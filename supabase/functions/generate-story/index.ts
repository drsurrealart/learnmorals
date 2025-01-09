import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { preferences } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid token');

    console.log("Received preferences:", preferences);

    // Create character names string if provided
    const characterNames = [preferences.characterName1, preferences.characterName2]
      .filter(Boolean)
      .map(name => name.trim())
      .filter(name => name.length > 0 && name.length <= 20)
      .join(" and ");
    
    const characterPrompt = characterNames 
      ? `Use the character names "${characterNames}" as the main characters in the story. Make sure these characters play central roles in the narrative.`
      : "Create appropriate character names for the story.";

    const prompt = `Create a ${preferences.genre} story for ${preferences.ageGroup} age group about ${preferences.moral}. ${characterPrompt} Format the story with a clear title at the start and a moral lesson at the end. The story should be engaging and end with a clear moral lesson. Keep it concise but meaningful. Do not use asterisks or other decorative characters in the formatting.`;

    console.log("Sending prompt to OpenAI:", prompt);

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a skilled storyteller who creates engaging, age-appropriate stories with clear moral lessons. Each story must be completely unique - never reuse character names, plot elements, or titles from previous stories. Create fresh, original content every time. Format the output with a Title at the start and a Moral at the end, without using any asterisks or decorative characters.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await openAIResponse.json();
    console.log("OpenAI response received");

    // First, get the current credits_used for this month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: currentCount, error: fetchError } = await supabase
      .from('user_story_counts')
      .select('credits_used')
      .eq('user_id', user.id)
      .eq('month_year', currentMonth)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error fetching current count:", fetchError);
      throw fetchError;
    }

    const currentCredits = currentCount?.credits_used || 0;
    
    // Then update or insert the new count
    const { error: countError } = await supabase
      .from('user_story_counts')
      .upsert({
        user_id: user.id,
        month_year: currentMonth,
        credits_used: currentCredits + 1,
        updated_at: new Date().toISOString()
      });

    if (countError) {
      console.error("Error incrementing credit count:", countError);
      throw countError;
    }

    return new Response(
      JSON.stringify({ story: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-story function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});