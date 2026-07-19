import { vi } from "vitest";

vi.stubGlobal("window", { clearTimeout, setTimeout });
