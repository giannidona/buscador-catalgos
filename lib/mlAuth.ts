// lib/mlAuth.ts — server-only OAuth token for Mercado Libre

const ML_TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const staticToken = process.env.ML_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const clientId = process.env.ML_CLIENT_ID?.trim();
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Configurá ML_CLIENT_ID y ML_CLIENT_SECRET (o ML_ACCESS_TOKEN) en las variables de entorno."
    );
  }

  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const res = await fetch(ML_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `No se pudo obtener token de Mercado Libre (HTTP ${res.status}): ${detail}`
    );
  }

  const data: { access_token: string; expires_in: number } = await res.json();

  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cached.token;
}
