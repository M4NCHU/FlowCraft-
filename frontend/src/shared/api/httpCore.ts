export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiQueryPrimitive =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type ApiQueryValue = ApiQueryPrimitive | ApiQueryPrimitive[];

export type ApiResponseType = "json" | "text" | "blob" | "void" | "raw";

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  query?: Record<string, ApiQueryValue>;
  withAuth?: boolean;
  withCredentials?: boolean;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  notifyOnSuccess?: boolean;
  notifyOnError?: boolean;
  successMessage?: string;
  errorMessage?: string;
  responseType?: ApiResponseType;
  baseUrl?: string;
}

export interface ApiClientDefaults {
  baseUrl?: string;
  headers?: Record<string, string>;
  withAuth?: boolean;
  withCredentials?: boolean;
  credentials?: RequestCredentials;
  timeoutMs?: number;
  notifyOnSuccess?: boolean;
  notifyOnError?: boolean;
}

export type ApiErrorCode = "http_error" | "network_error" | "timeout" | "aborted";

export interface ApiErrorMeta {
  path?: string;
  url?: string;
  method?: HttpMethod;
  code?: ApiErrorCode;
  isAbortError?: boolean;
  isTimeoutError?: boolean;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly path?: string;
  readonly url?: string;
  readonly method?: HttpMethod;
  readonly code: ApiErrorCode;
  readonly isAbortError: boolean;
  readonly isTimeoutError: boolean;
  override readonly cause?: unknown;

  constructor(
    status: number,
    message: string,
    data: unknown,
    meta: ApiErrorMeta = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.path = meta.path;
    this.url = meta.url;
    this.method = meta.method;
    this.code = meta.code ?? "http_error";
    this.isAbortError = meta.isAbortError ?? false;
    this.isTimeoutError = meta.isTimeoutError ?? false;
    this.cause = meta.cause;
  }
}

type UnauthorizedHandler = () => void;

export type ApiNotificationKind = "success" | "error" | "info" | "warning";

export interface ApiNotification {
  kind: ApiNotificationKind;
  message: string;
  status: number;
  data: unknown;
  path: string;
}

type NotificationHandler = (notification: ApiNotification) => void;

interface PreparedRequest {
  body: BodyInit | undefined;
  headers: Record<string, string>;
}

interface RequestSignalState {
  signal?: AbortSignal;
  cleanup: () => void;
  isTimeout: () => boolean;
}

export interface ApiClient {
  request<TResponse = unknown, TBody = unknown>(
    path: string,
    options?: ApiRequestOptions<TBody>
  ): Promise<TResponse>;
  get<TResponse = unknown>(
    path: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ): Promise<TResponse>;
  post<TResponse = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions<TBody>, "method" | "body">
  ): Promise<TResponse>;
  put<TResponse = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions<TBody>, "method" | "body">
  ): Promise<TResponse>;
  patch<TResponse = unknown, TBody = unknown>(
    path: string,
    body?: TBody,
    options?: Omit<ApiRequestOptions<TBody>, "method" | "body">
  ): Promise<TResponse>;
  delete<TResponse = unknown>(
    path: string,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ): Promise<TResponse>;
}

let onUnauthorized: UnauthorizedHandler | null = null;
let notifyHandler: NotificationHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function setNotificationHandler(handler: NotificationHandler | null) {
  notifyHandler = handler;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getDefaultErrorMessage(status: number): string {
  return getReadableDefaultErrorMessage(status);
}

function getReadableDefaultErrorMessage(status: number): string {
  if (status === 0) return "Brak połączenia z serwerem.";
  if (status === 400) return "Nieprawidłowe żądanie.";
  if (status === 401) return "Sesja wygasła lub brak autoryzacji.";
  if (status === 403) return "Brak uprawnień do tej operacji.";
  if (status === 404) return "Nie znaleziono zasobu.";
  if (status === 408) return "Przekroczono czas oczekiwania na odpowiedź serwera.";
  if (status >= 500) return "Błąd serwera. Spróbuj ponownie później.";
  return "Wystąpił błąd podczas przetwarzania żądania.";
}

export function toApiError(
  error: unknown,
  fallbackMessage = getReadableDefaultErrorMessage(0),
  meta: (ApiErrorMeta & { status?: number; data?: unknown }) | undefined = undefined
): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  const isAbort = isAbortError(error);
  const isTimeout = meta?.code === "timeout";
  const status = meta?.status ?? (isTimeout ? 408 : 0);
  const message = isTimeout
    ? getReadableDefaultErrorMessage(408)
    : error instanceof Error && error.message
    ? error.message
    : fallbackMessage;

  return new ApiError(status, message, meta?.data ?? null, {
    ...meta,
    code: meta?.code ?? (isAbort ? "aborted" : "network_error"),
    isAbortError: isAbort,
    isTimeoutError: isTimeout,
    cause: error,
  });
}

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
const configuredBaseUrl = envBaseUrl ? envBaseUrl.replace(/\/$/, "") : "";

function resolveBaseUrl(baseUrlOverride?: string): string {
  if (baseUrlOverride) {
    return baseUrlOverride.replace(/\/$/, "");
  }

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost";
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function serializeQueryValue(value: Exclude<ApiQueryPrimitive, undefined>): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function buildUrl(
  path: string,
  query?: ApiRequestOptions["query"],
  baseUrlOverride?: string
): string {
  const url = new URL(resolveBaseUrl(baseUrlOverride) + normalizePath(path));

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => {
      if (entry === null || entry === undefined) {
        return;
      }
      url.searchParams.append(key, serializeQueryValue(entry));
    });
  });

  return url.toString();
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function isBinaryBody(body: unknown): body is Blob | ArrayBuffer {
  if (typeof Blob !== "undefined" && body instanceof Blob) return true;
  if (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) {
    return true;
  }
  return false;
}

function isUrlSearchParams(body: unknown): body is URLSearchParams {
  return typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
}

function prepareRequestBody(
  body: unknown,
  headers: Record<string, string>
): PreparedRequest {
  if (body === undefined || body === null) {
    return { body: undefined, headers };
  }

  if (isFormData(body) || isBinaryBody(body) || isUrlSearchParams(body)) {
    return { body: body as BodyInit, headers };
  }

  if (typeof body === "string") {
    return { body, headers };
  }

  return {
    body: JSON.stringify(body),
    headers: {
      ...headers,
      "Content-Type": headers["Content-Type"] ?? "application/json",
    },
  };
}

function isJsonLikePayload(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

async function parseResponse<T>(
  response: Response,
  responseType: ApiResponseType = "json"
): Promise<T> {
  if (responseType === "raw") {
    return response as unknown as T;
  }

  if (
    responseType === "void" ||
    response.status === 204 ||
    response.status === 205
  ) {
    return undefined as unknown as T;
  }

  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!text) {
    return undefined as unknown as T;
  }

  if (contentType.includes("application/json") || isJsonLikePayload(text)) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  return text as unknown as T;
}

function isAbortError(error: unknown): boolean {
  return !!(
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function createRequestSignal(
  signal?: AbortSignal,
  timeoutMs?: number
): RequestSignalState {
  if (!timeoutMs || timeoutMs <= 0) {
    return {
      signal,
      cleanup: () => undefined,
      isTimeout: () => false,
    };
  }

  const controller = new AbortController();
  let didTimeout = false;

  const abortFromParent = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  const timeoutId = globalThis.setTimeout(() => {
    didTimeout = true;
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortFromParent);
      }
    },
    isTimeout: () => didTimeout,
  };
}

function getErrorNotificationKind(status: number): ApiNotificationKind {
  if (status === 404) return "warning";
  if (status === 401 || status === 403) return "error";
  if (status >= 500) return "error";
  return "error";
}

function extractValidationMessage(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("errors" in data)) {
    return null;
  }

  const errors = (data as { errors?: unknown }).errors;
  if (!errors || typeof errors !== "object") {
    return null;
  }

  const messages = Object.values(errors as Record<string, unknown>)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string" && !!value.trim());

  if (!messages.length) {
    return null;
  }

  return messages.join(" ");
}

function extractMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const candidateKeys = ["message", "error", "title", "detail"] as const;
  for (const key of candidateKeys) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const validationMessage = extractValidationMessage(data);
  if (validationMessage) {
    return validationMessage;
  }

  const toast = (data as { toast?: unknown }).toast;
  if (
    toast &&
    typeof toast === "object" &&
    "text" in toast &&
    typeof (toast as { text?: unknown }).text === "string"
  ) {
    return ((toast as { text: string }).text ?? "").trim() || null;
  }

  return null;
}

function emitNotification(notification: ApiNotification | null) {
  if (notification && notifyHandler) {
    notifyHandler(notification);
  }
}

function createClientError(
  error: unknown,
  path: string,
  url: string,
  method: HttpMethod,
  timeoutState: RequestSignalState,
  fallbackMessage?: string
): ApiError {
  const timedOut = timeoutState.isTimeout();
  return toApiError(error, fallbackMessage, {
    status: timedOut ? 408 : 0,
    data: null,
    path,
    url,
    method,
    code: timedOut ? "timeout" : undefined,
  });
}

function normalizeRequestOptions<TBody>(
  defaults: ApiClientDefaults,
  options: ApiRequestOptions<TBody>
): ApiRequestOptions<TBody> {
  return {
    ...defaults,
    ...options,
    headers: {
      ...(defaults.headers ?? {}),
      ...(options.headers ?? {}),
    },
  };
}

export function createApiClient(defaults: ApiClientDefaults = {}): ApiClient {
  async function request<TResponse = unknown, TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {}
  ): Promise<TResponse> {
    const finalOptions = normalizeRequestOptions(defaults, options);
    const method = finalOptions.method ?? "GET";
    const url = buildUrl(path, finalOptions.query, finalOptions.baseUrl);
    const prepared = prepareRequestBody(finalOptions.body, {
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8",
      ...(finalOptions.headers ?? {}),
    });
    const timeoutState = createRequestSignal(
      finalOptions.signal,
      finalOptions.timeoutMs
    );

    const init: RequestInit = {
      method,
      headers: prepared.headers,
      credentials:
        finalOptions.credentials ??
        (finalOptions.withCredentials ?? true ? "include" : "same-origin"),
      signal: timeoutState.signal,
      body: prepared.body,
    };

    try {
      const response = await fetch(url, init);
      const data = await parseResponse<TResponse>(
        response,
        finalOptions.responseType
      );

      if (!response.ok) {
        const unauthorizedHandler = onUnauthorized;
        const shouldTriggerUnauthorized =
          response.status === 401 &&
          !!unauthorizedHandler &&
          finalOptions.withAuth !== false;

        if (shouldTriggerUnauthorized) {
          unauthorizedHandler();
        }

        const message =
          extractMessage(data) ??
          finalOptions.errorMessage ??
          getReadableDefaultErrorMessage(response.status);

        const apiError = new ApiError(response.status, message, data, {
          path,
          url,
          method,
          code: "http_error",
        });

        if (finalOptions.notifyOnError !== false) {
          emitNotification({
            kind: getErrorNotificationKind(response.status),
            message,
            status: response.status,
            data,
            path,
          });
        }

        throw apiError;
      }

      if (finalOptions.notifyOnSuccess) {
        const message =
          finalOptions.successMessage ?? extractMessage(data) ?? null;

        if (message) {
          emitNotification({
            kind: "success",
            message,
            status: response.status,
            data,
            path,
          });
        }
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      const apiError = createClientError(
        error,
        path,
        url,
        method,
        timeoutState,
        finalOptions.errorMessage ?? getReadableDefaultErrorMessage(0)
      );

      if (finalOptions.notifyOnError !== false && !apiError.isAbortError) {
        emitNotification({
          kind: getErrorNotificationKind(apiError.status),
          message: apiError.message,
          status: apiError.status,
          data: apiError.data,
          path,
        });
      }

      throw apiError;
    } finally {
      timeoutState.cleanup();
    }
  }

  return {
    request,
    get<TResponse = unknown>(
      path: string,
      options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ) {
      return request<TResponse>(path, { ...options, method: "GET" });
    },
    post<TResponse = unknown, TBody = unknown>(
      path: string,
      body?: TBody,
      options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
    ) {
      return request<TResponse, TBody>(path, {
        ...options,
        method: "POST",
        body,
      });
    },
    put<TResponse = unknown, TBody = unknown>(
      path: string,
      body?: TBody,
      options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
    ) {
      return request<TResponse, TBody>(path, {
        ...options,
        method: "PUT",
        body,
      });
    },
    patch<TResponse = unknown, TBody = unknown>(
      path: string,
      body?: TBody,
      options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
    ) {
      return request<TResponse, TBody>(path, {
        ...options,
        method: "PATCH",
        body,
      });
    },
    delete<TResponse = unknown>(
      path: string,
      options: Omit<ApiRequestOptions, "method" | "body"> = {}
    ) {
      return request<TResponse>(path, { ...options, method: "DELETE" });
    },
  };
}

export const httpClient = createApiClient();

export async function apiRequest<TResponse = unknown, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  return httpClient.request<TResponse, TBody>(path, options);
}

export function apiGet<TResponse = unknown>(
  path: string,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<TResponse> {
  return httpClient.get<TResponse>(path, options);
}

export function apiPost<TResponse = unknown, TBody = unknown>(
  path: string,
  body?: TBody,
  options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
): Promise<TResponse> {
  return httpClient.post<TResponse, TBody>(path, body, options);
}

export function apiPut<TResponse = unknown, TBody = unknown>(
  path: string,
  body?: TBody,
  options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
): Promise<TResponse> {
  return httpClient.put<TResponse, TBody>(path, body, options);
}

export function apiPatch<TResponse = unknown, TBody = unknown>(
  path: string,
  body?: TBody,
  options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}
): Promise<TResponse> {
  return httpClient.patch<TResponse, TBody>(path, body, options);
}

export function apiDelete<TResponse = unknown>(
  path: string,
  options: Omit<ApiRequestOptions, "method" | "body"> = {}
): Promise<TResponse> {
  return httpClient.delete<TResponse>(path, options);
}
