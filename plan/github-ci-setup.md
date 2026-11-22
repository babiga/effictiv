# Effictiv accounts and GitHub CI deployment

Effictiv uses a GitHub App for sign-in and read-only access to GitHub Actions results. Register a separate GitHub App and use a separate PostgreSQL database for the Vercel preview. Use a stable preview URL that browsers and GitHub webhooks can reach.

## GitHub App

- Set the homepage to the Effictiv origin and the callback URL to `<origin>/api/auth/github/callback`. Set the setup URL to `<origin>/dashboard/import`.
- Enable expiring user tokens and allow users to install the app on their accounts or organizations. Keep **Request user authorization during installation** disabled. Users sign in before installing.
- Set repository **Actions** to **Read-only** and retain the required read-only **Metadata** permission. Subscribe to **Workflow run** events. GitHub also delivers installation lifecycle events to the app.
- Enable the webhook at `<origin>/api/github/webhook`. Set a random webhook secret and generate a private key.

## Vercel environment

Configure these values as runtime environment variables for the corresponding environment. For production, use `https://effictiv.vercel.app` as the origin.

| Variable | Value |
| --- | --- |
| `EFFICTIV_URL` | Canonical public origin. Use the same origin in GitHub App settings. |
| `DATABASE_URL` | TLS-enabled PostgreSQL connection URL. Use the existing production database if configured. |
| `GITHUB_APP_SLUG` | GitHub App slug used in installation links. |
| `GITHUB_APP_CLIENT_ID` | GitHub App client ID. |
| `GITHUB_APP_CLIENT_SECRET` | GitHub App client secret. |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key PEM. Literal newlines and escaped newlines are supported. |
| `GITHUB_APP_WEBHOOK_SECRET` | Secret matching GitHub's webhook configuration. |
| `EFFICTIV_TOKEN_KEY` | A stable 32-byte, base64-encoded key for GitHub credentials. Generate with `openssl rand -base64 32`. |
| `CRON_SECRET` | A random token used for the Vercel retry job. |
| `EFFICTIV_PILOT_WRITE_TOKEN` | Existing trusted pilot upload credential. Retain it for the pilot import scripts. |

Install dependencies with `npm ci`. With the target `DATABASE_URL` available in your shell, apply forward migrations with `npm run db:migrate` before deploying. This keeps existing measurement and comparison rows. The Vercel retry job runs daily after production deployment. Preview retries can be exercised through **Sync now**.

## Local verification

Run `npm run build`, then run `npm run test:github-ci` with `EFFICTIV_TEST_DATABASE_URL` set to a disposable PostgreSQL database. The test uses the Playwright Chromium installation from `benchmarks/dashboard`, the local `zip` command, and a GitHub API stub. It verifies the application flow without external credentials.

## Release checks

1. Open the Vercel preview and register with GitHub. Sign out and sign back in. Install the preview GitHub App for a public npm repository and a private npm repository, then import both.
2. Commit the two files from **Set up CI measurements** to each default branch. Wait for Actions to finish and confirm the run appears in Effictiv without clicking **Sync now**. On a supported public runner, compare the row and CSV against the artifact. Confirm the private two-vCPU runner shows the build outcome and unavailable energy.
3. Confirm a second account without access receives a project-not-found response for the project, CSV, and stored artifact. Remove access in GitHub and repeat the check with the original account.
4. Configure production, migrate its database, and deploy. Confirm the [pilot CI endpoint](https://effictiv.vercel.app/api/v1/projects/1306723014/ci-runs) returns HTTP 200. Repeat the sign-in, import, and automatic run check against production.

Effictiv stores the verified collector JSON for authenticated project access after the GitHub artifact expires. Webhook delivery replays and **Sync now** use the same repository, run, and attempt identity. **Sync now** checks the latest 20 completed workflow runs on the current default branch.
