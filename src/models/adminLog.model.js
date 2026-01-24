// models/adminLog.model.js
import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        action: {
            type: String,
            required: true,
            index: true
        },

        entityType: {
            type: String,
            required: true,
            index: true
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

adminLogSchema.index({ entityType: 1, entityId: 1 });

export const AdminLog = mongoose.model("AdminLog", adminLogSchema);
