import { createWriteStream } from "fs";
import * as ora from "ora";
import * as path from "path";
import { ArgType } from "./azcopy.types";

export function writeDownload(relativeFilePath: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res: any) => {
    return new Promise((resolve, reject) => {
      const fileStream = createWriteStream(
        path.resolve(__dirname, relativeFilePath)
      );
      res.body.pipe(fileStream);
      res.body.on("error", (err) => {
        reject(err);
      });
      fileStream.on("finish", function () {
        resolve();
      });
    });
  };
}

export async function wrapSpinner(
  oraOptions: ArgType<typeof ora>[0],
  fn: () => Promise<unknown>
) {
  const spinner = ora(oraOptions).start();

  try {
    await fn();
  } catch (error) {
    spinner.fail();
    throw error;
  }

  spinner.succeed();
}
