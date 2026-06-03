import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Bot, Send, Sparkles, Loader2, ThumbsUp, ThumbsDown, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supervisor-ai`;

// Clean markdown artifacts from AI responses (skip table lines)
const cleanResponse = (text: string): string => {
  return text
    .replace(/#{1,6}\s*/g, "")           // remove markdown headings
    .replace(/\*\*(.*?)\*\*/g, "$1")     // bold
    .replace(/\*(.*?)\*/g, "$1")         // italic
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1") // code blocks
    .replace(/^[-•]\s+/gm, "• ")         // normalize bullets
    .replace(/^>\s?/gm, "")              // remove blockquotes >
    .replace(/\*{2,}/g, "")              // stray asterisks
    .replace(/_{2,}/g, "")               // stray underscores used as separators
    .replace(/~{2}(.*?)~{2}/g, "$1")     // strikethrough
    .replace(/\n{3,}/g, "\n\n")          // collapse excessive blank lines
    .trim();
};

// Parse a markdown table block into { headers, rows }
const parseMarkdownTable = (block: string): { headers: string[]; rows: string[][] } | null => {
  const lines = block.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;
  // header row must have pipes
  if (!lines[0].includes("|")) return null;

  const parseCells = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

  const headers = parseCells(lines[0]);
  // second line should be the separator (dashes)
  const sepIdx = lines[1].match(/^[\s|:-]+$/) ? 1 : -1;
  if (sepIdx === -1) return null;

  const rows = lines.slice(sepIdx + 1).map(parseCells);
  return { headers, rows };
};

// Render inline text with clickable links, phone numbers, and WhatsApp
const renderInlineLinks = (text: string): React.ReactNode => {
  const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let tokenized = text.replace(MD_LINK, '<<<MDLINK:$2:::$1>>>');
  const SPLIT = /(<<<MDLINK:[^>]+>>>|https?:\/\/[^\s)<>,]+|(?:WhatsApp|whatsapp|Whatsapp)[:\s]*[\+]?[\d\s\-()]{7,}|(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g;
  const parts = tokenized.split(SPLIT);

  return parts.map((part, i) => {
    if (!part) return null;
    const md = part.match(/^<<<MDLINK:(.*?):::(.+?)>>>$/);
    if (md) {
      return (
        <a key={i} href={md[1]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all">
          {md[2]}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all">
          {part}
        </a>
      );
    }
    const waMatch = part.match(/^(?:WhatsApp|whatsapp|Whatsapp)[:\s]*([\+\d\s\-()]{7,})$/);
    if (waMatch) {
      const digits = waMatch[1].replace(/[^\d+]/g, '');
      const waUrl = `https://wa.me/${digits.replace('+', '')}`;
      return (
        <a key={i} href={waUrl} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          {part}
        </a>
      );
    }
    const phoneDigits = part.replace(/[^\d+]/g, '');
    if (phoneDigits.length >= 7 && /^[\+]?[\d\s\-()]+$/.test(part.trim())) {
      return (
        <a key={i} href={`tel:${phoneDigits}`}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
};

// Render a table as a styled HTML table
const renderTable = (table: { headers: string[]; rows: string[][] }, key: number) => (
  <div key={key} className="my-3 overflow-x-auto rounded-lg border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-muted/60">
          {table.headers.map((h, hi) => (
            <th key={hi} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, ri) => (
          <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
            {row.map((cell, ci) => (
              <td key={ci} className="px-3 py-2 text-foreground border-b border-border/50">
                {renderInlineLinks(cell)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Main renderer: splits content into table blocks and text blocks
const renderFormattedContent = (text: string): React.ReactNode => {
  // Split by table blocks (consecutive lines containing pipes with a separator row)
  const TABLE_REGEX = /((?:^[ \t]*\|.+\|[ \t]*\n?){2,})/gm;
  const segments: { type: "text" | "table"; content: string }[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(TABLE_REGEX)) {
    const before = text.slice(lastIndex, match.index);
    if (before.trim()) segments.push({ type: "text", content: before });
    segments.push({ type: "table", content: match[1] });
    lastIndex = (match.index || 0) + match[0].length;
  }
  const remaining = text.slice(lastIndex);
  if (remaining.trim()) segments.push({ type: "text", content: remaining });

  // If no table segments found, fall back to simple rendering
  if (segments.length === 0) {
    return renderInlineLinks(cleanResponse(text));
  }

  return segments.map((seg, i) => {
    if (seg.type === "table") {
      const parsed = parseMarkdownTable(seg.content);
      if (parsed) return renderTable(parsed, i);
      // Not a valid table, render as text
      return <React.Fragment key={i}>{renderInlineLinks(cleanResponse(seg.content))}</React.Fragment>;
    }
    return (
      <div key={i} className="whitespace-pre-wrap">
        {renderInlineLinks(cleanResponse(seg.content))}
      </div>
    );
  });
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  "Summarize the progress of all my assigned students",
  "What are the key evaluation criteria for a thesis chapter?",
  "Help me write constructive feedback for a weak methodology section",
  "What formatting guidelines should I check in a thesis?",
  "How should I handle a student who is behind on milestones?",
];

const AIAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: ChatMessage[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: userMessages, mode: "chat" }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `Error ${resp.status}`);
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: msg };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    try {
      await streamChat(updatedMessages);
    } catch (e: any) {
      toast.error(e.message || "Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = (type: "up" | "down") => {
    toast.success(type === "up" ? "Thanks! Marked as helpful." : "Thanks for the feedback. We'll improve.");
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">AI Assistant</h1>
            <p className="text-muted-foreground text-sm">Intelligent support for thesis supervision</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">
            <Bot size={14} className="mr-1.5" /> Chat Assistant
          </TabsTrigger>
          <TabsTrigger value="checks">
            <AlertTriangle size={14} className="mr-1.5" /> Automated Checks
          </TabsTrigger>
        </TabsList>

        {/* ── Chat Tab ── */}
        <TabsContent value="chat" className="space-y-4">
          {messages.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="text-center mb-5">
                <Sparkles size={32} className="mx-auto text-primary/60 mb-2" />
                <h3 className="font-display font-bold text-foreground">How can I help?</h3>
                <p className="text-sm text-muted-foreground mt-1">Ask me anything about thesis supervision, evaluation, or student progress.</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(p)}
                    className="text-xs px-3 py-2 rounded-lg border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div ref={scrollRef} className="h-[400px] md:h-[500px] overflow-y-auto p-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 text-foreground"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Bot size={12} className="text-primary" />
                          <span className="text-xs font-medium text-primary">AI Assistant</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap" style={{ fontSize: '15px', lineHeight: '1.7' }}>{renderFormattedContent(m.content)}</div>
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                          <button onClick={() => handleFeedback("up")} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-success transition-colors">
                            <ThumbsUp size={12} />
                          </button>
                          <button onClick={() => handleFeedback("down")} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-destructive transition-colors">
                            <ThumbsDown size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex gap-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about evaluation criteria, student progress, feedback tips…"
                className="resize-none h-12 min-h-[48px]"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="shrink-0">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ── Automated Checks Tab ── */}
        <TabsContent value="checks">
          <AutomatedChecks />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

/* ── Automated Checks sub-component ── */
const severityConfig = {
  high: { color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  medium: { color: "bg-warning/10 text-warning", icon: Info },
  low: { color: "bg-success/10 text-success", icon: CheckCircle },
};



interface RecentSubmission {
  id: string;
  student_name: string;
  stage: string;
  status: string;
  submitted_at: string;
}

const AutomatedChecks = () => {
  const [subs, setSubs] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("thesis_submissions")
      .select("id, student_name, stage, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { setSubs((data as RecentSubmission[]) || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={16} className="text-warning" />
          <h3 className="font-display font-bold text-foreground">Recent Submissions</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Latest thesis submissions from your students. Use the Chat tab to ask the AI for detailed analysis.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
      ) : subs.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-5 text-center text-sm text-muted-foreground">
          No submissions yet.
        </div>
      ) : (
        subs.map((s) => {
          const cfg = s.status === "Pending" ? severityConfig.medium
            : s.status === "Rejected" ? severityConfig.high
            : severityConfig.low;
          const Icon = cfg.icon;
          return (
            <div key={s.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">{s.student_name} — {s.stage}</h4>
                <Badge variant={s.status === "Rejected" ? "destructive" : s.status === "Pending" ? "outline" : "secondary"} className="text-xs">
                  {s.status}
                </Badge>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${cfg.color}`}>
                <Icon size={14} className="shrink-0" />
                <p className="text-sm">
                  Submitted {new Date(s.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default AIAssistant;
