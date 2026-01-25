import mongoose from "mongoose";
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    try {
        const res = await mongoose.connect(process.env.MONGODB_URI)
        console.log(`MongoDB connected successfully ! || Connection host ${res.connection.host}`)
    } catch (error) {
        console.error("Failed to connect to DB", error)
        process.exit(1)
    }
}

export default connectDB