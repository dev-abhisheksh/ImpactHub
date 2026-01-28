import jwt from "jsonwebtoken"

export const socketAuth = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Unauthorized"))

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            if (!decoded?._id) return next(new Error("Unauthorized"))

            socket.user = { _id: decoded._id, role: decoded.role };
            next();
        } catch (error) {
            next(new Error("Unauthorized"))
        }
    })
}