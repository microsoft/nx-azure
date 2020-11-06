import { createWriteStream, existsSync, mkdir } from "fs";
import * as ora from "ora";
import { platform } from "os";
import * as path from "path";
import { ArgType } from "./azcopy.types";

const binPath = path.resolve(__dirname, "./scripts/bin");

export function ensureBinFolder() {
  return new Promise((resolve, reject) => {
    if (!existsSync(binPath)) {
      mkdir(
        binPath,
        // Apparently this is not documented in @types/node but NODEJS docs say we can use it this way - https://nodejs.org/api/fs.html#fs_fs_mkdir_path_options_callback
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        { recursive: true },
        (err) => {
          if (err) {
            reject(err);
          }

          resolve();
        }
      );
    } else {
      resolve();
    }
  });
}

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

export function shellEscape(args: string[]) {
  const quote = platform() === "win32" ? '"' : "'";

  return args
    .map((arg) => {
      if (!/^[A-Za-z0-9_/-]+$/.test(arg)) {
        arg = quote + arg.replace(quote, `\${quote}`) + quote;
        arg = arg
          .replace(/^(?:'')+/g, "") // unduplicate single-quote at the beginning
          .replace(/^(?:"")+/g, "") // unduplicate double-quote at the beginning
          .replace(/\\'''/g, "\\'") // remove non-escaped single-quote if there are enclosed between 2 escaped
          .replace(/\\"""/g, '\\"'); // remove non-escaped double-quote if there are enclosed between 2 escaped
      }
      return arg;
    })
    .join(" ");
}
