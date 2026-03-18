const crypto = require("crypto");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalKey] = storedHash.split(":");
  if (!salt || !originalKey) return false;

  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");

  const a = Buffer.from(derivedKey, "hex");
  const b = Buffer.from(originalKey, "hex");

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
