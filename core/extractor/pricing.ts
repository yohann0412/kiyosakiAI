/**
 * List prices in USD per million tokens. Used for the per-upload cost cap and
 * the spend ledger. Update when Anthropic's price list changes.
 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-2": { input: 8, output: 40 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Unknown models are priced like the most expensive one we use, never zero. */
const FALLBACK_PRICE = PRICES["claude-fable-5-2"];

export interface TokenUsage {
  inputTokens: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  outputTokens: number;
}

export function priceFor(model: string) {
  return PRICES[model] ?? FALLBACK_PRICE;
}

export function costUsd(model: string, usage: TokenUsage): number {
  const price = priceFor(model);
  const input =
    usage.inputTokens * price.input +
    (usage.cacheWriteTokens ?? 0) * price.input * 1.25 +
    (usage.cacheReadTokens ?? 0) * price.input * 0.1;
  const output = usage.outputTokens * price.output;
  return (input + output) / 1_000_000;
}

/**
 * Worst-case cost of one extraction: every page at the largest image size the
 * models accept plus a full output budget. This is the per-upload cost cap.
 */
export function worstCaseCostUsd(model: string, maxPages: number, maxOutputTokens: number): number {
  const TOKENS_PER_PAGE = 5000;
  const PROMPT_TOKENS = 3500;
  return costUsd(model, {
    inputTokens: PROMPT_TOKENS + maxPages * TOKENS_PER_PAGE,
    outputTokens: maxOutputTokens,
  });
}
