import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('No stripe signature found');
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    console.log('Received Stripe webhook event:', event.type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if (!customer.email) {
          throw new Error('No customer email found');
        }

        // Get the price ID to determine subscription level
        const priceId = subscription.items.data[0].price.id;
        
        // Get subscription tier based on price ID
        const { data: tier, error: tierError } = await supabase
          .from('subscription_tiers')
          .select('level')
          .or(`stripe_price_id.eq.${priceId},stripe_yearly_price_id.eq.${priceId}`)
          .single();

        if (tierError || !tier) {
          console.error('Error finding subscription tier:', tierError);
          throw new Error('Subscription tier not found');
        }

        // Update user's subscription level and add timestamp
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_level: tier.level,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.metadata.supabaseUid);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }

        console.log('Successfully updated subscription for user:', customer.email);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);

        // Reset subscription to free tier
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            subscription_level: 'free',
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.metadata.supabaseUid);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }

        console.log('Successfully cancelled subscription for user:', customer.email);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Handle one-time purchases (credits)
        if (session.mode === 'payment') {
          const customer = await stripe.customers.retrieve(session.customer as string);
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;

          if (!priceId) {
            throw new Error('No price ID found in checkout session');
          }

          // Get the credits product details
          const { data: tier, error: tierError } = await supabase
            .from('subscription_tiers')
            .select('level, monthly_credits')
            .eq('stripe_price_id', priceId)
            .single();

          if (tierError || !tier) {
            console.error('Error finding credits tier:', tierError);
            throw new Error('Credits tier not found');
          }

          // Add credits to user's current month
          const currentMonth = new Date().toISOString().slice(0, 7);
          const { error: creditsError } = await supabase
            .from('user_story_counts')
            .upsert({
              user_id: customer.metadata.supabaseUid,
              month_year: currentMonth,
              credits_used: 0,
              updated_at: new Date().toISOString()
            });

          if (creditsError) {
            console.error('Error updating credits:', creditsError);
            throw creditsError;
          }

          console.log('Successfully processed credits purchase for user:', customer.email);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          // The subscription update will trigger the credit allocation via database trigger
          console.log('Payment succeeded for subscription:', subscription.id);
          console.log('Credits will be allocated for customer:', customer.email);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});