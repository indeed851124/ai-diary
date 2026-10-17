// API 흐름 점검: 회원가입 → 일기 작성 → 권한 → 페이지 렌더링
// 사용법: 개발 서버와 DB를 띄운 뒤 `npm run e2e` (다른 주소면 `node scripts/e2e.mjs http://localhost:3000`)
// 실행할 때마다 테스트 계정이 DB에 새로 만들어진다.
const BASE = process.argv[2] ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${BASE}/login`); return; } catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error("server not up");
}

function cookieFrom(res) {
  const raw = res.headers.get("set-cookie") ?? "";
  return raw.split(";")[0];
}

async function post(path, body, cookie) {
  return fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
}

await waitForServer();
const stamp = Date.now();
const a = { email: `a${stamp}@test.dev`, password: "password123" };
const b = { email: `b${stamp}@test.dev`, password: "password123" };

let r = await post("/api/signup", { email: "bad", password: "x" });
check("signup rejects invalid input (400)", r.status === 400, (await r.json()).error);

r = await post("/api/signup", a);
check("signup A (201)", r.status === 201);
const cookieA = cookieFrom(r);
check("signup sets httpOnly session cookie", /HttpOnly/i.test(r.headers.get("set-cookie") ?? ""));

r = await post("/api/signup", a);
check("duplicate email (409)", r.status === 409);

r = await post("/api/login", { ...a, password: "wrongpass1" });
check("login wrong password (401)", r.status === 401);

r = await post("/api/login", a);
check("login A (200)", r.status === 200);

r = await post("/api/diaries", { content: "오늘은 발표를 망쳐서 속상했다. 그래도 친구가 위로해 줘서 조금 나아졌다." });
check("create diary without session (401)", r.status === 401);

r = await post("/api/diaries", { content: "   " }, cookieA);
check("empty diary rejected (400)", r.status === 400);

const t0 = Date.now();
r = await post("/api/diaries", { content: "오늘은 발표를 망쳐서 속상했다. 그래도 친구가 위로해 줘서 조금 나아졌다." }, cookieA);
const created = await r.json();
const diaryId = created.diary?.id;
check("create diary (201)", r.status === 201 && !!diaryId, `${Date.now() - t0}ms, analysis=${created.diary?.analysis ? "yes" : "null"}${created.error ? ", error=" + created.error : ""}`);

r = await fetch(`${BASE}/api/diaries`, { headers: { Cookie: cookieA } });
const list = await r.json();
check("list contains diary", list.diaries?.some((d) => d.id === diaryId));

r = await post("/api/signup", b);
const cookieB = cookieFrom(r);
r = await fetch(`${BASE}/api/diaries/${diaryId}`, { headers: { Cookie: cookieB } });
check("other user GET diary (404)", r.status === 404);
r = await post(`/api/diaries/${diaryId}/analyze`, undefined, cookieB);
check("other user re-analyze (404)", r.status === 404);
r = await fetch(`${BASE}/api/diaries`, { headers: { Cookie: cookieB } });
check("other user's list is empty", (await r.json()).diaries?.length === 0);

r = await fetch(`${BASE}/`, { redirect: "manual" });
check("home without cookie redirects to /login", r.status === 307 && r.headers.get("location")?.endsWith("/login"));

r = await fetch(`${BASE}/`, { headers: { Cookie: cookieA } });
const home = await r.text();
check("home renders for A", r.status === 200 && home.includes("오늘, 마음은 어땠나요?"));

r = await fetch(`${BASE}/diary/${diaryId}`, { headers: { Cookie: cookieA } });
const detail = await r.text();
check("detail renders diary content for A", r.status === 200 && detail.includes("발표를 망쳐서"));
check("detail shows retry UI when analysis missing", created.diary?.analysis ? true : detail.includes("답장 다시 받기"));

r = await fetch(`${BASE}/diary/${diaryId}`, { headers: { Cookie: cookieB } });
const detailB = await r.text();
check("detail hides diary from B", !detailB.includes("발표를 망쳐서"), `status ${r.status}`);

console.log(results.join("\n"));
if (results.some((line) => line.startsWith("FAIL"))) process.exit(1);
