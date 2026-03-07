import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },

    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    senderRole: {
        type: String,
        enum: ["user", "expert"],
        required: true
    },

    content: {
        type: String,
        required: true
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

// Feature 4: Compound index for fast, ordered message retrieval
messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model("Message", messageSchema)