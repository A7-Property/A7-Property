FROM node:22-bookworm-slim AS base
# Prisma's migration engine needs OpenSSL; public HTTPS services need CA roots.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN DATABASE_URL=postgresql://a7:a7@localhost:5432/a7_property npm run db:generate && npm run build

# Run migrations and administrator bootstrap as separate, one-off jobs.
FROM build AS tools
USER node
CMD ["npm", "run", "db:deploy"]

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=4000
WORKDIR /app
COPY package.json package-lock.json ./
# Prisma Client's optional peer installs the CLI even with --omit=dev.
# Remove that tooling explicitly; generated clients use @prisma/client/runtime.
RUN npm ci --omit=dev && rm -rf node_modules/prisma node_modules/.bin/prisma && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e 'fetch(`http://127.0.0.1:${process.env.PORT}/api/v1/health/ready`).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "dist/main.js"]
