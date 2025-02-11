import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { NavigationBar } from "@/components/NavigationBar";
import { StatsCards } from "@/components/admin/StatsCards";
import { SubscriptionChart } from "@/components/admin/SubscriptionChart";
import { AdminNav } from "@/components/admin/AdminNav";

interface UserStatistics {
  total_users: number;
  total_stories: number;
  users_by_subscription: Record<string, number>;
  stories_last_30_days: number;
  total_audio_stories: number;
  average_story_length: number;
}

const AdminDashboard = () => {
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: isAdmin, error } = await supabase.rpc('is_admin', {
        user_id: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) {
        console.error("Error checking admin status:", error);
        throw error;
      }
      return isAdmin;
    },
  });

  const { data: stats, isLoading: isLoadingStats, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('subscription_level');
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Get all stories
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select('*');
      
      if (storiesError) {
        console.error("Error fetching stories:", storiesError);
        throw storiesError;
      }

      // Get audio stories
      const { data: audioStories, error: audioError } = await supabase
        .from('audio_stories')
        .select('*');

      if (audioError) {
        console.error("Error fetching audio stories:", audioError);
        throw audioError;
      }

      // Calculate statistics
      const total_users = profiles.length;
      const total_stories = stories.length;
      const total_audio_stories = audioStories?.length || 0;
      
      const users_by_subscription = profiles.reduce((acc, profile) => {
        const level = profile.subscription_level || 'free';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const stories_last_30_days = stories.filter(story => 
        new Date(story.created_at) >= thirtyDaysAgo
      ).length;

      // Calculate average story length (in words)
      const totalWords = stories.reduce((sum, story) => {
        return sum + (story.content?.split(/\s+/).length || 0);
      }, 0);
      const average_story_length = Math.round(totalWords / (stories.length || 1));

      return {
        total_users,
        total_stories,
        users_by_subscription,
        stories_last_30_days,
        total_audio_stories,
        average_story_length
      } as UserStatistics;
    },
    enabled: !!isAdmin,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isCheckingAdmin) {
    return (
      <>
        <NavigationBar onLogout={handleLogout} />
        <div className="container mx-auto p-6">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <NavigationBar onLogout={handleLogout} />
        <Alert variant="destructive" className="m-6">
          <AlertDescription>
            You do not have permission to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavigationBar onLogout={handleLogout} />
        <Alert variant="destructive" className="m-6">
          <AlertDescription>
            Error loading dashboard statistics. Please try again later.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const subscriptionData = stats?.users_by_subscription 
    ? Object.entries(stats.users_by_subscription).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <>
      <NavigationBar onLogout={handleLogout} />
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-12 md:col-span-3 lg:col-span-2">
            <AdminNav />
          </div>
          
          {/* Main Content */}
          <div className="col-span-12 md:col-span-9 lg:col-span-10 space-y-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            
            <StatsCards 
              isLoading={isLoadingStats} 
              stats={stats} 
            />
            
            <SubscriptionChart 
              isLoading={isLoadingStats}
              data={subscriptionData}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;