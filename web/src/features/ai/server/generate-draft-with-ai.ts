'use server';

import OpenAI from 'openai';
import { buildDraftSystemPrompt, buildDraftUserPrompt } from '@/features/ai/lib/ai-prompt';
import { buildFallbackDraftText } from '@/features/drafts/lib/build-fallback-draft';
import type { GenerateDraftWithAiInput, GenerateDraftWithAiResult } from '@/features/ai/types';

const MODEL = 'gpt-4.1-mini';

export async function generateDraftWithAi(
  input: GenerateDraftWithAiInput
): Promise<GenerateDraftWithAiResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  // Nema API ključa → fallback na template renderer
  if (!apiKey) {
    return {
      success: true,
      text: buildFallbackDraftText(input),
      provider: 'fallback',
      model: 'template-builder',
      fallbackUsed: true,
    };
  }

  try {
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildDraftSystemPrompt() },
        { role: 'user', content: buildDraftUserPrompt(input) },
      ],
    });

    const text = response.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return {
        success: true,
        text: buildFallbackDraftText(input),
        provider: 'fallback',
        model: 'template-builder',
        fallbackUsed: true,
      };
    }

    return {
      success: true,
      text,
      provider: 'openai',
      model: MODEL,
      fallbackUsed: false,
    };
  } catch (err) {
    console.error('[generateDraftWithAi] OpenAI greška:', err);
    return {
      success: true,
      text: buildFallbackDraftText(input),
      provider: 'fallback',
      model: 'template-builder',
      fallbackUsed: true,
    };
  }
}
