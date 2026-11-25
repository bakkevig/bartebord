# Voting

Digital voting for the year's best and worst mustache. Each participant gets a slip with a unique code on arrival, registers with name and selfie, and votes in two rounds from their phone. The pages themselves are in Norwegian.

| Page | Path | Who |
|---|---|---|
| Vote | `bartebord.no/vote/` | Participants (the QR code on the slip leads here) |
| Admin | `bartebord.no/admin/` | The organizer (password protected) |
| Big screen | `bartebord.no/screen/` | Shown on a TV or projector at the venue |

## How the evening works

1. **Registration:** The participant scans the slip, enters their name and takes a selfie.
2. **Round 1:** Voting opens by itself when all 22 have registered, or at 18:00 if not everyone has registered by then. The admin can also open it manually. Anyone not yet registered is asked to register before voting. They also become a candidate, but only for those who vote after they registered.
3. **Snapshot:** The admin sees live results and who has not voted. Not everyone needs to have voted.
4. **Final:** The admin presses «Start finalen». The top 3 in each category go through (if several are tied for 3rd place, all of them go through). Everyone votes again among the finalists.
5. **Winners:** The admin ends the final and sees the winners. On a tie, the admin picks the winner among those tied before the winners can be revealed. Finally the admin presses «Vis vinnerne for alle», and the winners are shown on the big screen and on every phone.

Nobody can vote for themselves, and each code gives one vote per round. The database stores who has voted, but not what each person voted.

## Setup (once)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free account and a new project. Pick a region in Europe.

### 2. Run the database setup

In Supabase: **SQL Editor → New query**. Paste the full contents of [`supabase/voting.sql`](supabase/voting.sql) and press **Run**.

Then run this (replace the password with your own, at least 10 characters):

```sql
select voting.set_admin_password('a-long-secret-password');
select * from voting.generate_codes(30);
```

The last line creates 30 codes: 22 participants and 8 spares.

### 3. Connect the site to Supabase

In Supabase: **Project Settings → API Keys**. You need the *Project URL* and the *Publishable key* (or the older *anon public* key). Both are meant to be public in a website; the database functions enforce the rules.

In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add:

- `SUPABASE_URL`: the Project URL, e.g. `https://abcdefgh.supabase.co`
- `SUPABASE_ANON_KEY`: the Publishable key

The site is rebuilt the next time something is pushed to `main`. You can also start a build manually under **Actions → Deploy to GitHub Pages → Run workflow**.

### 4. Dress rehearsal

Test with a few phones before the evening. On `/admin/` under **Innstillinger**, set the number of participants to 3 so voting opens once 3 have registered.

Go through the whole flow: registration, round 1, final and reveal. Afterwards, under **Innstillinger**, reset (type NULLSTILL to confirm) and set the number of participants back to 22.

Resetting deletes registrations and votes but keeps the codes, so printed slips still work. Test photos stay in Storage under `mustaches` and can be deleted there if you like.

### 5. Print the slips

Open `/admin/`, log in and go to **Lapper → Skriv ut**. There are eight slips per A4 sheet, with dashed edges to cut along.

## On the evening

- Keep `/screen/` open on a TV or projector. It updates by itself.
- Keep `/admin/` open on your own phone or computer.
- **Lost slip:** The code is in the participant list at the bottom of the admin page.
- **Dead phone:** The participant can use another phone. Tap «bytt» in the top right and enter the code from the slip.
- **Mistakes:** «Tilbake til første runde» works as long as nobody has voted in the final. «Gjenåpne finalen» works after the final has been ended.

Photos are kept after the evening, in Supabase Storage under `mustaches`.

## Testing locally

Requires Docker Desktop. Start Supabase from the repository folder:

```bash
npx supabase start
```

This also runs `supabase/voting.sql` and the test settings in `supabase/seed.sql`: admin password `test-passord-123`, ten codes, and voting that opens once 3 have registered. `npx supabase db reset` starts over with fresh codes.

Create `.env.local` in the repository root with the API URL and Publishable key that `npx supabase status` prints:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Then run `npm run dev` and open `http://localhost:5173/admin/`. Stop Supabase with `npx supabase stop`.

## Useful SQL

```sql
-- Change the opening time
update voting.settings set voting_opens_at = '2026-11-28 18:00 Europe/Oslo' where id = 1;

-- Create more codes
select * from voting.generate_codes(5);

-- Change the admin password
select voting.set_admin_password('new-password-here');
```
