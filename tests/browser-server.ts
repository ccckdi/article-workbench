import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../server/database.js";
import { seedDatabase } from "../server/seed.js";
import { createApp } from "../server/app.js";

if (!existsSync("dist/web/index.html"))
  throw new Error("请先运行 npm run build");
const directory = mkdtempSync(join(tmpdir(), "workbench-browser-"));
const databasePath = join(directory, "browser.sqlite");
const db = openDatabase(databasePath);
seedDatabase(db);
db.close();
const app = await createApp({
  databasePath,
  allowedOrigins: ["http://127.0.0.1:4178"],
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  });
await app.listen({ host: "127.0.0.1", port: 4178 });
