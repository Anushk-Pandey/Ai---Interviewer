const interviewSessionModel = require("../models/interviewSession.model.js")
const interviewReportModel = require("../models/interviewReport.model.js")
const { evaluateAnswer, generateOverallSessionFeedback } = require("../services/ai.service.js")

/**
 * @description Controller to start a new interview session based on a prep plan
 */
async function startSessionController(req, res) {
    try {
        const { reportId } = req.body
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized: user not found" })
        }
        if (!reportId) {
            return res.status(400).json({ message: "reportId is required" })
        }

        const report = await interviewReportModel.findOne({ _id: reportId, user: req.user.id })
        if (!report) {
            return res.status(404).json({ message: "Interview plan report not found" })
        }

        // Take a subset of questions (e.g., 3 technical and 3 behavioral) for the live mock interview
        const techQs = report.technicalQuestions.slice(0, 3).map(q => ({
            question: q.question,
            type: "technical",
            modelAnswer: q.answer,
            intention: q.intention,
            userAnswer: ""
        }))

        const behQs = report.behavioralQuestions.slice(0, 3).map(q => ({
            question: q.question,
            type: "behavioral",
            modelAnswer: q.answer,
            intention: q.intention,
            userAnswer: ""
        }))

        const questions = [...techQs, ...behQs]

        if (questions.length === 0) {
            return res.status(400).json({ message: "No questions found in this prep plan to start an interview" })
        }

        const session = await interviewSessionModel.create({
            interviewReport: report._id,
            user: req.user.id,
            status: "active",
            currentQuestionIndex: 0,
            questions
        })

        res.status(201).json({
            message: "Interview session started successfully",
            session
        })

    } catch (err) {
        console.error("Error in startSessionController:", err)
        res.status(500).json({ message: "Internal server error: " + err.message })
    }
}

/**
 * @description Controller to get an interview session by ID
 */
async function getSessionController(req, res) {
    try {
        const { sessionId } = req.params
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized: user not found" })
        }

        const session = await interviewSessionModel.findOne({ _id: sessionId, user: req.user.id })
            .populate("interviewReport", "title jobDescription")
        if (!session) {
            return res.status(404).json({ message: "Interview session not found" })
        }

        res.status(200).json({
            message: "Interview session fetched successfully",
            session
        })

    } catch (err) {
        console.error("Error in getSessionController:", err)
        res.status(500).json({ message: "Internal server error: " + err.message })
    }
}

/**
 * @description Controller to submit an answer for the current question in the session
 */
async function submitAnswerController(req, res) {
    try {
        const { sessionId } = req.params
        const { userAnswer } = req.body

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if (userAnswer === undefined || userAnswer === null) {
            return res.status(400).json({ message: "userAnswer is required" })
        }

        const session = await interviewSessionModel.findOne({ _id: sessionId, user: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Interview session not found" })
        }

        if (session.status !== "active") {
            return res.status(400).json({ message: "This interview session has already been completed" })
        }

        const currentIdx = session.currentQuestionIndex
        if (currentIdx >= session.questions.length) {
            return res.status(400).json({ message: "All questions in this session have already been answered" })
        }

        const currentQuestion = session.questions[currentIdx]

        // Fetch report to get job description context for AI
        const report = await interviewReportModel.findById(session.interviewReport)
        const jobDescription = report ? report.jobDescription : ""

        // Evaluate answer using Groq AI
        let evaluation
        try {
            evaluation = await evaluateAnswer({
                question: currentQuestion.question,
                modelAnswer: currentQuestion.modelAnswer,
                userAnswer: userAnswer || "Candidate gave no response.",
                jobDescription
            })
        } catch (aiErr) {
            console.error("AI Evaluation failed:", aiErr)
            return res.status(502).json({ message: "Failed to evaluate answer using AI. Please try again." })
        }

        // Update current question results
        currentQuestion.userAnswer = userAnswer
        currentQuestion.score = evaluation.score
        currentQuestion.feedback = evaluation.feedback
        currentQuestion.suggestions = evaluation.suggestions

        // Advance to next question index
        session.currentQuestionIndex += 1
        await session.save()

        res.status(200).json({
            message: "Answer submitted and evaluated successfully",
            evaluation,
            currentQuestionIndex: session.currentQuestionIndex,
            totalQuestions: session.questions.length
        })

    } catch (err) {
        console.error("Error in submitAnswerController:", err)
        res.status(500).json({ message: "Internal server error: " + err.message })
    }
}

/**
 * @description Controller to finish the session and generate overall feedback
 */
async function completeSessionController(req, res) {
    try {
        const { sessionId } = req.params
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const session = await interviewSessionModel.findOne({ _id: sessionId, user: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Interview session not found" })
        }

        // If already completed, just return the completed session
        if (session.status === "completed") {
            return res.status(200).json({
                message: "Interview session is already completed",
                session
            })
        }

        // Fetch report for context
        const report = await interviewReportModel.findById(session.interviewReport)
        const jobDescription = report ? report.jobDescription : ""

        // Generate overall performance evaluation
        let finalFeedback
        try {
            finalFeedback = await generateOverallSessionFeedback({
                questions: session.questions,
                jobDescription
            })
        } catch (aiErr) {
            console.error("Final AI feedback generation failed:", aiErr)
            return res.status(502).json({ message: "Failed to generate overall report using AI. Please try again." })
        }

        // Update overall session properties
        session.status = "completed"
        session.overallScore = finalFeedback.overallScore
        session.technicalFeedback = finalFeedback.technicalFeedback
        session.communicationFeedback = finalFeedback.communicationFeedback
        session.strengths = finalFeedback.strengths
        session.improvements = finalFeedback.improvements

        await session.save()

        res.status(200).json({
            message: "Interview session completed successfully",
            session
        })

    } catch (err) {
        console.error("Error in completeSessionController:", err)
        res.status(500).json({ message: "Internal server error: " + err.message })
    }
}

module.exports = {
    startSessionController,
    getSessionController,
    submitAnswerController,
    completeSessionController
}
