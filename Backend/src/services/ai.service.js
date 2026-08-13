// const { GoogleGenAI } = require("@google/genai")
const Groq = require("groq-sdk")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

// const ai = new GoogleGenAI({
//     apiKey: process.env.GOOGLE_GENAI_API_KEY
// })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them").min(5, "At least 5 technical questions are required"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them").min(5, "At least 5 behavioral questions are required"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})


async function generateInterviewReport({ resume, selfDescription, jobDescription }, retries = 2) {
    try {

        const prompt = `
Generate a COMPLETE interview report in STRICT JSON format.
MATCH SCORE INSTRUCTION:
- Calculate matchScore (0–100) based on:
  - Skills match (40%)
  - Project/experience relevance (25%)
  - Tools & technologies match (15%)
  - Problem-solving & concepts (10%)
  - Communication (from self description) (10%)

- If candidate strongly matches most required skills → 80–100
- Partial match → 50–79
- Weak match → below 50

- Do NOT give random scores
- Justify score internally before assigning final number
- Return ONLY a number (no explanation)

IMPORTANT RULES:
- Do NOT return empty arrays
- Generate at least:
  - 8 technicalQuestions
  - 8 behavioralQuestions
  - 5 skillGaps
  - 7 preparationPlan entries

technicalQuestions format:
[
  {
    "question": "...",
    "intention": "...",
    "answer": "..."
  }
]

behavioralQuestions same format

skillGaps:
[
  {
    "skill": "...",
    "severity": "low | medium | high"
  }
]

preparationPlan:
[
  {
    "day": 1,
    "focus": "...",
    "tasks": ["...", "..."]
  }
]

Also include:
- matchScore (0-100)
- title (job title)

Return ONLY JSON. No explanation.

Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}
`;

        // const response = await ai.models.generateContent({
        //     model: "gemini-2.0-flash",
        //     contents: prompt,
        //     config: {
        //         responseMimeType: "application/json",
        //         responseSchema: zodToJsonSchema(interviewReportSchema),
        //     }
        // });

        // const raw = JSON.parse(response.candidates[0].content.parts[0].text);
        // const raw = JSON.parse(response.text);
        // console.log("RAW AI RESPONSE:", JSON.stringify(raw, null, 2))

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert interview coach. Always respond with valid JSON only. No markdown, no explanation, no backticks."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 4000,
        });

        const raw = JSON.parse(response.choices[0].message.content);
        // console.log("RAW AI RESPONSE:", JSON.stringify(raw, null, 2));
        const parsed = interviewReportSchema.safeParse(raw);

        // if (!parsed.success) throw new Error("Invalid AI response");

        if (!parsed.success) {
            console.error("Zod validation failed:", parsed.error.issues);
            throw new Error("Invalid AI response");
        }

        return parsed.data;

    } catch (err) {
        if (retries === 0) throw err;
        console.log("Retrying AI...");
        return generateInterviewReport({ resume, selfDescription, jobDescription }, retries - 1);
    }
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    // const response = await ai.models.generateContent({
    //     model: "gemini-2.0-flash",
    //     contents: prompt,
    //     config: {
    //         responseMimeType: "application/json",
    //         responseSchema: zodToJsonSchema(resumePdfSchema),
    //     }
    // })


    // const jsonContent = JSON.parse(response.text)

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
            {
                role: "system",
                content: "You are a professional resume writer. Return only valid JSON with an html field. No markdown, no backticks."
            },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 4000,
    })

    const jsonContent = JSON.parse(response.choices[0].message.content)
    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

const answerEvaluationSchema = z.object({
    score: z.number().min(0).max(10).describe("Score out of 10 for the user's answer, based on correctness, depth, and relevance"),
    feedback: z.string().describe("Constructive feedback identifying strengths and gaps in their answer"),
    suggestions: z.array(z.string()).describe("Actionable advice on how to improve this answer or what they missed").min(1)
})

async function evaluateAnswer({ question, modelAnswer, userAnswer, jobDescription }, retries = 2) {
    try {
        const prompt = `
Evaluate the candidate's answer to the following interview question.

Question: ${question}
Expected/Model Answer: ${modelAnswer}
Candidate's Answer: ${userAnswer}
Target Job Description: ${jobDescription}

You MUST return a JSON object with the following structure:
{
  "score": <number from 0 to 10>,
  "feedback": "<detailed constructive feedback text>",
  "suggestions": [
    "<actionable suggestion 1>",
    "<actionable suggestion 2>"
  ]
}

Assess how well the candidate's answer compares to the model answer, and if they addressed the requirements in the job description.
Return ONLY valid JSON. No explanations, no backticks, no markdown.
`;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert interviewer and assessor. Evaluate the candidate's answer and return only a JSON object matching the requested schema. No explanation, no backticks, no markdown."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
            max_tokens: 2000,
        });

        const raw = JSON.parse(response.choices[0].message.content);
        const parsed = answerEvaluationSchema.safeParse(raw);

        if (!parsed.success) {
            console.error("Zod validation failed for answer evaluation:", parsed.error.issues);
            throw new Error("Invalid AI response");
        }

        return parsed.data;
    } catch (err) {
        if (retries === 0) throw err;
        console.log("Retrying evaluateAnswer AI...");
        return evaluateAnswer({ question, modelAnswer, userAnswer, jobDescription }, retries - 1);
    }
}

const sessionFeedbackSchema = z.object({
    overallScore: z.number().min(0).max(100).describe("Overall score (0-100) representing their performance across the entire interview session"),
    technicalFeedback: z.string().describe("A professional critique of their technical depth, correctness, and problem-solving skills demonstrated"),
    communicationFeedback: z.string().describe("A professional critique of their clarity, structure, articulation, and professional tone"),
    strengths: z.array(z.string()).describe("3-5 key strengths demonstrated by the candidate during the interview").min(2),
    improvements: z.array(z.string()).describe("3-5 actionable areas of improvement where the candidate needs to work").min(2)
})

async function generateOverallSessionFeedback({ questions, jobDescription }, retries = 2) {
    try {
        const questionsSummary = questions.map((q, idx) => {
            return `Question ${idx + 1}: ${q.question}
Type: ${q.type}
Candidate's Answer: ${q.userAnswer || "N/A"}
Score: ${q.score}/10
Feedback: ${q.feedback}
Suggestions: ${q.suggestions.join(", ")}
------------------------------------`;
        }).join("\n");

        const prompt = `
Analyze the candidate's performance across the entire mock interview session and generate a comprehensive evaluation.

Target Job Description: ${jobDescription}

Questions, Answers, and Evaluations:
${questionsSummary}

You MUST return a JSON object with the following structure:
{
  "overallScore": <number from 0 to 100 representing the composite score percentage>,
  "technicalFeedback": "<detailed analysis of their technical depth, correctness, and problem-solving>",
  "communicationFeedback": "<detailed critique of their articulation, clarity, structure, and professional tone>",
  "strengths": [
    "<key strength 1>",
    "<key strength 2>",
    "<key strength 3>"
  ],
  "improvements": [
    "<actionable improvement area 1>",
    "<actionable improvement area 2>",
    "<actionable improvement area 3>"
  ]
}

Write clear, detailed, and professional feedback.
Return ONLY valid JSON. No explanations, no backticks, no markdown.
`;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert director of talent acquisition. Generate a detailed, high-quality final interview assessment and return only a JSON object matching the requested schema. No explanation, no backticks, no markdown."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.5,
            max_tokens: 3000,
        });

        const raw = JSON.parse(response.choices[0].message.content);
        const parsed = sessionFeedbackSchema.safeParse(raw);

        if (!parsed.success) {
            console.error("Zod validation failed for overall feedback:", parsed.error.issues);
            throw new Error("Invalid AI response");
        }

        return parsed.data;
    } catch (err) {
        if (retries === 0) throw err;
        console.log("Retrying generateOverallSessionFeedback AI...");
        return generateOverallSessionFeedback({ questions, jobDescription }, retries - 1);
    }
}

module.exports = { generateInterviewReport, generateResumePdf, evaluateAnswer, generateOverallSessionFeedback }