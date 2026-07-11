const FALLBACK = "/api";
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || FALLBACK;

const TOKEN_KEY = "umat_sps_token";

export const getToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function logActivity(
  action: string,
  entity?: string,
  entity_id?: string | number,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    await apiFetch("/audit-logs", {
      method: "POST",
      body: JSON.stringify({ action, entity, entity_id: entity_id ? String(entity_id) : undefined, details }),
    });
  } catch { /* never block UI for logging */ }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  
  // Only set Content-Type for JSON body, NOT for FormData
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  // Remove Content-Type if it's FormData to let browser set it with boundary
  if (options.body instanceof FormData && headers.has("Content-Type")) {
    headers.delete("Content-Type");
  }
  
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const method = (options.method ?? "GET").toUpperCase();
  if (method === "GET") headers.set("Cache-Control", "no-cache");

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (e) {
    throw new ApiError(
      import.meta.env.PROD
        ? "Cannot reach the server. Please try again."
        : `Cannot reach API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  };

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = (typeof data === "object" && data && "error" in data && (data as { error?: string }).error) || res.statusText;
    throw new ApiError(String(msg), res.status);
  }
  
  return data as T;
}