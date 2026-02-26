import mongoose from "mongoose";
import { Problem } from "../models/problem.model.js";
import { Solution } from "../models/solution.model.js";
import { addReputationEvent } from "../services/reputation.service.js";
import { Reputation } from "../models/reputation.model.js";
import { client, delRedisCache } from "../utils/redisClient.js";
import { logAdminAction } from "../utils/adminLogHelper.js";
import { AdminLog } from "../models/adminLog.model.js";
import { validateSolutionWithAI } from "../services/ai.service.js";


const createSolution = async (req, res) => {
    try {
        const { problemId } = req.params;
        let { answer } = req.body;

        if (!problemId || !answer) {
            return res.status(400).json({ message: "ProblemId and answer is required" })
        }

        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem" })
        }

        answer = answer.trim();

        if (!answer) {
            return res.status(400).json({ message: "Answer should not be empty" })
        }

        if (answer.length < 20 || answer.length > 2000) {
            return res.status(400).json({ message: "Answer length must be between 20 - 2000 letters" })
        }

        const problem = await Problem.findOne({ _id: problemId, isDeleted: false });
        if (!problem) {
            return res.status(404).json({ message: "Problem not found!" })
        }

        if (problem.expertOnly && req.user.role !== "expert") {
            return res.status(403).json({ message: "Only Experts are allowed" })
        }

        // ✅ AI Validation Step (NEW)
        const validation = await validateSolutionWithAI({
            problemTitle: problem.title,
            problemDescription: problem.description,
            solutionText: answer
        });

        if (!validation.isRelevant) {
            return res.status(400).json({
                message: "Solution is not relevant to the problem."
            });
        }

        if (!validation.isAppropriate) {
            return res.status(400).json({
                message: "Solution contains spam or inappropriate content."
            });
        }

        // ✅ Only create after passing validation
        const solution = await Solution.create({
            answer,
            problemId,
            answeredBy: req.user._id,
        });

        await solution.populate("answeredBy", "fullName");

        await addReputationEvent({
            userId: req.user._id,
            solutionId: solution._id,
            type: "commented"
        });

        await delRedisCache(client, [
            `personalDashboard:${req.user._id}`,
            `personalDashboard:${problem.createdBy}`,
            `solutions:problemId:${problemId}`
        ]);

        return res.status(201).json({
            message: "Solution created successfully",
            solution
        });

    } catch (error) {
        console.error("Failed to create a solution", error);

        if (error?.code === 11000) {
            return res.status(409).json({
                message: "You have already submitted a solution for this problem"
            });
        }

        return res.status(500).json({
            message: "Failed to create a solution"
        });
    }
};

const acceptSolution = async (req, res) => {
    try {
        const { solutionId } = req.params;

        // Find solution
        const solution = await Solution.findById(solutionId);
        if (!solution) {
            return res.status(404).json({ message: "Solution not found" });
        }

        // Check if already accepted
        if (solution.isAccepted) {
            return res.status(400).json({ message: "Solution is already accepted" });
        }

        // Check if user is trying to accept their own solution
        if (solution.answeredBy.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot accept your own answer" });
        }

        // Find problem
        const problem = await Problem.findById(solution.problemId);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        // Check if problem is open
        if (problem.status !== "open") {
            return res.status(400).json({ message: "Problem is not open" });
        }

        if (problem.status === "solved") {
            return res.status(409).json({ message: "Problem is already solved" });
        }

        // Check authorization (must be problem owner or admin)
        if (problem.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Only problem owner can accept solutions" });
        }

        // Update solution and problem
        solution.isAccepted = true;
        problem.status = "solved";

        await Promise.all([
            solution.save(),
            problem.save()
        ]);

        try {
            await addReputationEvent({
                userId: solution.answeredBy,
                solutionId: solutionId,
                type: "solution_accepted"
            });
        } catch (err) {
            console.error("Failed to add reputation:", err.message);
        }

        await delRedisCache(client, [
            `personalDashboard:${solution.answeredBy}`,
            `personalDashboard:${problem.createdBy}`,
            `solutions:problemId:${solution.problemId}`,
            `allProblems:page:*`
        ])

        return res.status(200).json({
            message: "Solution accepted successfully",
            solution,
            problem
        });

    } catch (error) {
        console.error("Accept solution error:", error);
        return res.status(500).json({
            message: "Failed to accept solution",
            error: error.message
        });
    }
};

const allSolutionsOfProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        if (!problemId) return res.status(400).json({ message: "Problem ID is required" })
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid problemID" })
        }

        const cacheKey = `solutions:problemId:${problemId}`
        const cached = await client.get(cacheKey)
        if (cached && cached !== "") {
            return res.status(200).json(JSON.parse(cached))
        }

        const problem = await Problem.findById(problemId)
        if (!problem) return res.status(404).json({ message: "Problem not found" })

        const solutions = await Solution.find({ problemId, isDeleted: false })
            .populate("answeredBy", "fullName role coverImage")
            .sort({ isAccepted: -1, createdAt: -1 })
            .select("-__v")
            .lean()

        const userIds = solutions.map(s => s.answeredBy._id)
        const repAgg = await Reputation.aggregate([
            { $match: { userId: { $in: userIds } } },
            { $group: { _id: "$userId", total: { $sum: "$points" } } }
        ])

        const repMap = Object.fromEntries(repAgg.map(r => [r._id.toString(), r.total]))

        const finalSolutions = solutions.map(s => ({
            ...s,
            answeredBy: {
                ...s.answeredBy,
                reputation: repMap[s.answeredBy._id.toString()] || 0
            }
        }));

        const responseData = {
            message: `Fetched all solutions for problem : ${problem?.title}`,
            count: finalSolutions.length,
            solutions: finalSolutions
        };

        await client.setex(cacheKey, 500, JSON.stringify(responseData))

        return res.status(200).json(responseData)
    } catch (error) {
        console.error("Failed to fetch solutions", error)
        return res.status(500).json({ message: "Failed to fetch solutions" })
    }
}

const reportSolution = async (req, res) => {
    try {
        const { solutionId } = req.params;

        if (!solutionId) {
            return res.status(400).json({ message: "Solution ID is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(solutionId)) {
            return res.status(400).json({ message: "Invalid Solution ID" });
        }

        const solution = await Solution.findById(solutionId)
            .populate("problemId", "createdBy");

        if (!solution) {
            return res.status(404).json({ message: "Solution not found" });
        }

        const isProblemOwner =
            solution.problemId.createdBy.equals(req.user._id);

        const isAdmin = req.user.role === "admin";

        if (!isProblemOwner && !isAdmin) {
            return res.status(403).json({
                message: "Not authorized to report this solution",
            });
        }

        if (solution.answeredBy.equals(req.user._id)) {
            return res
                .status(400)
                .json({ message: "Cannot report your own solution" });
        }

        // prevent duplicate reporting
        if (solution.isReported) {
            return res
                .status(400)
                .json({ message: "Solution already reported" });
        }

        if (solution.isAccepted) {
            return res.status(400).json({ message: "Cannot report an accepted solution" });
        }

        // mark solution as reported
        solution.isReported = true;
        await solution.save();

        await addReputationEvent({
            userId: solution.answeredBy,
            solutionId,
            type: "reported",
        });

        await AdminLog.create({
            adminId: req.user._id,
            action: "report_solution",
            entityType: "Solution",
            entityId: solution._id,
            meta: {
                reportedBy: req.user._id,
                problemId: solution.problemId._id
            }
        })

        return res.status(200).json({
            message: "Solution reported successfully",
        });
    } catch (error) {
        console.error("Operation failed", error);
        return res.status(500).json({ message: "Operation failed" });
    }
};


export {
    createSolution,
    acceptSolution,
    allSolutionsOfProblem,
    reportSolution
}