export interface SlidevPluginSettings {
  port: number;
  nodeExecutable: string;
  isDebug: boolean;
  slidevTemplateLocation: string;
  shouldRenderSlideNumberInMarkdownPreview: boolean;
}

export const DEFAULT_SETTINGS: SlidevPluginSettings = {
  port: 3030,
  nodeExecutable: "",
  isDebug: false,
  slidevTemplateLocation: "",
  shouldRenderSlideNumberInMarkdownPreview: false,
};

export function normalizeSettings(value: unknown): SlidevPluginSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    port: isPortNumber(value["port"]) ? value["port"] : DEFAULT_SETTINGS.port,
    nodeExecutable:
      typeof value["nodeExecutable"] === "string"
        ? value["nodeExecutable"]
        : DEFAULT_SETTINGS.nodeExecutable,
    isDebug:
      typeof value["isDebug"] === "boolean"
        ? value["isDebug"]
        : DEFAULT_SETTINGS.isDebug,
    slidevTemplateLocation:
      typeof value["slidevTemplateLocation"] === "string"
        ? value["slidevTemplateLocation"]
        : DEFAULT_SETTINGS.slidevTemplateLocation,
    shouldRenderSlideNumberInMarkdownPreview:
      typeof value["shouldRenderSlideNumberInMarkdownPreview"] === "boolean"
        ? value["shouldRenderSlideNumberInMarkdownPreview"]
        : DEFAULT_SETTINGS.shouldRenderSlideNumberInMarkdownPreview,
  };
}

export function isPortNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 65_535
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
