import { describe, expect, it, vi } from "vitest";
import type { TerminableProcess } from "./slidevProcess";
import { terminateSlidevProcess } from "./slidevProcess";

function returnTrue() {
  return true;
}

class FakeProcess implements TerminableProcess {
  exitCode: number | null = null;
  signalCode: string | null = null;
  kill = vi.fn<(signal: "SIGKILL" | "SIGTERM") => boolean>(returnTrue);
  private readonly closeListeners = new Set<() => void>();

  once(_event: "close", listener: () => void) {
    this.closeListeners.add(listener);
  }

  off(_event: "close", listener: () => void) {
    this.closeListeners.delete(listener);
  }

  close(signal: "SIGKILL" | "SIGTERM") {
    this.signalCode = signal;
    for (const listener of this.closeListeners) {
      listener();
    }
  }
}

class ExitsWhileSubscribingProcess extends FakeProcess {
  override once(event: "close", listener: () => void) {
    this.signalCode = "SIGTERM";
    super.once(event, listener);
  }
}

describe("terminateSlidevProcess", () => {
  it("allows the process to exit after SIGTERM", async () => {
    const child = new FakeProcess();
    child.kill.mockImplementation((signal) => {
      queueMicrotask(() => {
        child.close(signal);
      });
      return true;
    });

    await terminateSlidevProcess(child, {
      forceTimeoutMs: 5,
      gracefulTimeoutMs: 5,
    });

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("uses SIGKILL when SIGTERM does not stop the process", async () => {
    const child = new FakeProcess();
    child.kill.mockImplementation((signal) => {
      if (signal === "SIGKILL") {
        queueMicrotask(() => {
          child.close(signal);
        });
      }
      return true;
    });

    await terminateSlidevProcess(child, {
      forceTimeoutMs: 20,
      gracefulTimeoutMs: 1,
    });

    expect(child.kill).toHaveBeenNthCalledWith(1, "SIGTERM");
    expect(child.kill).toHaveBeenNthCalledWith(2, "SIGKILL");
  });

  it("does nothing when the process has already exited", async () => {
    const child = new FakeProcess();
    child.exitCode = 0;

    await terminateSlidevProcess(child);

    expect(child.kill).not.toHaveBeenCalled();
  });

  it("does not miss an exit that happens while subscribing", async () => {
    const child = new ExitsWhileSubscribingProcess();

    await terminateSlidevProcess(child, {
      forceTimeoutMs: 1,
      gracefulTimeoutMs: 1,
    });

    expect(child.kill).toHaveBeenCalledOnce();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });
});
