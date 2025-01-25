import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { StoryCreatorLayout } from "@/components/kids/StoryCreatorLayout";
import { StoryCreatorHeader } from "@/components/kids/StoryCreatorHeader";
import { StoryTypeSelector } from "@/components/kids/StoryTypeSelector";
import { GenerateStoryButton } from "@/components/kids/GenerateStoryButton";
import { StoryGenerationModal } from "@/components/kids/StoryGenerationModal";
import { ConfirmationDialog } from "@/components/kids/ConfirmationDialog";
import { AgeGroupTabs } from "@/components/kids/AgeGroupTabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Helper function to map UI age groups to database age groups
const mapAgeGroupToDbGroup = (uiAgeGroup: string): string => {
  switch (uiAgeGroup) {
    case '5-7':
      return 'preschool';
    case '8-10':
      return 'elementary';
    case '11-12':
      return 'tween';
    default:
      return 'preschool';
  }
};

export default function KidsStoryCreator() {
  const [ageGroup, setAgeGroup] = useState("5-7");
  const [storyType, setStoryType] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAgeGroupChange = (value: string) => {
    setAgeGroup(value);
    setStoryType(""); // Reset story type when age group changes
  };

  const handleGenerateClick = () => {
    setShowConfirmDialog(true);
  };

  const handleModalClose = () => {
    setIsGenerating(false);
    setGenerationStep("");
  };

  const generateStory = async () => {
    try {
      setShowConfirmDialog(false); // Close confirmation dialog
      setIsGenerating(true);
      setGenerationStep("Creating your magical story...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to create stories",
          variant: "destructive",
        });
        return;
      }

      const dbAgeGroup = mapAgeGroupToDbGroup(ageGroup);

      const response = await supabase.functions.invoke('generate-story', {
        body: { 
          preferences: {
            ageGroup: dbAgeGroup,
            genre: storyType,
            moral: 'kindness',
            lengthPreference: 'short',
            language: 'english',
            tone: 'playful',
            readingLevel: 'beginner'
          },
          mode: 'kids'
        }
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to generate story");
      }

      setGenerationStep("Saving your story...");
      
      // Extract the story content and other data
      const { story, enrichment, imagePrompt } = response.data;
      
      // Generate a slug from the title
      const title = story.split('\n')[0];
      const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Save the story to the database
      const { data: savedStory, error: saveError } = await supabase
        .from('stories')
        .insert({
          title,
          content: story,
          age_group: dbAgeGroup,
          genre: storyType,
          moral: 'kindness',
          author_id: session.user.id,
          image_prompt: imagePrompt,
          reflection_questions: enrichment?.reflection_questions || [],
          action_steps: enrichment?.action_steps || [],
          related_quote: enrichment?.related_quote || '',
          discussion_prompts: enrichment?.discussion_prompts || [],
          slug
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Clear generation state and close modals
      setIsGenerating(false);
      setGenerationStep("");
      setShowConfirmDialog(false);
      
      // Redirect to the story page
      if (savedStory?.id) {
        navigate(`/your-stories?story=${savedStory.id}`);
      } else {
        navigate('/your-stories');
      }

    } catch (error: any) {
      console.error("Error generating story:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate story. Please try again.",
        variant: "destructive",
      });
      // Clear generation state and close modals on error
      setIsGenerating(false);
      setGenerationStep("");
      setShowConfirmDialog(false);
    }
  };

  return (
    <StoryCreatorLayout>
      <div className="space-y-8">
        <StoryCreatorHeader />
        
        <AgeGroupTabs
          selectedAgeGroup={ageGroup}
          onAgeGroupChange={handleAgeGroupChange}
        />
        
        <StoryTypeSelector
          selectedType={storyType}
          onSelect={setStoryType}
          ageGroup={ageGroup}
          disabled={isGenerating}
        />
        
        <GenerateStoryButton
          storyType={storyType}
          isGenerating={isGenerating}
          onClick={handleGenerateClick}
        />

        <ConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          onConfirm={generateStory}
          totalCredits={9}
        />

        <StoryGenerationModal
          isOpen={isGenerating}
          generationStep={generationStep}
          onOpenChange={handleModalClose}
        />
      </div>
    </StoryCreatorLayout>
  );
}