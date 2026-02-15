import { Problem } from "../models/problem.model.js";
import { Reputation } from "../models/reputation.model.js";
import { Solution } from "../models/solution.model.js";
import { Redemption } from "../models/redemption.model.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { client } from "../utils/redisClient.js";

export const getUserDashboardStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user._id);
        const cacheKey = `personalDashboard:${userId}`

        // Check cache
        const cached = await client.get(cacheKey)
        if (cached) {
            return res.status(200).json({
                message: "From cache", ...JSON.parse(cached)
            })
        }

        const totalProblems = await Problem.countDocuments({
            createdBy: userId,
            isDeleted: false
        });

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

        const problemStatus = await Problem.aggregate([
            { $match: { createdBy: userId, isDeleted: false } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const latestProblems = await Problem.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("title status createdAt description");

        const latestSolutions = await Solution.find({ answeredBy: userId })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("problemId answer")
            .populate("problemId", "title");

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

        const responseData = {
            totalProblems,
            totalSolutionsReceived,
            totalSolutionsProvided,
            problemStatus,
            latestProblems,
            latestSolutions,
            solutionsReceivedOverTime,
            totalPoints
        };

        await client.setex(cacheKey, 300, JSON.stringify(responseData));

        res.status(200).json(responseData);

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

export const Profile = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ message: "UserId is required" })
        const uid = new mongoose.Types.ObjectId(userId);

        const user = await User.findById(userId)
            .select("-password -accessToken -__v -isBanned -banExpiresAt -refreshTokens -authProvider ");

        if (!user) return res.status(404).json({ message: "User not found" })

        const totalProblemsPosted = await Problem.countDocuments({ createdBy: userId, isDeleted: false });
        const totalSolutions = await Solution.countDocuments({ answeredBy: userId })

        const totalPointsEarned = await Reputation.aggregate([
            { $match: { userId: uid } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ])
        const totalPoints = totalPointsEarned[0]?.total || 0;


        const userStats = {
            totalPoints,
            totalProblemsPosted,
            totalSolutions
        }

        if (req.user.role === "admin") {
            return res.status(200).json({
                message: "Fetched all details",
                user,
                userStats
            })
        }

        if (user.profileVisibility === "private") {
            const privateProfile = {
                fullName: user.fullName,
                email: user.email,
                bio: user.bio,
                coverImage: user.coverImage,
                role: user.role,
                expertCategories: user.expertCategories,
                portfolioLink: user.portfolioLink,
                experience: user.experience,
                createdAt: user.createdAt,
            }

            return res.status(200).json({
                message: "Fetched all details",
                privateProfile
            })
        }

        const publicProfile = {
            fullName: user.fullName,
            email: user.email,
            coverImage: user.coverImage,
            bio: user.bio,
            role: user.role,
            expertCategories: user.expertCategories,
            portfolioLink: user.portfolioLink,
            experience: user.experience,
            createdAt: user.createdAt,
            userStats
        }

        return res.status(200).json({
            message: "Fetched all details",
            publicProfile
        })

    } catch (error) {
        console.log("Failed to fetch details", error)
        return res.status(500).json({ message: "Failed to fetch details" })
    }
}

export const toggleProfileVisibility = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("profileVisibility")
        if (!user) return res.status(404).json({ message: "User not found" })

        const toggled = await User.findByIdAndUpdate(
            req.user._id,
            { profileVisibility: user.profileVisibility === "public" ? "private" : "public" },
            { new: true }
        )

        return res.status(200).json({
            message: `Profile visibility toggled to ${toggled.profileVisibility === "public" ? "Public" : "Private"}`
        })
    } catch (error) {
        console.error("Failed to toggle profile visibility", error)
        return res.status(500).json({ message: "Failed to toggle profile visibility" })
    }
}

export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const uid = new mongoose.Types.ObjectId(userId);
        const user = await User.findById(userId)
            .select("-password -accessToken -__v -isBanned -banExpiresAt -refreshTokens -authProvider");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const totalProblemsPosted = await Problem.countDocuments({
            createdBy: userId,
            isDeleted: false
        });

        const totalSolutions = await Solution.countDocuments({
            answeredBy: userId
        });

        const totalPointsAgg = await Reputation.aggregate([
            { $match: { userId: uid } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);

        const totalPoints = totalPointsAgg[0]?.total || 0;

        const profile = {
            fullName: user.fullName,
            email: user.email,
            coverImage: user.coverImage,
            role: user.role,
            bio: user.bio,
            expertCategories: user.expertCategories,
            portfolioLink: user.portfolioLink,
            experience: user.experience,
            profileVisibility: user.profileVisibility,
            userStats: {
                totalPoints,
                totalProblemsPosted,
                totalSolutions
            }
        };

        return res.status(200).json({
            message: "Fetched profile",
            profile
        });

    } catch (error) {
        console.log("Failed to fetch my profile", error);
        return res.status(500).json({ message: "Failed to fetch profile" });
    }
};

export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const { fullName, portfolioLink, experience, bio, expertCategories } = req.body;

        const updateFields = {};

        if (fullName !== undefined) updateFields.fullName = fullName;
        if (portfolioLink !== undefined) updateFields.portfolioLink = portfolioLink;
        if (experience !== undefined) updateFields.experience = experience;
        if (bio !== undefined) updateFields.bio = bio;
        if (expertCategories !== undefined) updateFields.expertCategories = expertCategories;

        // Handle image upload
        if (req.file) {
            const result = await uploadToCloudinary(
                req.file.buffer,
                "profile-images"
            );

            updateFields.coverImage = result.secure_url;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true, runValidators: true }
        ).select("-password -accessToken -__v -isBanned -banExpiresAt -refreshTokens -authProvider");

        return res.status(200).json({
            message: "Profile updated successfully",
            profile: updatedUser
        });
    } catch (error) {
        console.error("Failed to update profile", error);
        return res.status(500).json({ message: "Failed to update profile" });
    }
};

export const getMyAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("coverImage")
            .lean();

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ coverImage: user.coverImage });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ message: "Failed to fetch avatar" });
    }
};


