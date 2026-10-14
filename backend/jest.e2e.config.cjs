module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["reflect-metadata", "<rootDir>/test/helpers/e2e-safety.ts"],
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.e2e-spec.ts"],
  testTimeout: 60_000,
  clearMocks: true,
};
