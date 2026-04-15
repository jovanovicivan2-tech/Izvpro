// AI nacrt — tipovi za input i rezultat generisanja

export type GenerateDraftWithAiInput = {
  tipAkta: string;
  templateText: string;
  userNote: string;
  predmetData: {
    broj_predmeta: string | null;
    godina: number | null;
    poverilac: string | null;
    duznik: string | null;
    duznik_adresa: string | null;
    iznos_glavnice: number | null;
    vrsta_predmeta: string | null;
    napomena: string | null;
  };
};

export type GenerateDraftWithAiResult =
  | {
      success: true;
      text: string;
      provider: 'openai';
      model: string;
      fallbackUsed: false;
    }
  | {
      success: true;
      text: string;
      provider: 'fallback';
      model: 'template-builder';
      fallbackUsed: true;
    }
  | {
      success: false;
      error: string;
    };
