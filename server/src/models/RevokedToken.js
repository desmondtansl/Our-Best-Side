import mongoose from "mongoose";

const { Schema } = mongoose;

// A login ended with "Log out": its token's session id (`sid`) is kept here
// until the token would have expired anyway, and tokens carrying it are
// refused (see tokens.js).
const revokedTokenSchema = new Schema({
  sid: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model("revokedToken", revokedTokenSchema);
