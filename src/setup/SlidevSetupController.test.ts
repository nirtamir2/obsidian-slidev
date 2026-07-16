import { describe, expect, it, vi } from "vitest";
import { SlidevSetupController } from "./SlidevSetupController";
import type {
  SlidevSetupInput,
  SlidevSetupResult,
  SlidevSetupState,
} from "./SlidevSetupService";

describe("slidev setup controller", () => {
  it("shares one active setup and persists the verified path once", async () => {
    const persistence = createDeferred<boolean>();
    const service = new FakeSetupService();
    service.setup.mockImplementation(() => {
      service.publish({
        logs: [],
        message: "Slidev is ready.",
        stage: "ready",
        status: "success",
      });
      return Promise.resolve({
        ok: true,
        projectPath: "/vault/.slidev",
      });
    });
    const persistProjectPath = vi.fn(async () => {
      await persistence.promise;
    });
    const controller = new SlidevSetupController({
      createInput: () => ({ vaultRoot: "/vault" }),
      persistProjectPath,
      service,
    });

    const firstSetup = controller.start();
    const secondSetup = controller.start();
    await vi.waitFor(() => {
      expect(persistProjectPath).toHaveBeenCalledWith("/vault/.slidev");
    });

    expect(secondSetup).toBe(firstSetup);
    expect(controller.getState()).toMatchObject({
      status: "running",
      message: "Saving Slidev settings…",
    });
    persistence.resolve(true);
    await expect(firstSetup).resolves.toEqual({
      ok: true,
      projectPath: "/vault/.slidev",
    });
    expect(persistProjectPath).toHaveBeenCalledOnce();
    expect(controller.getState()).toMatchObject({
      status: "success",
      stage: "ready",
    });
  });

  it("does not persist a failed setup", async () => {
    const service = new FakeSetupService();
    service.setup.mockResolvedValue({
      ok: false,
      code: "missing-npm",
      message: "npm is missing.",
    });
    const persistProjectPath = vi.fn();
    const controller = new SlidevSetupController({
      createInput: () => ({ vaultRoot: "/vault" }),
      persistProjectPath,
      service,
    });

    await expect(controller.start()).resolves.toMatchObject({
      ok: false,
      code: "missing-npm",
    });
    expect(persistProjectPath).not.toHaveBeenCalled();
  });

  it("reports input and settings persistence failures", async () => {
    const inputFailureController = new SlidevSetupController({
      createInput: () => {
        throw new Error("No local vault path");
      },
      persistProjectPath: vi.fn(),
      service: new FakeSetupService(),
    });
    const service = new FakeSetupService();
    service.setup.mockResolvedValue({
      ok: true,
      projectPath: "/vault/.slidev",
    });
    const settingsFailureController = new SlidevSetupController({
      createInput: () => ({ vaultRoot: "/vault" }),
      persistProjectPath: async () => {
        throw new Error("settings unavailable");
      },
      service,
    });

    await expect(inputFailureController.start()).resolves.toMatchObject({
      ok: false,
      code: "filesystem-error",
    });
    await expect(settingsFailureController.start()).resolves.toMatchObject({
      ok: false,
      code: "settings-error",
    });
  });

  it("unsubscribes and cancels setup on disposal", async () => {
    const service = new FakeSetupService();
    const controller = new SlidevSetupController({
      createInput: () => ({ vaultRoot: "/vault" }),
      persistProjectPath: vi.fn(),
      service,
    });

    await controller.dispose();

    expect(service.cancel).toHaveBeenCalledOnce();
    expect(service.listenerCount()).toBe(0);
  });
});

class FakeSetupService {
  cancel = vi.fn(resolveImmediately);
  setup =
    vi.fn<(input: SlidevSetupInput) => Promise<SlidevSetupResult>>(
      returnFailedSetup,
    );
  private readonly listeners = new Set<(state: SlidevSetupState) => void>();
  private state: SlidevSetupState = {
    logs: [],
    message: "Slidev is not configured.",
    stage: "idle",
    status: "idle",
  };

  getState() {
    return this.state;
  }

  listenerCount() {
    return this.listeners.size;
  }

  publish(state: SlidevSetupState) {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  subscribe(listener: (state: SlidevSetupState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

function createDeferred<T>() {
  let resolvePromise: ((value: T | PromiseLike<T>) => void) | null = null;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve(value: T) {
      if (resolvePromise == null) {
        throw new Error("Deferred promise was not initialized.");
      }
      resolvePromise(value);
    },
  };
}

function resolveImmediately() {
  return Promise.resolve();
}

function returnFailedSetup(): Promise<SlidevSetupResult> {
  return Promise.resolve({
    ok: false,
    code: "install-failed",
    message: "Setup failed.",
  });
}
