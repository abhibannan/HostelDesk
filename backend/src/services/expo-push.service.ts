import { db } from "../config/firebase.js";

type PushMessage = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

type ExpoPushTokenRecord = {
  token: string;
  userId: string;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_TOKEN = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;

export function isExpoPushToken(value: string): boolean {
  return EXPO_PUSH_TOKEN.test(value);
}

export async function sendExpoPushNotifications(
  messages: PushMessage[],
): Promise<void> {
  if (!messages.length) return;

  const messageByUser = new Map(messages.map((message) => [message.userId, message]));
  const userIds = [...messageByUser.keys()];
  const tokens: ExpoPushTokenRecord[] = [];
  const seenTokens = new Set<string>();

  for (let index = 0; index < userIds.length; index += 10) {
    const snapshot = await db
      .collection("pushTokens")
      .where("userId", "in", userIds.slice(index, index + 10))
      .get();

    for (const document of snapshot.docs) {
      const data = document.data();
      const token = String(data.token ?? "");
      const userId = String(data.userId ?? "");
      if (messageByUser.has(userId) && isExpoPushToken(token) && !seenTokens.has(token)) {
        seenTokens.add(token);
        tokens.push({ token, userId });
      }
    }
  }

  for (let index = 0; index < tokens.length; index += 100) {
    const batchTokens = tokens.slice(index, index + 100);
    const payload = batchTokens.map(({ token, userId }) => {
      const message = messageByUser.get(userId)!;
      return {
        to: token,
        title: message.title,
        body: message.body,
        sound: "default",
        priority: "high",
        channelId: "default",
        _displayInForeground: true,
        data: message.data ?? {},
      };
    });

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Expo push notification request failed:", await response.text());
      } else {
        const result = (await response.json()) as {
          data?: Array<{ status: string; message?: string; details?: { error?: string } }>;
        };
        // Clean up unregistered tokens
        if (Array.isArray(result?.data)) {
          result.data.forEach((ticket, idx) => {
            if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
              const deadToken = batchTokens[idx]?.token;
              if (deadToken) {
                db.collection("pushTokens")
                  .where("token", "==", deadToken)
                  .get()
                  .then((snap) => {
                    snap.docs.forEach((doc) => doc.ref.delete());
                  })
                  .catch(() => {});
              }
            }
          });
        }
      }
    } catch (error) {
      // A notification record is still retained in-app if push delivery fails.
      console.error("Expo push notification delivery failed:", error);
    }
  }
}
