import {
  ensureNxProject,
  readJson,
  runNxCommandAsync,
} from "@nrwl/nx-plugin/testing";

describe("azure-cloud e2e", () => {
  it("should create azure-cloud", async (done) => {
    ensureNxProject("@nx-azure/azure-cloud", "dist/libs/azure-cloud");
    await runNxCommandAsync(
      `generate @nx-azure/azure-cloud:init --storageAccount accountName --storageContainer containerName`
    );

    const nxJson = readJson("nx.json");
    expect(nxJson.tasksRunnerOptions.default.runner).toEqual(
      "@nx-azure/azure-cloud"
    );

    done();
  });
});
