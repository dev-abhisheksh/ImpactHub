import { Server } from "socket.io";
import app from "./src/app.js";
import connectDB from "./src/utils/db.js";
import dotenv from "dotenv";
import http from "http";
import { socketAuth } from "./src/middlewares/socketAuth.middleware.js";
import { Solution } from "./src/models/solution.model.js";
import { Problem } from "./src/models/problem.model.js";
import { Conversation } from "./src/models/conversation.model.js";
import { Message } from "./src/models/message.model.js";
import { client, delRedisCache } from "./src/utils/redisClient.js";

dotenv.config();
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

socketAuth(io);

io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} | user: ${socket.user._id}`);

    socket.on("start-conversation", async ({ problemId, solutionId }) => {
        try {
            console.log(`📩 start-conversation | problemId: ${problemId} | solutionId: ${solutionId}`);
            const userId = socket.user._id;

            const problem = await Problem.findOne({ _id: problemId, isDeleted: false });
            if (!problem) { console.log("❌ Problem not found"); return; }
            if (problem.status === "closed") { console.log("❌ Problem is closed"); return; }

            const solution = await Solution.findById(solutionId);
            if (!solution) { console.log("❌ Solution not found"); return; }
            if (solution.problemId.toString() !== problemId) { console.log("❌ Solution doesn't belong to problem"); return; }

            if (!solution.isAccepted) { console.log("❌ Solution is NOT accepted"); return; }

            if (
                problem.createdBy.toString() !== userId &&
                solution.answeredBy.toString() !== userId
            ) { console.log("❌ User is neither problem owner nor solution provider"); return; }

            const conversation = await Conversation.findOneAndUpdate(
                { problemId, solutionId },
                {
                    $setOnInsert: {
                        userId: problem.createdBy,
                        expertId: solution.answeredBy
                    }
                },
                { upsert: true, new: true }
            );

            await delRedisCache(client, [
                `conversations:${problem.createdBy}`,
                `conversations:${solution.answeredBy}`
            ]);

            socket.join(conversation._id.toString());
            socket.emit("conversation-started", conversation);
            console.log(`✅ conversation-started | conversationId: ${conversation._id}`);
        } catch (err) {
            console.error("💥 start-conversation error:", err);
        }
    });

    socket.on("send-message", async ({ conversationId, content }) => {
        try {
            const userId = socket.user._id;

            const convo = await Conversation.findById(conversationId);
            if (!convo || convo.status !== "open") return;

            if (
                convo.userId.toString() !== userId &&
                convo.expertId.toString() !== userId
            ) return;

            const message = await Message.create({
                conversationId,
                senderId: userId,
                senderRole: convo.expertId.toString() === userId ? "expert" : "user",
                content
            });

            await delRedisCache(client, [
                `conversations:${convo.userId}`,
                `conversations:${convo.expertId}`
            ]);

            io.to(conversationId).emit("new-message", message);
        } catch (err) {
            console.error("💥 send-message error:", err);
        }
    });

    socket.on("disconnect", (reason) => {
        console.log(`🔌 Socket disconnected: ${socket.id} | reason: ${reason}`);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
