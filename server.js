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

dotenv.config();
connectDB();

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

socketAuth(io);

io.on("connection", (socket) => {
    socket.on("start-conversation", async ({ problemId, solutionId }) => {
        const userId = socket.user._id;

        const problem = await Problem.findOne({ _id: problemId, isDeleted: false });
        if (!problem || problem.status === "closed") return;

        const solution = await Solution.findById(solutionId);
        if (!solution || solution.problemId.toString() !== problemId) return;

        if (
            problem.createdBy.toString() !== userId &&
            solution.answeredBy.toString() !== userId
        ) return;

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

        socket.join(conversation._id.toString());
        socket.emit("conversation-started", conversation);
    });

    socket.on("send-message", async ({ conversationId, content }) => {
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

        io.to(conversationId).emit("new-message", message);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
