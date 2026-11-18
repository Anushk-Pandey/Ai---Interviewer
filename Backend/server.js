require("dotenv").config()
const app = require("./src/app.js")
const connectDB = require("./src/config/database.js")
// const invokeGeminiAi = require("./src/services/ai.service.js")
// const { resume, selfDescription, jobDescription } = require("./src/services/temp.js")
// const generateInterviewReport = require("./src/services/ai.service.js")

//* database connection
connectDB()

//* for testing purpose only
// invokeGeminiAi()
// generateInterviewReport({ resume, selfDescription, jobDescription })

const PORT = process.env.PORT || 3000

//* server starting
app.listen(PORT, () => {
    console.log(`Server is running on Port ${PORT}`)
})