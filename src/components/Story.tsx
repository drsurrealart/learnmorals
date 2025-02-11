import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StoryContent } from "./story/StoryContent";
import { StoryActions } from "./story/StoryActions";
import { StorySocialShare } from "./story/StorySocialShare";
import { StoryEnrichment } from "./story/StoryEnrichment";
import { FavoriteButton } from "./story/FavoriteButton";
import { AudioStory } from "./story/AudioStory";
import { StoryImage } from "./story/image/StoryImage";
import { StoryPDF } from "./story/pdf/StoryPDF";
import { StoryVideo } from "./story/video/StoryVideo";
import { useQuery } from "@tanstack/react-query";
import { Loading } from "@/components/ui/loading";

interface StoryProps {
  content: string;
  enrichment: {
    reflection_questions: string[];
    action_steps: string[];
    related_quote: string;
    discussion_prompts: string[];
  } | null;
  onReflect: () => void;
  onCreateNew: () => void;
  ageGroup?: string;
  genre?: string;
  language?: string;
  tone?: string;
  readingLevel?: string;
  lengthPreference?: string;
}

export function Story({ 
  content, 
  enrichment, 
  onReflect, 
  onCreateNew,
  ageGroup,
  genre,
  language,
  tone,
  readingLevel,
  lengthPreference
}: StoryProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const isKidsStory = ageGroup?.toLowerCase().includes('kid') || ageGroup?.toLowerCase().includes('child');

  // Split content to separate moral from the rest of the story
  const parts = content.split("Moral:");
  const storyContent = parts[0].trim();
  const moral = parts[1]?.trim() || "";

  // Extract title from the first line of the story
  const titleMatch = storyContent.match(/^(.+?)\n/);
  const title = titleMatch ? titleMatch[1].trim() : "Untitled Story";
  const storyWithoutTitle = storyContent.replace(/^.+?\n/, '').trim();

  // Fetch the story ID using the title
  const { data: storyData, isLoading, refetch } = useQuery({
    queryKey: ['story', title],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('id')
        .eq('title', title)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="p-4 md:p-8 space-y-4 md:space-y-6 animate-fade-in bg-story-background">
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
          {storyData?.id && <FavoriteButton storyId={storyData.id} />}
        </div>

        <StoryContent
          title={title}
          content={storyWithoutTitle}
          moral={moral}
          ageGroup={ageGroup}
          genre={genre}
          language={language}
          tone={tone}
          readingLevel={readingLevel}
          lengthPreference={lengthPreference}
        />

        {/* Audio Story Card for Kids */}
        {isKidsStory && storyData?.id && (
          <Card className="p-4 md:p-6 animate-fade-in border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-xl text-center w-full">Listen to the Story!</h3>
            </div>
            <AudioStory 
              storyId={storyData.id} 
              storyContent={storyWithoutTitle}
              isKidsMode={true}
            />
          </Card>
        )}

        {enrichment && !isKidsStory && (
          <StoryEnrichment
            reflectionQuestions={enrichment.reflection_questions}
            actionSteps={enrichment.action_steps}
            relatedQuote={enrichment.related_quote}
            discussionPrompts={enrichment.discussion_prompts}
          />
        )}

        {storyData?.id && !isKidsStory && (
          <>
            <AudioStory 
              storyId={storyData.id} 
              storyContent={storyWithoutTitle}
            />
            <StoryImage
              storyId={storyData.id}
              storyContent={storyWithoutTitle}
            />
            <StoryVideo
              storyId={storyData.id}
              storyContent={storyWithoutTitle}
            />
            <StoryPDF
              storyId={storyData.id}
              storyContent={storyWithoutTitle}
            />
          </>
        )}

        <div className="border-t pt-4 md:pt-6 space-y-4">
          <StoryActions
            onCreateNew={onCreateNew}
            isKidsMode={isKidsStory}
          />
          {!isKidsStory && (
            <StorySocialShare
              title={title}
              content={storyWithoutTitle}
              moral={moral}
              url={window.location.href}
            />
          )}
        </div>
      </Card>
    </div>
  );
}