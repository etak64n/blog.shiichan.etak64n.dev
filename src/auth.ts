import { createRemoteJWKSet, jwtVerify } from 'jose'

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com'

// JWKS is a public-key cache, not request-scoped state, so module scope is fine
const jwks = createRemoteJWKSet(new URL(`${GITHUB_OIDC_ISSUER}/.well-known/jwks`))

export type AuthResult = { ok: true } | { ok: false; reason: string }

function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

/**
 * Ingest API authentication.
 * Production: verifies a GitHub Actions OIDC token, pinned to the exact
 * repository and branch via the `sub` claim.
 * Local development: accepts DEV_BEARER_TOKEN from .dev.vars (empty in
 * production = disabled).
 */
export async function verifyIngestAuth(
  authorization: string | undefined,
  env: Pick<Env, 'OIDC_AUDIENCE' | 'ALLOWED_OIDC_SUB' | 'DEV_BEARER_TOKEN'>,
): Promise<AuthResult> {
  if (!authorization?.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing bearer token' }
  }
  const token = authorization.slice('Bearer '.length)

  if (env.DEV_BEARER_TOKEN !== '' && timingSafeEqualStr(token, env.DEV_BEARER_TOKEN)) {
    return { ok: true }
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: GITHUB_OIDC_ISSUER,
      audience: env.OIDC_AUDIENCE,
    })
    if (payload.sub !== env.ALLOWED_OIDC_SUB) {
      return { ok: false, reason: 'subject not allowed' }
    }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'token verification failed' }
  }
}
