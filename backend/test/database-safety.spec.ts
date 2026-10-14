import { assertDisposableDatabase } from "./helpers/database-safety";

describe("integration database safety", () => {
  const environment = { NODE_ENV: "test", DATABASE_URL: "postgresql://tester:password@localhost:5432/a7_property_test" };
  it("accepts the isolated test database", () => expect(() => assertDisposableDatabase(environment)).not.toThrow());
  it.each(["a7_property", "production", "contest", "latest", "a7_testproduction"])("rejects non-test database %s", (name) => {
    expect(() => assertDisposableDatabase({ ...environment, DATABASE_URL: `postgresql://localhost/${name}` })).toThrow(/database name/);
  });
  it.each(["production", "development", undefined])("rejects runtime mode %s", (mode) => {
    expect(() => assertDisposableDatabase({ ...environment, NODE_ENV: mode })).toThrow(/NODE_ENV/);
  });
  it.each([undefined, "", "invalid", "https://localhost/a7_test"])("rejects invalid connection %s", (url) => {
    expect(() => assertDisposableDatabase({ ...environment, DATABASE_URL: url })).toThrow();
  });
});
