const fetch = require("node-fetch");
const db = require("../db");

// ── Knowledge base (same as in the standalone chatbot) ──
const KNOWLEDGE_BASE = `
# UMaT School of Postgraduate Studies (SPS) — Knowledge Base
Source: https://sps.umat.edu.gh/

## About the School
The School of Postgraduate Studies (SPS) runs MSc/MPhil and PhD programmes in Geomatic, Geological, Mining and Minerals Engineering and Mathematics and MPhil/MSc programmes in Mechanical, Electrical and Electronic, and Petroleum Engineering.

## Contact Information
- Office line: 0332092695
- WhatsApp & SMS: 0593134347
- Working Hours: Monday – Friday, 8:00 am – 5:00 pm
- Address: School of Postgraduate Studies, University Of Mines and Technology, Post Office Box 237, Tarkwa – Ghana

## Degrees Awarded
- Postgraduate Diploma (PgD)
- Master of Science (MSc)
- Master of Philosophy (MPhil)
- Doctor of Philosophy (PhD)

## Study Duration
- Full-time Master's: max 24 months
- Full-time Doctorate: max 36 months
- Part-time Master's: max 36 months
- Part-time Doctorate: max 48 months

## Available Programmes
PhD/MPhil/MSc in: Geomatic Engineering, Geological Engineering, Mining Engineering, Minerals Engineering, Petroleum Engineering, Mechanical Engineering, Electrical & Electronic Engineering, Computer Science and Engineering, Mathematics, Petroleum Refining and Petrochemical Engineering, Environmental Engineering, Occupational Health and Safety

D. Eng. in: Geological, Mining, Minerals, Petroleum, Electrical & Electronic Engineering

Executive Certificates: Mining Technology, Gold Extraction Technology

## How to Apply
International applicants: Fill form at https://admissions.umat.edu.gh/addapps/postgrad/intapp.php
Deadlines: 15th May (July Admission), 30th November (January Admission)

## About the Support System
This system helps students with: Course registration, Thesis upload, Results, Financial status, Document requests, Exam timetable, Clearance tracking, AI chatbot assistance.
`;

const SYSTEM_PROMPT = `You are the UMaT SPS Assistant — a helpful chatbot for postgraduate students.
Answer questions about admissions, programmes, fees, registration, seminars, and the support system.
Be concise, professional, and use markdown. If unsure, suggest contacting the SPS office.
${KNOWLEDGE_BASE}`;

const buildSupervisorPrompt = (students) => {
  let studentContext = "";
  if (students && students.length > 0) {
    studentContext = `

## Your Assigned Students (live data)
${students.map((s, i) =>
  `${i + 1}. ${s.name} | Index: ${s.index_number} | Programme: ${s.program_name || "N/A"} | Department: ${s.department_name || "N/A"} | Thesis: ${s.thesis_title || "Not submitted"} | Thesis Status: ${s.thesis_status || "None"} | Assigned: ${s.assigned_at ? new Date(s.assigned_at).toLocaleDateString() : "N/A"}`
).join("\n")}

When asked about your students, use ONLY the above data. Do not invent or assume any details.`;
  } else {
    studentContext = "\n\nYou currently have no assigned students in the system.";
  }
  return `You are an AI assistant for thesis supervisors at the University of Mines and Technology (UMaT), School of Postgraduate Studies.
Help supervisors with: thesis evaluation criteria, writing constructive feedback, tracking student progress, formatting guidelines, handling milestone delays, and best practices in postgraduate supervision.
Be professional, concise, and practical.${studentContext}`;
};

// POST /api/chatbot/chat
exports.chat = async (req, res) => {
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: "AI service not configured" });

  try {
    const { messages, mode } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: "messages array is required" });

    let systemPrompt = SYSTEM_PROMPT;
    if (mode === "supervisor") {
      let students = [];
      try {
        const userId = req.user?.id;
        console.log(`[Chatbot] supervisor mode — user_id: ${userId}`);
        if (userId) {
          const supRes = await db.query("SELECT id FROM supervisors WHERE user_id = $1", [userId]);
          console.log(`[Chatbot] supervisor record:`, JSON.stringify(supRes.rows));
          if (supRes.rows.length > 0) {
            const supId = supRes.rows[0].id;
            const stuRes = await db.query(
              `SELECT s.id, CONCAT(u.first_name, ' ', u.last_name) AS name,
                      s.index_number, p.name AS program_name, d.name AS department_name,
                      ss.assigned_at,
                      ts.title AS thesis_title, ts.status AS thesis_status
               FROM student_supervisors ss
               JOIN students s ON ss.student_id = s.id
               JOIN users u ON s.user_id = u.id
               LEFT JOIN programs p ON s.program_id = p.id
               LEFT JOIN departments d ON s.department_id = d.id
               LEFT JOIN LATERAL (
                 SELECT title, status FROM thesis_submissions
                 WHERE student_id = s.id ORDER BY submitted_at DESC LIMIT 1
               ) ts ON true
               WHERE ss.supervisor_id = $1
               ORDER BY u.last_name`,
              [supId]
            );
            students = stuRes.rows;
            console.log(`[Chatbot] fetched ${students.length} students:`, students.map(s => s.name));
          }
        }
      } catch (dbErr) {
        console.error("[Chatbot] Failed to fetch supervisor students:", dbErr.message);
      }
      systemPrompt = buildSupervisorPrompt(students);
    }
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
    const groqRes = await fetch(groqUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      const status = groqRes.status;
      console.error(`[Groq] ${status} error:`, JSON.stringify(err));
      if (status === 429) return res.status(429).json({ error: "Rate limit exceeded" });
      return res.status(500).json({ error: err?.error?.message || "AI service error" });
    }

    // Groq uses OpenAI SSE format natively — pipe directly
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    groqRes.body.pipe(res);
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: err.message });
  }
};
