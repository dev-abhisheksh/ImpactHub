import { Redemption } from "../models/redemption.model.js";
import { Reputation } from "../models/reputation.model.js";
import mongoose from "mongoose";


const requestRedemption = async (req, res) => {
    try {
        if (!req.user?._id) return res.status(401).json({ message: "Unathorized" })

        const { points } = req.body;
        if (![500, 1000].includes(points)) {
            return res.status(400).json({ message: "Invalid points for redemption request. Select 500 or 1000 points." })
        }

        const userId = new mongoose.Types.ObjectId(req.user._id)

        const pending = await Redemption.findOne({
            userId,
            status: "pending"
        })

        if (pending) return res.status(400).json({ message: "You already have a pending redemption request" })

        const earned = await Reputation.aggregate([
            { $match: { userId } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ])
        const totalEarned = earned[0]?.total ?? 0;

        const redeemed = await Redemption.aggregate([
            { $match: { userId, status: { $in: ["pending", "approved"] } } },
            { $group: { _id: null, total: { $sum: "$points" } } }
        ])
        const totalRedeemed = redeemed[0]?.total ?? 0;

        const availablePoints = totalEarned - totalRedeemed;
        console.log("Left points:", availablePoints)
        if (availablePoints < points) {
            return res.status(400).json({ message: "Insufficient points for redemption!", availablePoints })
        }

        const redemption = await Redemption.create({
            userId,
            points,
            rewardType: "gift_card",
            status: "pending"
        })

        return res.status(200).json({
            message: "Redemption request submitted",
            redemption,
            availablePoints: availablePoints - points
        })
    } catch (error) {
        console.error("Failed to submit redemption request", error)
        return res.status(500).json({ message: "Failed to submit redemption request" })
    }
}

export {
    requestRedemption
}