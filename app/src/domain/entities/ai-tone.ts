/**
 * Per-store AI tone preference.
 *
 * Injected into every Stoki-AI system prompt (advisor, WhatsApp brain,
 * monthly report, anomaly alerts, explain-line-item) so the same underlying
 * data produces language that matches the owner's comfort level.
 *
 * NOT a translation layer — that's i18n. This chooses REGISTER within
 * English: how formal, how much jargon, whether to use kasi slang.
 *
 * Default is 'plain' so nothing changes for existing users until they opt in.
 */
export type AiTone = 'casual' | 'plain' | 'professional' | 'technical'

export const AI_TONES: ReadonlyArray<{
  key: AiTone
  label: string
  /** Shown under the radio in the settings picker. */
  description: string
  /** Live preview string the settings picker renders so the owner can see
   *  the vibe before saving. Same info in each — different voice. */
  preview: string
}> = [
  {
    key: 'casual',
    label: 'Casual (kasi)',
    description: 'Township vibe. Like chatting with a friend in the taxi rank.',
    preview: "Howzit boss! Today R2,400 in the till — nice. But watch it, sugar is running low, only 3 packs left. Restock before Sunday, hey?",
  },
  {
    key: 'plain',
    label: 'Plain (everyday)',
    description: 'Simple SA English. No fancy words. Best for most traders.',
    preview: "You made R2,400 today — a good day. Just a heads up: sugar is nearly finished, only 3 packs left. Best to restock before Sunday.",
  },
  {
    key: 'professional',
    label: 'Professional',
    description: 'Polite business tone. Suitable for SMMEs with staff and formal customers.',
    preview: "Today's sales came to R2,400 — a solid performance. Please note stock of sugar is low, with only 3 packs remaining. Restock is recommended before Sunday.",
  },
  {
    key: 'technical',
    label: 'Technical (financial)',
    description: 'Full accounting language. For VAT-registered businesses with a bookkeeper or accountant.',
    preview: "Turnover for today: R2,400. Inventory alert: SKU 'Sugar 1kg' is below reorder point (on-hand 3, ROP 10). Recommend PO before Sunday to avoid stockout impacting margin.",
  },
]

export const DEFAULT_AI_TONE: AiTone = 'plain'

export function isValidAiTone(value: unknown): value is AiTone {
  return value === 'casual' || value === 'plain' || value === 'professional' || value === 'technical'
}

/**
 * Instruction block interpolated into every Stoki AI system prompt.
 * Extends the existing SCOPE_LOCK_BLOCK — this covers HOW to talk, that
 * covers WHAT to talk about.
 *
 * Style rules per tone are explicit rather than left to the model's
 * imagination — otherwise "casual" drifts into over-familiarity and
 * "technical" leaks into every audience regardless of setting.
 */
export function toneInstruction(tone: AiTone): string {
  switch (tone) {
    case 'casual':
      return `TONE — the owner chose "Casual (kasi)":
- Warm, informal, township-friendly. It's okay to use "howzit", "yebo", "sharp", "boss", "bra", "sisi" — but sparingly, not every sentence.
- Use everyday words. NEVER use accounting jargon (no "revenue", "COGS", "GP", "margin erosion", "P&L").
- Translate money-in-money-out into feelings: "nice day", "slow one today", "watch out — you spent more than usual".
- Sentences short. 1-2 short lines per point.`
    case 'plain':
      return `TONE — the owner chose "Plain (everyday)":
- Simple, direct SA English. No jargon.
- Say "money you took in" not "revenue". Say "money you spent on stock" not "COGS". Say "you're making less per item than before" not "margin erosion".
- Warm but not slangy. Aim for how you'd explain it to a family member new to running a business.
- Short sentences. Get to the point.`
    case 'professional':
      return `TONE — the owner chose "Professional":
- Polite, business-appropriate. Standard English. Some retail terms okay ("sales", "expenses", "stock levels", "customers").
- Avoid heavy accounting jargon (still no "COGS", "GP%", "amortisation" without a plain-English fallback).
- Complete sentences, well-structured. Comfortable for a small-business owner with formal customers or staff.
- Neutral warmth — not slangy, not stiff.`
    case 'technical':
      return `TONE — the owner chose "Technical (financial)":
- Full accounting and business terminology. This owner has a bookkeeper or accountant OR runs a VAT-registered SMME.
- Use precise terms: revenue, COGS, gross margin, GP%, net profit, cash flow, working capital, reorder point, days-cover, AR/AP, VAT input/output.
- Show workings when helpful (e.g. "GP% dropped from 32% to 24% because avg cost/unit rose R2.10 while price held").
- Structured, analytical. Bullet points welcome. Precise numbers matter.`
  }
}
