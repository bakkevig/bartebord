-- Local test settings only. This file is used by `npx supabase start` and
-- `npx supabase db reset`, never by the hosted project.
-- Voting opens once 3 have registered. The codes are listed under Lapper on /admin/.
select voting.set_admin_password('test-passord-123');
update voting.settings set expected_count = 3;
select * from voting.generate_codes(10);
