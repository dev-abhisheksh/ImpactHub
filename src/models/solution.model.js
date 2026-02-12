import mongoose from "mongoose";

const solutionSchema = new mongoose.Schema({
    answer: {
        type: String,
        required: true,
        trim: true
    },

    problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        required: true,
        // index: true
    },

    answeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    isAccepted: {
        type: Boolean,
        default: false
    },

    isEdited: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    votes: {
        upvotes: {
            type: Number,
            default: 0
        }
    }
}, { timestamps: true });

solutionSchema.index(
    { problemId: 1, answeredBy: 1 },
    { unique: true }
)

solutionSchema.index(
    { problemId: 1 },
    { unique: true, partialFilterExpression: { isAccepted: true } }
);

export const Solution = mongoose.model("Solution", solutionSchema);
