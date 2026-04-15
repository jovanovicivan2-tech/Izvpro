-- ============================================================
-- IZVPRO — Seed: prva kancelarija i admin korisnik
-- Pokreni u Supabase SQL editoru NAKON sto si pokrenuo migraciju
-- ============================================================

-- Korak 1: Kreira kancelariju
INSERT INTO offices (id, naziv, adresa, email)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'IZVPRO Kancelarija',
  'Beograd',
  'admin@izvpro.rs'
)
ON CONFLICT (id) DO NOTHING;

-- Korak 2: Kreira auth korisnika direktno u auth.users
-- (zaobilazi email verifikaciju)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@izvpro.rs',
  crypt('Izvpro2026!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Korak 3: Kreira identity zapis (obavezan za email login)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'admin@izvpro.rs',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "email": "admin@izvpro.rs"}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Korak 4: Ubacuje u korisnici tabelu
INSERT INTO korisnici (id, office_id, ime_prezime, email, role, aktivan)
VALUES (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Admin',
  'admin@izvpro.rs',
  'admin',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Korak 5: Verifikacija — treba da vrati 1 red
SELECT
  k.id,
  k.ime_prezime,
  k.email,
  k.role,
  o.naziv AS kancelarija
FROM korisnici k
JOIN offices o ON o.id = k.office_id
WHERE k.email = 'admin@izvpro.rs';
