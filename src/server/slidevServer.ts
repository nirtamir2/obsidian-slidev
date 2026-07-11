import { isPortNumber } from "../settings";

export interface SlidevServerRequestOptions {
  url: string;
  method: "GET";
  throw: false;
}

export interface SlidevServerResponse {
  status: number;
}

export type RequestUrlImplementation = (
  options: SlidevServerRequestOptions,
) => Promise<SlidevServerResponse>;

export function getSlidevServerUrl(port: number): string {
  if (!isPortNumber(port)) {
    throw new RangeError("Port must be an integer between 1 and 65535.");
  }

  return `http://localhost:${String(port)}/`;
}

export async function probeSlidevServer(
  port: number,
  request: RequestUrlImplementation,
): Promise<boolean> {
  const url = getSlidevServerUrl(port);

  try {
    const response = await request({ url, method: "GET", throw: false });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}
