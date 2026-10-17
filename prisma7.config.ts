import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 마이그레이션은 Transaction pooler(6543)를 거치면 실패할 수 있다.
    // Supabase에서는 DIRECT_URL에 Session pooler(5432)나 직접 연결 주소를 넣는다.
    // DIRECT_URL이 없으면 DATABASE_URL을 쓴다 (로컬 DB).
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
