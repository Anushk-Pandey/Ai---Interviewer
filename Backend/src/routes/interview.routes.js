const express = require("express")
const { authUser, optionalAuth } = require("../middlewares/auth.middleware.js")
const interviewController = require("../controllers/interview.controller.js")
const upload = require("../middlewares/file.middleware.js")

const interviewRouter = express.Router()

/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description, resume pdf and job description.
 * @access public / optional auth (saves user ID if logged in)
 */
interviewRouter.post("/", optionalAuth, upload.single("resume"), interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access public / optional auth
 */
interviewRouter.get("/report/:interviewId", optionalAuth, interviewController.getInterviewReportByIdController)


/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access optional auth (returns user reports if logged in, empty array for guests)
 */
interviewRouter.get("/", optionalAuth, interviewController.getAllInterviewReportsController)


/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access public / optional auth
 */
interviewRouter.post("/resume/pdf/:interviewReportId", optionalAuth, interviewController.generateResumePdfController)



module.exports = interviewRouter