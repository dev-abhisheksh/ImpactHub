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

        const solution = await Solution.create({
            answer,
            problemId,
            answeredBy: req.user._id,
        })

        await addReputationEvent({ userId: req.user._id, solutionId: solution._id, type: "commented" })

        return res.status(201).json({
            message: "Solution created successfully",
            solution //testing purpose later ill remove
        })

    } catch (error) {
        console.error("Failed to create a solution", error)
        if (error.code === 11000) {
            return res.status(409).json({ message: "You already submitted a solution" })
        }
        return res.status(500).json({ message: "Failed to create a solution" })
    }
}

//using automacity ,if one operation fails all falls back gracefully
const acceptSolution = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const solution = await Solution.findById(req.params.solutionId).session(session)
        if (!solution) throw new Error("Solution not found")

        if (solution.isAccepted) return res.status(400).json({ message: "Solution is alreay accepted" })
        if (solution.answeredBy.equals(req.user._id)) {
            return res.status(400).json({ message: "Can accept your answer" })
        }

        const problem = await Problem.findById(solution.problemId).session(session)
        if (!problem || problem.status !== "open") throw new Error("Invalid problem state")

        if (!problem.createdBy.equals(req.user._id) && req.user.role !== "admin") {
            return res.status(403).json({ message: "Not allowed" })
        }

        solution.isAccepted = true;
        problem.status = "solved"

        await Promise.all([solution.save({ session }), problem.save({ session })])
        await session.commitTransaction()

        await logAdminAction({
            adminId: req.user._id,
            action: "ACCEPT_SOLUTION",
            entityType: "Solution",
            entityId: req.params.solutionId
        })

        await addReputationEvent({ userId: solution.answeredBy, solutionId: req.params.solutionId, type: "solution_accepted" })

        return res.status(200).json({ message: "Solution accepted" });
    } catch (error) {
        await session.abortTransaction()
        return res.status(400).json({ message: error.message })
    } finally {
        session.endSession()
    }
}

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