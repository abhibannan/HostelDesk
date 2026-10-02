// Default to local development server, or replace with your online hosted URL (e.g., Render/Railway)
export const API_URL = "https://staynexa-1.onrender.com/api/v1";

let hasWarmedUp = false;
export function warmupApi(): void {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {
    // Retry once if Render was sleeping
    setTimeout(() => {
      fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {});
    }, 3000);
  });
}

export async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiRequest(path: string, options: RequestInit = {}, token?: string | null) {
  if (!token) throw new Error("You are not signed in.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    const message = data && typeof data === "object" ? (data as Record<string, unknown>).message : null;
    throw new Error(String(message || `Request failed: ${response.status}`));
  }
  return data;
}
