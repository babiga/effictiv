FROM node:22.22.0-bookworm-slim@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3 AS base
ENV NEXT_TELEMETRY_DISABLED=1 TZ=UTC

FROM base AS browser
WORKDIR /harness
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright EFFICTIV_BENCHMARK_SUMMARY_FILE=/tmp/effictiv-visits.json
COPY package.json package-lock.json ./
RUN npm ci && node_modules/.bin/playwright-core install --with-deps --only-shell chromium
COPY fixture.json visit.mjs ./
USER node
CMD ["sleep", "infinity"]

FROM base AS application
WORKDIR /app
ARG FIXTURE_DATE
RUN chown node:node /app
COPY --chown=node:node . .
USER node
RUN npm ci && NEXT_PUBLIC_EFFICTIV_BENCHMARK_DATE="$FIXTURE_DATE" npm run build && npm cache clean --force
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"]
