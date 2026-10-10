import mongoose from "mongoose";

const { Schema } = mongoose;

// One entry each time admin access is granted or removed from the site.
const adminAccessLogSchema = new Schema(
  {
    action: { type: String, enum: ["grant", "revoke"], required: true },
    // Whose access changed, and who changed it (both stored as emails so the
    // log still reads correctly if an account is later deleted).
    email: { type: String, required: true },
    by: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("adminAccessLog", adminAccessLogSchema);
