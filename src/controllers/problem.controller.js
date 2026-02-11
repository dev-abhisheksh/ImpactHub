import { Notification } from "../models/notification.model.js";
import { Problem } from "../models/problem.model.js ";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import { generateCategoryWithAi } from "../services/ai.service.js";
import { generateTagsWithAI } from "../services/tagsGenerationWithAi.servce.js";
import { client, delRedisCache } from "../utils/redisClient.js";
import cloudinary from "../utils/cloudinary.js";
import { logAdminAction } from "../utils/adminLogHelper.js";
import { AdminLog } from "../models/adminLog.model.js";

const createProblem = async (req, res) => {
    try {
        let { title, description, expertOnly, } = req.body;

        if (!title || !description) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        let bannerImage = null;
        if (req.file) {
            const uploadResult = await uploadToCloudinary(req.file.buffer);
            bannerImage = uploadResult.secure_url;
        }

        title = title.trim();
        description = description.trim();

        // Generate both specific and broad categories
        let specificCategory = "general";
        let broadCategory = "environment";

        try {
            const categories = await generateCategoryWithAi({ title, description });
            specificCategory = categories.specificCategory;
            broadCategory = categories.broadCategory;
        } catch (error) {
            console.error("AI category generation failed:", error);
        }

        let tags = [];
        try {
            tags = await generateTagsWithAI({ title, description, category: specificCategory });

            if (typeof tags === 'string') {
                tags = JSON.parse(tags);
            }
            if (!Array.isArray(tags)) {
                tags = [];
            }
        } catch (error) {
            console.error("AI tags generation failed:", error);
            tags = [];
        }

        const normalizedTags = [
            ...new Set(
                tags
                    .map(t => String(t).toLowerCase().trim())
                    .filter(t => t.length > 0 && !t.includes(" "))
            )
        ];

        const problem = await Problem.create({
            title,
            description: description,
            category: specificCategory,        // Specific category for display
            expertCategory: broadCategory,     // Broad category for expert matching
            tags: normalizedTags,
            expertOnly: expertOnly === true || expertOnly === 'true',
            createdBy: req.user._id,
            bannerImage
        });

        // Find experts using BROAD category for better matching
        const experts = await User.find({
            role: "expert",
            expertCategories: broadCategory  // Match using broad category
        }).select("_id");

        if (experts.length > 0) {
            await Notification.insertMany(
                experts.map(expert => ({
                    userId: expert._id,
                    problemId: problem._id,
                    message: "A new problem was posted related to your expertise"
                }))
            );
        }

        await delRedisCache(client, [
            `personalDashboard:${req.user._id}`,
            `personalDashboard:${problem.createdBy}`,
            `allProblems:page:*`
        ])

        return res.status(201).json({
            message: "Problem created successfully",
            problem
        });

    } catch (error) {
        console.error("Failed to create problem", error);
        return res.status(500).json({ message: "Failed to create problem" });
    }
};

const updateMyProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        const { title, description, expertOnly, tags } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem ID" });
        }

        const existingProblem = await Problem.findOne({
            _id: problemId,
            isDeleted: false,
        });

        if (!existingProblem) {
            return res
                .status(404)
                .json({ message: "Problem not found" });
        }

        const isOwner =
            existingProblem.createdBy.toString() ===
            req.user._id.toString();

        const isAdmin = req.user.role === "admin";

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Access denied" });
        }

        const updateFields = {};

        if (typeof title === "string" && title.trim().length > 0) {
            updateFields.title = title.trim();
        }

        if (typeof description === "string" && description.trim().length > 0) {
            updateFields.description = description.trim();
        }

        if (expertOnly !== undefined) {
            updateFields.expertOnly =
                expertOnly === true || expertOnly === "true";
        }

        if (tags) {
            try {
                const parsedTags = JSON.parse(tags);
                if (Array.isArray(parsedTags)) {
                    updateFields.tags = parsedTags;
                }
            } catch {
                return res.status(400).json({ message: "Invalid tags format" });
            }
        }

        if (req.file) {
            if (existingProblem.bannerImage?.public_id) {
                await cloudinary.uploader.destroy(
                    existingProblem.bannerImage.public_id
                );
            }

            const result = await uploadToCloudinary(
                req.file.buffer,
                "problem-images"
            );

            updateFields.bannerImage = {
                url: result.secure_url,
                public_id: result.public_id,
            };
        }

        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const problem = await Problem.findByIdAndUpdate(
            problemId,
            { $set: updateFields },
            { new: true }
        );

        if (isAdmin && !isOwner) {
            await AdminLog.create({
                adminId: req.user._id,
                action: "UPDATE_PROBLEM",
                entityType: "Problem",
                entityId: problemId,
                meta: {
                    updatedFields: Object.keys(updateFields),
                    ownerId: existingProblem.createdBy,
                },
            });
        }

        await delRedisCache(client, [
            `personalDashboard:${req.user._id}`,
            `problem:${problemId}`,
            `allProblems:page:*`,
        ]);

        return res.status(200).json({
            message: "Problem updated successfully",
            problem,
        });
    } catch (error) {
        console.error("Failed to update problem", error);
        return res.status(500).json({ message: "Failed to update problem" });
    }
};


const getProblems = async (req, res) => {
    try {
        let { category, tags, expertOnly } = req.query;

        let page = Number(req.query.page) || 1;
        let limit = Number(req.query.limit) || 10;
        let skip = (page - 1) * limit;

        const filter = { isDeleted: false };

        if (category) filter.category = category.toLowerCase();
        if (expertOnly !== undefined)
            filter.expertOnly = expertOnly === "true";

        if (tags) {
            const parsedTags = tags
                .split(",")
                .map(tag => tag.trim().toLowerCase())
                .filter(Boolean);

            if (parsedTags.length) {
                filter.tags = { $in: parsedTags };
            }
        }

        const cacheKey = `problems:page:${page}:limit:${limit}:category:${category || "all"}:tags:${tags || "none"}:expert:${expertOnly || "all"}`;

        const cached = await client.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const problems = await Problem.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "fullName role coverImage");

        const total = await Problem.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        const responseData = {
            message: "Fetched problems successfully",
            page,
            limit,
            total,
            totalPages,
            results: problems.length,
            problems
        };

        await client.setex(cacheKey, 600, JSON.stringify(responseData));

        return res.status(200).json(responseData);

    } catch (error) {
        console.error("Failed to fetch problems", error);
        return res.status(500).json({ message: "Failed to fetch problems" });
    }
};

const getProblemById = async (req, res) => {
    try {
        const { problemId } = req.params;
        if (!problemId) return res.status(400).json({ message: "Problem ID is required" })
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem ID" })
        }

        const problem = await Problem.findOneAndUpdate(
            { _id: problemId, isDeleted: false },
            { $inc: { views: 1 } },
            { new: true }
        ).populate("createdBy", "fullName");

        if (!problem) return res.status(404).json({ message: "Problem not found" })



        return res.status(200).json({
            message: "Problem fetched successfully",
            problem
        })

    } catch (error) {
        console.error("Failed to fetch problem", error)
        return res.status(500).json({ message: "Failed to fetch problem" })
    }
}

const deleteProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem ID" })
        }

        const problem = await Problem.findOneAndUpdate(
            {
                _id: problemId,
                createdBy: req.user._id,
                isDeleted: false
            },
            {
                $set: { isDeleted: true }
            },
            { new: true }
        )

        if (!problem) return res.status(404).json({ message: "Problem not found or already deleted" })

        return res.status(200).json({
            message: "Problem Deleted successfully",
            problem
        })
    } catch (error) {
        console.error("Failed to delete problem")
        return res.status(500).json({ message: "Failed to delete problem" })
    }
}

const toggleDeleteProblemVisibility = async (req, res) => {
    try {
        const { problemId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem ID" })
        }

        if (req.user.role !== "admin") return res.status(403).json({ message: "Only Admins can toggle visibility" })

        const problem = await Problem.findById(problemId)
        if (!problem) return res.status(404).json({ message: "Problem not found" })

        problem.isDeleted = !problem.isDeleted
        await problem.save()

        await logAdminAction({
            adminId: req.user._id,
            action: problem.isDeleted ? "HIDE_PROBLEM" : "UNHIDE_PROBLEM",
            entityType: "Problem",
            entityId: problem._id
        })

        return res.status(200).json({
            message: `Problem ${problem.isDeleted ? "Hidden" : "Visible"} successfully`,
            problem
        })
    } catch (error) {
        console.error("Failed to toggle problem visibility", error)
        return res.status(500).json({ message: "Failed to toggle problem visibility" })
    }
}

const getMyProblems = async (req, res) => {
    try {
        const problems = await Problem.find({
            createdBy: req.user._id,
            isDeleted: false
        }).sort({ createdAt: -1 })

        if (problems.length === 0) {
            return res.status(200).json({
                message: "Fetched your problems",
                problems: []
            })
        }

        return res.status(200).json({
            message: "Fetched your problems",
            count: problems.length,
            problems
        })
    } catch (error) {
        console.error("Failed to fetch your problems", error)
        return res.status(500).json({ message: "Failed to fetch your problems" })
    }
}

// ------------------------------------ PRO USER ----------------------------------------

const togglePinProblem = async (req, res) => {
    try {
        const { problemId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(problemId)) {
            return res.status(400).json({ message: "Invalid Problem ID" })
        }

        const user = await User.findById(req.user?._id)

        // console.log(user.isPro)
        if (!user.isPro) {
            return res.status(403).json({ message: "Only Pro users can access this privilege" })
        }

        const problem = await Problem.findOne({
            _id: problemId,
            isDeleted: false
        })
        if (!problem) return res.status(404).json({ message: "Problem not found or deleted" })

        if (problem.createdBy.toString() !== req.user._id) {
            return res.status(403).json({ message: "You doent own this problem" })
        }

        problem.isPinned = !problem.isPinned
        await problem.save()

        return res.status(200).json({
            message: `The problem is ${problem.isPinned ? "Pinned" : "Unpinned"}`,
            problem
        })

    } catch (error) {
        console.error("Failed to toggle Problem Pin", error)
        return res.status(500).json({ message: "Failed to toggle Problem Pin" })
    }
}

const getPinnedProblems = async (req, res) => {
    try {
        const pinnedProblems = await Problem.find({
            isDeleted: false,
            isPinned: true
        })
            .populate("createdBy", "fullName role email")
            .sort({ createdAt: -1 })
            .lean()

        return res.status(200).json({
            message: "Fetched all pinned problems",
            count: pinnedProblems.length,
            pinnedProblems
        })
    } catch (error) {
        console.error("Failed to fetch pinned Problems", error)
        return res.status(500).json({ message: "Failed to fetch pinned Problems" })
    }
}

export {
    createProblem,
    getProblems,
    getProblemById,
    deleteProblem,
    toggleDeleteProblemVisibility,
    getMyProblems,
    togglePinProblem,
    getPinnedProblems,
    updateMyProblem
}