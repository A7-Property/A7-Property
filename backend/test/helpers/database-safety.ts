/** Integration suites truncate tables; reject production mode and non-test databases. */
export function assertDisposableDatabase(environment: NodeJS.ProcessEnv = process.env) {
  if (environment.NODE_ENV !== "test") throw new Error("Integration tests require NODE_ENV=test");
  let url: URL;
  try { url = new URL(environment.DATABASE_URL ?? ""); }
  catch { throw new Error("Integration tests require a disposable PostgreSQL DATABASE_URL"); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !/(?:^|_)test(?:_|$)/i.test(database)) {
    throw new Error("Integration database name must contain a separate test segment (for example a7_property_test)");
  }
}
