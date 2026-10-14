import { validateEnvironment } from "../src/common/config";

const productionDatabaseUrl = "postgresql://user:secret@db.example.org:5432/a7_property?sslmode=require";

const required = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/a7_property",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
};

describe("backend environment", () => {
  it("applies safe defaults and accepts a numeric port from the environment", () => {
    const config = validateEnvironment({ ...required, PORT: "4001" });
    expect(config.PORT).toBe(4001);
    expect(config.FRONTEND_URL).toBe("http://localhost:3000");
  });

  it("rejects missing or reused JWT secrets", () => {
    expect(() => validateEnvironment({ DATABASE_URL: required.DATABASE_URL })).toThrow();
    expect(() => validateEnvironment({ ...required, JWT_REFRESH_SECRET: required.JWT_ACCESS_SECRET })).toThrow("different");
  });

  it("rejects placeholder production secrets and insecure origins", () => {
    expect(() => validateEnvironment({ ...required, NODE_ENV: "production", FRONTEND_URL: "http://localhost:3000" })).toThrow("HTTPS");
    expect(() => validateEnvironment({ ...required, NODE_ENV: "production", FRONTEND_URL: "https://a7.example", JWT_ACCESS_SECRET: "replace-this-placeholder-secret-123" })).toThrow("placeholder");
  });

  it("requires complete remote storage and SMTP settings in production", () => {
    const base = { ...required, DATABASE_URL: productionDatabaseUrl, NODE_ENV: "production", FRONTEND_URL: "https://app.example.org", BACKEND_PUBLIC_URL: "https://api.example.org", STORAGE_DRIVER: "r2", MAIL_DRIVER: "smtp" };
    expect(() => validateEnvironment(base)).toThrow("R2");
    const storage = { ...base, R2_ACCOUNT_ID: "account", R2_ACCESS_KEY_ID: "r2-key", R2_SECRET_ACCESS_KEY: "r2-secret", R2_BUCKET_NAME: "a7-images", R2_PRIVATE_BUCKET_NAME: "a7-private-documents", R2_PUBLIC_URL: "https://images.example.org" };
    expect(() => validateEnvironment({ ...storage, R2_PRIVATE_BUCKET_NAME: "" })).toThrow("private R2");
    expect(() => validateEnvironment({ ...storage, R2_PRIVATE_BUCKET_NAME: storage.R2_BUCKET_NAME })).toThrow("private R2");
    expect(() => validateEnvironment(storage)).toThrow("SMTP");
    expect(() => validateEnvironment({ ...storage, SMTP_HOST: "smtp.example.org", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "smtp-secret", MAIL_FROM: "A7 <mail@example.org>" })).not.toThrow();
  });

  it("requires a TLS database connection in production", () => {
    const complete = {
      ...required, NODE_ENV: "production", FRONTEND_URL: "https://app.example.org", BACKEND_PUBLIC_URL: "https://api.example.org",
      STORAGE_DRIVER: "r2", R2_ACCOUNT_ID: "account", R2_ACCESS_KEY_ID: "r2-key", R2_SECRET_ACCESS_KEY: "r2-secret", R2_BUCKET_NAME: "a7-images", R2_PRIVATE_BUCKET_NAME: "a7-private-documents", R2_PUBLIC_URL: "https://images.example.org",
      MAIL_DRIVER: "smtp", SMTP_HOST: "smtp.example.org", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "smtp-secret", MAIL_FROM: "A7 <mail@example.org>",
    };
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: "postgresql://user:secret@db.example.org:5432/a7_property" })).toThrow("TLS");
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl })).not.toThrow();
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl, REDIS_URL: "redis://cache.example.org:6379" })).toThrow("TLS");
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl, REDIS_URL: "rediss://cache.example.org:6380" })).not.toThrow();
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl, ALLOW_DEMO_CATALOG_SEED: "true" })).toThrow("seeding");
    for (const suffix of ["?note=sslmode=require", "?sslmode=require-invalid", "?sslmode=require&sslmode=disable"]) {
      expect(() => validateEnvironment({ ...complete, DATABASE_URL: `postgresql://user:secret@db.example.org:5432/a7_property${suffix}` })).toThrow("TLS");
    }
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl, FRONTEND_URL: "https://app.example.org/dashboard" })).toThrow("HTTPS");
    expect(() => validateEnvironment({ ...complete, DATABASE_URL: productionDatabaseUrl, BACKEND_PUBLIC_URL: "https://api.example.org?token=value" })).toThrow("HTTPS");
  });

  it("rejects invalid ports and zero token lifetimes", () => {
    expect(() => validateEnvironment({ ...required, PORT: "65536" })).toThrow("PORT");
    expect(() => validateEnvironment({ ...required, ACCESS_TOKEN_EXPIRES_IN: "0s" })).toThrow("ACCESS_TOKEN_EXPIRES_IN");
    expect(() => validateEnvironment({ ...required, REFRESH_TOKEN_EXPIRES_IN: "0d" })).toThrow("REFRESH_TOKEN_EXPIRES_IN");
  });

  it("accepts tunable security limits and rejects an out-of-range value", () => {
    const config = validateEnvironment({ ...required, LOGIN_MAX_FAILURES: "3", LOGIN_LOCK_MINUTES: "30", THROTTLE_LIMIT: "120" });
    expect(config.LOGIN_MAX_FAILURES).toBe(3);
    expect(config.LOGIN_LOCK_MINUTES).toBe(30);
    expect(config.THROTTLE_LIMIT).toBe(120);
    expect(() => validateEnvironment({ ...required, LOGIN_MAX_FAILURES: "0" })).toThrow("LOGIN_MAX_FAILURES");
  });

  it("rejects a malformed Redis URL but allows it to be absent", () => {
    expect(() => validateEnvironment({ ...required, REDIS_URL: "http://cache.example.org" })).toThrow("REDIS_URL");
    expect(validateEnvironment({ ...required, REDIS_URL: "rediss://cache.example.org:6380" }).REDIS_URL).toBe("rediss://cache.example.org:6380");
    const blank = validateEnvironment({ ...required, REDIS_URL: "", ADMIN_BOOTSTRAP_EMAIL: "", ADMIN_BOOTSTRAP_PASSWORD: "" });
    expect(blank.REDIS_URL).toBeUndefined();
    expect(blank.ADMIN_BOOTSTRAP_EMAIL).toBeUndefined();
  });
});
