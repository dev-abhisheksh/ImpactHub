import express from "express"
import verifyToken from "../middlewares/auth.middleware.js"
import authorizeRoles from "../middlewares/roles.middleware.js"
import { getMyApplication, submitExpertApplications } from "../controllers/userDashboard.controller.js"
import { getExpertApplications, reviewExpertApplication } from "../controllers/admin.controller.js"

const router = express.Router()

router.post("/apply", verifyToken, authorizeRoles("user"), submitExpertApplications)
router.get("/", verifyToken, authorizeRoles("admin"), getExpertApplications)
router.patch("/:applicationId/review", verifyToken, authorizeRoles("admin"), reviewExpertApplication)
router.get("/my-application", verifyToken, getMyApplication)

export default router;