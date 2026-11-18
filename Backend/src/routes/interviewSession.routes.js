const express = require("express")
const { optionalAuth } = require("../middlewares/auth.middleware.js")
const interviewSessionController = require("../controllers/interviewSession.controller.js")

const sessionRouter = express.Router()

// Start a new session from a report (guest or logged-in)
sessionRouter.post("/start", optionalAuth, interviewSessionController.startSessionController)

// Get session state
sessionRouter.get("/:sessionId", optionalAuth, interviewSessionController.getSessionController)

// Submit answer for current question
sessionRouter.post("/:sessionId/answer", optionalAuth, interviewSessionController.submitAnswerController)

// Complete interview session and generate final performance analysis
sessionRouter.post("/:sessionId/complete", optionalAuth, interviewSessionController.completeSessionController)

module.exports = sessionRouter
