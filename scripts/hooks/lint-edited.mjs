// Claude Code PostToolUse 훅: 방금 수정한 .ts/.tsx 파일 하나만 ESLint로 검사한다.
// 에러가 있으면 exit 2로 stderr를 Claude에게 돌려주고, 경고만 있거나 대상이 아니면 조용히 끝낸다.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let filePath;
try {
  const input = JSON.parse(raw);
  filePath = input.tool_input?.file_path ?? input.tool_response?.filePath;
} catch {
  process.exit(0);
}
if (!filePath || !/\.(ts|tsx)$/.test(filePath)) process.exit(0);

const abs = path.resolve(filePath);
const rel = path.relative(root, abs);
if (rel.startsWith("..") || rel.split(path.sep).some((p) => ["node_modules", "generated", ".next"].includes(p))) {
  process.exit(0);
}

const eslint = new ESLint({ cwd: root });
if (await eslint.isPathIgnored(abs)) process.exit(0);

let result;
try {
  [result] = await eslint.lintFiles([abs]);
} catch {
  process.exit(0); // 파일이 사라졌거나 ESLint 설정 문제: 편집을 막지 않는다
}
if (result && result.errorCount > 0) {
  const formatter = await eslint.loadFormatter("stylish");
  process.stderr.write(`ESLint 에러 (${rel}):\n${await formatter.format([result])}`);
  process.exit(2);
}
