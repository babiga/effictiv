import "server-only";

import { database } from "@/lib/measurements/database";
import { accountGitHubToken, currentAccount } from "./accounts";
import { findInstalledRepository, GitHubError, listInstallationRepositories, type InstalledRepository } from "./client";

type Membership = { repositoryId: string; installationId: string | null };

export async function projectMemberships(accountId: string) {
  const { rows } = await database().query<Membership>(`
    SELECT p.repository_id AS "repositoryId", p.github_installation_id AS "installationId"
    FROM account_projects ap JOIN projects p USING (repository_id)
    WHERE ap.account_id = $1 AND NOT p.github_access_suspended
    ORDER BY ap.imported_at DESC, p.repository_id
  `, [accountId]);
  return rows;
}

export async function listAccessibleProjects(accountId: string) {
  const memberships = await projectMemberships(accountId);
  if (memberships.length === 0) return [];
  const token = await accountGitHubToken(accountId);
  const groups = new Map<string, Set<string>>();
  for (const { repositoryId, installationId } of memberships) {
    if (!installationId) continue;
    const ids = groups.get(installationId) ?? new Set<string>();
    ids.add(repositoryId);
    groups.set(installationId, ids);
  }

  const projects = new Map<string, InstalledRepository>();
  for (const [installationId, remaining] of groups) {
    try {
      for (let page = 1; remaining.size > 0; page++) {
        const repos = await listInstallationRepositories(token, installationId, page);
        for (const repo of repos) {
          if (remaining.delete(repo.id)) projects.set(repo.id, { ...repo, installationId });
        }
        if (repos.length < 100) break;
      }
    } catch (error) {
      if (!(error instanceof GitHubError && [404, 410].includes(error.status))) throw error;
    }
  }
  return memberships.flatMap(({ repositoryId }) => {
    const project = projects.get(repositoryId);
    return project ? [project] : [];
  });
}

export async function accessibleProject(accountId: string, repositoryId: string) {
  const { rows: [project] } = await database().query<Membership>(`
    SELECT p.repository_id AS "repositoryId", p.github_installation_id AS "installationId"
    FROM account_projects ap JOIN projects p USING (repository_id)
    WHERE ap.account_id = $1 AND ap.repository_id = $2 AND NOT p.github_access_suspended
  `, [accountId, repositoryId]);
  if (!project?.installationId) return null;
  try {
    const token = await accountGitHubToken(accountId);
    return await findInstalledRepository(token, project.installationId, repositoryId);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 401) return null;
    throw error;
  }
}

export async function currentProject(repositoryId: string) {
  const account = await currentAccount();
  return account ? accessibleProject(account.id, repositoryId) : null;
}

export async function importProject(accountId: string, repository: InstalledRepository) {
  const { id, full_name, private: privateRepo, default_branch, installationId } = repository;
  await database().query(`
    WITH project AS (
      INSERT INTO projects (repository_id, repository_name, github_installation_id, github_private, github_default_branch)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (repository_id) DO UPDATE SET repository_name = EXCLUDED.repository_name,
        github_installation_id = EXCLUDED.github_installation_id, github_private = EXCLUDED.github_private,
        github_default_branch = EXCLUDED.github_default_branch, github_access_suspended = false
      RETURNING repository_id
    )
    INSERT INTO account_projects (account_id, repository_id)
    SELECT $6, repository_id FROM project ON CONFLICT (account_id, repository_id) DO NOTHING
  `, [id, full_name, installationId, privateRepo, default_branch, accountId]);
}

export async function setInstallationAccess(installationId: string, suspended: boolean, repositoryIds?: string[]) {
  await database().query(`
    UPDATE projects SET github_access_suspended = $2
    WHERE github_installation_id = $1 AND ($3::bigint[] IS NULL OR repository_id = ANY($3))
  `, [installationId, suspended, repositoryIds ?? null]);
}
