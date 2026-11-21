FROM node:22.22.0-bookworm-slim@sha256:7cc56ef285a8568121537d17b05e72128f01b89c54607b51acf084a50ef483f3

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 TZ=UTC PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY . .
RUN npm ci \
    && npm ci --prefix benchmarks/dashboard \
    && benchmarks/dashboard/node_modules/.bin/playwright-core install --with-deps --only-shell chromium \
    && NEXT_PUBLIC_EFFICTIV_BENCHMARK_DATE="$(node -p 'require("./benchmarks/dashboard/fixture.json").date')" npm run build \
    && npm cache clean --force

CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"]
