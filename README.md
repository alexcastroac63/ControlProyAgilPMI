# Enterprise DevOps Hub

SaaS enterprise-grade tipo Jira Software + Azure DevOps + Monday.com para gestión de portafolio, proyectos Scrum, QA, equipos, dashboards ejecutivos, reportería e integración GitHub.

## Stack

- Frontend: Next.js 16, React, TypeScript, Tailwind CSS, ShadCN-style UI, Zustand, React Query.
- Backend: NestJS, Node.js, TypeScript, Prisma ORM.
- Database: PostgreSQL.
- Auth: correo/clave, JWT, refresh token, recuperación de contraseña, sesiones activas.
- Infra: Docker, Docker Compose, GitHub Actions.
- Enterprise: RBAC, multi-tenant, auditoría, logs, WebSockets, GitHub API.

## Estructura

```txt
/apps/web              Next.js enterprise UI
/apps/api              NestJS REST API + Swagger + Prisma
/packages/ui           Componentes UI compartidos
/packages/types        Tipos compartidos
/packages/config       Configuración compartida
/.github/workflows     CI/CD
/scripts               Scripts dev/prod
```

## Arquitectura Hexagonal

La API está organizada por módulos de dominio (`auth`, `projects`, `portfolio`, `backlog`, `sprints`, `boards`, `qa`, `github`, `reports`, `notifications`). Cada módulo expone controladores REST como adaptadores de entrada, servicios de aplicación con reglas de negocio y Prisma como adaptador de persistencia. La separación por módulos permite extraer casos de uso, repositorios e integraciones externas sin acoplar la lógica de dominio al transporte HTTP.

## Ejecutar

```powershell
Copy-Item .env.example .env
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

URLs:

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

Credenciales demo:

- Email: `admin@devhub.local`
- Password: `Admin12345!`

## Docker

```powershell
docker compose up --build -d
```

La composición Docker separa la UI y las funciones backend por dominio:

- `ui`: Next.js en `http://localhost:3000`.
- `api-gateway`: Nginx en `http://localhost:4000/api`.
- `api-dashboard`: módulos Dashboard, Reports y Notifications.
- `api-projects`: módulos Projects, Portfolio y Reports.
- `api-scrum-board`: módulos Backlog, Sprints y Boards/WebSocket.
- `api-qa`: módulo QA.
- `api-github`: módulo GitHub.
- `api-teams`: módulos Auth, Users y Notifications.
- `settings`: configuración de almacenamiento local/SharePoint y dominios Microsoft permitidos, expuesto por `api-teams`.

Cada backend usa la misma imagen NestJS y selecciona sus funciones con `API_MODULE`.
Puertos directos de diagnóstico: `4101` Dashboard, `4102` Projects, `4103` Scrum Board, `4104` QA, `4105` GitHub, `4106` Teams.

## Módulos Implementados

- Auth local con JWT, refresh token, sesiones activas, bloqueo por intentos fallidos y recuperación por correo demo.
- Multiempresa con `organizations` y aislamiento por `organizationId`.
- RBAC con roles, permisos y guards.
- Portafolio con programas, proyectos, objetivos estratégicos, presupuestos y riesgos.
- Proyectos con estados, presupuestos, sponsor, PM, Scrum Master, Product Owner y área de negocio.
- Backlog con épicas, features, historias, tasks, bugs, spikes, prioridades, story points, comentarios, adjuntos y dependencias.
- Sprints con goal, fechas, velocity, capacity, inicio/cierre y relación de tickets.
- Scrum Board con columnas configurables, WIP limits, WebSockets y movimiento de tickets.
- QA con suites, casos, ejecuciones, evidencias y matriz de trazabilidad.
- GitHub API para repos, branches, commits, PRs y releases, más webhook para vincular `PROY-123`.
- Dashboard ejecutivo con métricas, velocity y heatmap.
- Reportería CSV y base extensible para PDF/Excel.
- Notificaciones email/in-app/Teams/Slack modeladas y WebSocket-ready.
- Auditoría y logs de actividad modelados.

## Scripts

```powershell
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
corepack pnpm prod
corepack pnpm db:migrate
corepack pnpm db:seed
```

## Variables

Ver `.env.example`.

Variables clave para Microsoft/SharePoint:

- `MICROSOFT_AUTH_ENABLED=true`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI=http://localhost:4000/api/auth/microsoft/callback`
- `MICROSOFT_ALLOWED_DOMAINS=empresa.com,otrodominio.com`
- `ATTACHMENT_STORAGE_PROVIDER=local` o `sharepoint`
- `ATTACHMENT_LOCAL_BASE_PATH`
- `SHAREPOINT_SITE_ID`, `SHAREPOINT_DRIVE_ID`, `SHAREPOINT_FOLDER_PATH`
