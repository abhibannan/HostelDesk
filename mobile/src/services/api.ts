import { Platform } from "react-native";

// Local development machine LAN IP
const LOCAL_LAN_IP = "192.168.0.183";

// Remote hosted backend (Render)
const REMOTE_API_URL = "https://staynexa-1.onrender.com/api/v1";
// Local development server
const LOCAL_API_URL = `http://${LOCAL_LAN_IP}:3000/api/v1`;

export const getBaseApiUrl = (): string => {
  return LOCAL_API_URL;
};

export const API_URL = getBaseApiUrl();

let hasWarmedUp = false;
export function warmupApi(): void {
  if (hasWarmedUp) return;
  hasWarmedUp = true;
  fetch(`${API_URL}/health`, { method: "GET" }).catch(() => {});
  if (API_URL !== REMOTE_API_URL) {
    fetch(`${REMOTE_API_URL}/health`, { method: "GET" }).catch(() => {});
  }
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
