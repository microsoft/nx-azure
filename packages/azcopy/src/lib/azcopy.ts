import { execFileSync, ExecFileSyncOptions, execSync } from "child_process";
import * as os from "os";
import { SupportedArchAndPlatform } from "./azcopy.types";

export function azcopy() {
  const platform = os.platform();
  const arch = os.arch();

  if (!SupportedArchAndPlatform.includes(`${platform}_${arch}`)) {
    throw Error(
      "Unsupported platform for azcopy - supported platform and arch are - " +
        SupportedArchAndPlatform.join(",")
    );
  }

  const commonExecOptions: ExecFileSyncOptions = {
    encoding: "utf8",
    stdio: "inherit",
    cwd: __dirname,
  };

  if (platform === "linux") {
    execFileSync("./scripts/nix.sh", commonExecOptions);
  } else if (platform === "darwin") {
    execFileSync("./scripts/osx.sh", commonExecOptions);
  } else if (platform === "win32") {
    if (arch === "x32") {
      execSync(
        "powershell -ExecutionPolicy RemoteSigned -File ./scripts/win32.ps1",
        {
          ...commonExecOptions,
          windowsHide: true,
        }
      );
    } else if (arch === "x64") {
      execSync(
        "powershell -ExecutionPolicy RemoteSigned -File ./scripts/win64.ps1",
        {
          ...commonExecOptions,
          windowsHide: true,
        }
      );
    }
  }
}
