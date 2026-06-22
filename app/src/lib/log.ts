/**
 * Tiny structured logger — single-line JSON to stdout/stderr that Vercel /
 * Railway logs collectors can parse and search by field.
 *
 * Intentionally NOT a pino / winston dependency. The whole point is "every
 * log line is a JSON object with stable keys so I can filter by storeId
 * when debugging a customer issue" — that's 20 lines of code, not a
 * package.json entry.
 *
 * Usage:
 *   import { log } from '@/lib/log'
 *   log.info('payroll.run', { storeId, runId, employees: count })
 *   log.error('payroll.run.failed', { storeId, error: err })
 *
 * The first arg is an `event` — a dotted name, stable across versions, so
 * you can grep for "payroll.run.failed" in production logs without it
 * drifting with copy changes. The second arg is the structured context.
 *
 * Convention: always tag storeId + userId where available. The event name
 * should describe WHAT happened, the context should answer WHO and HOW.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  /** Multi-tenancy key — always include where you have it. */
  storeId?: string
  /** Acting principal — always include where you have it. */
  userId?: string
  /** Free-form structured fields. Don't put secrets here. */
  [key: string]: unknown
}

const ENV = process.env.NODE_ENV ?? 'development'
const VERCEL_ENV = process.env.VERCEL_ENV // 'production' | 'preview' | 'development' | undefined

function emit(level: Level, event: string, ctx?: LogContext): void {
  // In test runs, stay quiet. Vitest captures stdout and lights the
  // console with noise; opt-out via env if you ever want to see them.
  if (ENV === 'test' && !process.env.LOG_IN_TESTS) return

  const line: Record<string, unknown> = {
    t: new Date().toISOString(),
    lvl: level,
    evt: event,
    env: VERCEL_ENV ?? ENV,
    ...serialiseContext(ctx),
  }

  // stderr for warn+error so Vercel groups them; stdout for info/debug.
  const out = level === 'warn' || level === 'error' ? console.error : console.log
  // Single-line JSON — Vercel's Logflare drain parses this natively.
  out(JSON.stringify(line))
}

/** Normalise Error instances (and nested error fields) to plain JSON. */
function serialiseContext(ctx?: LogContext): Record<string, unknown> {
  if (!ctx) return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(ctx)) {
    if (value instanceof Error) {
      out[key] = { message: value.message, name: value.name, stack: value.stack }
    } else {
      out[key] = value
    }
  }
  return out
}

export const log = {
  debug: (event: string, ctx?: LogContext) => emit('debug', event, ctx),
  info:  (event: string, ctx?: LogContext) => emit('info',  event, ctx),
  warn:  (event: string, ctx?: LogContext) => emit('warn',  event, ctx),
  error: (event: string, ctx?: LogContext) => emit('error', event, ctx),
}
