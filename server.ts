import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy initializer for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Full-stack server API endpoints
app.post("/api/ai/coach", async (req, res) => {
  try {
    const { history, todayRecord, streak, maxStreak } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({
        error: "Gemini API Key is not configured on the server. Please add your GEMINI_API_KEY in the Secrets panel."
      });
    }

    const ai = getAI();

    // Prepare contextual data for the prompt
    const historySummary = Object.entries(history || {})
      .map(([date, record]: [string, any]) => {
        const completed = record.tasks.filter((t: any) => t.status === "completed").map((t: any) => t.name).join(", ");
        const incomplete = record.tasks.filter((t: any) => t.status !== "completed").map((t: any) => t.name).join(", ");
        const targetText = record.targetCount ? ` Target: ${record.targetCount} tasks.` : "";
        const goalsText = record.dailyGoalsText ? ` Focus Goals: [${record.dailyGoalsText}].` : "";
        return `- Date: ${date}, Completion: ${record.completionRate}%, Active Work Time: ${(record.studyTime / (1000 * 60 * 60)).toFixed(2)} hrs.${targetText}${goalsText} Completed: [${completed}]. Missed: [${incomplete}].`;
      })
      .slice(-15) // Limit context to last 15 days to save tokens and keep latency low
      .join("\n");

    const todaySummary = todayRecord
      ? `Today's Date: ${todayRecord.date}. 
         Today's Ambition/Target task count: ${todayRecord.targetCount || "Not set"}.
         Today's Focus Goals: [${todayRecord.dailyGoalsText || "None set"}].
         Tasks completed so far: ${todayRecord.tasks.filter((t: any) => t.status === "completed").map((t: any) => t.name).join(", ") || "None"}. Active work time: ${(todayRecord.studyTime / (1000 * 60 * 60)).toFixed(2)} hrs.`
      : "No data logged yet today.";

    const promptText = `
You are "GrindStreaks Coach", a strict, encouraging, data-driven AI assistant styled after Google's high-productivity design culture.
Your job is to analyze this student/developer's study and habit tracking log and provide deep, professional recommendations, comments, and actionable guidelines.
Do not use flashy metaphors, stay minimalist, polite, and precise.

Here is the tracking history of the user (past 15 days):
${historySummary || "No previous history logged yet."}

Current status:
${todaySummary}
Current Streak: ${streak} Days
Longest Streak: ${maxStreak} Days

Task categories available: DSA, Web, CAT, Certificates, Routine, Custom.
CRITICAL CONSTRAINT: You MUST completely ignore and exclude "Routine" tasks (like "Nap", "Wake Up", "Breakfast", etc.) when evaluating study hours, study consistency, or academic averages. "Routine" tasks do NOT contribute to study goals and must never inflate study-time totals, focus averages, or academic consistency metrics.

Please analyze:
1. Progress and hours spent on study categories (specifically Web Dev, DSA, and CAT Preparation).
2. Patterns in their tracking (consistency, best hours, weekday efficiency, excluding Routine blocks).
3. Identify which habits/tasks they are neglecting.
4. Synthesize a neat productivity assessment.

You must output exactly a JSON object matching this schema:
{
  "recommendations": "markdown string of comprehensive coaching analysis, specific guidelines, feedback, and tips (around 3 brief paragraphs). Stay realistic and encouraging.",
  "highlights": ["bulleted string 1", "bulleted string 2", "bulleted string 3", "bulleted string 4"],
  "guideline": "One clear, impactful headline of advice for consistency today."
}

Ensure the highlights contain interesting, computed data-driven metrics in human language like:
- "You studied X hours this month."
- "Your most productive weekday was Tuesday."
- "You completed Web Development 100% of the time."
- "Your average study block is around 2.1 hours."
(Make up or estimate these statistics intelligently based on the real tracking history provided above, or fallback gracefully if history is limited. Let the highlights feel extremely custom and real to their logged logs!)
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            guideline: { type: Type.STRING },
          },
          required: ["recommendations", "highlights", "guideline"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Received empty response from Gemini API");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("AI Coach error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating insights." });
  }
});

app.get("/api/ai/quote", async (req, res) => {
  try {
    const name = req.query.name as string || "high-performer";
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ quote: "Your limitation—it's only your imagination. Make today count." });
    }

    const ai = getAI();
    const promptText = `Generate a single, short, powerful, minimalist motivational quote for a student/developer named "${name}" who is starting their day. Keep it under 15 words, clean, and deeply inspiring. Avoid cliché phrases. Do not put quotation marks around the response.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
    });

    const quote = response.text?.trim() || "Great things never come from comfort zones.";
    res.json({ quote });
  } catch (error: any) {
    console.error("Quote API error:", error);
    res.json({ quote: "Great things never come from comfort zones. Let's build today!" });
  }
});

// Serve frontend assets using Vite middleware or express static
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
