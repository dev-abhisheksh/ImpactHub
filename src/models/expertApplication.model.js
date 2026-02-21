import mongoose from "mongoose"

const expertApplicationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    bio: {
        type: String,
        required: true
    },

    experience: {
        type: Number
    },

    expertCategories: [
        {
            type: String,
            required: true
        }
    ],

    portfolioLink: {
        type: String
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

}, { timestamps: true })

expertApplicationSchema.index(
    { userId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "pending" }
    }
);

export const ExpertApplication = mongoose.model("ExpertApplication", expertApplicationSchema);