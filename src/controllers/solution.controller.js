import mongoose from "mongoose";
import { Problem } from "../models/problem.model.js";
import { Solution } from "../models/solution.model.js";
import { addReputationEvent } from "../services/reputation.service.js";
import { Reputation } from "../models/reputation.model.js";


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

        if (answer === null || answer === "") {
            return res.status(400).json({ message: "Answer should not be empty" })
        }

        if (answer.length < 20 || answer.length > 2000) {
            return res.status(400).json({ message: "Answer length must be between 20 - 2000 letters" })
        }

        const problem = await Problem.findOne({ _id: problemId, isDeleted: false });
        if (!problem) return res.status(404).json({ message: "Problem not found!" })

        if (problem.expertOnly && req.user.role !== "expert") {
            return res.status(403).json({ message: "Only Experts are allowed" })
        }

        if (req.user.isBanned && req.user.banExpiresAt > Date.now()) {
            return res.status(403).json({ message: "User temporary Banned" })
        }

        const solution = await Solution.create({
            answer,
            problemId,
            answeredBy: req.user._id,
        })

        await solution.populate("answeredBy", "fullName")

        await addReputationEvent({ userId: req.user._id, solutionId: solution._id, type: "commented" })

        return res.status(201).json({
            message: "Solution created successfully",
            solution //testing purpose later ill remove
        })

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
}

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

        // ✅ Add reputation points for accepted solution
        try {
            await addReputationEvent({
                userId: solution.answeredBy,
                solutionId: solutionId,
                type: "solution_accepted"
            });
        } catch (err) {
            console.error("Failed to add reputation:", err.message);
        }

        // ✅ Log admin action (optional)
        try {
            await logAdminAction({
                adminId: req.user._id,
                action: "ACCEPT_SOLUTION",
                entityType: "Solution",
                entityId: solutionId
            });
        } catch (err) {
            console.error("Failed to log admin action:", err.message);
        }

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


        const problem = await Problem.findById(problemId)
        if (!problem) return res.status(404).json({ message: "Problem not found" })

        const solutions = await Solution.find({ problemId, isDeleted: false })
            .populate("answeredBy", "fullName role")
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


        return res.status(200).json({
            message: `Fetched all solutions for problem : ${problem?.title}`,
            count: finalSolutions.length,
            solutions: finalSolutions
        })
    } catch (error) {
        console.error("Failed to fetch solutions", error)
        return res.status(500).json({ message: "Failed to fetch solutions" })
    }
}

const reportSolution = async (req, res) => {
    try {
        const { solutionId } = req.params;
        if (!solutionId) return res.status(400).json({ message: "Solution ID is required" })
        if (!mongoose.Types.ObjectId.isValid(solutionId)) {
            return res.status(400).json({ message: "Invalid Soltion ID" })
        }

        const solution = await Solution.findById(solutionId)
        if (!solution) return res.status(404).json({ message: "solution not found" })

        if (solution?.answeredBy.equals(req.user._id)) {
            return res.status(400).json({ message: "Cannot report your own solution" })
        }

        await addReputationEvent({ userId: solution.answeredBy, solutionId, type: "reported" })

        return res.status(200).json({
            message: "Operation successful",
        })
    } catch (error) {
        console.error("Operation failed", error)
        return res.status(500).json({ message: "Operation failed" })
    }
}


export {
    createSolution,
    acceptSolution,
    allSolutionsOfProblem,
    reportSolution
}