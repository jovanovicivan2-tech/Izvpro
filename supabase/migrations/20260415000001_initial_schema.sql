-- ============================================================
-- IZVPRO — Inicijalna shema baze podataka
-- ============================================================

-- 1. OFFICES (kancelarije)
-- ============================================================
CREATE TABLE IF NOT EXISTS offices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naziv       text NOT NULL,
  adresa      text,
  email       text,
  telefon     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. KORISNICI
-- ============================================================
CREATE TABLE IF NOT EXISTS korisnici (
  id          uuid PRIMARY KEY,  -- = auth.users.id
  office_id   uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  ime_prezime text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'operater' CHECK (role IN ('admin', 'operater', 'pregled')),
  aktivan     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_korisnici_office_id ON korisnici(office_id);

-- 3. PREDMETI
-- ============================================================
CREATE TABLE IF NOT EXISTS predmeti (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id           uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  broj_predmeta       text NOT NULL,
  godina              int  NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  poverilac           text NOT NULL,
  duznik              text NOT NULL,
  duznik_adresa       text,
  iznos_glavnice      numeric(15,2),
  vrsta_predmeta      text,
  status              text NOT NULL DEFAULT 'aktivan' CHECK (status IN ('aktivan','obustavljen','zavrsen','arhiviran')),
  rok_sledece_radnje  date,
  napomena            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_predmeti_office_id ON predmeti(office_id);
CREATE INDEX IF NOT EXISTS idx_predmeti_status    ON predmeti(status);

-- 4. ROKOVI
-- ============================================================
CREATE TABLE IF NOT EXISTS rokovi (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predmet_id  uuid NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
  office_id   uuid NOT NULL REFERENCES offices(id)  ON DELETE CASCADE,
  naziv_roka  text NOT NULL,
  datum_roka  date NOT NULL,
  status      text NOT NULL DEFAULT 'aktivan' CHECK (status IN ('aktivan','hitan','zavrsen')),
  prioritet   text NOT NULL DEFAULT 'srednji' CHECK (prioritet IN ('nizak','srednji','visok','hitan')),
  napomena    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rokovi_predmet_id ON rokovi(predmet_id);
CREATE INDEX IF NOT EXISTS idx_rokovi_office_id  ON rokovi(office_id);
CREATE INDEX IF NOT EXISTS idx_rokovi_datum      ON rokovi(datum_roka);

-- 5. SABLONI
-- ============================================================
CREATE TABLE IF NOT EXISTS sabloni (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id     uuid NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  naziv         text NOT NULL,
  tip_akta      text NOT NULL CHECK (tip_akta IN ('dopis','zakljucak','resenje','obavestenje')),
  template_text text NOT NULL,
  aktivan       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sabloni_office_id ON sabloni(office_id);

-- 6. NACRTI
-- ============================================================
CREATE TABLE IF NOT EXISTS nacrti (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predmet_id     uuid NOT NULL REFERENCES predmeti(id) ON DELETE CASCADE,
  office_id      uuid NOT NULL REFERENCES offices(id)  ON DELETE CASCADE,
  sablon_id      uuid REFERENCES sabloni(id) ON DELETE SET NULL,
  tip_akta       text NOT NULL CHECK (tip_akta IN ('dopis','zakljucak','resenje','obavestenje')),
  generated_text text NOT NULL,
  edited_text    text,
  created_by     uuid NOT NULL REFERENCES korisnici(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nacrti_predmet_id ON nacrti(predmet_id);
CREATE INDEX IF NOT EXISTS idx_nacrti_office_id  ON nacrti(office_id);

-- ============================================================
-- RLS POLITIKE
-- ============================================================

ALTER TABLE offices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE korisnici ENABLE ROW LEVEL SECURITY;
ALTER TABLE predmeti  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rokovi    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sabloni   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nacrti    ENABLE ROW LEVEL SECURITY;

-- Helper funkcija: vrati office_id prijavljenog korisnika
CREATE OR REPLACE FUNCTION get_my_office_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT office_id FROM korisnici WHERE id = auth.uid() LIMIT 1;
$$;

-- OFFICES — korisnik vidi samo svoju kancelariju
CREATE POLICY offices_select ON offices FOR SELECT
  USING (id = get_my_office_id());

-- KORISNICI — vidi samo kolege iz iste kancelarije
CREATE POLICY korisnici_select ON korisnici FOR SELECT
  USING (office_id = get_my_office_id());

CREATE POLICY korisnici_insert ON korisnici FOR INSERT
  WITH CHECK (office_id = get_my_office_id());

CREATE POLICY korisnici_update ON korisnici FOR UPDATE
  USING (office_id = get_my_office_id());

-- PREDMETI
CREATE POLICY predmeti_select ON predmeti FOR SELECT
  USING (office_id = get_my_office_id());

CREATE POLICY predmeti_insert ON predmeti FOR INSERT
  WITH CHECK (office_id = get_my_office_id());

CREATE POLICY predmeti_update ON predmeti FOR UPDATE
  USING (office_id = get_my_office_id());

CREATE POLICY predmeti_delete ON predmeti FOR DELETE
  USING (office_id = get_my_office_id());

-- ROKOVI
CREATE POLICY rokovi_select ON rokovi FOR SELECT
  USING (office_id = get_my_office_id());

CREATE POLICY rokovi_insert ON rokovi FOR INSERT
  WITH CHECK (office_id = get_my_office_id());

CREATE POLICY rokovi_update ON rokovi FOR UPDATE
  USING (office_id = get_my_office_id());

CREATE POLICY rokovi_delete ON rokovi FOR DELETE
  USING (office_id = get_my_office_id());

-- SABLONI
CREATE POLICY sabloni_select ON sabloni FOR SELECT
  USING (office_id = get_my_office_id());

CREATE POLICY sabloni_insert ON sabloni FOR INSERT
  WITH CHECK (office_id = get_my_office_id());

CREATE POLICY sabloni_update ON sabloni FOR UPDATE
  USING (office_id = get_my_office_id());

-- NACRTI
CREATE POLICY nacrti_select ON nacrti FOR SELECT
  USING (office_id = get_my_office_id());

CREATE POLICY nacrti_insert ON nacrti FOR INSERT
  WITH CHECK (office_id = get_my_office_id());

CREATE POLICY nacrti_update ON nacrti FOR UPDATE
  USING (office_id = get_my_office_id());

CREATE POLICY nacrti_delete ON nacrti FOR DELETE
  USING (office_id = get_my_office_id());
