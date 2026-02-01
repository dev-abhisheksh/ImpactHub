import { populate } from "dotenv";
import { Notification } from "../models/notification.model.js";
import mongoose from "mongoose";


const getNotifications = async (req, res) => {
    try {
        if (req.user.role !== "expert") {
            return res.status(403).json({ message: "Only Experts can view notifications" })
        }

        const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 })
        .populate("problemId", "_id title createdAt")
        .populate("userId", "fullName role")
        if (!notifications) return res.status(404).json({ message: "No notifications" })

        return res.status(200).json({
            message: "Fetched Notifications",
            count: notifications.length,
            notifications
        })
    } catch (error) {
        console.error("Failed to fetch notifications")
        return res.status(500).json({ message: "Failed to fetch notifications" })
    }
}

const readNotifications = async (req, res) => {
    try {
        const { notificationId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ message: "Invalid notificationID" })
        }

        const notification = await Notification.findOneAndUpdate(
            {
                _id: notificationId,
                userId: req.user._id
            },
            { $set: { isRead: true } },
            { new: true }
        )

        if (!notification) return res.status(404).json({ message: "Notification not found" })


        return res.status(200).json({
            message: "Message marked as read",
            notification
        })
    } catch (error) {
        console.log("Failed to mark notification as read", error)
        return res.status(500).json({ message: "Failed to read notifications" })
    }
}

export {
    getNotifications,
    readNotifications
}