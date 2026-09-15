import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Database } from "./database.js";
import type { User } from "../shared/types.js";

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  roles: string;
  password_salt: string;
  password_hash: string;
}
export const sessionCookie = "workbench_session";
export const sessionLifetime = 8 * 60 * 60;
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function passwordRecord(password: string) {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}
function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roles: JSON.parse(row.roles),
  };
}
export function authenticate(
  db: Database,
  username: string,
  password: string,
): User | null {
  const row = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username) as unknown as UserRow | undefined;
  const actual = scryptSync(
    password,
    row?.password_salt ?? "missing-account-salt",
    64,
  );
  const expected = row
    ? Buffer.from(row.password_hash, "hex")
    : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && row ? toUser(row) : null;
}
export function newSession(db: Database, userId: string) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  db.prepare(
    "INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(digest(token), userId, Date.now() + sessionLifetime * 1000);
  return token;
}
export function sessionUser(db: Database, token?: string): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT users.* FROM users JOIN sessions ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
    )
    .get(digest(token), Date.now()) as unknown as UserRow | undefined;
  return row ? toUser(row) : null;
}
export function removeSession(db: Database, token?: string) {
  if (token)
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(digest(token));
}
