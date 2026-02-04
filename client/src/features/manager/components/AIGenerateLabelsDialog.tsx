import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { Sparkles, Wand2, ArrowLeft, Check, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { chatWidgetApi } from "../../chat-widget/services/chatWidget.api";
import { type LabelCategory } from "../../../services/label.api";
import { ScrollArea } from "../../../components/ui/scroll-area";

interface AIGenerateLabelsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: LabelCategory[];
  onSuccess: () => void;
}

type Step = "input" | "thinking" | "preview" | "creating";

export function AIGenerateLabelsDialog({
  isOpen,
  onClose,
  categories,
  onSuccess,
}: AIGenerateLabelsDialogProps) {
  const [step, setStep] = useState<Step>("input");
  const [categoryId, setCategoryId] = useState<string>("new");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");

  // Preview state
  const [suggestedLabels, setSuggestedLabels] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [targetCategoryName, setTargetCategoryName] = useState("");

  const handleSuggest = async () => {
    if (categoryId === "new" && !newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe what labels you want to generate");
      return;
    }

    setStep("thinking");
    try {
      const selectedCategory =
        categoryId === "new"
          ? newCategoryName
          : categories.find((c) => c.id === categoryId)?.name || "";

      setTargetCategoryName(selectedCategory);

      // Prompt Gemini to use the suggest_labels tool
      const prompt = `[AI_COMMAND: SUGGEST_LABELS]
Category: ${selectedCategory}
Description: ${description}

Requirements:
1. Use the "suggest_labels" tool to propose a list of labels (at least 10-15 relevant ones).
2. DO NOT create them yet.
3. Use your knowledge to provide a high-quality list of labels for this theme.`;

      const response = await chatWidgetApi.sendMessage(prompt, []);

      // Parse response. It should be a JSON string of AIResponse with label_suggestion data
      try {
        const result = JSON.parse(response.text);
        if (
          result.type === "card" &&
          result.content?.data?.type === "label_suggestion"
        ) {
          const labels = result.content.data.labels || [];
          setSuggestedLabels(labels);
          setSelectedLabels(new Set(labels)); // Select all by default
          setStep("preview");
        } else {
          throw new Error("Invalid AI response format");
        }
      } catch (e) {
        console.error("Failed to parse AI suggestions", e, response.text);
        toast.error(
          "AI returned an unexpected response. Please try being more specific.",
        );
        setStep("input");
      }
    } catch (error) {
      console.error("AI Suggestion failed", error);
      toast.error("AI failed to generate suggestions. Please try again.");
      setStep("input");
    }
  };

  const handleCreate = async () => {
    if (selectedLabels.size === 0) {
      toast.error("Please select at least one label to create");
      return;
    }

    setStep("creating");
    try {
      const labelsToCreate = suggestedLabels.filter((label) =>
        selectedLabels.has(label),
      );

      // Construct a command for creation
      const prompt = `[AI_COMMAND: CREATE_LABELS]
Category: ${targetCategoryName}
Labels: ${labelsToCreate.join(", ")}

Requirements:
1. Call "create_labels_auto" with these EXACT labels and category name.
2. This is my final confirmation. Perform the tool call immediately.`;

      await chatWidgetApi.sendMessage(prompt, []);

      toast.success(
        `Successfully started creating ${labelsToCreate.length} labels!`,
      );
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("AI creation failed", error);
      toast.error(
        "Failed to create labels. Please try calling the AI in the chat widget directly.",
      );
      setStep("preview");
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after a small delay to allow closing animation
    setTimeout(() => {
      setStep("input");
      setNewCategoryName("");
      setDescription("");
      setCategoryId("new");
      setSuggestedLabels([]);
      setSelectedLabels(new Set());
    }, 300);
  };

  const toggleLabel = (label: string) => {
    const newSet = new Set(selectedLabels);
    if (newSet.has(label)) {
      newSet.delete(label);
    } else {
      newSet.add(label);
    }
    setSelectedLabels(newSet);
  };

  const toggleAll = () => {
    if (selectedLabels.size === suggestedLabels.length) {
      setSelectedLabels(new Set());
    } else {
      setSelectedLabels(new Set(suggestedLabels));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <DialogTitle>AI Label Generator</DialogTitle>
          </div>
          <DialogDescription>
            {step === "input" &&
              "Describe the labels you need, and our AI will suggest themes for you."}
            {step === "thinking" &&
              "AI is analyzing your request and preparing suggestions..."}
            {step === "preview" &&
              `Review the ${suggestedLabels.length} labels suggested for "${targetCategoryName}".`}
            {step === "creating" &&
              "Creating your selected labels in the system..."}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <Label>Target Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select or create category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Create New Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoryId === "new" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label htmlFor="category-name">New Category Name</Label>
                <Input
                  id="category-name"
                  placeholder="e.g. Medical, Vehicles, Animals..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">
                  What labels should I generate?
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                  onClick={() =>
                    setDescription(
                      "Tạo 10-15 label về chủ đề [Điền chủ đề ở đây]. Các label nên bao gồm: [Ví dụ 1], [Ví dụ 2]... Hãy đảm bảo các label có tính bao quát và chính xác.",
                    )
                  }
                >
                  <Sparkles className="w-3 h-3" />
                  Suggest Prompt
                </Button>
              </div>
              <Textarea
                id="description"
                placeholder="e.g. 10 types of common street vehicles, or 20 different types of tropical fruits..."
                className="min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Wand2 className="w-3 h-3" />
                Tip: You will be able to review and edit the list in the next
                step.
              </p>
            </div>
          </div>
        )}

        {(step === "thinking" || step === "creating") && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
            <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
            <p className="text-sm font-medium text-gray-600">
              {step === "thinking"
                ? "AI is analyzing your request and preparing suggestions..."
                : "Saving labels to system..."}
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Select Labels to Create ({selectedLabels.size})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px]"
                onClick={toggleAll}
              >
                {selectedLabels.size === suggestedLabels.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[250px] pr-4 border rounded-md p-2 bg-gray-50/50">
              <div className="grid grid-cols-2 gap-2">
                {suggestedLabels.map((label) => (
                  <div
                    key={label}
                    onClick={() => toggleLabel(label)}
                    className={`flex items-center gap-2 p-2 rounded-md border transition-all cursor-pointer ${
                      selectedLabels.has(label)
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-100 text-gray-500 opacity-70"
                    }`}
                  >
                    <Checkbox
                      checked={selectedLabels.has(label)}
                      onCheckedChange={() => toggleLabel(label)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm truncate">{label}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ListChecks className="w-3 h-3" />
              You can ask for more labels or changes by going back.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "input" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSuggest}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                Next: View Suggestions
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep("input")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Edit Requirements
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 ml-auto"
              >
                <Check className="w-4 h-4" />
                Confirm & Create
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
