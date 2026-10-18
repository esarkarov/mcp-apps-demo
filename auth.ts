import { createHash, timingSafeEqual } from "node:crypto";
import {
  OAuthError,
  OAuthErrorCode,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";

export const DEMO_USER = "demo";
const MIN_KEY_LENGTH = 16;
const USER_NAME = /^[a-z0-9_-]{1,32}$/i;
const TOKEN_LIFETIME_SECONDS = 3600;

const sha256 = (value: string) => createHash("sha256").update(value).digest();

export function parseApiKeys(raw: string | undefined): Map<string, string> {
  const keys = new Map<string, string>();
  for (const entry of (raw ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(":");
    const key = separator === -1 ? trimmed : trimmed.slice(0, separator);
    const user = separator === -1 ? DEMO_USER : trimmed.slice(separator + 1);
    if (key.length < MIN_KEY_LENGTH)
      throw new Error(
        `API keys must be at least ${MIN_KEY_LENGTH} characters.`,
      );
    if (!USER_NAME.test(user))
      throw new Error("User names may only use letters, digits, '_' and '-'.");
    keys.set(key, user);
  }
  return keys;
}

export function createApiKeyVerifier(
  keys: Map<string, string>,
): OAuthTokenVerifier {
  const entries = [...keys].map(([key, user]) => ({
    digest: sha256(key),
    user,
  }));
  return {
    async verifyAccessToken(token) {
      const digest = sha256(token);
      let user: string | undefined;
      for (const entry of entries)
        if (timingSafeEqual(digest, entry.digest)) user = entry.user;
      if (!user)
        throw new OAuthError(OAuthErrorCode.InvalidToken, "Invalid API key");
      return {
        token,
        clientId: user,
        scopes: [],
        expiresAt: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
        extra: { user },
      };
    },
  };
}
