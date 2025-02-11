import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookMarked, BookOpen, Target, Clock, Bookmark, Calendar, LineChart, TrendingUp, Music, Heart } from "lucide-react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export const StoryStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['story-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      
      // Get all stories for the user
      const { data: stories, error } = await supabase
        .from('stories')
        .select('*')
        .eq('author_id', session.user.id);
        
      if (error) throw error;
      
      // Get the total count from user_story_counts across all months
      const { data: storyCounts, error: countError } = await supabase
        .from('user_story_counts')
        .select('credits_used, month_year')
        .eq('user_id', session.user.id);

      if (countError) throw countError;

      // Get audio stories count
      const { data: audioStories, error: audioError } = await supabase
        .from('audio_stories')
        .select('id')
        .eq('user_id', session.user.id);

      if (audioError) throw audioError;

      // Get favorites count
      const { data: favorites, error: favoritesError } = await supabase
        .from('story_favorites')
        .select('id')
        .eq('user_id', session.user.id);

      if (favoritesError) throw favoritesError;
      
      // Sum up all credits_used counts
      const totalGenerated = storyCounts?.reduce((sum, record) => 
        sum + (record.credits_used || 0), 0) || 0;

      const totalWords = stories.reduce((sum, story) => sum + story.content.length, 0);
      
      // Calculate most used genre
      const genreCounts = stories.reduce((acc, story) => {
        acc[story.genre] = (acc[story.genre] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostUsedGenre = Object.entries(genreCounts).reduce((a, b) => 
        (a[1] > b[1] ? a : b), ['None', 0])[0];

      // Calculate total reading time (assuming average reading speed of 200 words per minute)
      const totalReadingMinutes = Math.round((totalWords / 5) / 200);

      // New stats calculations
      const averageStoryLength = Math.round(totalWords / (stories.length || 1));

      // Calculate most active month
      const monthCounts = storyCounts?.reduce((acc, record) => {
        acc[record.month_year] = record.credits_used || 0;
        return acc;
      }, {} as Record<string, number>);

      const mostActiveMonth = Object.entries(monthCounts || {}).reduce((a, b) => 
        (a[1] > b[1] ? a : b), ['None', 0])[0];

      // Calculate stories this month
      const currentMonth = format(new Date(), 'yyyy-MM');
      const storiesThisMonth = storyCounts?.find(record => 
        record.month_year === currentMonth)?.credits_used || 0;

      return {
        totalStories: totalGenerated,
        savedStories: stories.filter(story => story.title && story.content).length,
        audioStoriesCount: audioStories?.length || 0,
        favoritesCount: favorites?.length || 0,
        totalReadingTime: totalReadingMinutes,
        mostUsedGenre,
        averageStoryLength,
        mostActiveMonth,
        storiesThisMonth
      };
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Your Story Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.totalStories || 0}</p>
            <p className="text-sm text-muted-foreground">Stories Created</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <BookMarked className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.savedStories || 0}</p>
            <p className="text-sm text-muted-foreground">Stories Saved</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.audioStoriesCount || 0}</p>
            <p className="text-sm text-muted-foreground">Audio Stories Created</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.totalReadingTime || 0}</p>
            <p className="text-sm text-muted-foreground">Total Reading Minutes</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.favoritesCount || 0}</p>
            <p className="text-sm text-muted-foreground">Stories Favorited</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Bookmark className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium capitalize">{stats?.mostUsedGenre}</p>
            <p className="text-sm text-muted-foreground">Favorite Genre</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <LineChart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.averageStoryLength || 0}</p>
            <p className="text-sm text-muted-foreground">Avg. Story Length</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-medium">{stats?.mostActiveMonth || 'None'}</p>
            <p className="text-sm text-muted-foreground">Most Active Month</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{stats?.storiesThisMonth || 0}</p>
            <p className="text-sm text-muted-foreground">Stories This Month</p>
          </div>
        </div>
      </div>
    </Card>
  );
};