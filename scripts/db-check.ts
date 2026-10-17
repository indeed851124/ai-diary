// DB 연결 점검: `npm run db:check`
// 앱과 같은 설정(src/lib/db-config.ts)으로 접속해 SSL 사용 여부와 테이블 존재 여부를 보여준다.
import "dotenv/config";
import type { TLSSocket } from "node:tls";
import pg from "pg";
import { getPoolConfig } from "../src/lib/db-config";

async function main() {
  const config = getPoolConfig();
  const pool = new pg.Pool({ ...config, max: 1, connectionTimeoutMillis: 10_000 });

  try {
    // 앱 → DB(또는 풀러) 구간의 TLS 상태. pg_stat_ssl은 풀러 → DB 구간이라 여기서는 쓰지 않는다.
    const client = await pool.connect();
    const socket = (client as unknown as { connection: { stream: Partial<TLSSocket> } }).connection.stream;
    const tls = socket.encrypted
      ? `TLS ${socket.getProtocol?.()} / 인증서 검증 ${socket.authorized ? "성공" : `실패 (${socket.authorizationError})`}`
      : "암호화 안 됨";
    client.release();

    const { rows } = await pool.query<{ version: string; db: string }>(
      "select version() as version, current_database() as db",
    );
    const { rows: tables } = await pool.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name in ('User', 'Diary', 'Analysis')
      order by table_name
    `);

    const host = new URL(config.connectionString!).host;
    console.log(`연결 성공: ${host} / ${rows[0].db}`);
    console.log(`서버: ${rows[0].version.split(",")[0]}`);
    console.log(`연결 암호화: ${tls}`);
    console.log(`테이블: ${tables.map((t) => t.table_name).join(", ") || "없음 — npm run db:deploy로 마이그레이션을 적용하세요"}`);
  } catch (error) {
    console.error("연결 실패:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
