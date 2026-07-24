# Samen — Google-koppeling instellen

Dit is een eenmalige setup. Doe eerst stap A t/m D; Gmail (stap E) kan later.

## A. Google Cloud: API's aanzetten
1. Ga naar console.cloud.google.com en kies je bestaande project (van de login).
2. **APIs & Services → Library** → zoek en enable: **Google Tasks API**.
   Wil je later Gmail: enable ook **Gmail API**.

## B. Scopes toevoegen aan het OAuth consent screen
1. **APIs & Services → OAuth consent screen → Data access / Scopes → Add or remove scopes**.
2. Voeg toe: `https://www.googleapis.com/auth/tasks`
   (voor Gmail later ook: `https://www.googleapis.com/auth/gmail.readonly`)
3. Opslaan.

> **Let op — 7 dagen.** Staat je project op **Testing**, dan verlopen de tokens na 7 dagen
> en moeten jullie opnieuw koppelen. Zet je 'm op **In production** dan vervalt dat, maar
> voor de Gmail-scope hoort daar een verificatietraject bij. Begin gerust in Testing en
> voeg jezelf + je partner toe als **Test users**.

## C. Client ID en secret klaarzetten
**APIs & Services → Credentials → je OAuth 2.0 Client ID** → noteer **Client ID** en
**Client secret**. (Dezelfde die je bij Supabase Authentication hebt ingevuld.)

## D. Edge Functions uitrollen
In Supabase → **Edge Functions**:
1. Zet eerst de geheimen: **Edge Functions → Secrets** (of Project Settings → Edge Functions):
   - `GOOGLE_CLIENT_ID` = je client ID
   - `GOOGLE_CLIENT_SECRET` = je client secret
   (`SUPABASE_URL` en `SUPABASE_SERVICE_ROLE_KEY` staan er standaard al.)
2. Maak twee functies aan met exact deze namen en plak de code uit
   `supabase/functions/google-sync/index.ts` en `supabase/functions/gmail-import/index.ts`.
   Vergeet niet het hulpbestand `_shared/google.ts` mee te nemen.
   Kan ook via de CLI: `supabase functions deploy google-sync gmail-import`.

## E. Koppelen in de app
1. Open de app → knop **Koppel Google** rechtsboven → log in en geef toestemming.
   Je partner doet hetzelfde op haar/zijn eigen account.
2. Vanaf nu verschijnt de knop **Sync**. Die duwt taken met een deadline naar de
   Google-takenlijst **Samen** en haalt afgevinkte taken terug.
3. Gmail: open **Uitnodigen** → **Gmail-label ook koppelen**. Maak in Gmail een label
   `Samen` en label de mails die je wil oppakken. Bij de volgende sync verschijnen ze
   in de kolom **Bedenken**, met een link naar de originele mail.

## Wat de sync wel en niet doet
- **Wel:** taken mét deadline → Google Taken (lijst "Samen"); afvinken in Google → kolom Klaar.
- **Niet:** wijzigingen die je in Google maakt (titel, datum) komen niet terug naar de app.
- **Terugkerend:** de Google Taken-API ondersteunt géén herhaling. Samen pusht daarom
  telkens de eerstvolgende instantie; de reeks zelf wordt in de app bijgehouden.
- Taken die via Google op Klaar komen krijgen het label **"tijd invullen"**, omdat de
  verplichte tijdsregistratie dan is overgeslagen.
