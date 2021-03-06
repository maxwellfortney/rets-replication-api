import mongoose from "mongoose";

const schema = new mongoose.Schema({
    address: Object,
    agent: Object,
    geo: Object,
    internetAddressDisplay: Boolean,
    internetEntireListingDisplay: Boolean,
    listDate: String,
    listPrice: Number, //?number
    listingId: String,
    listingKey: String,
    mls: Object,
    // // mlsId: String,
    modified: String,
    office: Object,
    totalPhotos: String,
    photos: Array,
    // privateRemarks: String,
    property: Object,
    remarks: String,
    // // sales: {},
    school: Object,
    // // showingContactName: String,
    // // showingContactPhone: String,
    // // showingInstructions: String,
    // // specialListingConditions: String,
    tax: Object,
    terms: String,
    virtualTourUrl: String,
});

export default mongoose.model("properties", schema);
