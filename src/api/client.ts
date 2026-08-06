import { BACKEND_URL, getAccessToken } from "./config";

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  auth?: boolean;
};

function detailToMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "detail" in detail) {
    const inner = (detail as { detail: unknown }).detail;
    if (typeof inner === "string") return inner;
    if (Array.isArray(inner)) {
      return inner
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item)
        )
        .join("; ");
    }
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  if (!BACKEND_URL) {
    throw new ApiError(
      "VITE_BACKEND_URL is not set. Point it at your Railway API.",
      0
    );
  }

  const { body, auth = true, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      detailToMessage(data, res.statusText || "Request failed"),
      res.status,
      data
    );
  }

  return data as T;
}
