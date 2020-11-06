import { exec, ExecFileSyncOptions, execSync } from "child_process";
import { accessSync } from "fs";
import fetch from "node-fetch";
import * as os from "os";
import * as path from "path";
import * as shellescape from "shell-escape";
import { SupportedArchAndPlatform } from "./azcopy.types";
import { ensureBinFolder, wrapSpinner, writeDownload } from "./helpers";

const argsToFilter = ["--force-bin-download"];

const platform = os.platform();
const arch = os.arch();
const forceBinDownload = process.argv.includes("--force-bin-download");

export async function azcopy(force: boolean = forceBinDownload) {
  console.log(`Detected ${platform} platform (arch - ${arch})`);

  const binPath = path.resolve(
    __dirname,
    platform === "win32" ? "./scripts/bin/azcopy.exe" : "./scripts/bin/azcopy"
  );

  try {
    accessSync(binPath);
    console.log("binary exists");
  } catch (error) {
    force = true;
    await ensureBinFolder();
    console.log("binary not found");
  }

  if (!SupportedArchAndPlatform.includes(`${platform}_${arch}`)) {
    throw Error(
      "Unsupported platform for azcopy - supported platform and arch are - " +
        SupportedArchAndPlatform.join(",")
    );
  }

  const commonExecOptions: ExecFileSyncOptions = {
    encoding: "utf8",
    stdio: "inherit",
    cwd: path.resolve(__dirname, "./scripts"),
  };

  let downloadLink: string;
  let downloadedFileRelativePath: string;
  let scriptFile: string;

  if (force) {
    if (platform === "win32") {
      scriptFile = "win.ps1";
      if (arch === "x32") {
        downloadLink = "https://aka.ms/downloadazcopy-v10-windows-32bit";
        downloadedFileRelativePath = "./scripts/bin/azcopy_win32.zip";
      } else {
        downloadLink = "https://aka.ms/downloadazcopy-v10-windows";
        downloadedFileRelativePath = "./scripts/bin/azcopy_win32_x64.zip";
      }

      await wrapSpinner(`Downloading azcopy from ${downloadLink}`, async () => {
        await fetch(downloadLink).then(
          writeDownload(downloadedFileRelativePath)
        );
      });

      await wrapSpinner(
        "Extracting...",
        () =>
          new Promise((resolve, reject) => {
            exec(
              `powershell -ExecutionPolicy RemoteSigned -File ${scriptFile}`,
              {
                ...commonExecOptions,
                windowsHide: true,
              },
              (error) => {
                if (error) {
                  reject("Error extracting azcopy files");
                  console.error(error);
                }

                resolve();
              }
            );
          })
      );
    } else if (platform === "linux" || platform === "darwin") {
      scriptFile = "nix.sh";
      if (platform === "linux") {
        downloadLink = "https://aka.ms/downloadazcopy-v10-linux";
        downloadedFileRelativePath = "./scripts/bin/azcopy_linux.tar.gz";
      } else {
        downloadLink = "https://aka.ms/downloadazcopy-v10-mac";
        downloadedFileRelativePath = "./scripts/bin/azcopy_linux.tar.gz";
      }

      await wrapSpinner(`Downloading azcopy from ${downloadLink}`, async () => {
        await fetch(downloadLink).then(
          writeDownload(downloadedFileRelativePath)
        );
      });

      await wrapSpinner(
        "Extracting...",
        () =>
          new Promise((resolve, reject) => {
            exec(`./${scriptFile}`, commonExecOptions, (error) => {
              if (error) {
                reject("Error extracting azcopy files");
                console.error(error);
              }

              resolve();
            });
          })
      );
    }
  }

  const args = process.argv.slice(2, process.argv.length).filter((arg) => {
    return !argsToFilter.includes(arg);
  });

  const azCopyCommand = [binPath, ...args];

  const escapedCommand = shellescape(azCopyCommand);

  console.log("------ executing azcopy ------ \n");
  execSync(escapedCommand, commonExecOptions);
}
