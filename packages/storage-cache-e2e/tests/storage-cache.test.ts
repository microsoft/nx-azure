// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ensureNxProject,
  readJson,
  runNxCommandAsync,
} from "@nrwl/nx-plugin/testing";

describe("storage-cache e2e", () => {
  it("should create storage-cache", async (done) => {
    ensureNxProject("@nx-azure/storage-cache", "dist/libs/storage-cache");
    await runNxCommandAsync(
      `generate @nx-azure/storage-cache:init --storageAccount accountName --storageContainer containerName`
    );

    const nxJson = readJson("nx.json");
    expect(nxJson.tasksRunnerOptions.default.runner).toEqual(
      "@nx-azure/storage-cache"
    );

    done();
  });
});
