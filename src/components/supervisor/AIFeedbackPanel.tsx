import { Bot, Sparkles, Loader2, ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Suggestion {
  text: string;
  category: string;
  helpful?: boolean | null;
}

interface AIFeedbackPanelProps {
  studentName: string;
  chapter: string;
  fileUrl?: string | null;
  fileName?: string;
  visible: boolean;
  onToggle: () => void;
  onUseSuggestion: (text: string) => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supervisor-ai`;

const categoryColors: Record<string, string> = {
  content: "bg-primary/10 text-primary",
  formatting: "bg-warning/10 text-warning",
  references: "bg-destructive/10 text-destructive",
  methodology: "bg-accent/50 text-accent-foreground",
  clarity: "bg-secondary text-secondary-foreground",
};

const AIFeedbackPanel = ({ studentName, chapter, fileUrl, fileName, visible, onToggle, onUseSuggestion }: AIFeedbackPanelProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [source, setSource] = useState<"live" | "sample">("live");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (visible && suggestions.length === 0) {
      generateSuggestions();
    }
  }, [visible]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          mode: "feedback",
          messages: [
            {
              role: "user",
              content: `Review the attached submission file from ${studentName} (${chapter}) — a postgraduate thesis chapter at UMaT — and produce specific feedback grounded in the actual content of the document.`,
            },
          ],
          context: { student: studentName, chapter },
          fileUrl,
          fileName,
        }),
      });

      if (!resp.ok) throw new Error("Failed to get suggestions");
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSource("live");
        setSuggestions(parsed.map((s: any) => ({ ...s, helpful: null })));
      } else {
        // Fallback mock suggestions if AI doesn't return proper JSON
        setSource("sample");
        setSuggestions([
          { text: "The methodology section could benefit from a clearer description of the research design and sampling strategy.", category: "methodology", helpful: null },
          { text: "Consider adding more recent references (2023-2026) to strengthen the literature foundation.", category: "references", helpful: null },
          { text: "Some paragraphs exceed the recommended length — consider breaking them into focused subsections.", category: "formatting", helpful: null },
          { text: "The research objectives are well-stated. Ensure each is addressed in the findings chapter.", category: "content", helpful: null },
        ]);
      }
    } catch (e) {
      // Fallback suggestions
      setSource("sample");
      setSuggestions([
        { text: "The methodology section could benefit from a clearer description of the research design.", category: "methodology", helpful: null },
        { text: "Consider adding more recent references to strengthen the literature foundation.", category: "references", helpful: null },
        { text: "Ensure consistent formatting of headings and subheadings throughout the chapter.", category: "formatting", helpful: null },
      ]);
      toast.error("Using cached suggestions — AI service temporarily unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (idx: number, helpful: boolean) => {
    setSuggestions((prev) => prev.map((s, i) => (i === idx ? { ...s, helpful } : s)));
    toast.success(helpful ? "Marked as helpful" : "Thanks for feedback");
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!visible) return null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-primary" />
          <span className="text-sm font-bold text-foreground font-display">AI Suggestions</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          <Sparkles size={8} className="mr-1" /> {source === "live" ? "Live AI" : "Sample fallback"}
        </Badge>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={18} className="animate-spin mr-2" />
              <span className="text-sm">Analyzing submission…</span>
            </div>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={`text-[10px] shrink-0 ${categoryColors[s.category] || "bg-muted text-muted-foreground"}`}>
                    {s.category}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(s.text, i)}
                      className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy"
                    >
                      {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-foreground">{s.text}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onUseSuggestion(s.text)}>
                    Use this feedback
                  </Button>
                  <div className="flex items-center gap-0.5 ml-auto">
                    <button
                      onClick={() => handleFeedback(i, true)}
                      className={`p-1 rounded transition-colors ${s.helpful === true ? "text-success" : "text-muted-foreground hover:text-success"}`}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => handleFeedback(i, false)}
                      className={`p-1 rounded transition-colors ${s.helpful === false ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border">
        <Button variant="ghost" size="sm" className="w-full text-xs" onClick={generateSuggestions} disabled={loading}>
          <Sparkles size={12} className="mr-1.5" /> Regenerate suggestions
        </Button>
      </div>
    </div>
  );
};

export default AIFeedbackPanel;
