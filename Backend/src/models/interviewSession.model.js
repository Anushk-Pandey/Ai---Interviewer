const mongoose = require('mongoose');

const questionSessionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["technical", "behavioral"],
        required: true
    },
    modelAnswer: {
        type: String,
        required: true
    },
    intention: {
        type: String,
        required: true
    },
    userAnswer: {
        type: String,
        default: ""
    },
    score: {
        type: Number, // 0 - 10
        min: 0,
        max: 10,
        default: null
    },
    feedback: {
        type: String,
        default: ""
    },
    suggestions: [{
        type: String
    }]
}, {
    _id: false
});

const interviewSessionSchema = new mongoose.Schema({
    interviewReport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewReport",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null
    },
    status: {
        type: String,
        enum: ["active", "completed"],
        default: "active"
    },
    currentQuestionIndex: {
        type: Number,
        default: 0
    },
    questions: [questionSessionSchema],
    overallScore: {
        type: Number, // 0 - 100
        min: 0,
        max: 100,
        default: null
    },
    technicalFeedback: {
        type: String,
        default: ""
    },
    communicationFeedback: {
        type: String,
        default: ""
    },
    strengths: [{
        type: String
    }],
    improvements: [{
        type: String
    }]
}, {
    timestamps: true
});

const interviewSessionModel = mongoose.model("InterviewSession", interviewSessionSchema);

module.exports = interviewSessionModel;
