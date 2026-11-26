const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


const interviewReportSchema = z.object({
    title: z.string().describe("The job title of the position this interview report is for, e.g. 'Junior Full Stack Developer'"),
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate a detailed interview preparation report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        Requirements for each field:
                        - title: the job title of the target position.
                        - matchScore: a number from 0 to 100 showing how well the candidate's profile matches the job description.
                        - technicalQuestions: at least 8 questions specific to the skills in the job description and the candidate's resume. For each, give the question, the interviewer's intention, and a detailed answer approach covering the key points to mention.
                        - behavioralQuestions: at least 5 questions. For each, give the question, the interviewer's intention, and a structured answer approach (situation, action, result), using examples from the candidate's own experience where possible.
                        - skillGaps: every important skill from the job description that is missing or weak in the resume, each with a severity of low, medium or high.
                        - preparationPlan: a 7-day plan. Each day needs a focus and a list of concrete tasks (topics to revise, problems to solve, projects to improve, mock interviews).

                        Base everything on the candidate's actual resume and the job description. Do not invent experience the candidate does not have.
                        `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    })
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

                        The response must be a JSON object with a single field "html", which contains the complete HTML (with inline CSS) of the resume, ready to be converted to PDF using Puppeteer.

                        Guidelines:
                        - Tailor the resume to the given job description and highlight the candidate's strengths and the experience most relevant to it.
                        - The content should read like a real human-written resume, not like AI-generated text.
                        - Keep the design simple and professional. You can use subtle colors or font styles for headings, but nothing flashy.
                        - Make it ATS friendly: use a single-column layout, standard section headings (Summary, Skills, Experience, Projects, Education), real text rather than images, and no tables for layout.
                        - Keep it to 1 to 2 pages when printed on A4. Focus on quality over quantity, and include only information that increases the candidate's chances of getting an interview call for this job.
                        - Use only the experience, skills, projects and education present in the candidate's resume and self description. Do not invent employers, dates, numbers or achievements.
                        `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: z.toJSONSchema(resumePdfSchema),
        }
    })


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }