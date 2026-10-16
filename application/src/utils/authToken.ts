const BASE64_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const decodeBase64 = (value: string): string | null => {
  let output = "";
  let buffer = 0;
  let bitCount = 0;

  for (const character of value) {
    if (character === "=") break;
    const digit = BASE64_CHARACTERS.indexOf(character);
    if (digit < 0) return null;

    buffer = (buffer << 6) | digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output += String.fromCharCode((buffer >> bitCount) & 0xff);
      buffer &= (1 << bitCount) - 1;
    }
  }

  return output;
};

const decodeJwtPayload = (token: string): unknown => {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = decodeBase64(padded);
    return decoded ? (JSON.parse(decoded) as unknown) : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string, now = Date.now()): boolean => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== "object" || !("exp" in payload)) {
    return false;
  }

  const expiresAt = payload.exp;
  return (
    typeof expiresAt === "number" &&
    Number.isFinite(expiresAt) &&
    expiresAt * 1000 <= now
  );
};

export const isExpiredTokenError = (
  status: number | undefined,
  code: string | undefined,
  message: string,
): boolean => {
  if (status !== 401) return false;

  const normalizedCode = code?.toLowerCase().replace(/[\s-]/g, "_");
  return (
    normalizedCode === "session_expired" ||
    normalizedCode === "token_expired" ||
    normalizedCode === "expired_token" ||
    normalizedCode === "jwt_expired" ||
    normalizedCode === "invalid_token" ||
    normalizedCode === "jwt_invalid" ||
    /\bsession\b.*\bexpired\b|\b(?:token|jwt)\b.*\b(?:expired|invalid)\b|\b(?:expired|invalid)\b.*\b(?:token|jwt)\b/i.test(
      message,
    )
  );
};
