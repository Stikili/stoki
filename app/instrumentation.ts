/**
 * Next 16 instrumentation hook — runs once when the server starts. Used here
 * for production-safety guardrails that should refuse to boot rather than
 * silently misconfigure.
 *
 * Current checks:
 *   1. NODE_TLS_REJECT_UNAUTHORIZED=0 in production → throw. Disabling
 *      TLS verification in prod means any MITM (incl. malicious proxy)
 *      is silently trusted. This env var is necessary for local dev
 *      against Norton VPN's HTTPS-scanning interception (see memory
 *      reference_local_env_tls), but must NEVER reach a real deploy.
 *      One copy-paste error from a real incident; this guard makes it
 *      a fast-fail at boot instead.
 */
export function register(): void {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
      throw new Error(
        '[stoki-safety] NODE_TLS_REJECT_UNAUTHORIZED=0 set in a production ' +
        'process. Refusing to boot — this disables TLS certificate verification ' +
        'for every outbound HTTPS call. If you reached this in error, unset ' +
        'the env var; if you reached this on purpose, you almost certainly ' +
        'do not want what you think you want.',
      )
    }
  }
}
