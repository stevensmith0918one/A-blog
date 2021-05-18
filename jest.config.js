module.exports = {
  verbose: true,
  collectCoverage: true,
  testTimeout: 30000,
  coverageReporters: ["cobertura"],
  roots: ["./__tests__"],
  displayName: {
    name: "RESOLVER ==>",
    color: "blue",
  },
  setupFiles: ["./__tests__/setup.js"],
  testPathIgnorePatterns: [
    "<rootDir>/__tests__/setup.js",
    "<rootDir>/dist/",
    "<rootDir>/__tests__/utils/",
  ],
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  reporters: ["default", "jest-junit"],
};
