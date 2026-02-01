import express from "express";
import dotenv from 'dotenv'
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.route.js"
import problemRouter from "./routes/problem.route.js"
import solutionRouter from "./routes/solution.route.js"
import voteRouter from "./routes/vote.route.js"
import reputationRouter from "./routes/reputation.route.js"
import notificationRouter from "./routes/notification.route.js"
import redemptionRouter from "./routes/redemption.route.js"
import userRouter from "./routes/user.route.js"
import adminRouter from "./routes/admin.route.js";
import chatRouter from "./routes/conversation.route.js"
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use("/api/v1/auth", authRouter)
app.use("/api/v1/problems", problemRouter)
app.use("/api/v1/solutions", solutionRouter)
app.use("/api/v1/votes", voteRouter)
app.use("/api/v1/reputations", reputationRouter)
app.use("/api/v1/notifications", notificationRouter)
app.use("/api/v1/redemptions", redemptionRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/admin", adminRouter)
app.use("/api/v1/chat", chatRouter)

export default app;