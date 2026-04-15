import type { TipAkta } from '@/types/database';

export type CreateDraftInput = {
  predmet_id: string;
  sablon_id: string;
  tip_akta: TipAkta;
  user_note: string;
};

export type CreateDraftResult =
  | { success: true; nacrtId: string; fallbackUsed: boolean }
  | { success: false; error: string };

export type UpdateDraftInput = {
  nacrtId: string;
  edited_text: string;
};

export type UpdateDraftResult =
  | { success: true }
  | { success: false; error: string };
