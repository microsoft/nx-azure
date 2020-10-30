// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

module.exports = {
  preset: "../../jest.preset.js",
  transform: {
    "^.+\\.[tj]sx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "html"],
  coverageDirectory: "../../coverage/libs/storage-cache",
  globals: { "ts-jest": { tsConfig: "<rootDir>/tsconfig.spec.json" } },
  displayName: "storage-cache",
};
