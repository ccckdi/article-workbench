import { createApp } from "./app.js";
const app = await createApp({ logger: true });
const port = Number(process.env.PORT || "3001");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT 必须是有效端口");
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}
try {
  await app.listen({ port, host: process.env.HOST || "127.0.0.1" });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
