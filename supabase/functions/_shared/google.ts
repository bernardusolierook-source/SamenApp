// Gedeelde helpers voor de Google-koppeling.
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Wisselt een refresh token in voor een access token.
export async function accessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Token vernieuwen mislukt: ${json.error_description || json.error}`);
  return json.access_token as string;
}

export async function gapi(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${url} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : await res.json();
}

// Zoekt (of maakt) de takenlijst "Samen".
export async function samenListId(token: string): Promise<string> {
  const lists = await gapi(token, "https://tasks.googleapis.com/tasks/v1/users/@me/lists");
  const found = (lists.items || []).find((l: any) => l.title === "Samen");
  if (found) return found.id;
  const made = await gapi(token, "https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    method: "POST", body: JSON.stringify({ title: "Samen" }),
  });
  return made.id;
}
