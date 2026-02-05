import { Reputation } from "../models/reputation.model.js";
import { User } from "../models/user.model.js";

const POINTS_MAP = {
    commented: 1,
    solution_accepted: 5,
    reported: -5,
};

export const addReputationEvent = async ({ userId, solutionId, type }) => {
    

    const points = POINTS_MAP[type];
    if (points === undefined) return;

    if (type === "reported") {
        const exists = await Reputation.findOne({ userId, solutionId, type });
        if (exists) return;
    }

    const user = await User.findById(userId).select("role");
    const finalPoints = type !== "reported" && user.role === "expert" ? points * 2 : points;
    // console.log("ROLE AT ACCEPT:", user.role);

    await Reputation.create({ userId, solutionId, type, points: finalPoints, });
    await User.findByIdAndUpdate(userId, {
        $inc: { reputationPoints: finalPoints },
    });

};
