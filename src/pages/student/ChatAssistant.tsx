import DashboardLayout from "@/components/DashboardLayout";
import { Bot, Send, Sparkles, Loader2, GraduationCap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/student-chatbot`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const quickPrompts = [
  "What are the fees for 2025/2026?",
  "What is the seminar requirement?",
  "How do I register for courses?",
  "How do I contact the SPS office?",
  "What is the thesis submission process?",
  "How do I apply for clearance?",
];

// Clean markdown artifacts from AI responses
const cleanResponse = (text: string): string => {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/gs, "$1")
    .replace(/^[-•]\s+/gm, "• ")
    .replace(/^>\s?/gm, "")
    .replace(/\*{2,}/g, "")
    .replace(/_{2,}/g, "")
    .replace(/~{2}(.*?)~{2}/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// Render text with clickable links, phone numbers, and WhatsApp links
const renderWithLinks = (text: string): React.ReactNode => {
  const cleaned = cleanResponse(text);

  // Token markdown links [label](url)
  const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let tokenized = cleaned.replace(MD_LINK, '<<<MDLINK:$2:::$1>>>');

  // Match: tokens, raw URLs, WhatsApp patterns, and phone numbers
  const SPLIT = /(<<<MDLINK:[^>]+>>>|https?:\/\/[^\s)<>,]+|(?:WhatsApp|whatsapp|Whatsapp)[:\s]*[\+]?[\d\s\-()]{7,}|(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/g;
  const parts = tokenized.split(SPLIT);

  return parts.map((part, i) => {
    if (!part) return null;

    // Markdown link token
    const md = part.match(/^<<<MDLINK:(.*?):::(.+?)>>>$/);
    if (md) {
      return (
        <a key={i} href={md[1]} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all">
          {md[2]}
        </a>
      );
    }

    // Raw URL
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all">
          {part}
        </a>
      );
    }

    // WhatsApp pattern (e.g. "WhatsApp: +233 24 000 1234")
    const waMatch = part.match(/^(?:WhatsApp|whatsapp|Whatsapp)[:\s]*([\+\d\s\-()]{7,})$/);
    if (waMatch) {
      const digits = waMatch[1].replace(/[^\d+]/g, '');
      const waUrl = `https://wa.me/${digits.replace('+', '')}`;
      return (
        <a key={i} href={waUrl} target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors inline-flex items-center gap-1">
          {part}
        </a>
      );
    }

    // Phone number pattern
    const phoneDigits = part.replace(/[^\d+]/g, '');
    if (phoneDigits.length >= 7 && /^[\+]?[\d\s\-()]+$/.test(part.trim())) {
      return (
        <a key={i} href={`tel:${phoneDigits}`}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          {part}
        </a>
      );
    }

    return <span key={i}>{part}</span>;
  });
};

const ChatAssistant = () => {
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
      body: JSON.stringify({ messages: userMessages }),
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
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
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
      toast.error(e.message || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              SPS Assistant
            </h1>
            <p className="text-muted-foreground text-sm">
              Ask about fees, registration, thesis, clearance, and more
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Welcome / Quick prompts */}
        {messages.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="text-center mb-5">
              <Sparkles size={32} className="mx-auto text-primary/60 mb-2" />
              <h3 className="font-display font-bold text-foreground">
                Welcome to SPS Assistant
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                I can help you with fees, course registration, thesis submissions,
                clearance, and other academic matters.
              </p>
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

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div
              ref={scrollRef}
              className="h-[400px] md:h-[500px] overflow-y-auto p-4 space-y-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-5 py-4 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground text-[15px]"
                        : "bg-muted/60 text-foreground text-[15px] leading-relaxed"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot size={14} className="text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          SPS Assistant
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap font-sans">{renderWithLinks(m.content)}</div>
                  </div>
                </div>
              ))}
              {isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Thinking…
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Input area */}
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
              placeholder="Ask about programmes, fees, admissions, seminars…"
              className="resize-none h-12 min-h-[48px]"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatAssistant;
