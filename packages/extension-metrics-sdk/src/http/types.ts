export type ExtensionHttpMiddleware = (
  req: ExtensionHttpRequest,
  res: ExtensionHttpResponse,
  next: () => void
) => void;

export type ExtensionHttpRequest = {
  method: string;
  baseUrl?: string;
  route?: { path?: string | string[] };
  path?: string;
};

export type ExtensionHttpResponse = {
  statusCode: number;
  on: (event: 'finish', listener: () => void) => void;
};
