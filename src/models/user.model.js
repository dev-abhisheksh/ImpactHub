import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            select: false,
        },

        role: {
            type: String,
            enum: ["user", "expert", "admin"],
            default: "user",
        },

        coverImage: {
            type: String,
            default: null
        },

        expertTags: {
            type: [String],
            default: [],
            index: true
        },

        reputationPoints: {
            type: Number,
            default: 0,
        },

        isExpertVerified: {
            type: Boolean,
            default: false,
        },

        authProvider: {
            type: String,
            enum: ["local", "google", "github"],
            default: "local",
        },

        providerId: {
            type: String,
        },

        refreshTokens: [
            {
                tokenHash: {
                    type: String,
                    required: true,
                },
                expiresAt: {
                    type: Date,
                    required: true,
                },
            },
        ],

        isPro: {
            type: Boolean,
            default: false
        },

        proExpiresAt: {
            type: Date,
            default: null
        }

    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
