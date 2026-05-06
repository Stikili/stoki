/**
 * Single source of truth for LLM model + API-key configuration.
 *
 * Values can be overridden via environment without code changes — useful for
 * pinning a specific model on staging, or switching to a cheaper / smaller
 * model under load. Defaults are the production-blessed values.
 *
 * Why centralised:
 *   - The API-key env var is named ANTHROPIC_API_KEY for backwards-compat
 *     with deployed environments. Renaming it would break those, so we keep
 *     the historical name and read it from a neutrally-named export here.
 *   - The model identifier is a string the provider dictates; we still pin
 *     it in one place so a future model swap is one edit, not a global grep.
 *
 * If you ever change LLM vendors, this file and the SDK import lines in
 * api/advisor/route.ts and lib/whatsapp-brain.ts are the only places to
 * touch.
 */

/** Resolve the LLM API key from env. Allow `LLM_API_KEY` as a forward-
 *  compatible override, else fall back to the historical `ANTHROPIC_API_KEY`
 *  so existing `.env.local` / production envs keep working unchanged. */
export const LLM_API_KEY = process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY

/** Default LLM model identifier. Override with `LLM_MODEL` in env if needed. */
export const LLM_MODEL = process.env.LLM_MODEL ?? 'claude-sonnet-4-6'
