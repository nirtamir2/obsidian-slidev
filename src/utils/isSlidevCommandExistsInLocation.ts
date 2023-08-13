import {lookpath} from "lookpath";
import path from "node:path";

export async function isSlidevCommandExistsInLocation(location: string) {
	const command = await lookpath("slidev", {
		include: [path.join(location, "node_modules", ".bin")],
	});
	return command != null;
}
