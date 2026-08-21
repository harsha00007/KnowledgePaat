/**
 * GradZenX — Centralized AI Provider Configuration
 * ============================================================
 * Server-side only. Never import this in client components.
 * No NEXT_PUBLIC_ variables are used here.
 *
 * Provider resolution priority (deterministic, documented):
 *
 *  1. AI_API_KEY + AI_ENDPOINT both set → use generic configured provider
 *  2. OPENAI_API_KEY set              → use OpenAI API
 *  3. GEMINI_API_KEY set              → use Gemini OpenAI-compatible endpoint
 *  4. None configured                 → return null (triggers deterministic fallback)
 *
 * Model resolution:
 *  - AI_MODEL overrides everything when set
 *  - OPENAI_MODEL used for OpenAI provider
 *  - GEMINI_MODEL used for Gemini provider
 *  - Hard defaults: gpt-4o-mini (OpenAI), gemini-1.5-flash (Gemini)
 * ============================================================
 */

export type AIProvider = 'openai' | 'gemini' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  endpoint: string;
  model: string;
}

// Gemini's OpenAI-compatible endpoint
const GEMINI_OPENAI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Resolves the AI provider configuration from environment variables.
 * Returns null if no provider is configured (safe fallback mode).
 *
 * IMPORTANT: This is a server-side function only.
 * API keys must never be prefixed with NEXT_PUBLIC_.
 */
export function resolveAIConfig(): AIConfig | null {
  // Priority 1: Fully custom provider (both key and endpoint must be set)
  const customKey = process.env.AI_API_KEY;
  const customEndpoint = process.env.AI_ENDPOINT;
  if (customKey && customEndpoint) {
    return {
      provider: 'custom',
      apiKey: customKey,
      endpoint: customEndpoint,
      model: process.env.AI_MODEL || 'gpt-4o-mini',
    };
  }

  // Priority 2: OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      endpoint: OPENAI_ENDPOINT,
      model: process.env.AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }

  // Priority 3: Gemini (via OpenAI-compatible interface)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      endpoint: GEMINI_OPENAI_ENDPOINT,
      model: process.env.AI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }

  // No provider configured — caller must use built-in deterministic fallback
  return null;
}

/**
 * Calls the configured LLM provider with a system + user prompt.
 *
 * Returns the raw response text, or null if:
 *  - No provider is configured
 *  - The provider returns a non-2xx status
 *  - The request throws a network error
 *
 * Caller is responsible for falling back to deterministic logic when null is returned.
 * Never logs API keys. Logs safe diagnostic info only.
 */
export async function callAIProvider(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; responseFormat?: 'json_object' | 'text' }
): Promise<string | null> {
  const config = resolveAIConfig();

  if (!config) {
    // No provider configured — caller will use built-in fallback
    return null;
  }

  const temperature = options?.temperature ?? 0.7;
  const responseFormat = options?.responseFormat ?? 'json_object';

  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    };

    // Only add response_format for providers that support it
    // Gemini's OpenAI-compatible API supports json_object mode
    if (responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Log safe diagnostic info — NOT the API key
      console.error(
        `[AI] Provider "${config.provider}" returned HTTP ${response.status}. ` +
        `Endpoint: ${config.endpoint}. Model: ${config.model}.`
      );
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn('[AI] Provider returned empty content.');
      return null;
    }

    return content;
  } catch (err: unknown) {
    // Log safe info only — not the key or raw error that might contain it
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[AI] Network error calling provider "${config.provider}": ${message}`);
    return null;
  }
}

/**
 * Returns true if any AI provider is currently configured.
 * Use this to show/hide AI-powered features in admin diagnostics.
 */
export function isAIConfigured(): boolean {
  return resolveAIConfig() !== null;
}
