export interface SlidevViewLeaf {
  setViewState(state: { active: true; type: string }): Promise<void> | void;
}

export interface SlidevViewWorkspace<TLeaf extends SlidevViewLeaf> {
  getLeavesOfType(viewType: string): Array<TLeaf>;
  getRightLeaf(split: false): TLeaf | null;
  revealLeaf(leaf: TLeaf): Promise<void> | void;
}

export async function activateSlidevView<TLeaf extends SlidevViewLeaf>(
  workspace: SlidevViewWorkspace<TLeaf>,
  viewType: string,
): Promise<void> {
  const existingLeaf = workspace.getLeavesOfType(viewType)[0];
  if (existingLeaf != null) {
    await workspace.revealLeaf(existingLeaf);
    return;
  }

  const leaf = workspace.getRightLeaf(false);
  if (leaf == null) {
    return;
  }

  await leaf.setViewState({ type: viewType, active: true });
  await workspace.revealLeaf(leaf);
}
