import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        // required: true
    },

    message: {
        type: String,
        required: true
    },

    isRead: {
        type: Boolean,
        default: false,
        required: true,
        index: true
    }
}, { timestamps: true })

notificationSchema.index({ userId: 1, createdAt: -1 })

export const Notification = mongoose.model("Notification", notificationSchema)