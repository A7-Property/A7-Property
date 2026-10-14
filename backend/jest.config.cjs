module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["reflect-metadata"],
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.spec.ts"],
  testPathIgnorePatterns: ["e2e-spec\\.ts$"],
  clearMocks: true,
};
