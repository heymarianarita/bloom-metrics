// Throwaway MySQL 8 for local development (npm run db:dev). Data lives only while it runs;
// the API re-creates the schema and imports server/seed/lovable-export.sql on start.
import { createDB } from "mysql-memory-server";

const db = await createDB({ version: "8.0.x", dbName: "bloom", port: 33306, downloadBinaryOnce: true });
console.log(`dev MySQL ready on 127.0.0.1:${db.port} (user ${db.username}, database ${db.dbName})`);

const stop = async () => {
  await db.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
