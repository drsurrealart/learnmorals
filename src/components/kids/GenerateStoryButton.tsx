import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

interface GenerateStoryButtonProps {
  storyType: string;
  isGenerating: boolean;
  onClick: () => void;
}

export function GenerateStoryButton({ storyType, isGenerating, onClick }: GenerateStoryButtonProps) {
  if (!storyType) return null;

  return (
    <div className="flex flex-col items-center mt-6 space-y-4">
      <Button
        size="lg"
        className="text-lg px-8 py-6 w-full md:w-auto"
        onClick={onClick}
        disabled={!storyType || isGenerating}
      >
        <Wand2 className="mr-2 h-5 w-5" />
        Create My Story!
      </Button>
    </div>
  );
}