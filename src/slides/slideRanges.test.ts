import { describe, expect, it } from "vitest";
import { parseSlideRanges } from "./slideRanges";

describe("parseSlideRanges", () => {
  it("finds ordinary Slidev separators", () => {
    expect(parseSlideRanges("# One\n\n---\n\n# Two\n")).toEqual([
      { end: 2, index: 0, start: 0 },
      { end: 6, index: 1, start: 3 },
    ]);
  });

  it("keeps document and per-slide frontmatter with their slides", () => {
    const source = [
      "---",
      "theme: default",
      "---",
      "",
      "# One",
      "",
      "---",
      "",
      "# Two",
      "",
      "---",
      "layout: center",
      "---",
      "",
      "# Three",
      "",
    ].join("\n");

    expect(parseSlideRanges(source)).toEqual([
      { end: 6, index: 0, start: 0 },
      { end: 10, index: 1, start: 7 },
      { end: 16, index: 2, start: 10 },
    ]);
  });

  it("ignores separators inside fenced code blocks", () => {
    const source = [
      "# One",
      "",
      "````md",
      "---",
      "```",
      "````",
      "",
      "---",
      "",
      "# Two",
    ].join("\n");

    expect(parseSlideRanges(source)).toEqual([
      { end: 7, index: 0, start: 0 },
      { end: 10, index: 1, start: 8 },
    ]);
  });

  it("ignores separators inside multiline HTML comments", () => {
    const source = ["# One", "<!--", "---", "-->", "---", "# Two"].join("\n");

    expect(parseSlideRanges(source)).toEqual([
      { end: 4, index: 0, start: 0 },
      { end: 6, index: 1, start: 4 },
    ]);
  });
});
