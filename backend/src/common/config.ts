import { plainToInstance } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from "class-validator";

class Environment {
  @IsIn(["development", "test", "production"])
  NODE_ENV = "development";

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*[smhd]$/)
  ACCESS_TOKEN_EXPIRES_IN = "15m";

  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*[smhd]$/)
  REFRESH_TOKEN_EXPIRES_IN = "7d";

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL = "http://localhost:3000";

  @IsOptional()
  @IsIn(["true", "false"])
  COOKIE_SECURE?: string;

  @IsIn(["local", "r2"])
  STORAGE_DRIVER = "local";

  @IsString()
  @IsNotEmpty()
  BACKEND_PUBLIC_URL = "http://localhost:4000";

  @IsString()
  @IsNotEmpty()
  UPLOAD_DIR = "uploads";

  @IsIn(["log", "smtp"])
  MAIL_DRIVER = "log";

  @IsOptional() @IsString() R2_ACCOUNT_ID?: string;
  @IsOptional() @IsString() R2_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() R2_SECRET_ACCESS_KEY?: string;
  @IsOptional() @IsString() R2_BUCKET_NAME?: string;
  @IsOptional() @IsString() R2_PUBLIC_URL?: string;
  @IsOptional() @IsString() R2_PRIVATE_BUCKET_NAME?: string;
  @IsOptional() @IsString() SMTP_HOST?: string;
  @IsOptional() @IsString() SMTP_PORT?: string;
  @IsOptional() @IsString() SMTP_USER?: string;
  @IsOptional() @IsString() SMTP_PASSWORD?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;
  @IsOptional() @IsIn(["true", "false"]) SMTP_SECURE?: string;
  @IsOptional() @IsIn(["true", "false"]) ENABLE_SWAGGER?: string;
  @IsOptional() @IsInt() @Min(0) TRUST_PROXY_HOPS?: number;

  @IsOptional()
  @IsString()
  @Matches(/^rediss?:\/\/\S+$/, { message: "REDIS_URL must be a redis:// or rediss:// URL" })
  REDIS_URL?: string;

  @IsIn(["true", "false"])
  ENABLE_JOBS = "true";

  @IsInt() @Min(1) @Max(10_000) THROTTLE_LIMIT = 60;
  @IsInt() @Min(1) @Max(3_600) THROTTLE_TTL_SECONDS = 60;
  @IsInt() @Min(1) @Max(100) LOGIN_MAX_FAILURES = 8;
  @IsInt() @Min(1) @Max(1_440) LOGIN_FAILURE_WINDOW_MINUTES = 15;
  @IsInt() @Min(1) @Max(1_440) LOGIN_LOCK_MINUTES = 15;
  @IsInt() @Min(1) @Max(1_000) LOGIN_MAX_FAILURES_PER_IP = 30;
  @IsInt() @Min(1) @Max(720) UPLOAD_ORPHAN_RETENTION_HOURS = 24;
  @IsInt() @Min(1) @Max(3_650) AUDIT_RETENTION_DAYS = 365;
  @IsInt() @Min(1) @Max(200) DATABASE_POOL_MAX = 10;
  @IsInt() @Min(1_000) @Max(120_000) DATABASE_STATEMENT_TIMEOUT_MS = 15_000;

  @IsOptional() @IsString() APP_VERSION?: string;
  @IsOptional() @IsEmail() ADMIN_BOOTSTRAP_EMAIL?: string;
  @IsOptional() @IsString() @MinLength(12) ADMIN_BOOTSTRAP_PASSWORD?: string;
}

const numericKeys = [
  "PORT", "TRUST_PROXY_HOPS", "THROTTLE_LIMIT", "THROTTLE_TTL_SECONDS",
  "LOGIN_MAX_FAILURES", "LOGIN_FAILURE_WINDOW_MINUTES", "LOGIN_LOCK_MINUTES", "LOGIN_MAX_FAILURES_PER_IP",
  "UPLOAD_ORPHAN_RETENTION_HOURS", "AUDIT_RETENTION_DAYS", "DATABASE_POOL_MAX", "DATABASE_STATEMENT_TIMEOUT_MS",
] as const;

function coerceNumbers(config: Record<string, unknown>) {
  const coerced: Record<string, unknown> = { ...config };
  // Templates intentionally leave these optional settings blank. Treat blank
  // as absent, so a single-replica deployment needs neither Redis nor bootstrap credentials.
  for (const key of ["REDIS_URL", "ADMIN_BOOTSTRAP_EMAIL", "ADMIN_BOOTSTRAP_PASSWORD"]) {
    if (coerced[key] === "") delete coerced[key];
  }
  for (const key of numericKeys) {
    const raw = coerced[key];
    if (raw === undefined || raw === "") delete coerced[key];
    else coerced[key] = Number(raw);
  }
  return coerced;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const value = plainToInstance(Environment, coerceNumbers(config), { enableImplicitConversion: true });
  const errors = validateSync(value, { skipMissingProperties: false });
  if (errors.length) throw new Error(`Invalid backend environment: ${errors.map((error) => error.property).join(", ")}`);
  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) throw new Error("JWT secrets must be different");
  if (value.NODE_ENV === "production") {
    if ([value.DATABASE_URL, value.JWT_ACCESS_SECRET, value.JWT_REFRESH_SECRET, value.R2_ACCOUNT_ID, value.R2_ACCESS_KEY_ID, value.R2_SECRET_ACCESS_KEY, value.R2_BUCKET_NAME, value.R2_PRIVATE_BUCKET_NAME, value.R2_PUBLIC_URL, value.SMTP_HOST, value.SMTP_USER, value.SMTP_PASSWORD, value.MAIL_FROM, value.FRONTEND_URL, value.BACKEND_PUBLIC_URL].some((item) => /replace|change.?me|APP_DOMAIN|API_DOMAIN|IMAGE_DOMAIN|ACCOUNT_ID|BUCKET_NAME|SMTP_HOST|SMTP_USER|DB_HOST/i.test(item ?? ""))) throw new Error("Replace all placeholder production values");
    const isHttpsUrl = (url: string) => { try { const parsed = new URL(url.trim()); return parsed.protocol === "https:" && !!parsed.hostname && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash; } catch { return false; } };
    if (value.FRONTEND_URL.split(",").some((url) => !isHttpsUrl(url))) throw new Error("Production FRONTEND_URL must use HTTPS");
    if (value.COOKIE_SECURE === "false") throw new Error("Production cookies must be secure");
    if (value.STORAGE_DRIVER !== "r2") throw new Error("Production storage must use R2");
    if (value.MAIL_DRIVER !== "smtp") throw new Error("Production mail must use SMTP");
    if (![value.R2_ACCOUNT_ID, value.R2_ACCESS_KEY_ID, value.R2_SECRET_ACCESS_KEY, value.R2_BUCKET_NAME, value.R2_PUBLIC_URL].every(Boolean) || !isHttpsUrl(value.R2_PUBLIC_URL!)) throw new Error("Production R2 configuration is incomplete");
    if (!value.R2_PRIVATE_BUCKET_NAME?.trim() || value.R2_PRIVATE_BUCKET_NAME.trim() === value.R2_BUCKET_NAME?.trim()) throw new Error("Production requires a separate private R2 document bucket");
    if (![value.SMTP_HOST, value.SMTP_PORT, value.SMTP_USER, value.SMTP_PASSWORD, value.MAIL_FROM].every(Boolean) || !Number.isInteger(Number(value.SMTP_PORT)) || Number(value.SMTP_PORT) < 1 || Number(value.SMTP_PORT) > 65535 || !value.MAIL_FROM?.includes("@")) throw new Error("Production SMTP configuration is incomplete");
    if (!isHttpsUrl(value.BACKEND_PUBLIC_URL)) throw new Error("Production BACKEND_PUBLIC_URL must use HTTPS");
    if (value.REDIS_URL && !value.REDIS_URL.startsWith("rediss://")) throw new Error("Production REDIS_URL must use TLS (rediss://)");
    if (config.ALLOW_DEMO_CATALOG_SEED === "true") throw new Error("Production demo catalog seeding is forbidden");
    if (value.ADMIN_BOOTSTRAP_EMAIL && !value.ADMIN_BOOTSTRAP_PASSWORD) throw new Error("ADMIN_BOOTSTRAP_EMAIL requires ADMIN_BOOTSTRAP_PASSWORD");
    let database: URL;
    try { database = new URL(value.DATABASE_URL); } catch { throw new Error("Production DATABASE_URL must be a PostgreSQL URL with TLS"); }
    const sslModes = database.searchParams.getAll("sslmode");
    if (!["postgres:", "postgresql:"].includes(database.protocol) || sslModes.length !== 1 || !["require", "verify-ca", "verify-full"].includes(sslModes[0])) throw new Error("Production DATABASE_URL must require TLS (sslmode=require or stricter)");
  }
  return value;
}
