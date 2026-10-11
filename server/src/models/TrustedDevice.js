import mongoose from "mongoose";

const { Schema } = mongoose;

// A browser that has logged in to an account successfully. The account-wide
// login limit doesn't block it, so wrong passwords typed by someone else
// can't lock the owner out of their own device. `key` is a hash of the
// email and the browser's random device id; it expires 90 days after the
// last successful login.
const trustedDeviceSchema = new Schema({
  key: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model("trustedDevice", trustedDeviceSchema);
