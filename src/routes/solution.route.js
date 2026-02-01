import express from "express";
import verifyToken from "../middlewares/auth.middleware.js";
import authorizeRoles from "../middlewares/roles.middleware.js";
import { acceptSolution, allSolutionsOfProblem, createSolution, reportSolution } from "../controllers/solution.controller.js";
import { aiModeration } from "../middlewares/aiModeration.middleware.js";
import { mySolutions } from "../controllers/userDashboard.controller.js";

const router = express.Router()

router.post("/create/:problemId", verifyToken, createSolution)
router.patch("/accept/:solutionId", verifyToken, acceptSolution)
router.get("/my", verifyToken, mySolutions)
router.get("/:problemId", verifyToken, allSolutionsOfProblem)
router.post("/:solutionId/report", verifyToken, reportSolution)



export default router
