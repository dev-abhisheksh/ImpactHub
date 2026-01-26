import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { adminLogs, approveExpertApplication, approveRedemptionRequest, expertApplicationRequests, redemptionRequests, rejectExpertApplication, rejectRedemptionRequest } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/expert-applications", verifyToken, authorizeRoles("admin"), expertApplicationRequests)
router.patch("/expert-application/:applicationId/approve", verifyToken, authorizeRoles("admin"), approveExpertApplication)
router.patch("/expert-application/:applicationId/reject", verifyToken, authorizeRoles("admin"), rejectExpertApplication)

// -----------------------------------   REDEMPTION REQUESTS   -----------------------------------

router.get("/redemption-requests", verifyToken, authorizeRoles("admin"), redemptionRequests)
router.patch("/redemption/:redemptionId/approve", verifyToken, authorizeRoles("admin"), approveRedemptionRequest)
router.patch("/redemption/:redemptionId/reject", verifyToken, authorizeRoles("admin"), rejectRedemptionRequest)

// -----------------------------------   ADMIN LOGS   -----------------------------------
router.get("/logs", verifyToken, authorizeRoles("admin"), adminLogs)

export default router;