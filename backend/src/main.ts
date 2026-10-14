import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import express from "express";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { assignRequestId } from "./common/request-context";
import { UploadsService } from "./uploads/uploads.service";

function allowedOrigins() {
  return (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const isProduction = process.env.NODE_ENV === "production";
  const app = await NestFactory.create(AppModule, { rawBody: false, bodyParser: false });
  app.enableShutdownHooks();
  app.setGlobalPrefix("api/v1");

  const express_ = app.getHttpAdapter().getInstance();
  express_.disable("x-powered-by");
  // Only trust the exact number of proxies in front of this service: trusting
  // more lets a client forge its own address for rate limits and audit logs.
  const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  if (trustedProxyHops > 0) express_.set("trust proxy", trustedProxyHops);

  // First in the chain: everything after it, including body-parser failures,
  // can then be correlated by request id.
  app.use(assignRequestId);

  const swaggerEnabled = !isProduction || process.env.ENABLE_SWAGGER === "true";
  app.use(helmet({
    // Images are served from this host to a separate frontend origin.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // A JSON API should load nothing at all; Swagger UI needs its own inline assets.
    contentSecurityPolicy: {
      directives: swaggerEnabled
        ? { "default-src": ["'self'"], "script-src": ["'self'", "'unsafe-inline'"], "style-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "data:"], "frame-ancestors": ["'none'"] }
        : { "default-src": ["'none'"], "img-src": ["'self'", "data:"], "frame-ancestors": ["'none'"] },
    },
    hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: false } : false,
    referrerPolicy: { policy: "no-referrer" },
  }));
  app.use(cookieParser());

  // Bounded bodies: uploads go through multipart, so JSON never needs to be large.
  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));

  if ((process.env.STORAGE_DRIVER ?? "local") === "local") {
    app.use("/media", app.get(UploadsService).publicMediaGate(), express.static(resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads"), {
      immutable: true,
      maxAge: "1y",
      fallthrough: false,
      index: false,
      dotfiles: "deny",
    }));
  }

  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    // Validation messages describe the client's own payload, never server state.
    disableErrorMessages: false,
  }));

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("A7 Property API")
      .setDescription("Myanmar property marketplace API. Access tokens are Bearer JWTs; the rotating refresh token is an HttpOnly cookie scoped to /api/v1/auth.")
      .setVersion(process.env.APP_VERSION ?? "1.0")
      .addBearerAuth()
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig), { useGlobalPrefix: false });
    logger.warn("Swagger UI is enabled at /api/docs");
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, process.env.API_BIND_ADDRESS ?? "0.0.0.0");
  logger.log(`API listening on port ${port} (${process.env.NODE_ENV ?? "development"})`);
  if (!process.env.REDIS_URL) logger.warn("REDIS_URL is not set: rate limits are per-process and only correct on a single replica");
  if (process.env.ENABLE_JOBS === "false") logger.log("Scheduled maintenance jobs are disabled on this replica");
}

void bootstrap();
