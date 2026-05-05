FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN pnpm install --filter @devhub/api... --frozen-lockfile=false

FROM deps AS build
COPY apps/api apps/api
RUN pnpm --filter @devhub/api prisma:generate && pnpm --filter @devhub/api build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
EXPOSE 4000
CMD ["pnpm", "--filter", "@devhub/api", "start"]
