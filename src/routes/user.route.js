import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import { fetchAllUsers } from "../controllers/user.controller.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { getMyProfile, getUserDashboardStats, Profile, toggleProfileVisibility, updateMyProfile } from "../controllers/userDashboard.controller.js";
import { upload } from "../middlewares/upload.moddleware.js";

const router = express.Router()

router.get("/", verifyToken, fetchAllUsers)


// --------------------- USER DASHBOARD --------------------
router.get("/stats", verifyToken, getUserDashboardStats)

router.get("/profile/:userId", verifyToken, Profile)
router.get("/my-profile", verifyToken, getMyProfile)

router.patch("/profile-visibility", verifyToken, toggleProfileVisibility)

router.patch("/update-profile", verifyToken, upload.single("coverImage"), updateMyProfile)

export default router;