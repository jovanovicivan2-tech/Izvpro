-- ============================================================
-- IZVPRO — Seed: prva kancelarija i admin korisnik
-- Pokreni OVO u Supabase SQL editoru nakon migracije
-- ============================================================

-- Korak 1: Kreira kancelariju
INSERT INTO offices (id, naziv, adresa, email)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'IZVPRO Kancelarija',
  'Beograd',
  'admin@izvpro.rs'
)
ON CONFLICT (id) DO NOTHING;

-- Korak 2: Kreira auth korisnika (potvrđen, bez email verifikacije)
SELECT auth.create_user(
  '{"email": "admin@izvpro.rs", "password": "Izvpro2026!", "email_confirm": true}'::jsonb
);

-- Korak 3: Ubacuje u korisnici tabelu
INSERT INTO korisnici (id, office_id, ime_prezime, email, role, aktivan)
SELECT
  u.id,
  'a0000000-0000-0000-0000-000000000001',
  'Admin',
  'admin@izvpro.rs',
  'admin',
  true
FROM auth.users u
WHERE u.email = 'admin@izvpro.rs'
ON CONFLICT (id) DO NOTHING;

-- Korak 4: Verifikacija
SELECT
  k.id,
  k.ime_prezime,
  k.email,
  k.role,
  o.naziv AS kancelarija
FROM korisnici k
JOIN offices o ON o.id = k.office_id
WHERE k.email = 'admin@izvpro.rs';
