FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN pnpm install --filter @devhub/web... --frozen-lockfile=false

FROM deps AS build
COPY apps/web apps/web
RUN pnpm --filter @devhub/web build

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@devhub/web", "start"]
