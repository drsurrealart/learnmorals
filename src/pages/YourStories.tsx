import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavigationBar } from "@/components/NavigationBar";
import { useToast } from "@/hooks/use-toast";
import { SavedStory } from "@/types/story";
import { useSearchParams } from "react-router-dom";
import { SearchBar } from "@/components/story/SearchBar";
import { StoriesList } from "@/components/story/StoriesList";
import { StoryPagination } from "@/components/story/StoryPagination";
import { Book, BookOpen } from "lucide-react";

const STORIES_PER_PAGE = 5;

const YourStories = () => {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [filteredStories, setFilteredStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStories, setTotalStories] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const highlightedStoryId = searchParams.get('story');
  const storyRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchStories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count } = await supabase
        .from('stories')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', session.user.id);

      setTotalStories(count || 0);

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('author_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
      setFilteredStories(data || []);

      if (highlightedStoryId && data) {
        const storyIndex = data.findIndex(story => story.id === highlightedStoryId);
        if (storyIndex !== -1) {
          const page = Math.floor(storyIndex / STORIES_PER_PAGE) + 1;
          setCurrentPage(page);
        }
      }
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

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (highlightedStoryId && storyRefs.current[highlightedStoryId]) {
      storyRefs.current[highlightedStoryId]?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [highlightedStoryId, currentPage, filteredStories]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    
    if (!query.trim()) {
      setFilteredStories(stories);
      setTotalStories(stories.length);
      return;
    }

    const searchTerm = query.toLowerCase();
    const filtered = stories.filter(story => 
      story.title.toLowerCase().includes(searchTerm) ||
      story.content.toLowerCase().includes(searchTerm) ||
      story.moral.toLowerCase().includes(searchTerm)
    );

    setFilteredStories(filtered);
    setTotalStories(filtered.length);
  };

  const handleDelete = async (storyId: string) => {
    try {
      // Delete audio stories
      const { error: audioError } = await supabase
        .from('audio_stories')
        .delete()
        .eq('story_id', storyId);

      if (audioError) throw audioError;

      // Delete story images
      const { error: imageError } = await supabase
        .from('story_images')
        .delete()
        .eq('story_id', storyId);

      if (imageError) throw imageError;

      // Delete story PDFs
      const { error: pdfError } = await supabase
        .from('story_pdfs')
        .delete()
        .eq('story_id', storyId);

      if (pdfError) throw pdfError;

      // Delete story translations where this story is either the original or the translation
      const { error: translationError1 } = await supabase
        .from('story_translations')
        .delete()
        .eq('original_story_id', storyId);

      if (translationError1) throw translationError1;

      const { error: translationError2 } = await supabase
        .from('story_translations')
        .delete()
        .eq('translated_story_id', storyId);

      if (translationError2) throw translationError2;

      // Delete story favorites
      const { error: favoriteError } = await supabase
        .from('story_favorites')
        .delete()
        .eq('story_id', storyId);

      if (favoriteError) throw favoriteError;

      // Finally, delete the story itself
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) throw error;

      // Update local state after successful deletion
      const updatedStories = stories.filter(story => story.id !== storyId);
      setStories(updatedStories);
      
      // Update filtered stories and maintain search results
      const updatedFilteredStories = filteredStories.filter(story => story.id !== storyId);
      setFilteredStories(updatedFilteredStories);
      setTotalStories(updatedFilteredStories.length);

      toast({
        title: "Success",
        description: "Story and all associated content deleted successfully",
      });

      // Adjust current page if necessary
      const newTotalPages = Math.ceil(updatedFilteredStories.length / STORIES_PER_PAGE);
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      toast({
        title: "Error",
        description: "Failed to delete the story",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalStories / STORIES_PER_PAGE);
  const startIndex = (currentPage - 1) * STORIES_PER_PAGE;
  const paginatedStories = filteredStories.slice(startIndex, startIndex + STORIES_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background">
      <NavigationBar onLogout={async () => {}} />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-2">
            <Book className="h-8 w-8 text-primary animate-bounce" />
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
              My Stories
            </h1>
            <BookOpen className="h-8 w-8 text-primary animate-bounce" />
          </div>
          <p className="text-lg text-muted-foreground">
            Your personal collection of magical stories that inspire and delight.
          </p>
        </div>
        
        <SearchBar 
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />

        <StoryPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <StoriesList 
          stories={paginatedStories}
          isLoading={isLoading}
          searchQuery={searchQuery}
          highlightedStoryId={highlightedStoryId}
          storyRefs={storyRefs}
          onDelete={handleDelete}
        />

        <StoryPagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default YourStories;