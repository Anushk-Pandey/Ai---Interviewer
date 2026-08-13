const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()


//* middlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
        const isVercel = origin.endsWith(".vercel.app");
        const matchesEnv = process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/$/, "");

        if (isLocalhost || isVercel || matchesEnv) {
            return callback(null, true);
        } else {
            return callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}))


//* require all the routes here
const authRouter = require('./routes/auth.routes.js')
const interviewRouter = require("./routes/interview.routes.js")
const sessionRouter = require("./routes/interviewSession.routes.js")


//* using all the routes here
app.use("/api/auth", authRouter)
app.use("/api/interview/session", sessionRouter)
app.use("/api/interview", interviewRouter)


module.exports = app