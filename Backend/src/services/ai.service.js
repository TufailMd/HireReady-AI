const Groq = require("groq-sdk");
const { z } = require("zod");
const puppeteer = require("puppeteer");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

console.log("Groq Model:", AI_MODEL);

// Keep your existing interviewReportSchema here
const interviewReportSchema = z.object({
  matchScore: z.number().min(0).max(100),
  technicalQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),
  behavioralQuestions: z.array(
    z.object({
      question: z.string(),
      intention: z.string(),
      answer: z.string(),
    }),
  ),
  skillGaps: z.array(
    z.object({
      skill: z.string(),
      severity: z.enum(["low", "medium", "high"]),
    }),
  ),
  preparationPlan: z.array(
    z.object({
      day: z.number(),
      focus: z.string(),
      tasks: z.array(z.string()),
    }),
  ),
  title: z.string(),
});

// Reusable Groq JSON generation function
async function generateJSON(prompt, schema) {
  const response = await groq.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert AI assistant.
Return ONLY a valid JSON object.
Follow the requested JSON structure exactly.
Do not include markdown, code fences, or explanations.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: {
      type: "json_object",
    },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  const parsed = JSON.parse(content);

  // Validate generated response using Zod
  return schema.parse(parsed);
}

// Generate Interview Report
async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  console.log("Generating interview report using Groq...");

  const prompt = `
Generate a comprehensive interview report.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Job Description:
${jobDescription}

Requirements:
1. Calculate a realistic match score between 0 and 100.
2. Generate relevant technical interview questions.
3. Generate behavioral interview questions.
4. Identify missing skills and their severity.
5. Create a practical day-wise preparation plan.
6. Answers should explain important concepts and approaches.

Return JSON with exactly this structure:

{
  "matchScore": 85,
  "technicalQuestions": [
    {
      "question": "What is...",
      "intention": "Why interviewer asks this question",
      "answer": "Detailed answer"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "Tell me about yourself",
      "intention": "To understand communication skills",
      "answer": "Suggested answer"
    }
  ],
  "skillGaps": [
    {
      "skill": "System Design",
      "severity": "medium"
    }
  ],
  "preparationPlan": [
    {
      "day": 1,
      "focus": "JavaScript Fundamentals",
      "tasks": [
        "Revise closures",
        "Practice promises"
      ]
    }
  ],
  "title": "Software Developer Interview Report"
}

Ensure all fields are present and data types are correct.
`;

  return await generateJSON(prompt, interviewReportSchema);
}

// Generate PDF from HTML
async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();

  try {
    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

// Generate Tailored Resume PDF
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  console.log("Generating tailored resume using Groq...");

  const resumePdfSchema = z.object({
    html: z.string(),
  });

  const prompt = `
Generate a professional ATS-friendly resume in HTML.

Candidate Resume:
${resume}

Candidate Self Description:
${selfDescription}

Job Description:
${jobDescription}

Requirements:

1. Tailor the resume according to the job description.
2. Highlight relevant skills and experience.
3. Keep the resume between 1-2 pages.
4. Use a simple, professional design.
5. Make the HTML ATS-friendly.
6. Use clean HTML and inline CSS.
7. Do not invent experience, education, or achievements.
8. Make it look naturally human-written.
9. Return the complete HTML document.

Return JSON in this structure:

{
  "html": "<!DOCTYPE html><html><head>...</head><body>...</body></html>"
}
`;

  const result = await generateJSON(prompt, resumePdfSchema);

  const pdfBuffer = await generatePdfFromHtml(result.html);

  return pdfBuffer;
}

module.exports = {
  generateInterviewReport,
  generateResumePdf,
};
