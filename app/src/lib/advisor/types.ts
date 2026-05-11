import type { SupabaseClient } from '@supabase/supabase-js'
import type { Store } from '@/domain/entities/store'
import type { z } from 'zod'
import type { GateId } from '@/lib/plan-gates'

/**
 * Context every tool handler receives.
 *
 * Stays narrow — Supabase client (already scoped to the user via cookies),
 * the resolved store, and the optional auth user id. Tools mutate via the
 * supabase client; we let RLS + plan gates handle authorisation rather
 * than re-implementing it in each tool.
 */
export interface ToolContext {
  supabase: SupabaseClient
  store: Store
  userId?: string
  /** Tag the surface so analytics + conversation memory can keep them
   *  separate. WhatsApp questions don't bleed into the in-app advisor. */
  channel: 'in_app' | 'whatsapp'
}

/**
 * Generic tool definition.
 *
 * - `mutates`: write tools (record_sale, record_restock, ...). The in-app
 *   advisor can run in read-only mode in some flows; the registry tags
 *   each tool so the caller can filter.
 * - `gate`: when present, the tool is only exposed to stores whose
 *   effective plan satisfies the gate. The LLM never sees a tool it
 *   can't call.
 */
export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O = unknown> {
  name: string
  description: string
  inputSchema: I
  mutates?: boolean
  gate?: GateId
  handler: (input: z.infer<I>, ctx: ToolContext) => Promise<O>
}

/** Concrete list of every tool in the registry. Used by callers to pick a
 *  subset (e.g. "only read tools" or "everything the user's plan allows"). */
export type ToolName =
  // Read — data
  | 'get_sales_summary'
  | 'get_top_products'
  | 'get_low_stock'
  | 'get_inventory'
  | 'get_debtors'
  | 'get_unread_alerts'
  // Read — environment
  | 'get_market_context'
  // Read — business insights (13 F-A blocks behind one tool)
  | 'get_business_insight'
  // Read — forecasting
  | 'forecast_demand'
  // Write — operational
  | 'record_sale'
  | 'record_return'
  | 'record_restock'
  | 'record_expense'
  | 'record_wastage'
