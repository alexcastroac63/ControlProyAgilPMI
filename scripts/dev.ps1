Copy-Item .env.example .env -ErrorAction SilentlyContinue
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
