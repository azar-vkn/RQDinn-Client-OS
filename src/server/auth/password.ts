import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Readable temporary password for new portal users, e.g. "maple-7429-river". */
export function generateTempPassword() {
  const words = ["maple", "river", "cedar", "amber", "lotus", "coral", "sage", "ember", "harbor", "willow", "saffron", "pepper"];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${crypto.randomInt(1000, 9999)}-${pick()}`;
}
