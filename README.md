# 🤖 Gen AI Interview Coach

[![React](https://img.shields.io/badge/React-19-blue.svg?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?logo=nodedotjs)](https://nodejs.org/)
[![Groq SDK](https://img.shields.io/badge/Groq%20Cloud-Llama%203.3-orange.svg)](https://groq.com/)

An AI-powered preparation platform that helps you parse your resume, compare it against a target job description, generate a day-wise learning roadmap, and practice mock interviews with real-time feedback.

---

## ✨ Features

*   **🔍 JD Match Score & Gaps:** Automatically calculates a match percentage and highlights missing skills.
*   **📅 Day-Wise Study Roadmap:** Generates a custom step-by-step prep calendar.
*   **🎙️ Interactive Mock Interview:** Practice tailored tech/behavioral questions with instant scoring (0-10) and feedback.
*   **📄 AI-Tailored Resume PDF:** Tailors your resume for the job description and builds a professional PDF.
*   **📊 Final Performance Report:** Provides an overall rating, communication assessment, key strengths, and improvements.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** (local or Atlas)
- **Groq API Key** (from [console.groq.com](https://console.groq.com/))

### 2. Run Backend
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory:
```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:5173
```
Start server:
```bash
npm run dev
```

### 3. Run Frontend
```bash
cd ../Frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Endpoints

- **Auth (`/api/auth`):** `/register` (POST) | `/login` (POST) | `/logout` (GET) | `/get-me` (GET)
- **Interview (`/api/interview`):** `/` (POST - create plan) | `/report/:id` (GET) | `/resume/pdf/:id` (POST)
- **Session (`/api/interview/session`):** `/start` (POST) | `/:id/answer` (POST) | `/:id/complete` (POST)
