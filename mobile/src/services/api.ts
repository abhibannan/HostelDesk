import { Platform } from "react-native";

// Remote hosted backend (Render)
const REMOTE_API_URL = "https://staynexa-1.onrender.com/api/v1";
// Local development server
const LOCAL_API_URL = "http://localhost:3000/api/v1";

// Local development machine LAN IP
const LOCAL_LAN_IP = "192.168.0.183";

export const getBaseApiUrl = (): string => {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return LOCAL_API_URL;
    }
    if (host.startsWith("192.168.") || host.startsWith("10.") || host.startsWith("172.")) {
      return `http://${host}:3000/api/v1`;
    }
  }

  // When running mobile app in development (Expo Go on same Wi-Fi)
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    return `http://${LOCAL_LAN_IP}:3000/api/v1`;
  }

  return REMOTE_API_URL;
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
