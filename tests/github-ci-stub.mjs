import { readFile } from "node:fs/promises";

const fetchNetwork = globalThis.fetch;
const json = (data, status = 200) => Response.json(data, { status });

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (!["github.com", "api.github.com", "effictiv-test.blob.core.windows.net"].includes(url.hostname)) {
    return fetchNetwork(input, init);
  }

  const { repositories, runs, revoked, unavailable } = JSON.parse(await readFile(process.env.EFFICTIV_GITHUB_TEST_STATE, "utf8"));
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  const token = headers.get("authorization")?.slice("Bearer ".length);
  const path = url.pathname;

  if (path === "/login/oauth/access_token") {
    const request = new URLSearchParams(init?.body);
    const login = request.get("code");
    if (!["alice", "bob"].includes(login) || !request.get("code_verifier")) return json({ error: "bad_verification_code" });
    return json({ access_token: login, refresh_token: `refresh-${login}`, expires_in: 28_800 });
  }
  if (path === "/user") {
    if (!["alice", "bob"].includes(token)) return json({}, 401);
    return json({ id: token === "alice" ? 11 : 12, login: token, name: token === "alice" ? "Alice" : "Bob", avatar_url: null });
  }
  if (path === "/user/installations") {
    return json({ installations: [{ id: 702, account: { login: "test-org" }, suspended_at: null }] });
  }
  if (path === "/user/installations/702/repositories") {
    const allowed = repositories.filter((repo) => (token === "alice" || (token === "bob" && !repo.private))
      && !revoked.includes(repo.id));
    return json({ repositories: allowed });
  }
  if (path === "/app/installations/702/access_tokens") {
    const { repository_ids, permissions } = JSON.parse(init.body);
    if (!token || token.split(".").length !== 3 || repository_ids.length !== 1 || permissions.actions !== "read") {
      return json({}, 403);
    }
    const id = repository_ids[0];
    return repositories.some((repo) => repo.id === id) ? json({ token: String(id) }) : json({}, 404);
  }
  if (path.startsWith("/repositories/")) {
    const repository = repositories.find(({ id }) => path === `/repositories/${id}` && token === String(id));
    return repository ? json(repository) : json({}, 404);
  }
  if (url.hostname === "effictiv-test.blob.core.windows.net") {
    if (headers.has("authorization")) return json({}, 403);
    const candidate = Object.values(runs).find(({ source }) => path === `/${source.id}.zip`);
    if (!candidate) return json({}, 404);
    if (unavailable.includes(candidate.run.id)) return json({}, 503);
    return new Response(await readFile(candidate.archivePath));
  }

  const repo = repositories.find(({ id, full_name }) => path.startsWith(`/repos/${full_name}/`) && token === String(id));
  if (!repo) return json({}, 404);
  const suffix = path.slice(`/repos/${repo.full_name}`.length);
  const candidates = Object.values(runs).filter(({ repositoryId }) => repositoryId === repo.id);
  if (suffix === "/actions/workflows/effictiv-energy.yml/runs") {
    return json({ workflow_runs: candidates.filter(({ manual }) => manual).map(({ run }) => run) });
  }
  for (const { run, source } of candidates) {
    if (suffix === `/actions/runs/${run.id}/attempts/${run.run_attempt}`) return json(run);
    if (suffix === `/actions/runs/${run.id}/artifacts`) return json({ artifacts: [source] });
    if (suffix === `/actions/artifacts/${source.id}/zip`) {
      return Response.redirect(`https://effictiv-test.blob.core.windows.net/${source.id}.zip`, 302);
    }
  }
  return json({}, 404);
};
