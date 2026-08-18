import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Load environment variables from .env (Prisma CLI does not auto-load .env
// when prisma.config.ts exists)
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
