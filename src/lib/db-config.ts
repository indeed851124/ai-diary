import fs from "node:fs";
import path from "node:path";
import type { PoolConfig } from "pg";

/**
 * 앱(런타임)이 쓰는 pg 커넥션 풀 설정.
 *
 * - DATABASE_URL: Supabase에서는 Transaction pooler(포트 6543) 주소를 쓴다.
 * - DATABASE_SSL_CA: Supabase CA 인증서. PEM 내용을 그대로 넣거나 파일 경로를 넣는다.
 *   Supabase는 자체 루트 CA로 서명한 인증서를 쓰기 때문에, 이 값이 없으면 인증서 검증에 실패한다.
 *   값이 있으면 URL의 sslmode 옵션은 무시하고 이 CA로 인증서와 호스트 이름을 검증한다.
 * - DATABASE_POOL_MAX: 인스턴스당 최대 커넥션 수 (기본 5). 서버리스 배포에서는 1~2로 낮춘다.
 */
export function getPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경 변수가 없습니다.");

  const ca = readCa(env.DATABASE_SSL_CA);
  const max = Number(env.DATABASE_POOL_MAX) || 5;

  if (!ca) {
    if (isSupabase(url)) {
      throw new Error(
        "Supabase에 연결하려면 DATABASE_SSL_CA가 필요합니다. " +
          "대시보드 Database Settings > SSL Configuration에서 인증서를 내려받아 경로나 PEM 내용을 넣어 주세요.",
      );
    }
    return { connectionString: url, max }; // 로컬 DB (prisma dev 등)
  }

  // URL에 sslmode가 있으면 pg가 아래 ssl 설정을 덮어쓰므로 지운다.
  const parsed = new URL(url);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    parsed.searchParams.delete(key);
  }
  return {
    connectionString: parsed.toString(),
    max,
    ssl: { ca, rejectUnauthorized: true },
  };
}

function isSupabase(url: string) {
  try {
    return /\.supabase\.(com|co)$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function readCa(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  // 환경 변수 한 줄에 넣느라 \n으로 이스케이프한 경우도 받는다.
  if (trimmed.startsWith("-----BEGIN")) return trimmed.replace(/\\n/g, "\n");
  // 경로는 실행 시점에 정해지므로 번들러가 추적하지 않게 한다 (프로젝트 전체가 서버 번들에 들어가는 것 방지).
  // 배포 환경에서는 파일 대신 PEM 내용을 넣는다.
  return fs.readFileSync(path.resolve(/*turbopackIgnore: true*/ process.cwd(), trimmed), "utf8");
}
