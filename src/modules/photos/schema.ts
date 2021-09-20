import mongoose from "mongoose";

const schema = new mongoose.Schema({
    listingKey: String,
    listingId: String,
    photos: [String],
});

export default mongoose.model("photos", schema);
