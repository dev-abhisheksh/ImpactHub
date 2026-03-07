import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { client } from "../utils/redisClient.js";
import mongoose from "mongoose";

/**
 * GET /api/v1/chat
 *
 * Returns all conversations where the logged-in user is either
 * the `userId` (problem owner) or the `expertId` (solution provider).
 *
 * Each conversation includes:
 *   - otherParticipant (name + avatar)
 *   - problem title
 *   - last message preview + timestamp
 *
 * Results are cached in Redis for 120 seconds.
 */
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const cacheKey = `conversations:${userId}`;

        // Try Redis cache first
        const cached = await client.get(cacheKey);
        if (cached && cached !== "") {
            return res.status(200).json(JSON.parse(cached));
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const conversations = await Conversation.aggregate([
            // Match conversations where user is a participant
            {
                $match: {
                    $or: [
                        { userId: userObjectId },
                        { expertId: userObjectId }
                    ]
                }
            },

            // Look up the last message for each conversation
            {
                $lookup: {
                    from: "messages",
                    let: { convoId: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$conversationId", "$$convoId"] } } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        { $project: { content: 1, createdAt: 1, senderId: 1, senderRole: 1 } }
                    ],
                    as: "lastMessageArr"
                }
            },

            // Flatten the lastMessage array
            {
                $addFields: {
                    lastMessage: { $arrayElemAt: ["$lastMessageArr", 0] },
                    lastMessageTime: {
                        $ifNull: [
                            { $arrayElemAt: ["$lastMessageArr.createdAt", 0] },
                            "$createdAt"  // fallback to conversation creation time
                        ]
                    }
                }
            },

            // Sort by most recent message
            { $sort: { lastMessageTime: -1 } },

            // Populate the problem title
            {
                $lookup: {
                    from: "problems",
                    localField: "problemId",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { title: 1 } }
                    ],
                    as: "problemArr"
                }
            },

            // Determine "other participant" id
            {
                $addFields: {
                    otherParticipantId: {
                        $cond: {
                            if: { $eq: ["$userId", userObjectId] },
                            then: "$expertId",
                            else: "$userId"
                        }
                    },
                    problem: { $arrayElemAt: ["$problemArr", 0] }
                }
            },

            // Populate the other participant's info
            {
                $lookup: {
                    from: "users",
                    localField: "otherParticipantId",
                    foreignField: "_id",
                    pipeline: [
                        { $project: { fullName: 1, coverImage: 1, role: 1 } }
                    ],
                    as: "otherParticipantArr"
                }
            },

            {
                $addFields: {
                    otherParticipant: { $arrayElemAt: ["$otherParticipantArr", 0] }
                }
            },

            // Final projection — clean output
            {
                $project: {
                    _id: 1,
                    problemId: 1,
                    solutionId: 1,
                    status: 1,
                    lastMessage: 1,
                    lastMessageTime: 1,
                    problem: 1,
                    otherParticipant: 1,
                    createdAt: 1
                }
            }
        ]);

        const responseData = {
            message: "Fetched conversations",
            count: conversations.length,
            conversations
        };

        // Cache for 120 seconds
        await client.setex(cacheKey, 120, JSON.stringify(responseData));

        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Failed to fetch conversations", error);
        return res.status(500).json({ message: "Failed to fetch conversations" });
    }
};

/**
 * GET /api/v1/chat/:conversationId/messages
 *
 * Returns all messages for a conversation (authorized users only).
 */
const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId)
            .populate("userId", "fullName coverImage")
            .populate("expertId", "fullName coverImage");

        if (
            !conversation ||
            ![conversation.userId._id.toString(), conversation.expertId._id.toString()]
                .includes(req.user._id.toString())
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const messages = await Message.find({ conversationId: conversation._id })
            .sort({ createdAt: 1 })
            .limit(100);

        return res.status(200).json({ conversation, messages });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch messages" });
    }
};

export { getConversations, getMessages };
