import mongoose from "mongoose";

const schema = new mongoose.Schema({
    initialSync: {
        type: String,
        required: false,
        default: null,
    },
    lastUpdate: {
        type: String,
        required: false,
        default: null,
    },
});

export default mongoose.model("config", schema);
