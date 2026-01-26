import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { adminLogs, approveExpertApplication, expertApplicationRequests, redemptionRequests, rejectExpertApplication } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/expert-applications", verifyToken, authorizeRoles("admin"), expertApplicationRequests)
router.patch("/expert-application/:applicationId/approve", verifyToken, authorizeRoles("admin"), approveExpertApplication)
router.patch("/expert-application/:applicationId/reject", verifyToken, authorizeRoles("admin"), rejectExpertApplication)

// -----------------------------------   ADMIN LOGS   -----------------------------------

router.get("/redemption-requests", verifyToken, authorizeRoles("admin"), redemptionRequests)

// -----------------------------------   ADMIN LOGS   -----------------------------------
router.get("/logs", verifyToken, authorizeRoles("admin"), adminLogs)

export default router;