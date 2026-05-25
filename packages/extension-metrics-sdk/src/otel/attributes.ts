/** OpenTelemetry semantic convention attribute keys used by this SDK (HTTP server, worker). */
export const HTTP_METHOD = 'http.request.method';
export const HTTP_ROUTE = 'http.route';
export const HTTP_STATUS_CODE = 'http.response.status_code';

export const WORKER_COMMAND = 'command';
export const WORKER_STATUS = 'status';

export const INSTRUMENT_HTTP_SERVER_DURATION = 'http.server.request.duration';
export const INSTRUMENT_HTTP_SERVER_ACTIVE_REQUESTS = 'http.server.active_requests';
export const INSTRUMENT_WORKER_COMMAND_DURATION = 'podverse.worker.command.duration';
