import { describe, expect, it, vi } from "vitest";
import { activateSlidevView } from "./activateSlidevView";

const viewType = "slidev-presentation-view";

describe("activateSlidevView", () => {
  it("reveals an existing view without creating or detaching a leaf", async () => {
    const existingLeaf = {
      setViewState: vi.fn(),
    };
    const workspace = {
      detachLeavesOfType: vi.fn(),
      getLeavesOfType: vi.fn(() => [existingLeaf]),
      getRightLeaf: vi.fn(() => null),
      revealLeaf: vi.fn(),
    };

    await activateSlidevView(workspace, viewType);

    expect(workspace.revealLeaf).toHaveBeenCalledOnce();
    expect(workspace.revealLeaf).toHaveBeenCalledWith(existingLeaf);
    expect(workspace.getRightLeaf).not.toHaveBeenCalled();
    expect(workspace.detachLeavesOfType).not.toHaveBeenCalled();
    expect(existingLeaf.setViewState).not.toHaveBeenCalled();
  });

  it("creates and reveals the view when no existing leaf is available", async () => {
    const operations: Array<string> = [];
    const createdLeaf = {
      setViewState: vi.fn(async () => {
        operations.push("set-view-state");
      }),
    };
    const workspace = {
      detachLeavesOfType: vi.fn(),
      getLeavesOfType: vi.fn(() => []),
      getRightLeaf: vi.fn(() => createdLeaf),
      revealLeaf: vi.fn(async (leaf: typeof createdLeaf) => {
        expect(leaf).toBe(createdLeaf);
        operations.push("reveal-leaf");
      }),
    };

    await activateSlidevView(workspace, viewType);

    expect(workspace.getRightLeaf).toHaveBeenCalledOnce();
    expect(workspace.getRightLeaf).toHaveBeenCalledWith(false);
    expect(createdLeaf.setViewState).toHaveBeenCalledOnce();
    expect(createdLeaf.setViewState).toHaveBeenCalledWith({
      type: viewType,
      active: true,
    });
    expect(workspace.revealLeaf).toHaveBeenCalledOnce();
    expect(workspace.revealLeaf).toHaveBeenCalledWith(createdLeaf);
    expect(operations).toEqual(["set-view-state", "reveal-leaf"]);
    expect(workspace.detachLeavesOfType).not.toHaveBeenCalled();
  });

  it("exits safely when a new right leaf cannot be created", async () => {
    const workspace = {
      detachLeavesOfType: vi.fn(),
      getLeavesOfType: vi.fn(() => []),
      getRightLeaf: vi.fn(() => null),
      revealLeaf: vi.fn(),
    };

    await expect(
      activateSlidevView(workspace, viewType),
    ).resolves.toBeUndefined();

    expect(workspace.getRightLeaf).toHaveBeenCalledWith(false);
    expect(workspace.revealLeaf).not.toHaveBeenCalled();
    expect(workspace.detachLeavesOfType).not.toHaveBeenCalled();
  });
});
