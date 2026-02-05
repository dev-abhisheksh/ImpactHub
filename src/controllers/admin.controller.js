import { AdminLog } from "../models/adminLog.model.js"
import { ExpertApplication } from "../models/expertApplication.model.js"
import { Notification } from "../models/notification.model.js"
import { Problem } from "../models/problem.model.js"
import { Redemption } from "../models/redemption.model.js"
import { Reputation } from "../models/reputation.model.js"
import { Solution } from "../models/solution.model.js"
import { User } from "../models/user.model.js"

const expertApplicationRequests = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        const requests = await ExpertApplication.find({ status: "pending" })
            .populate("userId", "fullName role createdAt")
            .sort({ createdAt: -1 })

        return res.status(200).json({
            message: "Fetched all pending Expert Applications requests",
            count: requests.length,
            requests
        })

    } catch (error) {
        console.error("Failed to fetch expert application requests", error)
        return res.status(500).json({ message: "Failed to fetch expert application requests" })
    }
}

const approveExpertApplication = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        const { applicationId } = req.params;
        const application = await ExpertApplication.findById(applicationId);
        if (!application || application.status !== "pending") {
            return res.status(404).json({ message: "Application not found or already processed" })
        }

        await User.findByIdAndUpdate(
            application.userId,
            {
                $set: {
                    role: "expert",
                    isExpertVerified: true,
                    bio: application.bio,
                    experience: application.experience,
                    expertCategories: application.expertCategories,
                    portfolioLink: application.portfolioLink
                }
            }
        )

        application.status = "approved",
            application.reviewedBy = req.user._id,
            await application.save()

        await AdminLog.create({
            adminId: req.user._id,
            action: "approved_expert_application",
            entityType: "ExpertApplication",
            entityId: application._id,
            meta: {
                userId: application.userId
            }
        })

        return res.status(200).json({ message: "Expert application approved successfully" })

    } catch (error) {
        console.error("Failed to approve expert application", error)
        return res.status(500).json({ message: "Failed to approve expert application" })
    }
}

const rejectExpertApplication = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        const { applicationId } = req.params;
        const application = await ExpertApplication.findById(applicationId);
        if (!application || application?.status !== "pending") {
            return res.status(404).json({ message: "Application not found or already processed" })
        }

        application.status = "rejected"
        application.reviewedBy = req.user._id
        await application.save()

        await AdminLog.create({
            adminId: req.user._id,
            action: "rejected_expert_application",
            entityType: "ExpertApplication",
            entityId: application._id,
            meta: {
                userId: application.userId
            }
        })

        return res.status(200).json({ message: "Expert application rejected successfully" })
    } catch (error) {
        console.error("Failed to reject expert application", error)
        return res.status(500).json({ message: "Failed to reject expert application" })
    }
}

// ---------------------------------------   REDEMPTION REQUESTS   ---------------------------------------

const redemptionRequests = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        const requests = await Redemption.find({ status: "pending" })
            .populate("userId", "fullName email createdAt reputationPoints") // 👈 ADD THIS LINE
            .sort({ createdAt: -1 })

        // Remove the 404 check - empty array is valid
        return res.status(200).json({
            message: "Fetched all pending redemption requests",
            count: requests.length,
            requests
        })
    } catch (error) {
        console.error("Failed to fetch redemption requests", error)
        return res.status(500).json({ message: "Failed to fetch redemption requests" })
    }
}

const approveRedemptionRequest = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        const { redemptionId } = req.params;

        const request = await Redemption.findById(redemptionId)
        if (!request) return res.status(404).json({ message: "Redemption Request not found or already processed" })

        const totalEarned = await Reputation.aggregate([
            { $match: { userId: request.userId } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ]);


        const totalRedeemed = await Redemption.aggregate([
            { $match: { userId: request.userId, status: "approved" } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ])

        const earned = totalEarned[0] ? totalEarned[0].total : 0
        const redeemed = totalRedeemed[0] ? totalRedeemed[0].total : 0
        const available = earned - redeemed

        if (available < request.points) {
            return res.status(400).json({ message: "Insufficient points for this redemption" })
        }

        if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" })

        request.status = "approved"
        await request.save()

        await AdminLog.create({
            adminId: req.user._id,
            action: "approved_redemption_request",
            entityType: "Redemption",
            entityId: request._id,
            meta: {
                userId: request.userId,
                points: request.points,
                rewardType: request.rewardType
            }
        })

        return res.status(200).json({
            message: "Redemption Request approved"
        })
    } catch (error) {
        console.error("Failed to approve redemption request", error)
        return res.status(500).json({ message: "Failed to approve redemption request" })
    }
}

const rejectRedemptionRequest = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }
        const { redemptionId } = req.params;
        const request = await Redemption.findById(redemptionId)
        if (!request) return res.status(404).json({ message: "Redemption Request not found or already processed" })

        if (request.status !== "pending") {
            return res.status(400).json({ message: "Request already processed" });
        }

        request.status = "rejected"
        await request.save()

        await AdminLog.create({
            adminId: req.user._id,
            action: "rejected_redemption_request",
            entityType: "Redemption",
            entityId: request._id,
            meta: {
                userId: request.userId,
                points: request.points,
                rewardType: request.rewardType
            }
        })
        return res.status(200).json({ message: "Redemption Request rejected" })
    } catch (error) {
        console.error("Failed to reject redemption request", error)
        return res.status(500).json({ message: "Failed to reject redemption request" })
    }
}

// ---------------------------------------   ADMIN LOGS   ---------------------------------------
const adminLogs = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Only Admins are allowed" })
        }

        let page = Number(req.query.page)
        let limit = Number(req.query.limit)
        let skip = (page - 1) * limit;

        const logs = await AdminLog.find().sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("adminId", "fullName name email")
            .sort({ createdAt: -1 })

        if (!logs) return res.status(404).json({ message: "No logs are found" })

        const count = await AdminLog.countDocuments()

        return res.status(200).json({
            message: "Fetched all adminLogs",
            count,
            logs
        })
    } catch (error) {
        console.error("Failed to fetch adminLogs", error)
        return res.status(500).json({ message: "Failed to fetch adminLogs" })
    }
}

const fetchAllUsers = async (req, res) => {
    try {
        let page = Number(req.query.page);
        let limit = Number(req.query.limit);
        let skip = (page - 1) * limit;

        const users = await User.find()
            .select("-refreshTokens -password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const count = await User.countDocuments();
        const proUsers = await User.countDocuments({ isPro: true });
        const admins = await User.countDocuments({ role: "admin" });

        const usersGraph = await User.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        return res.status(200).json({
            message: "Fetched all users",
            count,
            proUsers,
            users,
            admins,
            usersGraph   // 👈 REQUIRED for graph
        })
    } catch (error) {
        console.error("Failed to fetch users", error)
        return res.status(500).json({ message: "Failed to fetch users" })
    }
}

const softDeleteProblem = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admins only" });
        }

        const { problemId } = req.params;
        if (!problemId) {
            return res.status(400).json({ message: "Problem ID is required" });
        }

        const problem = await Problem.findOneAndUpdate(
            { _id: problemId, isDeleted: false },
            {
                isDeleted: true,
                status: "closed"
            },
            { new: true }
        )
            .populate("createdBy", "fullName role ")

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found or already deleted"
            });
        }

        await AdminLog.create({
            adminId: req.user._id,
            action: "soft_deleted_problem",
            entityType: "Problem",
            entityId: problemId,
            meta: {
                title: problem.title,
                createdBy: problem.createdBy._id,
                fullName: problem.fullName,
                deletedAt: new Date()
            }
        });


        return res.status(200).json({
            message: "Problem soft deleted successfully",
            problem
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

const toggleDeleteProblem = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admins only" });
        }

        const { problemId } = req.params;
        if (!problemId) {
            return res.status(400).json({ message: "Problem ID is required" });
        }

        const problem = await Problem.findById(problemId)
            .populate("createdBy", "fullName")

        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        const wasDeleted = problem.isDeleted;

        // TOGGLE
        problem.isDeleted = !problem.isDeleted;

        // status handling (important)
        if (problem.isDeleted) {
            problem.status = "closed";
        } else {
            // restore logic — choose ONE policy
            problem.status = "open"; // or store previousStatus if you want accuracy
        }

        await problem.save();

        await AdminLog.create({
            adminId: req.user._id,
            action: wasDeleted ? "restored_problem" : "soft_deleted_problem",
            entityType: "Problem",
            entityId: problem._id,
            meta: {
                title: problem.title,
                fullName: problem.fullName,
                deletedAt: wasDeleted ? null : new Date()
            }
        });

        return res.status(200).json({
            message: wasDeleted
                ? "Problem restored successfully"
                : "Problem soft deleted successfully",
            problem
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};

const fetchProductsForAdmin = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" })

        const page = Number(req.query.page)
        const limit = Number(req.query.limit)
        let skip = (page - 1) * limit;

        const problems = await Problem.find().select("-description -expertOnly -bannerImage -__v --expertCategory")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "fullName role")

        const problemsCount = await Problem.countDocuments();

        return res.status(200).json({
            message: "Fetched all problems",
            page,
            limit,
            totalPages: Math.ceil(problemsCount / limit),
            problemsCount,
            problems
        });
    } catch (error) {
        console.error("Failed to fetch problems", error)
        return res.status(500).json({ message: "Failed to fetch problems" })
    }
}

const fetchSolutionsForAdmin = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" })

        let page = Number(req.query.page)
        let limit = Number(req.query.limit)
        let skip = (page - 1) * limit;

        const solutions = await Solution.find()
            .populate("answeredBy", "fullName")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const count = await Solution.countDocuments()

        return res.status(200).json({
            message: "Fetched all solutions",
            count,
            solutions
        })
    } catch (error) {
        console.error("Failed to fetch all solutions", error)
        return res.status(500).json({ message: "Failed to fetch all solutions" })
    }
}

const toggleSolutionsVisibility = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" })

        const { solutionId } = req.params;
        if (!solutionId) return res.status(400).json({ message: "SolutionId is required" })

        const solution = await Solution.findById(solutionId)
            .populate("answeredBy", "fullName")

        if (!solution) return res.status(404).json({ message: "Solution not found" })

        const wasDeleted = solution.isDeleted;
        solution.isDeleted = !solution.isDeleted

        await solution.save()

        await AdminLog.create({
            adminId: req.user._id,
            action: wasDeleted ? "restored_solution" : "soft_deleted_solution",
            entityType: "Solution",
            entityId: solution._id,
            meta: {
                title: solution.title,
                fullName: solution.fullName,
                deletedAt: wasDeleted ? null : new Date()
            }
        })

        return res.status(200).json({
            message: wasDeleted
                ? "Solution restored successfully"
                : "Solution soft deleted successfully",
            solution
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
}

const banUser = async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" })
        const { userId } = req.params;
        const { banTime } = req.body;
        if (!banTime || !userId) return res.status(400).json({ message: "banTime and UserId are required for banning a user" })

        const hours = Number(banTime);
        if (!hours || hours <= 0) return res.status(400).json({ message: "Invalid banTime" });

        await User.findByIdAndUpdate(userId, {
            isBanned: true,
            banExpiresAt: new Date(Date.now() + hours * 60 * 60 * 1000)
        });

        await Notification.create({
            userId,
            message: `You are banned for ${hours} hours until ${new Date(Date.now() + hours * 3600000).toLocaleString()}`
        })

        await AdminLog.create({
            adminId: req.user._id,
            entityId: userId,
            entityType: "User",
            action: "banned_user",
            meta: {}
        })

        return res.status(200).json({
            message: `User banned for ${banTime} hours`
        })

    } catch (error) {
        console.error("Failed to ban user", error)
        return res.status(500).json({ message: "Failed to ban user" })
    }
}

export {
    expertApplicationRequests,
    approveExpertApplication,
    rejectExpertApplication,
    adminLogs,
    redemptionRequests,
    approveRedemptionRequest,
    rejectRedemptionRequest,
    fetchAllUsers,
    softDeleteProblem,
    toggleDeleteProblem,
    fetchProductsForAdmin,
    fetchSolutionsForAdmin,
    toggleSolutionsVisibility,
    banUser
}