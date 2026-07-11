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

import { API_BASE_URL, getToken } from "@/lib/api";

const CHAT_URL = `${API_BASE_URL}/chatbot/chat`;

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
    setSuggestions([]);
  }, [studentName, chapter]);

  useEffect(() => {
    if (visible && suggestions.length === 0 && !loading) {
      generateSuggestions();
    }
  }, [visible, suggestions.length]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          mode: "supervisor",
          messages: [
            {
              role: "user",
              content: `Generate 4 specific feedback suggestions for a postgraduate thesis submission by ${studentName} (${chapter}) at UMaT. Return ONLY a JSON array with objects having "text" and "category" fields. Categories must be one of: content, formatting, references, methodology, clarity. Example: [{"text":"...","category":"methodology"}]`,
            },
          ],
        }),
      });

      if (!resp.ok) throw new Error("Failed to get suggestions");
      if (!resp.body) throw new Error("No response body");

      // Collect full streamed content
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx).replace(/\r$/, "");
          buffer = buffer.slice(idx + 1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
          } catch { /* skip */ }
        }
      }

      const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setSource("live");
        setSuggestions(parsed.map((s: any) => ({ ...s, helpful: null })));
      } else {
        throw new Error("No JSON array in response");
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
