// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// This file includes code from @nrwl/nx-cloud@9.3.2 under MIT license

import { ProjectGraph } from "@nrwl/workspace/src/core/project-graph";
import { NxJson } from "@nrwl/workspace/src/core/shared-interfaces";
import {
  AffectedEvent,
  Task,
} from "@nrwl/workspace/src/tasks-runner/tasks-runner";
import {
  DefaultTasksRunnerOptions,
  RemoteCache,
  tasksRunnerV2,
} from "@nrwl/workspace/src/tasks-runner/tasks-runner-v2";
import { output } from "@nrwl/workspace/src/utils/output";
import { BlobService, createBlobService } from "azure-storage";
import * as chalk from "chalk";
import { config } from "dotenv";
import { createReadStream, existsSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Observable, Subject } from "rxjs";
import { c, x } from "tar";

interface Context {
  target?: string;
  initiatingProject?: string | null;
  projectGraph: ProjectGraph;
  nxJson: NxJson;
}

interface StorageCacheTaskRunnerOptions extends DefaultTasksRunnerOptions {
  sasToken?: string;
  storageAccount: string;
  storageContainer: string;
}

interface ApiError extends Error {
  code: string;
  response: {
    message: string;
    status: number;
    data: {
      message: string;
    };
  };
}

type Statuses = { [key: string]: string };

function printMessage(message) {
  const formattedMessage = output.colors.gray(message);
  output.addNewline();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (output as any).writeOutputTitle({
    label: chalk.reset.inverse.bold.keyword("grey")(" CLOUD "),
    title: chalk.keyword("grey")(formattedMessage),
  });
  output.addNewline();
}

class MessageReporter {
  public cacheError: string | { message: string };
  public apiError: string | { message: string };
  public message: string;

  constructor() {
    this.cacheError = null;
    this.apiError = null;
    this.message = null;
  }

  get anyErrors() {
    return this.cacheError || this.apiError;
  }

  printMessages() {
    if (this.anyErrors) {
      const bodyLines = [];
      if (this.cacheError) {
        bodyLines.push(`- ${this.cacheError}`);
      }
      if (this.apiError && this.apiError !== this.cacheError) {
        bodyLines.push(`- ${this.apiError}`);
      }
      output.warn({
        title: `Storage Cache Problems`,
        bodyLines,
      });
    }
    if (this.message) {
      printMessage(this.message);
    }
  }

  extractErrorMessage(e: ApiError, scope: string) {
    if (
      e.code === "ECONNREFUSED" ||
      e.code === "EAI_AGAIN" ||
      e.code === "ENOTFOUND" ||
      e.code === "EPROTO" ||
      e.code === "ECONNABORTED"
    ) {
      return `Cannot connect to remote cache (scope: ${scope}, code: ${e.code}).`;
    } else if (e.response && e.response.status === 401) {
      return e.response.data.message
        ? e.response.data.message
        : e.response.data;
    } else if (e.response && e.response.status === 402) {
      return e.response.data.message
        ? e.response.data.message
        : e.response.data;
    } else {
      let details = "";
      if (e.response && e.response.data && e.response.data.message) {
        details = `. ${e.response.data.message}`;
      } else if (e.response && e.response.data) {
        details = `. ${e.response.data}`;
      }
      return `${e.message}${details} (code: ${e.code})`;
    }
  }
}

class AzureStorageRemoteCloud implements RemoteCache {
  public static VERBOSE_LOGGING = process.env.NX_VERBOSE_LOGGING;
  private storeRequests: Promise<boolean>[];

  constructor(
    private options: StorageCacheTaskRunnerOptions,
    private messages: MessageReporter,
    private statuses: Statuses
  ) {
    this.storeRequests = [];
  }

  async retrieve(hash: string, cacheDirectory: string) {
    if (this.messages.cacheError) {
      return false;
    }
    try {
      if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
        output.note({
          title: `Storage Cache: Downloading ${hash}`,
        });
      }

      const tgz = this.createFileName(hash, cacheDirectory);
      await this.downloadFile(hash, tgz);
      this.createCommitFile(hash, cacheDirectory);

      if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
        output.note({
          title: `Storage Cache: Cache hit ${hash}`,
        });
      }
      this.statuses[hash] = "remote-cache-hit";
      return true;
    } catch (e) {
      if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
        output.note({
          title: `Error during retrieve is: ${JSON.stringify(e)}`,
        });
      }
      if (e.statusCode && e.statusCode === 404) {
        if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
          output.note({
            title: `Storage Cache: Cache miss ${hash}`,
          });
        }
      } else {
        this.messages.cacheError = this.messages.extractErrorMessage(
          e,
          "storage"
        );
      }
      this.statuses[hash] = "remote-cache-miss";
      return false;
    }
  }

  store(hash: string, cacheDirectory: string) {
    if (this.messages.cacheError) {
      return Promise.resolve(false);
    }

    const result = Promise.resolve().then(async () => {
      try {
        if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
          output.note({
            title: `Storage Cache: Storage ${hash}`,
          });
        }

        const tgz = await this.createFile(hash, cacheDirectory);
        await this.uploadFile(hash, tgz);
        if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
          output.note({
            title: `Storage Cache: Stored ${hash}`,
          });
        }
        return true;
      } catch (e) {
        if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
          output.note({
            title: `Error during store is: ${JSON.stringify(e)}`,
          });
        }
        this.messages.cacheError = this.messages.extractErrorMessage(
          e,
          "storage"
        );
        return false;
      }
    });

    this.storeRequests.push(result);
    return result;
  }

  createFileName(hash: string, cacheDirectory: string) {
    return join(cacheDirectory, `${hash}.tar.gz`);
  }

  createCommitFile(hash: string, cacheDirectory: string) {
    writeFileSync(join(cacheDirectory, `${hash}.commit`), "true");
  }

  waitForStoreRequestsToComplete() {
    return Promise.all(this.storeRequests);
  }

  async createFile(hash: string, cacheDirectory: string) {
    const tgz = this.createFileName(hash, cacheDirectory);
    await c(
      {
        gzip: true,
        file: tgz,
        cwd: cacheDirectory,
      },
      [hash]
    );
    return tgz;
  }

  async uploadFile(hash: string, tgz: string) {
    const storageAccount = this.options.storageAccount;
    const sasToken = this.options.sasToken;
    const connectionString = `BlobEndpoint=https://${storageAccount}.blob.core.windows.net/;QueueEndpoint=https://${storageAccount}.queue.core.windows.net/;FileEndpoint=https://${storageAccount}.file.core.windows.net/;TableEndpoint=https://${storageAccount}.table.core.windows.net/;SharedAccessSignature=${sasToken}`;
    const blobService = createBlobService(connectionString);

    const blobOptions: BlobService.GetBlobRequestOptions = {
      timeoutIntervalInMs: 3600000,
      clientRequestTimeoutInMs: 3600000,
      maximumExecutionTimeInMs: 3600000,
    };

    const blobName = `${hash}.tar.gz`;
    const uploadPromise = new Promise((resolve, reject) => {
      blobService.createBlockBlobFromLocalFile(
        this.options.storageContainer,
        blobName,
        tgz,
        blobOptions,
        (err) => {
          if (err) {
            if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
              output.note({
                title: `Error during uploadFile is: ${JSON.stringify(err)}`,
              });
            }
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
    await uploadPromise;
  }

  async downloadFile(hash: string, tgz: string) {
    const storageAccount = this.options.storageAccount;
    const sasToken = this.options.sasToken;
    const connectionString = `BlobEndpoint=https://${storageAccount}.blob.core.windows.net/;QueueEndpoint=https://${storageAccount}.queue.core.windows.net/;FileEndpoint=https://${storageAccount}.file.core.windows.net/;TableEndpoint=https://${storageAccount}.table.core.windows.net/;SharedAccessSignature=${sasToken}`;
    const blobService = createBlobService(connectionString);

    const blobOptions: BlobService.GetBlobRequestOptions = {
      timeoutIntervalInMs: 3600000,
      clientRequestTimeoutInMs: 3600000,
      maximumExecutionTimeInMs: 3600000,
    };

    if (this.doesCacheExist(hash)) {
      const downloadPromise = new Promise((resolve, reject) => {
        blobService.getBlobToLocalFile(
          this.options.storageContainer,
          `${hash}.tar.gz`,
          tgz,
          blobOptions,
          (err) => {
            if (err) {
              if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
                output.note({
                  title: `Error during downloadFile is: ${JSON.stringify(err)}`,
                });
              }
              reject(err);
            } else {
              resolve(true);
            }
          }
        );
      });

      await downloadPromise;

      const unTarFile = createReadStream(tgz).pipe(
        x({
          cwd: dirname(tgz),
        })
      );

      return new Promise((resolve) => {
        unTarFile.on("close", () => {
          resolve();
        });
      });
    } else {
      throw {
        statusCode: 404,
      };
    }
  }

  async doesCacheExist(hash: string): Promise<boolean> {
    const blobName = `${hash}.tar.gz`;
    const storageAccount = this.options.storageAccount;
    const sasToken = this.options.sasToken;
    const connectionString = `BlobEndpoint=https://${storageAccount}.blob.core.windows.net/;QueueEndpoint=https://${storageAccount}.queue.core.windows.net/;FileEndpoint=https://${storageAccount}.file.core.windows.net/;TableEndpoint=https://${storageAccount}.table.core.windows.net/;SharedAccessSignature=${sasToken}`;
    const blobService = createBlobService(connectionString);

    const blobPromise = new Promise<boolean>((resolve) => {
      blobService.doesBlobExist(
        this.options.storageContainer,
        blobName,
        (err, result) => {
          if (err) {
            if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
              output.note({
                title: `Error during doesCacheExist is: ${JSON.stringify(err)}`,
              });
            }
            resolve(false);
          } else {
            resolve(result.exists);
          }
        }
      );
    });

    return await blobPromise;
  }
}

const storageCacheTasksRunner = (
  tasks: Task[],
  options: StorageCacheTaskRunnerOptions,
  context: Context
): Observable<AffectedEvent> => {
  if (
    process.env.AZURE_CACHE_SAS_TOKEN ||
    options.sasToken ||
    existsSync(join(process.cwd(), ".env.secrets"))
  ) {
    if (!options.sasToken && process.env.AZURE_CACHE_SAS_TOKEN !== "") {
      if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
        output.note({
          title: `Setting SAS Token option from environment variable`,
        });
      }
      options.sasToken = process.env.AZURE_CACHE_SAS_TOKEN;
    }

    if (!options.sasToken && existsSync(join(process.cwd(), ".env.secrets"))) {
      if (AzureStorageRemoteCloud.VERBOSE_LOGGING) {
        output.note({
          title: `Setting SAS Token option from .env.secrets file`,
        });
      }
      const result = config({
        path: join(process.cwd(), ".env.secrets"),
      });
      if (result.error) {
        output.note({
          title:
            "Error while setting SAS token on environment variable from .env.secrets",
        });
        throw result.error;
      }
      if (result.parsed.AZURE_CACHE_SAS_TOKEN) {
        options.sasToken = result.parsed.AZURE_CACHE_SAS_TOKEN;
      }
    }

    if (!options.sasToken) {
      throw "No SAS Token was found.";
    }

    if (options.sasToken.charAt(0) === "?") {
      options.sasToken = options.sasToken.substring(1);
    }
    const statues: Statuses = {};
    const messages = new MessageReporter();
    const remoteCache = new AzureStorageRemoteCloud(options, messages, statues);
    const res = tasksRunnerV2(
      tasks,
      {
        ...options,
        remoteCache,
      },
      context
    );
    const wrappedRes = new Subject<AffectedEvent>();
    res.subscribe({
      next: (value) => wrappedRes.next(value),
      error: (err) => wrappedRes.error(err),
      complete: async () => {
        await Promise.all([remoteCache.waitForStoreRequestsToComplete()]);
        messages.printMessages();
        wrappedRes.complete();
      },
    });
    return wrappedRes;
  } else {
    return tasksRunnerV2(tasks, options, context);
  }
};

export default storageCacheTasksRunner;
