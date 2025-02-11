
import { Switch } from "@/components/ui/switch";
import { CreditCostInput } from "./CreditCostInput";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ConfigItemProps {
  config: {
    id: string;
    key_name: string;
    description: string | null;
    is_active: boolean;
    kids_story_credits_cost: number | null;
  };
  onToggle: (id: string, checked: boolean) => void;
  onUpdateCreditsCost: (id: string, cost: number) => void;
  onUpdateProvider?: (id: string, provider: string) => void;
}

export const ConfigItem = ({ 
  config, 
  onToggle, 
  onUpdateCreditsCost,
  onUpdateProvider 
}: ConfigItemProps) => {
  const isProviderConfig = config.key_name === "IMAGE_GENERATION_PROVIDER";
  const isApiKeyConfig = ["RUNWARE_API_KEY", "OPENAI_API_KEY"].includes(config.key_name);

  return (
    <div className={cn(
      "p-4 border rounded-lg",
      isProviderConfig ? "bg-muted/50" : "bg-background"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <p className="font-medium">{config.key_name}</p>
          {config.description && (
            <p className="text-sm text-gray-500 mb-2">{config.description}</p>
          )}
          {config.key_name === "AUDIO_STORY_CREDITS" && (
            <CreditCostInput
              label="Kids Story Credits Cost"
              value={config.kids_story_credits_cost || 0}
              onChange={(cost) => onUpdateCreditsCost(config.id, cost)}
            />
          )}
          {isProviderConfig && onUpdateProvider && (
            <div className="mt-4">
              <RadioGroup
                defaultValue={config.is_active ? "runware" : "openai"}
                onValueChange={(value) => onUpdateProvider(config.id, value)}
                className="flex flex-col space-y-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai" id="openai" />
                  <Label htmlFor="openai" className="font-normal">OpenAI DALL-E</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="runware" id="runware" />
                  <Label htmlFor="runware" className="font-normal">Runware.ai</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isProviderConfig && (
            <>
              <Switch
                checked={config.is_active}
                onCheckedChange={(checked) => onToggle(config.id, checked)}
              />
              <span className="text-sm">
                {config.is_active ? "Active" : "Inactive"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
