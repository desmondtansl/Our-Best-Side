// Password rules for new accounts.
export const MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password; anything longer would
// be silently cut, so longer passwords are refused instead.
export const MAX_BYTES = 72;

// Some of the most used passwords, which are tried first by anyone guessing.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd",
  "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000",
  "87654321", "11223344", "123123123", "qwerty123", "qwertyuiop", "qwerty12",
  "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "abc12345", "abcd1234", "aa123456",
  "iloveyou", "iloveyou1", "letmein1", "welcome1", "welcome123", "admin123",
  "sunshine", "football", "baseball", "superman", "princess", "starwars",
  "trustno1", "whatever", "ourbestside",
]);

// The reason a password can't be used, or null if it's fine.
export const passwordProblem = (password, email = "") => {
  if (typeof password !== "string") return "Enter a password";
  if (password.length < MIN_LENGTH) return `Your password must be at least ${MIN_LENGTH} characters`;
  if (Buffer.byteLength(password, "utf8") > MAX_BYTES) {
    return `Your password can be at most ${MAX_BYTES} characters`;
  }
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "That password is too common. Please choose another.";
  const [name] = String(email).toLowerCase().split("@");
  if (lower === String(email).toLowerCase() || (name.length >= 4 && lower === name)) {
    return "Your password can't be your email address";
  }
  return null;
};
