const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware.js")
const interviewSessionController = require("../controllers/interviewSession.controller.js")

const sessionRouter = express.Router()

// Start a new session from a report
sessionRouter.post("/start", authMiddleware.authUser, interviewSessionController.startSessionController)

// Get session state
sessionRouter.get("/:sessionId", authMiddleware.authUser, interviewSessionController.getSessionController)

// Submit answer for current question
sessionRouter.post("/:sessionId/answer", authMiddleware.authUser, interviewSessionController.submitAnswerController)

// Complete interview session and generate final performance analysis
sessionRouter.post("/:sessionId/complete", authMiddleware.authUser, interviewSessionController.completeSessionController)

module.exports = sessionRouter
