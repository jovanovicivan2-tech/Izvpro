// Tipovi za IZVPRO bazu podataka
// Uskladiti sa Supabase schemom

export type UserRole = 'admin' | 'operater' | 'pregled';

export type CaseStatus = 'nov' | 'u_radu' | 'ceka_dopunu' | 'zavrsen';

export type DeadlineStatus = 'aktivan' | 'hitan' | 'zavrsen';

export type DeadlinePriority = 'nizak' | 'srednji' | 'visok' | 'hitan';

export type DraftType = 'dopis' | 'zakljucak' | 'resenje' | 'obavestenje';

export interface Office {
  id: string;
  naziv: string;
  adresa: string | null;
  email: string | null;
  telefon: string | null;
  created_at: string;
}

export interface User {
  id: string;
  office_id: string;
  ime_prezime: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Case {
  id: string;
  office_id: string;
  broj_predmeta: string;
  datum_prijema: string;
  poverilac: string;
  duznik: string;
  adresa_duznika: string | null;
  iznos: number;
  vrsta_predmeta: string | null;
  status: CaseStatus;
  opis: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deadline {
  id: string;
  case_id: string;
  naziv_roka: string;
  datum_roka: string;
  status: DeadlineStatus;
  prioritet: DeadlinePriority;
  created_at: string;
}

export interface Draft {
  id: string;
  case_id: string;
  tip_akta: DraftType;
  template_id: string | null;
  generated_text: string;
  edited_text: string | null;
  created_by: string;
  created_at: string;
}

export interface Template {
  id: string;
  office_id: string;
  naziv: string;
  tip_akta: DraftType;
  template_text: string;
  active: boolean;
  created_at: string;
}
