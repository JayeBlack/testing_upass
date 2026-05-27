import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `You are an AI assistant for postgraduate thesis supervisors at UMaT (University of Mines and Technology). 
You help supervisors with:
- Evaluating student submissions and providing constructive feedback
- Understanding evaluation criteria and academic standards
- Tracking student progress and milestones
- Answering questions about thesis guidelines, formatting, and best practices
- Providing summaries of student work and historical feedback
Keep responses concise, professional, and actionable. When comparing items, listing student progress, showing schedules, evaluation criteria, or any structured data, ALWAYS use markdown tables (with | pipes and --- separator rows) for clarity. Use plain text for explanations.`,

  feedback: `You are an AI assistant helping a thesis supervisor review a student's submission.
You will be given the actual submission file (PDF/doc) as attached content. READ IT and base your feedback on what is actually written in the document — cite specific sections, claims, or wording where useful.
Generate 4-6 specific, constructive feedback suggestions tied to the real content.
Each suggestion must be actionable, professional, and concretely reference the submission (e.g. "In Section 2.3 on sampling…").
Format each suggestion as a JSON array of objects with "text" (the feedback) and "category" (one of: "content", "formatting", "references", "methodology", "clarity").
Return ONLY the JSON array, no other text.`,

  checks: `You are an AI assistant that performs automated quality checks on thesis submissions.
Based on the submission details provided, identify potential issues.
Return a JSON array of objects with "issue" (description), "severity" (one of: "high", "medium", "low"), and "section" (affected area).
Return ONLY the JSON array, no other text.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "chat", context, fileUrl, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    // If a file URL is provided (feedback/checks mode), fetch it and attach as multimodal content
    let fileParts: any[] = [];
    if (fileUrl) {
      try {
        const fileResp = await fetch(fileUrl);
        if (fileResp.ok) {
          const buf = new Uint8Array(await fileResp.arrayBuffer());
          const ct = (fileResp.headers.get("content-type") || "").toLowerCase();
          const name = (fileName || fileUrl).toLowerCase();
          const isPdf = ct.includes("pdf") || name.endsWith(".pdf");
          const isImg = ct.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name);
          if (isPdf || isImg) {
            let binary = "";
            for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
            const b64 = btoa(binary);
            const mime = isPdf ? "application/pdf" : (ct || "image/png");
            fileParts = [{ type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } }];
            console.log(`Attached file ${fileName || ""} (${mime}, ${buf.length} bytes)`);
          } else {
            // Unsupported (e.g. .docx) — try to extract plain text fallback
            try {
              const text = new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ").replace(/\s+/g, " ").slice(0, 20000);
              if (text.trim().length > 200) {
                fileParts = [{ type: "text", text: `\n\n--- Submission file (${fileName}) extracted text (truncated) ---\n${text}` }];
                console.log(`Attached extracted text for ${fileName} (${text.length} chars)`);
              } else {
                console.warn(`Unsupported file type ${ct} for ${fileName}; no text extractable`);
              }
            } catch (e) {
              console.warn("Text extract failed", e);
            }
          }
        } else {
          console.warn("Could not fetch file:", fileResp.status);
        }
      } catch (err) {
        console.error("File fetch error:", err);
      }
    }

    const userMessages = messages.map((m: any, idx: number) => {
      // Attach file to the last user message
      if (idx === messages.length - 1 && m.role === "user" && fileParts.length > 0) {
        return {
          role: "user",
          content: [{ type: "text", text: m.content }, ...fileParts],
        };
      }
      return m;
    });

    const allMessages = [
      { role: "system", content: systemPrompt },
      ...(context ? [{ role: "user", content: `Context: ${JSON.stringify(context)}` }] : []),
      ...userMessages,
    ];

    const isStreaming = mode === "chat";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: allMessages,
          stream: isStreaming,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isStreaming) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("supervisor-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
