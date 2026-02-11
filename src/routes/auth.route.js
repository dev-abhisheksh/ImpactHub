import express from "express";
import { loginWithPassword, logoutUser, refreshAccessToken, registerExpert, registerUser, verifyOTP } from "../controllers/auth.controller.js";
import verifyToken from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginWithPassword)
router.post("/refresh", refreshAccessToken)
router.post("/logout", logoutUser)
router.post("/register-expert", verifyToken, registerExpert)
router.post("/verify-otp", verifyOTP);

export default router;