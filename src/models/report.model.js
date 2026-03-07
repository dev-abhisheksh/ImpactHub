import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        solutionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Solution",
            required: true,
            index: true
        },

        reportedUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        reason: {
            type: String,
            required: true,
            enum: [
                "spam",
                "low_quality",
                "plagiarism",
                "abusive",
                "irrelevant",
                "other"
            ]
        },

        description: {
            type: String,
            maxlength: 500
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true
        },

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        reviewedAt: {
            type: Date
        },

        adminNote: {
            type: String
        }

    },
    { timestamps: true }
);

reportSchema.index({ solutionId: 1, reportedBy: 1 }, { unique: true });

export const Report = mongoose.model("Report", reportSchema);