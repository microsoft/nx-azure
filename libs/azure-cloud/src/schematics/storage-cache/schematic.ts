// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Rule } from "@angular-devkit/schematics";
import { updateJsonFile } from "@nrwl/workspace";
import { execSync } from "child_process";
import { readFileSync, statSync } from "fs";
import { noop } from "rxjs";
import { StorageCacheSchematicSchema } from "./schema";

function isCompatibleVersion() {
  const json = JSON.parse(readFileSync("package.json").toString());
  let version =
    json.dependencies["@nrwl/workspace"] ||
    json.devDependencies["@nrwl/workspace"];
  if (!version) {
    throw new Error(`You must use Nx >= 8.0 to enable Storage Cache`);
  }

  if (version.startsWith("^") || version.startsWith("~")) {
    version = version.substr(1);
  }
  const [major, minor] = version.split(".");
  const majorNumber = Number.parseInt(major, 10);
  if (isNaN(majorNumber)) {
    return true;
  }

  if (majorNumber >= 9) {
    return true;
  }

  if (Number.parseInt(minor, 10) >= 12) {
    return true;
  }

  return false;
}

function isYarn() {
  try {
    return statSync("yarn.lock").isFile();
  } catch (err) {
    return false;
  }
}

function updateWorkspacePackage() {
  console.log(
    `Updating @nrwl/workspace ot 8.12.10 to make the workspace compatible with Storage Cache.`
  );
  if (isYarn()) {
    console.log(`yarn add --dev @nrwl/workspace@8.12.10`);
    execSync(`yarn add --dev @nrwl/workspace@8.12.10`, {
      stdio: ["inherit", "inherit", "inherit"],
    });
  } else {
    console.log(`npm i --save-dev @nrwl/workspace@8.12.10`);
    execSync(`npm i --save-dev @nrwl/workspace@8.12.10`, {
      stdio: ["inherit", "inherit", "inherit"],
    });
  }
}

function updateNxJson(ops: StorageCacheSchematicSchema) {
  updateJsonFile("nx.json", (json) => {
    json.tasksRunnerOptions = {
      default: {
        runner: "@nx-azure/storage-cache",
        options: {
          sasToken: ops.sasToken ? ops.sasToken : "",
          storageAccount: ops.storageAccount,
          storageContainer: ops.storageContainer,
          cacheableOperations: ["build", "test", "lint", "e2e"],
        },
      },
    };
  });
}

export default function (options: StorageCacheSchematicSchema): Rule {
  return async () => {
    if (!isCompatibleVersion()) {
      updateWorkspacePackage();
    }

    updateNxJson(options);
    return noop();
  };
}
