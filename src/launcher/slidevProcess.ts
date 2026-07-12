const defaultGracefulTimeoutMs = 2000;
const defaultForceTimeoutMs = 1000;

export interface TerminableProcess {
  readonly exitCode: number | null;
  readonly signalCode: string | null;
  kill(signal: "SIGKILL" | "SIGTERM"): boolean;
  off(event: "close", listener: () => void): unknown;
  once(event: "close", listener: () => void): unknown;
}

interface TerminationOptions {
  forceTimeoutMs?: number;
  gracefulTimeoutMs?: number;
}

export async function terminateSlidevProcess(
  childProcess: TerminableProcess,
  options: TerminationOptions = {},
): Promise<void> {
  if (hasExited(childProcess)) {
    return;
  }

  const gracefulExit = waitForChildExit(
    childProcess,
    options.gracefulTimeoutMs ?? defaultGracefulTimeoutMs,
  );
  childProcess.kill("SIGTERM");
  if (await gracefulExit) {
    return;
  }

  const forcedExit = waitForChildExit(
    childProcess,
    options.forceTimeoutMs ?? defaultForceTimeoutMs,
  );
  childProcess.kill("SIGKILL");
  await forcedExit;
}

function hasExited(childProcess: TerminableProcess) {
  return childProcess.exitCode != null || childProcess.signalCode != null;
}

async function waitForChildExit(
  childProcess: TerminableProcess,
  timeoutMs: number,
): Promise<boolean> {
  if (hasExited(childProcess)) {
    return true;
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const runtimeWindow: Pick<
      typeof globalThis,
      "clearTimeout" | "setTimeout"
    > = globalThis;
    const finish = (didExit: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      runtimeWindow.clearTimeout(timeout);
      childProcess.off("close", handleClose);
      resolve(didExit);
    };
    const handleClose = () => {
      finish(true);
    };
    const timeout = runtimeWindow.setTimeout(() => {
      finish(false);
    }, timeoutMs);
    childProcess.once("close", handleClose);
    if (hasExited(childProcess)) {
      finish(true);
    }
  });
}
