// Tipovi za IZVPRO bazu podataka
// Uskladjeno sa stvarnim kolonama u Supabase

export type UserRole = 'admin' | 'operater' | 'pregled';

export type OfficeStatus = 'pending' | 'active' | 'suspended';

export type PredmetStatus = 'aktivan' | 'obustavljen' | 'zavrsen' | 'arhiviran';

export type RokStatus = 'aktivan' | 'hitan' | 'zavrsen';

export type RokPrioritet = 'nizak' | 'srednji' | 'visok' | 'hitan';

export type TipAkta = 'dopis' | 'zakljucak' | 'resenje' | 'obavestenje';

// -------------------------------------------------------
// Tabela: offices (kancelarije)
// -------------------------------------------------------
export interface Office {
  id: string;
  naziv: string;
  adresa: string | null;
  email: string | null;
  telefon: string | null;
  pib: string | null;
  website: string | null;
  status: OfficeStatus;
  created_at: string;
}

// -------------------------------------------------------
// Tabela: korisnici
// -------------------------------------------------------
export interface Korisnik {
  id: string;           // = auth.users.id
  office_id: string;
  ime_prezime: string;
  email: string;
  role: UserRole;
  aktivan: boolean;
  is_super_admin: boolean;
  created_at: string;
}

// -------------------------------------------------------
// Tabela: predmeti
// Kolone uskladjene sa predmeti/page.tsx queryjima
// -------------------------------------------------------
// Tabela: deliveries (dostava pismena)
// -------------------------------------------------------
export type TipPismena = 'resenje' | 'zakljucak' | 'dopis' | 'obavestenje' | 'nalog' | 'ostalo';
export type StatusDostave = 'poslato' | 'primljeno' | 'vraceno' | 'odbijeno';

export interface Delivery {
  id: string;
  predmet_id: string;
  office_id: string;
  tip_pismena: TipPismena;
  primalac: string;
  adresa_dostave: string | null;
  datum_slanja: string;
  datum_prijema: string | null;
  status: StatusDostave;
  napomena: string | null;
  created_at: string;
}

// -------------------------------------------------------
// Tabela: payments (uplate po predmetu)
// -------------------------------------------------------
export type TipUplate = 'uplata' | 'povracaj' | 'troskovi' | 'kamata';

export interface Payment {
  id: string;
  predmet_id: string;
  office_id: string;
  datum_uplate: string;
  iznos: number;
  tip_uplate: TipUplate;
  opis: string | null;
  created_at: string;
}

// -------------------------------------------------------
// Tabela: case_parties (stranke predmeta)
// -------------------------------------------------------
export type TipStranke = 'duznik' | 'poverilac' | 'zastupnik_duznika' | 'zastupnik_pov' | 'trece_lice';

export interface CaseParty {
  id: string;
  predmet_id: string;
  office_id: string;
  tip_stranke: TipStranke;
  ime_prezime: string;
  jmbg_pib: string | null;
  adresa: string | null;
  telefon: string | null;
  email: string | null;
  napomena: string | null;
  created_at: string;
}

// -------------------------------------------------------
export interface Predmet {
  id: string;
  office_id: string;
  broj_predmeta: string;
  godina: number;
  poverilac: string;
  duznik: string;
  duznik_adresa: string | null;
  iznos_glavnice: number | null;
  vrsta_predmeta: string | null;
  status: PredmetStatus;
  rok_sledece_radnje: string | null;  // ISO date string
  napomena: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// Tabela: rokovi
// -------------------------------------------------------
export interface Rok {
  id: string;
  predmet_id: string;
  office_id: string;
  naziv_roka: string;
  datum_roka: string;   // ISO date string
  status: RokStatus;
  prioritet: RokPrioritet;
  napomena: string | null;
  created_at: string;
}

// -------------------------------------------------------
// Tabela: nacrti
// -------------------------------------------------------
export interface Nacrt {
  id: string;
  predmet_id: string;
  office_id: string;
  sablon_id: string | null;
  tip_akta: TipAkta;
  generated_text: string;
  edited_text: string | null;
  created_by: string;   // = korisnici.id
  created_at: string;
}

// -------------------------------------------------------
// Tabela: sabloni
// -------------------------------------------------------
export interface Sablon {
  id: string;
  office_id: string;
  naziv: string;
  tip_akta: TipAkta;
  template_text: string;
  aktivan: boolean;
  created_at: string;
}
