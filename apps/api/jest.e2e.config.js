module.exports = {
  preset: "ts-jest",
  testMatch: ["<rootDir>/tests/e2e/**/*.e2e.test.ts"],
  globalSetup: "<rootDir>/tests/e2e/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/e2e/globalTeardown.ts",
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/setup.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig-test.json",
    },
  },
  moduleNameMapper: {
    "^@api/(.*)$": "<rootDir>/src/$1",
    "^@podverse/external-services/(.*)$": "<rootDir>/../../packages/external-services/dist/$1",
    "^@podverse/helpers/(.*)$": "<rootDir>/../../packages/helpers/dist/$1",
    "^@podverse/orm/(.*)$": "<rootDir>/../../packages/orm/dist/$1",
    "^@podverse/parser/(.*)$": "<rootDir>/../../packages/parser/dist/$1",
  }
};
