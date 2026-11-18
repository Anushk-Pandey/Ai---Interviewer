const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service.js")
const interviewReportModel = require("../models/interviewReport.model.js")

// /**
//  * @description Controller to generate interview report based on user self description, resume and job description.
//  */
async function generateInterViewReportController(req, res) {
    try {
        // Required body fields
        const { selfDescription, jobDescription } = req.body
        if (!jobDescription) {
            return res.status(400).json({
                message: "jobDescription is required"
            })
        }

        const hasResume = req.file && req.file.buffer
        const hasSelfDesc = selfDescription && selfDescription.trim() !== ""

        if (!hasResume && !hasSelfDesc) {
            return res.status(400).json({
                message: "Either resume PDF file or selfDescription is required"
            })
        }

        // Safely parse PDF if uploaded
        let resumeText = ""
        if (hasResume) {
            let resumeContent
            try {
                resumeContent = await pdfParse(req.file.buffer)
                resumeText = resumeContent.text || ""
            } catch (pdfErr) {
                console.error("PDF parse failed:", pdfErr.message)
                return res.status(400).json({ message: "Failed to parse PDF. Please upload a valid PDF file." })
            }

            if (!resumeText && !hasSelfDesc) {
                return res.status(400).json({ message: "PDF appears to be empty or unreadable" })
            }
        }

        // Safely call AI
        let interViewReportByAi
        try {
            interViewReportByAi = await generateInterviewReport({
                resume: resumeText,
                selfDescription: selfDescription || "",
                jobDescription
            })
        } catch (aiErr) {
            console.error("AI generation failed:", aiErr.message)
            return res.status(502).json({ message: "AI service failed. Please try again later." })
        }

        // Save report (with user ID if logged in, null if guest)
        let interviewReport
        try {
            interviewReport = await interviewReportModel.create({
                user: req.user ? req.user.id : null,
                resume: resumeText,
                selfDescription: selfDescription || "",
                jobDescription,
                ...interViewReportByAi
            })
        } catch (dbErr) {
            console.error("DB save failed:", dbErr.message)
            return res.status(500).json({ message: "Failed to save interview report" })
        }

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (err) {
        console.error("Unexpected error in generateInterViewReportController:", err)
        res.status(500).json({ message: "Internal server error: " + err.message })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    if (!req.user || !req.user.id) {
        return res.status(200).json({
            message: "Guest user - no saved reports.",
            interviewReports: []
        })
    }

    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


// /**
//  * @description Controller to generate resume PDF based on user self description, resume and job description.
//  */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        const interviewReport = await interviewReportModel.findById(interviewReportId)

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })

        res.send(pdfBuffer)
    } catch (err) {
        console.error("Error generating resume PDF:", err)
        res.status(500).json({ message: "Failed to generate resume PDF: " + err.message })
    }
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }