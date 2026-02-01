import { Problem } from "../models/problem.model.js";
import { Reputation } from "../models/reputation.model.js";
import { Solution } from "../models/solution.model.js";
import mongoose from "mongoose";

export const getUserDashboardStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);

        // 1. Total problems posted
        const totalProblems = await Problem.countDocuments({
            createdBy: userId,
            isDeleted: false
        });

        // 2. Total solutions received on user's problems
        const totalSolutionsReceived = await Solution.countDocuments({
            problemId: {
                $in: await Problem.find({ createdBy: userId }).distinct("_id")
            }
        });

        const totalPointsEarned = await Reputation.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ])

        const totalSolutionsProvided = await Solution.countDocuments({
            answeredBy: userId
        })

        const totalPoints = totalPointsEarned[0]?.total || 0;

        // 3. Problem status breakdown (solved vs unsolved)
        const problemStatus = await Problem.aggregate([
            { $match: { createdBy: userId, isDeleted: false } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);


        // 4. Latest 3 problems
        const latestProblems = await Problem.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("title status createdAt description");

        // 5. Latest 3 solutions provided by user
        const latestSolutions = await Solution.find({ answeredBy: userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("problemId answer")
            .populate("problemId", "title");

        // Solutions received over time (for line graph)
        const solutionsReceivedOverTime = await Solution.aggregate([
            {
                $match: {
                    problemId: {
                        $in: await Problem
                            .find({ createdBy: userId })
                            .distinct("_id"),
                    },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: "$createdAt" },
                        week: { $isoWeek: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.week": 1,
                },
            },
        ]);



        res.status(200).json({
            totalProblems,
            totalSolutionsReceived,
            totalSolutionsProvided,
            problemStatus,
            latestProblems,
            latestSolutions,
            solutionsReceivedOverTime,
            totalPoints
        });
    } catch (error) {
        res.status(500).json({ message: "Dashboard fetch failed" });
    }
};

export const mySolutions = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const solutions = await Solution.find({ answeredBy: req.user._id })
            .populate("problemId", "title")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        return res.status(200).json({
            message: "Fetched all solutions",
            count: solutions.length,
            page,
            solutions
        });
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: "Failed to fetch solutions" });
    }
};
import { Redemption } from "../models/redemption.model.js";

export const myEarnings = async (req, res) => {
    try {
        const reputationRecords = await Reputation.find({ userId: req.user._id })
            .populate({
                path: "solutionId",
                select: "_id answer problemId",
                populate: {
                    path: "problemId",
                    select: "_id title"
                }
            })
            .sort({ createdAt: -1 });

        const redemptionRecords = await Redemption.find({
            userId: req.user._id,
            status: "approved"
        }).sort({ createdAt: -1 });

        const totalPoints = reputationRecords.reduce((s, r) => s + r.points, 0);
        const redeemedPoints = redemptionRecords.reduce((s, r) => s + r.points, 0);
        const availablePoints = totalPoints - redeemedPoints;

        return res.status(200).json({
            totalPoints,
            redeemedPoints,
            availablePoints,
            reputationRecords,
            redemptionRecords
        });
    } catch (error) {
        console.error("Failed to fetch earnings:", error);
        return res.status(500).json({ message: "Failed to fetch earnings" });
    }
};


export const myRedemptions = async (req, res) => {
    try {
        const redeemed = await Redemption.find({ userId: req.user._id })

        return res.status(200).json({
            message: "Fetched all redemption history",
            count: redeemed.length,
            redeemed
        })
    } catch (error) {
        console.log("Failed to fetch redemption logs", error)
        return res.status(500).json({ message: "Failed to fetch redemption logs" })
    }
}