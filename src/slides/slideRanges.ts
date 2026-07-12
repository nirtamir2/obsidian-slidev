export interface SlideRange {
  end: number;
  index: number;
  start: number;
}

export function parseSlideRanges(markdown: string): Array<SlideRange> {
  const lines = markdown.split(/\r?\n/);
  const slides: Array<SlideRange> = [];
  let start = 0;
  let inHtmlComment = false;
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const rawLine = lines[lineIndex] ?? "";
    const line = rawLine.trimEnd();

    if (inHtmlComment) {
      inHtmlComment = advanceHtmlCommentState(rawLine, true);
      lineIndex += 1;
      continue;
    }

    if (line.startsWith("---")) {
      start = addSlide(slides, start, lineIndex);
      const frontmatterEnd = findFrontmatterEnd(lines, lineIndex, line);
      if (frontmatterEnd != null) {
        start = lineIndex;
        lineIndex = frontmatterEnd;
      }
      lineIndex += 1;
      continue;
    }

    const codeFenceEnd = findCodeFenceEnd(lines, lineIndex, line);
    if (codeFenceEnd != null) {
      lineIndex = codeFenceEnd + 1;
      continue;
    }

    inHtmlComment = advanceHtmlCommentState(rawLine, false);
    lineIndex += 1;
  }

  if (start <= lines.length - 1) {
    addSlide(slides, start, lines.length);
  }

  return slides;
}

function addSlide(
  slides: Array<SlideRange>,
  start: number,
  end: number,
): number {
  if (start === end) {
    return start;
  }
  slides.push({ end, index: slides.length, start });
  return end + 1;
}

function findFrontmatterEnd(
  lines: Array<string>,
  separatorIndex: number,
  separator: string,
): number | null {
  const nextLine = lines[separatorIndex + 1];
  const hasFrontmatter =
    separator[3] !== "-" &&
    typeof nextLine === "string" &&
    nextLine.trim().length > 0;
  if (!hasFrontmatter) {
    return null;
  }

  let lineIndex = separatorIndex + 1;
  while (lineIndex < lines.length && lines[lineIndex]?.trimEnd() !== "---") {
    lineIndex += 1;
  }
  return lineIndex;
}

function findCodeFenceEnd(
  lines: Array<string>,
  openingIndex: number,
  openingLine: string,
): number | null {
  if (!openingLine.trimStart().startsWith("```")) {
    return null;
  }

  const codeFence = /^\s*`+/.exec(openingLine)?.[0];
  if (codeFence == null) {
    return null;
  }

  let lineIndex = openingIndex + 1;
  while (
    lineIndex < lines.length &&
    lines[lineIndex]?.startsWith(codeFence) !== true
  ) {
    lineIndex += 1;
  }
  return lineIndex < lines.length ? lineIndex : null;
}

function advanceHtmlCommentState(line: string, initialState: boolean) {
  let inHtmlComment = initialState;
  let cursor = 0;

  while (cursor < line.length) {
    if (inHtmlComment) {
      const commentEnd = line.indexOf("-->", cursor);
      if (commentEnd === -1) {
        return true;
      }
      inHtmlComment = false;
      cursor = commentEnd + 3;
      continue;
    }

    const commentStart = line.indexOf("<!--", cursor);
    if (commentStart === -1) {
      return false;
    }
    const commentEnd = line.indexOf("-->", commentStart + 4);
    if (commentEnd === -1) {
      return true;
    }
    cursor = commentEnd + 3;
  }

  return inHtmlComment;
}
