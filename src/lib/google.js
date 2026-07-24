import { supabase } from "./supabase";
import { saveGoogleLink } from "./data";

// Scopes. Taken = "sensitive"; Gmail lezen = "restricted" (zwaarder verificatietraject).
// Daarom apart aan te zetten.
export const SCOPE_TASKS = "https://www.googleapis.com/auth/tasks";
export const SCOPE_GMAIL = "https://www.googleapis.com/auth/gmail.readonly";

// Start een Google-login die óók een refresh token teruggeeft.
// access_type=offline + prompt=consent is nodig, anders krijg je alleen een access token.
export async function connectGoogle({ withGmail = false } = {}) {
  const scopes = ["email", "profile", SCOPE_TASKS, ...(withGmail ? [SCOPE_GMAIL] : [])].join(" ");
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

// Direct na terugkomst van Google zit het refresh token in de sessie.
// Het is er maar één keer, dus we slaan het meteen op.
export async function captureGoogleTokens(member, householdId) {
  const { data: { session } } = await supabase.auth.getSession();
  const refresh = session?.provider_refresh_token;
  if (!refresh || !member) return false;
  const gmail = sessionStorage.getItem("samen_google_gmail") === "1";
  sessionStorage.removeItem("samen_google_gmail");
  await saveGoogleLink({
    member_id: member.id,
    household_id: householdId,
    refresh_token: refresh,
    gmail_enabled: gmail,
  });
  return true;
}
