import {FileSystemAdapter, Vault} from "obsidian";

export function getVaultPath(vault: Vault) {
	const {adapter} = vault;
	if (adapter instanceof FileSystemAdapter) {
		return adapter.getBasePath();
	}
	throw new Error("No vault path");
}
