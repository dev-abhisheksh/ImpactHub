import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { getNotifications, readNotifications } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", verifyToken, getNotifications)
router.patch("/:notificationId/read", verifyToken, readNotifications)

export default router;