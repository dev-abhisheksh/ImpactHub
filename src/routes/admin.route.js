import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { adminLogs, approveExpertApplication, approveRedemptionRequest, banUser, expertApplicationRequests, fetchAllUsers, fetchProductsForAdmin, fetchSolutionsForAdmin, redemptionRequests, rejectExpertApplication, rejectRedemptionRequest, softDeleteProblem, toggleDeleteProblem, toggleSolutionsVisibility } from "../controllers/admin.controller.js";

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

router.get("/user", verifyToken, authorizeRoles("admin"), fetchAllUsers)

router.patch("/delete/:problemId", verifyToken, authorizeRoles("admin"), softDeleteProblem)

router.patch("/toggle-problem/:problemId", verifyToken, authorizeRoles("admin"), toggleDeleteProblem)

router.get("/problems", verifyToken, authorizeRoles("admin"), fetchProductsForAdmin)

router.get("/solutions", verifyToken, authorizeRoles("admin"), fetchSolutionsForAdmin)
router.patch("/toggle-solution/:solutionId", verifyToken, authorizeRoles("admin"), toggleSolutionsVisibility)

router.patch("/ban/:userId", verifyToken, authorizeRoles("admin"), banUser)

export default router;