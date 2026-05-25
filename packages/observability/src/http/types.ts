export type ObservabilityHttpMiddleware = (
  req: ObservabilityHttpRequest,
  res: ObservabilityHttpResponse,
  next: () => void
) => void;

export type ObservabilityHttpRequest = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  baseUrl?: string;
  route?: { path?: string | string[] };
  path?: string;
};

export type ObservabilityHttpResponse = {
  statusCode: number;
  on: (event: 'finish', listener: () => void) => void;
  setHeader: (name: string, value: string) => void;
};
