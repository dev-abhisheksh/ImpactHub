import { AdminLog } from "../models/adminLog.model.js"
import { ExpertApplication } from "../models/expertApplication.model.js"
import { Redemption } from "../models/redemption.model.js"
import { Reputation } from "../models/reputation.model.js"
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

        const requests = await Redemption.find({ status: "pending" }).sort({ createdAt: -1 })
        if (requests.length === 0) {
            return res.status(404).json({ message: "No pending redemption requests found" })
        }
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

        const logs = await AdminLog.find().sort({ createdAt: -1 })
        if (!logs) return res.status(404).json({ message: "No logs are found" })

        return res.status(200).json({
            message: "Fetched all adminLogs",
            count: logs.length,
            logs
        })
    } catch (error) {
        console.error("Failed to fetch adminLogs", error)
        return res.status(500).json({ message: "Failed to fetch adminLogs" })
    }
}

export {
    expertApplicationRequests,
    approveExpertApplication,
    rejectExpertApplication,
    adminLogs,
    redemptionRequests,
    approveRedemptionRequest
}