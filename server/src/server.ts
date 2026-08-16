import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./db.js";

const config = loadConfig();
await connectDatabase(config.MONGODB_URI);
const app = await buildApp(config);

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Encerrando o servidor");
  await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  await disconnectDatabase();
  process.exit(1);
}
