import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (
            !conversation ||
            ![conversation.userId.toString(), conversation.expertId.toString()]
                .includes(req.user._id)
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const messages = await Message.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 })
            .limit(50);

        return res.status(200).json(messages);
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch messages" });
    }
};

export default getMessages;
