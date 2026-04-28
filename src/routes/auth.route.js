import express from "express";
import { loginWithPassword, logoutUser, refreshAccessToken, registerExpert, registerUser, verifyOTP, forgotPassword, verifyResetOTP, resetPassword } from "../controllers/auth.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginWithPassword)
router.post("/refresh", refreshAccessToken)
router.post("/logout", logoutUser)
router.post("/register-expert", verifyToken, registerExpert)
router.post("/verify-otp", verifyOTP);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

export default router;