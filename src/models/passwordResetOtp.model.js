import mongoose from "mongoose";

const passwordResetOtpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
});

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetOTP = mongoose.model("PasswordResetOTP", passwordResetOtpSchema);
