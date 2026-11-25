# Bartekåringen

Digital kåring av årets beste og verste bart. Hver deltaker får en lapp med en unik kode ved ankomst, registrerer seg med navn og selfie, og stemmer i to runder fra mobilen.

| Side | Adresse | Hvem |
|---|---|---|
| Stemmeside | `bartebord.no/stem/` | Deltakerne (QR-koden på lappen går hit) |
| Admin | `bartebord.no/admin/` | Arrangøren (krever passord) |
| Storskjerm | `bartebord.no/skjerm/` | Vises på TV eller projektor i lokalet |

## Slik foregår kvelden

1. **Registrering:** Deltakeren skanner lappen, skriver navnet sitt og tar en selfie.
2. **Første runde:** Avstemningen åpner av seg selv når alle 22 har registrert seg, eller kl. 18:00 hvis ikke alle har registrert seg før det. Admin kan også åpne den manuelt. Den som ikke har registrert seg ennå, blir bedt om å gjøre det før de stemmer. De blir da også kandidater, men bare for dem som stemmer etter at de er registrert.
3. **Øyeblikksbilde:** Admin ser resultatet fortløpende og hvem som ikke har stemt. Det er ikke nødvendig at alle har stemt.
4. **Finale:** Admin trykker «Start finalen». Topp 3 i hver kategori går videre (står flere likt på 3. plass, blir alle med). Alle stemmer på nytt blant finalistene.
5. **Vinnere:** Admin avslutter finalen og ser vinnerne. Ved uavgjort avgjør dere det på stedet. Til slutt trykker admin «Vis vinnerne for alle», og vinnerne vises på storskjermen og på alle telefonene.

Ingen kan stemme på seg selv, og hver kode gir én stemme per runde. Det lagres hvem som har stemt, men ikke hva hver enkelt stemte.

## Oppsett (én gang)

### 1. Lag et Supabase-prosjekt

Gå til [supabase.com](https://supabase.com), lag en gratis konto og et nytt prosjekt. Velg en region i Europa.

### 2. Kjør databaseoppsettet

I Supabase: **SQL Editor → New query**. Lim inn hele innholdet i [`supabase/stemmer.sql`](supabase/stemmer.sql) og trykk **Run**.

Kjør deretter dette (bytt ut passordet med et eget, minst 10 tegn):

```sql
select stemmer.set_admin_password('et-langt-hemmelig-passord');
select * from stemmer.generate_codes(30);
```

Den siste linjen lager 30 koder: 22 deltakere og 8 i reserve.

### 3. Koble nettsiden til Supabase

I Supabase: **Project Settings → API Keys**. Du trenger *Project URL* og *Publishable key* (eller den eldre *anon public*-nøkkelen). Begge er laget for å ligge åpent i en nettside. Det er databasefunksjonene som passer på reglene.

I GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Legg inn:

- `SUPABASE_URL`: Project URL, for eksempel `https://abcdefgh.supabase.co`
- `SUPABASE_ANON_KEY`: Publishable key

Nettsiden bygges på nytt neste gang noe pushes til `main`. Du kan også starte byggingen manuelt under **Actions → Deploy to GitHub Pages → Run workflow**.

### 4. Generalprøve

Test med noen få telefoner før kvelden. Sett for eksempel at avstemningen åpner når 3 har registrert seg:

```sql
update stemmer.settings set expected_count = 3;
```

Gå gjennom hele løpet: registrering, første runde, finale og avsløring. Nullstill etterpå og sett tilbake innstillingene:

```sql
select stemmer.reset();
update stemmer.settings set expected_count = 22, voting_opens_at = '2026-11-28 18:00 Europe/Oslo';
```

`stemmer.reset()` sletter registreringer og stemmer, men beholder kodene, så utskrevne lapper fortsatt virker. Testbildene ligger igjen i Storage under `barter`. De kan slettes der hvis du vil.

### 5. Skriv ut lappene

Åpne `/admin/`, logg inn og gå til **Lapper → Skriv ut**. Det blir åtte lapper per A4-ark, med stiplede kanter å klippe langs.

## På kvelden

- Ha `/skjerm/` oppe på en TV eller projektor. Den oppdaterer seg selv.
- Ha `/admin/` oppe på din egen telefon eller PC.
- **Mistet lapp:** Koden står i deltakerlisten nederst på adminsiden.
- **Tom telefon:** Deltakeren kan bruke en annen telefon. Trykk «bytt» øverst til høyre og skriv inn koden fra lappen.
- **Feiltrykk:** «Tilbake til første runde» fungerer så lenge ingen har stemt i finalen. «Gjenåpne finalen» fungerer etter at finalen er avsluttet.

Bildene beholdes etter kvelden, i Supabase Storage under `barter`.

## Nyttige SQL-kommandoer

```sql
-- Endre åpningstidspunkt eller antall deltakere
update stemmer.settings set voting_opens_at = '2026-11-28 18:00 Europe/Oslo', expected_count = 22;

-- Lage flere koder
select * from stemmer.generate_codes(5);

-- Bytte adminpassord
select stemmer.set_admin_password('nytt-passord-her');
```
