import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NavigationBar } from "@/components/NavigationBar";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SavedStory {
  id: string;
  title: string;
  content: string;
  moral: string;
  created_at: string;
  age_group: string;
  genre: string;
}

const YourStories = () => {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('author_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error("Error fetching stories:", error);
      toast({
        title: "Error",
        description: "Failed to load your stories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      setStories(stories.filter(story => story.id !== storyId));
      toast({
        title: "Success",
        description: "Story deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({
        title: "Error",
        description: "Failed to delete the story",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAgeGroup = (ageGroup: string) => {
    const ageGroups: Record<string, string> = {
      preschool: "Preschool (3-5)",
      elementary: "Elementary (6-8)",
      tween: "Tween (9-12)",
      teen: "Teen (13-17)",
      adult: "Adult (18+)"
    };
    return ageGroups[ageGroup] || ageGroup;
  };

  const formatGenre = (genre: string) => {
    return genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, ' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background">
      <NavigationBar onLogout={async () => {}} />
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold text-center mb-8">Your Stories</h1>
        
        {isLoading ? (
          <div className="text-center">Loading your stories...</div>
        ) : stories.length === 0 ? (
          <div className="text-center text-gray-500">
            You haven't saved any stories yet.
          </div>
        ) : (
          <div className="space-y-6">
            {stories.map((story) => (
              <Card key={story.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        Saved on {formatDate(story.created_at)}
                      </p>
                      <div className="flex gap-2">
                        <Badge variant="secondary">
                          {formatAgeGroup(story.age_group)}
                        </Badge>
                        <Badge variant="outline">
                          {formatGenre(story.genre)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(story.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="prose max-w-none">
                  <div className="text-story-text whitespace-pre-wrap">
                    {story.content}
                  </div>
                </div>
                {story.moral && (
                  <Card className="bg-secondary p-4">
                    <h3 className="font-semibold mb-2">Moral</h3>
                    <p className="text-story-text">{story.moral}</p>
                  </Card>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default YourStories;