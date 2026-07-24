import { supabase } from "./supabase";
import { saveGoogleLink, getGoogleLink } from "./data";

// Scopes. Taken = "sensitive"; Gmail lezen = "restricted" (zwaarder verificatietraject).
export const SCOPE_TASKS = "https://www.googleapis.com/auth/tasks";
export const SCOPE_GMAIL = "https://www.googleapis.com/auth/gmail.readonly";

// Start een Google-login die óók een refresh token teruggeeft.
// access_type=offline + prompt=consent is nodig, anders krijg je alleen een access token.
// We onthouden expliciet dat DIT een koppel-actie is (en of Gmail meedoet),
// zodat het opstarten van de app niet per ongeluk als koppeling wordt gezien.
export async function connectGoogle({ withGmail = false } = {}) {
  const scopes = ["email", "profile", SCOPE_TASKS, ...(withGmail ? [SCOPE_GMAIL] : [])].join(" ");
  sessionStorage.setItem("samen_google_connect", "1");
  sessionStorage.setItem("samen_google_gmail", withGmail ? "1" : "0");
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes,
      redirectTo: window.location.origin,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
}

// Slaat de koppeling op. Draait alleen zinvol ná een echte koppel-actie.
// gmail_enabled gaat alleen OMHOOG bij een Gmail-koppeling; een gewone
// Taken-(her)koppeling zet 'm nooit terug op false.
export async function captureGoogleTokens(member, householdId) {
  const isConnect = sessionStorage.getItem("samen_google_connect") === "1";
  if (!isConnect || !member) return false; // gewoon de app openen -> niets opslaan

  const { data: { session } } = await supabase.auth.getSession();
  const refresh = session?.provider_refresh_token;
  const wantGmail = sessionStorage.getItem("samen_google_gmail") === "1";
  sessionStorage.removeItem("samen_google_connect");
  sessionStorage.removeItem("samen_google_gmail");

  const existing = await getGoogleLink(member.id);
  const row = {
    member_id: member.id,
    household_id: householdId,
    // eenmaal aan blijft aan; een Gmail-koppeling zet 'm aan
    gmail_enabled: wantGmail || !!existing?.gmail_enabled,
  };
  // refresh token alleen overschrijven als Google er nu écht een gaf,
  // anders behouden we de bestaande koppeling.
  if (refresh) row.refresh_token = refresh;
  else if (!existing) return false; // geen token en nog geen rij -> niets te doen

  await saveGoogleLink(row);
  return true;
}
