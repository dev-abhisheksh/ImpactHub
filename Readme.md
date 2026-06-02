# 🌍 ImpactHub — Scalable & AI-Powered Sustainability Platform (API)

![Status](https://img.shields.io/badge/Status-Active%20Development-blue)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Caching%20%26%20Rate%20Limiting-red)
![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![RBAC](https://img.shields.io/badge/RBAC-Admin%20%7C%20Expert%20%7C%20User-blue)
![AI](https://img.shields.io/badge/AI-Gemini%20Moderation-purple)

A **production-grade community platform** built with **Node.js, Express, MongoDB, and Redis**, designed to crowdsource solutions for **sustainability and environmental challenges**. 

ImpactHub bridges the gap between environmental problems and expert solutions using **AI-driven moderation**, **gamified reputation systems**, and **real-time collaboration tools**.

---

## 🎯 What This Backend Demonstrates

This project is built to show **how complex community ecosystems are architected**, focusing on integrity, engagement, and performance.

It demonstrates:

- **Strict Sustainability Focus**: AI-powered content filtering to ensure the platform remains dedicated to environmental impact.
- **Expert-Driven Quality**: A verification system for experts and "Expert-Only" problem categories.
- **Advanced Gamification**: A multi-factor reputation system that drives community engagement and quality contributions.
- **Real-Time Synergy**: Seamless interaction via Socket.io for chat and instant notifications.
- **Caching Discipline**: Strategic use of Redis to handle high-traffic dashboards and search queries.
- **Defensive Backend Design**: Multi-layer validation (Schema + AI + Middleware) to prevent spam and out-of-scope content.

---

## 🚀 Core Features

### 🔐 Authentication & Security
- **OTP-Based Verification**: Secure email-based registration and password resets.
- **JWT Session Management**: Robust authentication with Access and Refresh tokens.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: System oversight, user verification, and global moderation.
  - **Expert**: Specialized access to high-priority problems and professional badge status.
  - **User**: General community participation and problem posting.

---

### 🌿 Sustainability Problem Solving
- **AI-Categorization**: Automatic assignment of problems to specific environmental categories (Water, Energy, Waste, etc.).
- **Smart Filtering**: AI prevents non-sustainability related content from being posted.
- **Image Integration**: Cloudinary-backed media support for problem documentation.
- **Targeted Reach**: Option to restrict problems to Verified Experts for high-quality technical solutions.

---

### 🏆 Gamification & Reputation
- **Reputation Engine**: Points awarded for solutions, upvotes, and community helpfulness.
- **Global Leaderboard**: Real-time ranking of top contributors.
- **Reward Redemption**: A system for users to redeem their reputation points for platform-specific perks or impact rewards.

---

### 💬 Real-Time Collaboration
- **Encrypted Messaging**: Private 1-to-1 conversations between users and experts.
- **Instant Notifications**: Real-time alerts for new solutions, votes, and expert application status.
- **Socket.io Integration**: Low-latency communication layer for an interactive user experience.

---

### 🧠 AI-Assisted Services (Gemini-Powered)

AI is integrated as a core utility layer, providing intelligent oversight across the platform.

#### AI Capabilities:
- **Automatic Tagging**: Generating relevant SEO and discovery tags for problems.
- **Solution Validation**: Checking if a solution is actually relevant to the problem before allowing submission.
- **Text Enhancement**: Helping users refine their problem statements for better clarity.
- **Out-of-Scope Detection**: Blocking off-topic content automatically.

---

### ⚡ Performance & Caching (Redis)

- **Dashboard Optimization**: Caching personal user dashboards and global problem feeds to reduce DB load.
- **Pattern-Based Invalidation**: Automatic cache clearing on data updates to ensure consistency.
- **Search Performance**: Fast retrieval of commonly searched categories and tags.
- **Graceful Fallback**: The system remains fully functional even if the Redis layer is temporarily unavailable.

---

### 🚦 Administration & Moderation
- **Expert Verification**: Admin workflow for reviewing and approving Expert applications.
- **Audit Logging**: Comprehensive tracking of admin actions for accountability.
- **Content Moderation**: Tools to report, hide, or delete problematic content.

---

## 📁 Project Structure

```text
src/
├── controllers/
│   ├── admin.controller.js           # Global oversight & verification
│   ├── auth.controller.js            # OTP, JWT, and session logic
│   ├── problem.controller.js         # AI-moderated problem lifecycle
│   ├── solution.controller.js        # Validated solution submissions
│   ├── conversation.controller.js    # Chat & messaging management
│   ├── reputation.controller.js      # Gamification & points logic
│   └── userDashboard.controller.js   # Aggregated data for user views
│
├── middlewares/
│   ├── auth.middleware.js            # JWT verification
│   ├── roles.middleware.js           # RBAC enforcement
│   └── aiModeration.middleware.js    # Content safety checks
│
├── models/                           # MongoDB Schemas
│   ├── user.model.js
│   ├── problem.model.js
│   ├── solution.model.js
│   ├── reputation.model.js
│   └── notification.model.js
│
├── services/
│   ├── ai.service.js                 # Gemini LLM integration
│   ├── reputation.service.js         # Points calculation logic
│   ├── email.service.js              # Brevo/Nodemailer integration
│   └── socket.js                     # Socket.io event handling
│
├── utils/
│   ├── redisClient.js                # Cache management
│   ├── cloudinary.js                 # Media storage
│   └── adminLogHelper.js             # Audit logging utility
│
├── app.js                            # Express configuration
└── server.js                         # Entry point & Socket.io init
```

---

## ⚙️ Environment Variables

| Variable | Description |
|--------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URL` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | JWT access token secret |
| `REFRESH_TOKEN_SECRET`| JWT refresh token secret |
| `REDIS_URL` | Redis URL (Upstash or local) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLOUDINARY_URL` | Cloudinary connection string |
| `BREVO_API_KEY` | Email service API key |

---

## 👨‍💻 Author

**Abhishek Sharma**  
Backend-focused Developer  
GitHub: [https://github.com/dev-abhisheksh](https://github.com/dev-abhisheksh)

---

⭐ Star this repo if you care about **sustainability** and **robust backend engineering**.
