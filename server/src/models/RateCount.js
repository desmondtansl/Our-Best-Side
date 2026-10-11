import mongoose from "mongoose";

const { Schema } = mongoose;

// A count of requests for one limit (e.g. "login attempts for this email
// from this address") within one time window. MongoDB deletes each count
// once its window has passed (the TTL index on expiresAt).
const rateCountSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model("rateCount", rateCountSchema);
