// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Tree } from "@angular-devkit/schematics";
import { SchematicTestRunner } from "@angular-devkit/schematics/testing";
import { createEmptyWorkspace } from "@nrwl/workspace/testing";
import { join } from "path";
import { AzureCloudSchematicSchema } from "./schema";

describe("azure-cloud schematic", () => {
  let appTree: Tree;
  const options: AzureCloudSchematicSchema = {
    sasToken: "foo",
    storageAccount: "bar",
    storageContainer: "baz",
  };

  const testRunner = new SchematicTestRunner(
    "@nx-azure/azure-cloud",
    join(__dirname, "../../../collection.json")
  );

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it("should run successfully", async () => {
    await expect(
      testRunner.runSchematicAsync("azure-cloud", options, appTree).toPromise()
    ).resolves.not.toThrowError();
  });
});
