import { describe, expect, it, vi } from "vitest";
import { getSlidevServerUrl, probeSlidevServer } from "./slidevServer";

describe("getSlidevServerUrl", () => {
  it("uses Slidev's localhost binding and preserves a non-default port", () => {
    expect(getSlidevServerUrl(4173)).toBe("http://localhost:4173/");
  });

  it.each([0, -1, 3030.5, 65_536, Number.NaN])(
    "rejects invalid port %s",
    (port) => {
      expect(() => getSlidevServerUrl(port)).toThrow(RangeError);
    },
  );
});

describe("probeSlidevServer", () => {
  it.each([200, 204, 301, 399])(
    "returns true for HTTP status %s",
    async (status) => {
      const request = vi.fn(async () => ({ status }));

      const isRunning = await probeSlidevServer(4317, request);

      expect(isRunning).toBe(true);
      expect(request).toHaveBeenCalledOnce();
      expect(request).toHaveBeenCalledWith({
        url: "http://localhost:4317/",
        method: "GET",
        throw: false,
      });
    },
  );

  it.each([400, 404, 500, 599])(
    "returns false for HTTP status %s",
    async (status) => {
      const request = vi.fn(async () => ({ status }));

      await expect(probeSlidevServer(3030, request)).resolves.toBe(false);
    },
  );

  it("returns false when the request is rejected", async () => {
    const request = vi.fn(async () => {
      throw new Error("connection refused");
    });

    await expect(probeSlidevServer(3030, request)).resolves.toBe(false);
  });

  it("rejects an invalid port without making a request", async () => {
    const request = vi.fn(async () => ({ status: 200 }));

    await expect(probeSlidevServer(0, request)).rejects.toThrow(RangeError);
    expect(request).not.toHaveBeenCalled();
  });
});
