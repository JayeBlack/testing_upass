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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  console.log(`[API] Fetching: ${path}`);
  console.log(`[API] Token present: ${!!token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (e) {
    console.error(`[API] Network error:`, e);
    throw new ApiError(
      `Cannot reach API at ${API_BASE_URL}. Is the backend running?`,
      0,
    );
  }

  console.log(`[API] Response status: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = (typeof data === "object" && data && "error" in data && (data as { error?: string }).error) || res.statusText;
    console.error(`[API] Error response:`, msg);
    throw new ApiError(String(msg), res.status);
  }
  
  console.log(`[API] Success: ${path}`, Array.isArray(data) ? `${data.length} items` : typeof data);
  return data as T;
}