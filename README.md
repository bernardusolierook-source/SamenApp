# Samen

Een gedeelde huishoud-takentool voor twee mensen. Elke taak heeft een levenscyclus
(**Bedenken → Plannen → Doen → Klaar**), één eigenaar, en hoort bij een *kaart*
(een staande verantwoordelijkheid). De evenwichtsbalk laat live zien hoe de verdeling
tussen jullie staat. Data is gedeeld en realtime: zie je partner een kaart verschuiven
terwijl het gebeurt.

Stack: React + Vite (frontend) · Supabase (Postgres, auth, realtime). Gratis tiers volstaan ruim.

---

## Wat er in deze v1 zit
- Gedeeld bord (CPE-fasen) + kaartenoverzicht + evenwichtsbalk
- Google-login, gekoppeld huishouden (oprichten of aansluiten met code)
- Realtime sync tussen beide gebruikers
- Conception-capture met triage-suggestie (los idee → voorgestelde kaart + eigenaar)
- Tijdelijke overdracht (handoff), checklists, bronnen, afgesproken standaard per kaart

## Wat bewust laag 2 is (nog niet gebouwd, wel voorbereid)
- **Gmail-koppeling** (label `→Samen` → taak): velden `task_sources` staan klaar; vergt
  een Supabase Edge Function die Gmail pollt of een push-watch afhandelt.
- **Agenda-projectie**: het veld `scheduled_at` is er al; tweerichtingssync met Google
  Calendar is de volgende stap.
- **Keep**: niet koppelbaar op privé-accounts (geen consumenten-API). De rol ervan —
  snelle capture — vul je met de ingebouwde capture; later eventueel een PWA share-target.

---

## Live zetten (±30 min, eenmalig)

### 1. Supabase-project
1. Maak een account op supabase.com → **New project**. Kies een **EU-regio**
   (bijv. Frankfurt) zodat de gezinsdata binnen de EU blijft.
2. Open **SQL Editor → New query**, plak de inhoud van `supabase/schema.sql`, **Run**.
3. Zet Google-login aan: **Authentication → Providers → Google → Enable**.
   - Maak een OAuth-client in de Google Cloud Console (APIs & Services → Credentials →
     OAuth client ID → Web application).
   - Bij **Authorized redirect URIs** zet je de waarde die Supabase toont
     (`https://JOUWPROJECT.supabase.co/auth/v1/callback`).
   - Plak Client ID + Secret terug in Supabase.
4. **Project Settings → API**: kopieer de `Project URL` en de `anon public` key.

### 2. Lokaal draaien
```bash
cp .env.example .env      # vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
npm install
npm run dev               # http://localhost:5173
```
Log in met Google, maak een huishouden aan. Je krijgt een uitnodigingscode.

### 3. Hosten (Vercel)
1. Push deze map naar een Git-repo (GitHub).
2. Vercel → **New Project** → importeer de repo (framework: Vite, detecteert vanzelf).
3. Zet bij **Environment Variables** dezelfde twee `VITE_`-waarden.
4. Deploy. Je krijgt een URL, bijv. `https://samen-xyz.vercel.app`.
5. Voeg die URL toe als **Site URL / Redirect URL** in Supabase
   (**Authentication → URL Configuration**) en als redirect-URI in de Google OAuth-client.

### 4. Je partner erbij
- Stuur je partner de URL. Op de telefoon: openen → browser-menu → **Zet op beginscherm**.
  Dan opent en voelt het als een app (geen app store nodig).
- Inloggen met Google → **Aansluiten met code** → jouw uitnodigingscode invoeren.
- Vanaf nu zien jullie hetzelfde, realtime.

---

## Eerste keer gebruiken
Bij een nieuw huishouden krijg je een **complete starterset van ~64 kaarten** (de vijf
Fair Play-categorieën, NL-context), allemaal eerst op jouw naam. Het idee: je herkent en
streept weg in plaats van zelf te moeten bedenken — precies de last die je wil wegnemen.

Ga naar **Kaarten** en doe samen twee dingen:
1. **Verdelen** — geef elke kaart een eigenaar. De evenwichtsbalk laat meteen zien waar
   het scheef zit. Dat verdelen ís de oefening.
2. **Opschonen** — wat niet bij jullie speelt (babyspullen, mantelzorg, een huurwoning)
   archiveer je met één tik. Archief is omkeerbaar (**Terughalen**) en telt niet mee in de
   balans. Niets wordt verwijderd, dus je verliest geen historie.

## Privacy
Alle data staat in jóuw Supabase-project (EU-regio aan te raden). Geen derde partij,
geen advertenties. Row-level security zorgt dat alleen leden van een huishouden de data
van dat huishouden zien.
```
src/
  lib/        supabase-client, datatoegang, constanten
  components/ BalanceBar, TaskCard, DomainCard, Drawer, ConceptionCapture, Onboarding
supabase/
  schema.sql  tabellen + RLS + RPC's (create_household / join_household)
```
