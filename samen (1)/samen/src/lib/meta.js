import { Home, Car, HeartPulse, Sparkles, Zap, Mail, MessageCircle, Link2, Paperclip } from "lucide-react";

export const STAGES = ["conception", "planning", "execution", "done"];
export const STAGE_META = {
  conception: { label: "Bedenken", mark: "C", hint: "wat moet er gebeuren" },
  planning:   { label: "Plannen",  mark: "P", hint: "wanneer & hoe" },
  execution:  { label: "Doen",     mark: "E", hint: "in uitvoering" },
  done:       { label: "Klaar",    mark: "✓", hint: "afgerond" },
};
export const CAT_META = {
  home:       { label: "Thuis",  Icon: Home },
  out:        { label: "Buiten", Icon: Car },
  caregiving: { label: "Zorg",   Icon: HeartPulse },
  magic:      { label: "Magie",  Icon: Sparkles },
  wild:       { label: "Wild",   Icon: Zap },
};
export const CAT_ORDER = ["home", "out", "caregiving", "magic", "wild"];
export const SOURCE_META = {
  email:    { label: "mail",     Icon: Mail },
  whatsapp: { label: "whatsapp", Icon: MessageCircle },
  link:     { label: "link",     Icon: Link2 },
  file:     { label: "bestand",  Icon: Paperclip },
};
export const PALETTE = ["#1F6E6B", "#8A4A6B", "#A8642B", "#3C5A8A", "#4C7A3A", "#7A4ACC"];
export const BOTH_COLOR = "#7C7F86";

export const fmtDate = (iso) =>
  iso ? new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)) : null;

// Verdeling berekenen over kaarten of taken, inclusief 'beide'.
export function distribution(items, members) {
  const counts = { both: 0 };
  members.forEach((m) => { counts[m.id] = 0; });
  let total = 0;
  for (const it of items) {
    if (it.shared) { counts.both += 1; total += 1; }
    else if (it.owner_id != null && counts[it.owner_id] !== undefined) { counts[it.owner_id] += 1; total += 1; }
  }
  return { counts, total };
}
export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export const STARTER_DOMAINS = [
  { name: "Avondeten doordeweeks", category: "home", cadence: "doorlopend", standard: "Plan voor 5 avonden; niemand staat om 17u te bedenken 'wat eten we'." },
  { name: "Boodschappen", category: "home", cadence: "wekelijks", standard: "Vaste basis in huis, lijst aangevuld vóór het weekend." },
  { name: "Vuilnis & afval scheiden", category: "home", cadence: "wekelijks", standard: "GFT/PMD/papier/rest op de juiste dag buiten." },
  { name: "Was draaien & ophangen", category: "home", cadence: "doorlopend", standard: "Geen overvolle wasmand, schone basis altijd beschikbaar." },
  { name: "Was vouwen & opbergen", category: "home", cadence: "doorlopend", standard: "Niets blijft langer dan een dag op het rek of de stoel liggen." },
  { name: "Strijken", category: "home", cadence: "doorlopend", standard: "Nette kleding klaar wanneer nodig." },
  { name: "Schoonmaak algemeen", category: "home", cadence: "wekelijks", standard: "Vloeren en oppervlakken één keer per week grondig." },
  { name: "Badkamer & toilet", category: "home", cadence: "wekelijks", standard: "Schoon en bijgevuld (zeep, wc-papier)." },
  { name: "Keuken & aanrecht", category: "home", cadence: "dagelijks", standard: "'s Avonds opgeruimd en schoon achtergelaten." },
  { name: "Afwas / vaatwasser", category: "home", cadence: "dagelijks", standard: "Vaatwasser draait en wordt uitgeruimd, geen stapel in de gootsteen." },
  { name: "Bedden verschonen", category: "home", cadence: "2-wekelijks", standard: "Schoon beddengoed om de twee weken." },
  { name: "Kamerplanten", category: "home", cadence: "wekelijks", standard: "Water naar behoefte, geen verlepte planten." },
  { name: "Voorraad huishoudspullen", category: "home", cadence: "doorlopend", standard: "Wasmiddel, wc-papier, tandpasta nooit echt op." },
  { name: "Post & administratie", category: "home", cadence: "wekelijks", standard: "Post geopend en verwerkt, niets blijft liggen." },
  { name: "Rekeningen betalen", category: "home", cadence: "maandelijks", standard: "Alles op tijd, geen aanmaningen." },
  { name: "Budget & sparen", category: "home", cadence: "maandelijks", standard: "Maandelijks samen naar in/uit en spaardoel kijken." },
  { name: "Verzekeringen & contracten", category: "home", cadence: "jaarlijks", standard: "Zorg, inboedel, energie, internet jaarlijks tegen het licht." },
  { name: "Auto onderhoud & APK", category: "out", cadence: "jaarlijks", standard: "APK nooit verlopen, onderhoud op tijd." },
  { name: "Tanken / laden", category: "out", cadence: "doorlopend", standard: "Tank of accu nooit onder een kwart aan het begin van de dag." },
  { name: "Fietsen onderhoud", category: "out", cadence: "doorlopend", standard: "Banden op spanning, licht werkt, reparatie binnen een week." },
  { name: "OV & reizen regelen", category: "out", cadence: "doorlopend", standard: "Saldo of abonnement op orde voor wie het nodig heeft." },
  { name: "Tuin & balkon", category: "out", cadence: "seizoen", standard: "Onderhouden naar seizoen — maaien, snoeien, onkruid." },
  { name: "Schuur, berging & buiten", category: "out", cadence: "doorlopend", standard: "Opgeruimd, buitenboel op z'n plek." },
  { name: "Seizoensklussen", category: "out", cadence: "seizoen", standard: "Ramen, cv ontluchten, tuin winterklaar — op het juiste moment." },
  { name: "Sociale agenda plannen", category: "out", cadence: "doorlopend", standard: "Afspraken met vrienden en familie geprikt en in de agenda." },
  { name: "Oppas regelen", category: "out", cadence: "doorlopend", standard: "Oppas geregeld zodra een avond is geprikt." },
  { name: "Contact familie & vrienden", category: "out", cadence: "doorlopend", standard: "Belangrijke mensen worden niet vergeten." },
  { name: "Pakketten & retouren", category: "out", cadence: "doorlopend", standard: "Bezorging opgehaald, retouren binnen de termijn terug." },
  { name: "Vaklieden inschakelen", category: "out", cadence: "doorlopend", standard: "Loodgieter of monteur gebeld en ingepland wanneer nodig." },
  { name: "Vakantie plannen & boeken", category: "out", cadence: "doorlopend", standard: "Hoofdvakantie ruim vooruit geboekt." },
  { name: "Reisvoorbereiding", category: "out", cadence: "doorlopend", standard: "Paspoorten geldig, ingepakt, huis/dieren/planten geregeld." },
  { name: "Cadeaus voor feestjes", category: "out", cadence: "doorlopend", standard: "Cadeau en kaart klaar vóór het feest van een ander." },
  { name: "School/opvang communicatie", category: "caregiving", cadence: "doorlopend", standard: "Berichten gelezen en beantwoord binnen twee dagen." },
  { name: "Oudergesprekken & rapporten", category: "caregiving", cadence: "per kwartaal", standard: "Gesprekken ingepland en bijgewoond." },
  { name: "BSO/opvang & facturen", category: "caregiving", cadence: "maandelijks", standard: "Opvang geregeld, facturen betaald, kinderopvangtoeslag kloppend." },
  { name: "Huiswerk & schoolspullen", category: "caregiving", cadence: "doorlopend", standard: "Spullen compleet, huiswerk begeleid waar nodig." },
  { name: "Sport & hobby's kinderen", category: "caregiving", cadence: "doorlopend", standard: "Ingeschreven, contributie betaald, brengen en halen geregeld." },
  { name: "Speelafspraken kinderen", category: "caregiving", cadence: "doorlopend", standard: "Afspraken gemaakt en de logistiek rond." },
  { name: "Kinderfeestjes (eigen)", category: "caregiving", cadence: "doorlopend", standard: "Gepland: uitnodigingen, traktatie, cadeautjes." },
  { name: "Kleding kinderen", category: "caregiving", cadence: "seizoen", standard: "Maten kloppen per seizoen, niets te klein." },
  { name: "Tandarts kinderen", category: "caregiving", cadence: "elke 6 mnd", standard: "Elk kind 2× per jaar, ruim vooruit geboekt." },
  { name: "Huisarts & CB kind", category: "caregiving", cadence: "doorlopend", standard: "Afspraken bijgehouden, vaccinaties op schema." },
  { name: "Tandarts volwassenen", category: "caregiving", cadence: "elke 6 mnd", standard: "Beiden 2× per jaar op controle." },
  { name: "Huisarts & recepten", category: "caregiving", cadence: "doorlopend", standard: "Afspraken en herhaalrecepten op tijd." },
  { name: "Avond- & slaaproutine", category: "caregiving", cadence: "dagelijks", standard: "Vaste routine, kinderen op tijd in bed." },
  { name: "Ziek kind opvangen", category: "caregiving", cadence: "doorlopend", standard: "Vooraf duidelijk wie thuisblijft bij ziekte." },
  { name: "Mantelzorg familie", category: "caregiving", cadence: "doorlopend", standard: "(Indien van toepassing) zorg voor ouder(s) verdeeld." },
  { name: "Wij samen — check-in", category: "caregiving", cadence: "wekelijks", standard: "Even stilstaan bij hoe het gaat, samen en apart." },
  { name: "Verjaardagen gezin", category: "magic", cadence: "doorlopend", standard: "Vieren geregeld: taart, cadeau, aandacht." },
  { name: "Verjaardagen & jubilea", category: "magic", cadence: "doorlopend", standard: "Onthouden, kaartje of belletje op de dag." },
  { name: "Feestdagen", category: "magic", cadence: "seizoen", standard: "Sint, Kerst, Pasen tijdig voorbereid — cadeaus, eten, traditie." },
  { name: "Uitjes & weekendjes", category: "magic", cadence: "doorlopend", standard: "Regelmatig iets leuks gepland." },
  { name: "Familietradities", category: "magic", cadence: "doorlopend", standard: "De dingen die jullie 'jullie' maken blijven leven." },
  { name: "Foto's & herinneringen", category: "magic", cadence: "doorlopend", standard: "Foto's geordend, af en toe iets afgedrukt of een album." },
  { name: "Date night", category: "magic", cadence: "maandelijks", standard: "Vaste tijd samen, los van de logistiek." },
  { name: "Attenties voor elkaar", category: "magic", cadence: "doorlopend", standard: "Kleine verrassingen, niet alleen op verjaardagen." },
  { name: "Cadeaus voor elkaar", category: "magic", cadence: "doorlopend", standard: "Verjaardag en jubileum van elkaar goed geregeld." },
  { name: "Reparaties in huis", category: "wild", cadence: "doorlopend", standard: "Niets langer dan twee weken kapot." },
  { name: "Klusprojecten & verbouwing", category: "wild", cadence: "doorlopend", standard: "Lopende klussen hebben een eigenaar en voortgang." },
  { name: "Grote aankopen", category: "wild", cadence: "doorlopend", standard: "Research, vergelijken en samen beslissen." },
  { name: "Opruimen & ontspullen", category: "wild", cadence: "incidenteel", standard: "Periodiek een kast, zolder of ruimte aanpakken." },
  { name: "Verhuizing & adreswijziging", category: "wild", cadence: "incidenteel", standard: "(Indien van toepassing) alles tijdig omgezet." },
  { name: "Noodgevallen & pech", category: "wild", cadence: "incidenteel", standard: "Lekkage, autopech, storing — duidelijk wie het oppakt." },
  { name: "Digitale boel", category: "wild", cadence: "doorlopend", standard: "Wachtwoorden, back-ups en updates op orde." },
];

export function suggestDomain(text, domains) {
  const words = text.toLowerCase().split(/[^a-zà-ÿ]+/).filter((w) => w.length > 3);
  let best = null, bestScore = 0;
  for (const d of domains) {
    const dwords = d.name.toLowerCase().split(/[^a-zà-ÿ]+/);
    const score = words.filter((w) => dwords.some((dw) => dw.includes(w) || w.includes(dw))).length;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return bestScore > 0 ? best : null;
}
