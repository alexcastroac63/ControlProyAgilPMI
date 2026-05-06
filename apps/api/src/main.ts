import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix("api");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "https:", "'unsafe-inline'"],
          upgradeInsecureRequests: null
        }
      }
    })
  );
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const swagger = new DocumentBuilder()
    .setTitle("Enterprise DevOps Hub API")
    .setDescription("REST API documentada para autenticacion, usuarios, proyectos, backlog, sprints, Scrum Board, QA, GitHub, reportes, notificaciones y configuracion.")
    .setVersion("1.0.0")
    .addServer("http://localhost:4000", "API local")
    .addServer("http://localhost:3000/api", "Proxy web local")
    .addBearerAuth()
    .addTag("auth", "Registro, login, sesiones y recuperacion de contrasena")
    .addTag("users", "Administracion de usuarios, roles y perfiles")
    .addTag("portfolio", "Portafolios estrategicos y programas")
    .addTag("projects", "Administracion de proyectos, adjuntos, costos y personal")
    .addTag("backlog", "Historias de usuario, tareas, bugs, dependencias y prioridad")
    .addTag("sprints", "Creacion, actualizacion, inicio, cierre y eliminacion de sprints")
    .addTag("boards", "Scrum Board, estados, drag and drop y movimiento de tarjetas")
    .addTag("qa", "Suites, casos, ejecuciones, defectos y trazabilidad")
    .addTag("github", "Conexiones, repositorios, estadisticas y webhooks")
    .addTag("dashboard", "Indicadores ejecutivos y operativos")
    .addTag("reports", "Exportacion y reporteria")
    .addTag("notifications", "Notificaciones in-app y eventos")
    .addTag("settings", "Configuracion general, almacenamiento, correo y Microsoft")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swagger), {
    customSiteTitle: "Enterprise DevOps Hub API Docs",
    swaggerOptions: {
      defaultModelExpandDepth: 3,
      defaultModelsExpandDepth: 3,
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
      persistAuthorization: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  });

  await app.listen(config.get("API_PORT", 4000));
}

bootstrap();
