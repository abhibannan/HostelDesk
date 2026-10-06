import { createSign } from "node:crypto";
import { db } from "../config/firebase.js";
import { env } from "../config/env.js";

type PushMessage = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type FcmTokenRecord = {
  token: string;
  userId: string;
};

// ── FCM V1 OAuth2 token cache ─────────────────────────────────────────────────

let cachedFcmToken: { value: string; expiresAt: number } | null = null;

function createServiceAccountJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
  ).toString("base64url");
  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), "base64url");
  return `${header}.${payload}.${sig}`;
}

async function getFcmAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedFcmToken && cachedFcmToken.expiresAt > now + 60_000) return cachedFcmToken.value;
  const jwt = createServiceAccountJWT();
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!resp.ok) throw new Error(`FCM token error: ${await resp.text()}`);
  const data = (await resp.json()) as { access_token: string; expires_in: number };
  cachedFcmToken = { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return cachedFcmToken.value;
}

// ── FCM V1 send ───────────────────────────────────────────────────────────────

const FCM_SEND_URL = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;

async function sendFcmV1(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getFcmAccessToken();
    const resp = await fetch(FCM_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: {
            priority: "high",
            ttl: "86400s", // Keep message for 24h if device is offline
            notification: {
              channelId: "default",
              sound: "default",
              defaultSound: true,
              defaultVibrateTimings: true,
              priority: "MAX" as any,
              visibility: "PUBLIC" as any,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",                // Immediate delivery
              "apns-push-type": "alert",            // Required for visible notifications
            },
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
                "content-available": 1,             // Wake app for background processing
                "interruption-level": "time-sensitive",
                "mutable-content": 1,
              },
            },
          },
          data,
        },
      }),
    });
    if (!resp.ok) {
      const r = (await resp.json()) as { error?: { message?: string; status?: string } };
      return { success: false, error: `${r?.error?.status}: ${r?.error?.message}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// Native FCM tokens are long strings; keep this for backwards compat callers
export function isExpoPushToken(value: string): boolean {
  return value?.length > 20;
}

export async function sendExpoPushNotifications(
  messages: PushMessage[],
): Promise<void> {
  if (!messages.length) return;

  const messageByUser = new Map(messages.map((message) => [message.userId, message]));
  const userIds = [...messageByUser.keys()];
  const tokens: FcmTokenRecord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < userIds.length; i += 10) {
    const snap = await db
      .collection("pushTokens")
      .where("userId", "in", userIds.slice(i, i + 10))
      .get();
    for (const doc of snap.docs) {
      const d = doc.data();
      const token = String(d.token ?? "");
      const userId = String(d.userId ?? "");
      if (messageByUser.has(userId) && token.length > 20 && !seen.has(token)) {
        seen.add(token);
        tokens.push({ token, userId });
      }
    }
  }

  if (!tokens.length) {
    console.log("[FCM] No push tokens found for:", userIds);
    return;
  }

  const deadTokens: string[] = [];
  await Promise.all(
    tokens.map(async ({ token, userId }) => {
      const msg = messageByUser.get(userId)!;
      const result = await sendFcmV1(token, msg.title, msg.body, msg.data ?? {});
      if (!result.success) {
        console.error(`[FCM] Failed → ${userId}: ${result.error}`);
        if (result.error?.includes("UNREGISTERED") || result.error?.includes("INVALID_ARGUMENT")) {
          deadTokens.push(token);
        }
      } else {
        console.log(`[FCM] Delivered → ${userId} ✓`);
      }
    })
  );

  for (const dead of deadTokens) {
    db.collection("pushTokens").where("token", "==", dead).get()
      .then((s) => s.docs.forEach((d) => d.ref.delete())).catch(() => {});
  }
}
