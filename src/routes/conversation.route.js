import express from "express"
import verifyToken from "../middlewares/auth.middleware.js";
import getMessages from "../controllers/conversation.controller.js";

const router = express.Router();

router.get("/:conversationId/messages", verifyToken, getMessages);

export default router;
