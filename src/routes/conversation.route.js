import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import { getConversations, getMessages } from "../controllers/conversation.controller.js";

const router = express.Router();

// GET /api/v1/chat — list all conversations for the logged-in user
router.get("/", verifyToken, getConversations);

// GET /api/v1/chat/:conversationId/messages — get messages for a conversation
router.get("/:conversationId/messages", verifyToken, getMessages);

export default router;
