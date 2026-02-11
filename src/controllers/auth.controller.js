import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import hashToken from "../utils/hashToken.js";
import { ExpertApplication } from "../models/expertApplication.model.js";
import { sendOtpEmail } from "../services/email.service.js";
import { OTP } from "../models/otp.model.js";

export const generateAccessToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};


export const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );
};



const registerUser = async (req, res) => {
    try {
        let { fullName, email, password, confirmPass } = req.body;

        if (!fullName || !email || !password || !confirmPass) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (password !== confirmPass) {
            return res.status(400).json({ message: "Passwords must match" });
        }

        email = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString()

        const hashedPassword = await bcrypt.hash(password, 10);

        await OTP.deleteMany({ email })

        await OTP.create({
            email,
            otp,
            fullName: fullName.trim(),
            password: hashedPassword,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        })

        await sendOtpEmail(email, otp)

        // await User.create({
        //     fullName: fullName.trim(),
        //     email,
        //     password: hashedPassword,
        //     role: "user",
        // });

        return res.status(200).json({
            message: "OTP sent to your email",
        });
    } catch (error) {
        console.error("Registration failed:", error);
        return res.status(500).json({ message: "Registration failed" });
    }
};

const verifyOTP = async (req, res) => {
    try {
        let { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "All fields are required" });
        }

        email = email.trim().toLowerCase();

        const otpRecord = await OTP.findOne({ email });

        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        if (otpRecord.otp !== otp) return res.status(400).json({ message: "Incorrect OTP" })

        const newUser = await User.create({
            fullName: otpRecord.fullName,
            email: otpRecord.email,
            password: otpRecord.password,
            role: "user",
        });

        await OTP.deleteMany({ email });

        return res.status(201).json({
            message: "Account verified and created successfully",
            userId: newUser._id,
        });
    } catch (error) {
        console.error("OTP verification failed:", error);
        return res.status(500).json({ message: "Verification failed" });
    }
}

const registerExpert = async (req, res) => {
    try {
        if (req.user.role === "expert") {
            return res.status(400).json({ message: "You're already an expert" });
        }

        const { bio, experience, expertCategories, portfolioLink } = req.body;
        if (!bio || !expertCategories?.length) {
            return res.status(400).json({ message: "Bio and expert categories are required" });
        }

        const existingApplication = await ExpertApplication.findOne({
            userId: req.user._id,
            status: "pending"
        });

        if (existingApplication) {
            return res.status(400).json({
                message: "Your expert application is already under review"
            });
        }

        const expertApplication = await ExpertApplication.create({
            userId: req.user._id,
            bio: bio.trim(),
            experience,
            expertCategories,
            portfolioLink,
            status: "pending",
            reviewedBy: null
        });

        return res.status(201).json({
            message: "Expert application submitted successfully",
            expertApplication
        });

    } catch (error) {
        console.error("Failed to register as expert", error);
        return res.status(500).json({ message: "Failed to register as expert" });
    }
};


const loginWithPassword = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        email = email.trim().toLowerCase();

        const existingUser = await User
            .findOne({ email })
            .select("+password");

        if (!existingUser) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            existingUser.password
        );

        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }

        const accessToken = generateAccessToken(existingUser);
        const refreshToken = generateRefreshToken(existingUser);

        // existingUser.refreshTokens.push({
        //     tokenHash: hashToken(refreshToken),
        //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        // });

        await existingUser.save();

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Login successful",
            accessToken,
            fullName: existingUser.fullName,
            role: existingUser.role,
            Pro: existingUser.isPro
        });
    } catch (error) {
        console.error("Failed to login user:", error);
        return res.status(500).json({ message: "Failed to login user" });
    }
};

const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({
                message: "No refreshToken provided"
            })
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        if (!decoded?.userId) {
            return res.status(403).json({
                message: "Invlaid refresh token"
            })
        }

        const refreshTokenHash = hashToken(refreshToken)

        const user = await User.findOne({
            _id: decoded.userId,
            "refreshTokens.tokenHash": refreshTokenHash
        })

        if (!user) {
            await User.updateOne(
                { _id: decoded.userId },
                { $set: { refreshTokens: [] } }
            )

            return res.status(403).json({
                message: "Refresh Token reuse detected. Please login again"
            })
        }

        user.refreshTokens = user.refreshTokens.filter(
            (t) => t.tokenHash !== refreshTokenHash
        )

        const newAccessToken = generateAccessToken(user)
        const newRefreshToken = generateRefreshToken(user)

        user.refreshTokens.push({
            tokenHash: hashToken(newRefreshToken),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })

        await user.save()

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        return res.status(200).json({
            accessToken: newAccessToken,
        });
    } catch (error) {
        return res.status(403).json({
            message: "Session expired. Please login again."
        });
    }
}

const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) return res.status(204).send()

        const refreshTokenHash = hashToken(refreshToken)

        await User.updateOne(
            { "refreshTokens.tokenHash": refreshTokenHash },
            { $pull: { refreshTokens: { tokenHash: refreshTokenHash } } }
        );

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        })

        return res.status(200).json({
            message: "Logout successfull"
        })
    } catch (error) {
        console.error("Logout failed", error)
        return res.status(500).json({ message: "Logout failed" })
    }
}


export {
    registerUser,
    loginWithPassword,
    refreshAccessToken,
    logoutUser,
    registerExpert,
    verifyOTP
}