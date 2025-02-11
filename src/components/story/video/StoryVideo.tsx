import { useState } from "react";
import { Card } from "@/components/ui/card";
import { VideoPlayer } from "./VideoPlayer";
import { VideoGenerationForm } from "./VideoGenerationForm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "lucide-react";

interface StoryVideoProps {
  storyId: string;
  storyContent: string;
}

export function StoryVideo({ storyId, storyContent }: StoryVideoProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing video if any
  const { data: videoData } = useQuery({
    queryKey: ['story-video', storyId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from('story_videos')
        .select('*')
        .eq('story_id', storyId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const { data: { publicUrl } } = supabase
          .storage
          .from('story-videos')
          .getPublicUrl(data.video_url);
        
        return { ...data, video_url: publicUrl };
      }
      
      return null;
    },
  });

  return (
    <Card className="p-4 md:p-6 space-y-4 bg-card">
      <div className="flex items-center gap-2 mb-4">
        <Video className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Story Video</h3>
      </div>

      {!videoData ? (
        <VideoGenerationForm
          storyId={storyId}
          storyContent={storyContent}
          showConfirmDialog={showConfirmDialog}
          onConfirmDialogChange={setShowConfirmDialog}
          isGenerating={false}
          generationStep=""
          hasAudioStory={false}
          onGenerate={() => {
            queryClient.invalidateQueries({ queryKey: ['story-video', storyId] });
          }}
        />
      ) : (
        <VideoPlayer 
          videoUrl={videoData.video_url}
          aspectRatio={videoData.aspect_ratio}
          storyId={storyId}
        />
      )}
    </Card>
  );
}