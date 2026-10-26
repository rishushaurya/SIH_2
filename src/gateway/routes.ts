import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { departmentAdapters } from '../adapters/registry';
import { env, oidcEnabled } from '../config/env';
import { EventBroadcaster } from '../services/audit/eventBroadcaster';
import { AuditBlock, auditLedger, digestOf } from '../services/audit/hashChain';
import { revokeSession, SessionUser, signSession } from '../services/auth/jwt';
import { buildAuthorizeUrl, completeLogin } from '../services/auth/oidc';
import { AuthenticatedRequest, clearSessionCookie, requireAuth, requireRole, setSessionCookie } from '../services/auth/rbacGuard';
import { demoLogin, publicPersonas } from '../services/auth/ssoBridge';
import { ConsentCryptoSigner } from '../services/consent/cryptoSigner';
import { ConsentManager } from '../services/consent/consentManager';
import { getJourney, listJourneys } from '../services/workflow/journeys';
import { WorkflowEngine } from '../services/workflow/workflowEngine';
import { httpError } from './errorHandler';
import { log } from './logger';
import openapi from './openapi.json';
import { createRateLimiter } from './rateLimiter';
import { validateBody } from './validationGuard';

const router = Router();

// Rate limiters (SECURITY_ACCESS.md §3.2): per IP before login, per citizen after.
const authLimiter = createRateLimiter({ maxRequests: 30, windowSeconds: 60, name: 'auth' });
const citizenLimiter = createRateLimiter({ maxRequests: 60, windowSeconds: 60, name: 'citizen' });
const verifyLimiter = createRateLimiter({ maxRequests: 10, windowSeconds: 60, name: 'verify' });

const startSession = (req: Request, res: Response, user: SessionUser) => {
  setSessionCookie(req, res, signSession(user));
  EventBroadcaster.emit('EVENT_AUTH', { provider: user.auth_provider, role: user.role }, { subject: user.citizen_hash });
};

const sessionView = (u: SessionUser) => ({
  full_name: u.full_name,
  role: u.role,
  department_id: u.department_id,
  masked_id: u.masked_id,
  auth_provider: u.auth_provider,
});

const demoOnly = (_req: Request, res: Response, next: () => void) =>
  env.DEMO_MODE ? next() : res.status(404).json({ error: 'NOT_FOUND', message: 'Demo login is disabled (DEMO_MODE=false).' });

// ============================================================================
// 1. Health & public keys
// ============================================================================
router.get('/health', async (_req: Request, res: Response) => {
  const { revenue, rto, certificates, education } = departmentAdapters;
  const [revenueHealth, rtoHealth, certificatesHealth, educationHealth] = await Promise.all(
    [revenue, rto, certificates, education].map((a) => a.ping())
  );
  const adapters = { revenue_postgres: revenueHealth, rto_mysql: rtoHealth, certificates_mongo: certificatesHealth, education_csv: educationHealth };
  const allUp = Object.values(adapters).every((a) => a.status === 'UP');
  const chain = auditLedger.verifyChainIntegrity();

  return res.status(allUp && chain.isValid ? 200 : 503).json({
    status: allUp && chain.isValid ? 'healthy' : 'degraded',
    version: '2.0.0',
    mode: env.DEMO_MODE ? 'demo' : 'live',
    uptime_seconds: Math.floor(process.uptime()),
    adapters,
    audit_ledger: { total_blocks: chain.totalBlocks, chain_integrity: chain.isValid ? 'verified' : 'tampered' },
  });
});

// Departments verify consent artifacts independently with this key set (RFC 7517).
router.get('/.well-known/jwks.json', (_req: Request, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300');
  return res.json(ConsentCryptoSigner.getJwks());
});

// OpenAPI 3 description for API Setu listing and integrators.
router.get('/openapi.json', (_req: Request, res: Response) => res.json(openapi));

// ============================================================================
// 2. Authentication: Meri Pehchaan (OAuth 2.0 + PKCE) and demo personas
// ============================================================================
router.get('/api/v1/auth/config', (_req: Request, res: Response) =>
  res.json({ demo_mode: env.DEMO_MODE, oidc: { enabled: oidcEnabled, provider_name: env.OIDC_PROVIDER_NAME } })
);

router.get('/api/v1/auth/personas', demoOnly, (_req: Request, res: Response) => res.json({ personas: publicPersonas() }));

const DemoLoginSchema = z
  .object({
    persona_id: z.string().max(32).optional(),
    full_name: z.string().trim().min(3).max(100).optional(),
    aadhaar: z.string().max(20).optional(),
  })
  .refine((b) => b.persona_id || (b.full_name && b.aadhaar), 'Provide persona_id, or full_name and aadhaar.');

router.post('/api/v1/auth/sso/login', demoOnly, authLimiter, validateBody(DemoLoginSchema), (req: Request, res: Response) => {
  const user = demoLogin(req.body);
  startSession(req, res, user);
  return res.json({ status: 'AUTHENTICATED', user: sessionView(user) });
});

router.get('/api/v1/auth/oidc/start', authLimiter, (_req: Request, res: Response) => {
  if (!oidcEnabled) return res.status(404).json({ error: 'OIDC_DISABLED', message: 'Meri Pehchaan login is not configured.' });
  return res.redirect(buildAuthorizeUrl());
});

router.get('/api/v1/auth/oidc/callback', authLimiter, async (req: Request, res: Response) => {
  const { code, state, error } = req.query;
  if (error || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect(`/?login_error=${encodeURIComponent(String(error || 'invalid_callback'))}`);
  }
  try {
    startSession(req, res, await completeLogin(code, state));
    return res.redirect('/');
  } catch (err: any) {
    log('WARN', 'OIDC login failed', { request_id: (req as any).requestId, code: err.code, error: err.message });
    return res.redirect(`/?login_error=${encodeURIComponent(err.code || 'login_failed')}`);
  }
});

router.get('/api/v1/auth/session', requireAuth, (req: AuthenticatedRequest, res: Response) => res.json({ user: sessionView(req.user!) }));

router.post('/api/v1/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  revokeSession(req.user!);
  clearSessionCookie(req, res);
  return res.json({ status: 'LOGGED_OUT' });
});

// ============================================================================
// 3. Workflow catalog
// ============================================================================
router.get('/api/v1/workflows', requireAuth, (_req: Request, res: Response) => res.json({ workflows: listJourneys() }));

router.get('/api/v1/workflows/:id', requireAuth, (req: Request, res: Response) => {
  const journey = getJourney(req.params.id);
  if (!journey) throw httpError(404, 'WORKFLOW_NOT_FOUND', `Workflow ${req.params.id} does not exist.`);
  return res.json({ workflow: journey });
});

// ============================================================================
// 4. DEPA consent (citizens only, per the RBAC matrix)
// ============================================================================
const GrantConsentSchema = z.object({ journey_id: z.string().max(64) });

router.post(
  '/api/v1/consent/grant',
  requireAuth,
  requireRole('CITIZEN'),
  citizenLimiter,
  validateBody(GrantConsentSchema),
  (req: AuthenticatedRequest, res: Response) => {
    const journey = getJourney(req.body.journey_id);
    if (!journey) throw httpError(404, 'WORKFLOW_NOT_FOUND', `Workflow ${req.body.journey_id} does not exist.`);
    const { jti, token, record } = ConsentManager.grantConsent(req.user!.citizen_hash, journey);
    return res.json({ status: 'CONSENT_GRANTED', consent_jti: jti, consent_token: token, record });
  }
);

router.post('/api/v1/consent/revoke/:jti', requireAuth, requireRole('CITIZEN'), citizenLimiter, (req: AuthenticatedRequest, res: Response) => {
  const result = ConsentManager.revokeConsent(req.params.jti, req.user!.citizen_hash);
  if (result.status !== 200) {
    return res.status(result.status).json({ error: 'REVOCATION_FAILED', message: result.message });
  }
  return res.json({ status: 'REVOKED', message: result.message });
});

router.get('/api/v1/consent/history', requireAuth, (req: AuthenticatedRequest, res: Response) =>
  res.json({ consents: ConsentManager.getCitizenConsents(req.user!.citizen_hash) })
);

// ============================================================================
// 5. Workflow execution (once-only auto-fill) and application submission
// ============================================================================
const ExecuteJourneySchema = z.object({ consent_token: z.string().max(4096) });

router.post(
  '/api/v1/workflows/:id/execute',
  requireAuth,
  requireRole('CITIZEN'),
  citizenLimiter,
  validateBody(ExecuteJourneySchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await WorkflowEngine.executeJourney({
        journey_id: req.params.id,
        citizen: { full_name: req.user!.full_name, aadhaar_hash: req.user!.citizen_hash },
        consent_token: req.body.consent_token,
      });
      return res.json({ status: 'EXECUTION_SUCCESS', result });
    } catch (error) {
      next(error);
    }
  }
);

const ApplicationSchema = z.object({
  journey_id: z.string().max(64),
  consent_jti: z.string().max(80).optional(), // absent when the citizen declined consent and filled manually
  form_values: z.record(z.string().max(64), z.string().max(500)),
});

// The middleware keeps only a digest of the submitted form; the integrating portal delivers the form itself.
router.post(
  '/api/v1/applications',
  requireAuth,
  requireRole('CITIZEN'),
  citizenLimiter,
  validateBody(ApplicationSchema),
  (req: AuthenticatedRequest, res: Response) => {
    const { journey_id, consent_jti, form_values } = req.body;
    const journey = getJourney(journey_id);
    if (!journey) throw httpError(404, 'WORKFLOW_NOT_FOUND', `Workflow ${journey_id} does not exist.`);

    if (consent_jti) {
      const consent = ConsentManager.getRecord(consent_jti);
      if (!consent || consent.citizen_hash !== req.user!.citizen_hash || consent.journey_id !== journey.id) {
        throw httpError(403, 'CONSENT_INVALID', 'Application must reference a consent you granted for this service.');
      }
    }
    const allowed = new Set(journey.form_fields.map((f) => f.key));
    const unknown = Object.keys(form_values).filter((k) => !allowed.has(k));
    if (unknown.length) throw httpError(400, 'UNKNOWN_FIELDS', `Fields not part of this service: ${unknown.join(', ')}`);

    const block = auditLedger.append({
      actor_id: req.user!.citizen_hash,
      action: 'FORM_SUBMIT',
      journey_id: journey.id,
      purpose: journey.title_en,
      consent_jti,
      payload_digest: digestOf({ journey_id, form_values }),
      metadata: { field_count: Object.keys(form_values).length, filled: consent_jti ? 'auto-fill' : 'manual' },
    });
    return res.status(201).json({
      status: 'SUBMITTED',
      reference: `MH-${journey.reference_prefix}-${block.timestamp.slice(0, 4)}-${String(block.index).padStart(6, '0')}`,
      audit_block: { index: block.index, block_hash: block.block_hash, timestamp: block.timestamp },
    });
  }
);

// ============================================================================
// 6. Audit ledger: citizen passbook, oversight, verification, regulator export
// ============================================================================
const publicBlockView = ({ index, timestamp, action, department, journey_id, purpose, consent_jti, block_hash }: AuditBlock) => ({
  index,
  timestamp,
  action,
  department,
  journey_id,
  purpose,
  consent_jti,
  block_hash,
});

const clampLimit = (value: unknown) => Math.min(Math.max(parseInt(String(value), 10) || 50, 1), 500);

// Who accessed my data, when, for what purpose (DPDP Act 2023 s.11 right to information).
router.get('/api/v1/audit/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const mine = auditLedger.getBlocks(clampLimit(req.query.limit), (b) => b.actor_id === req.user!.citizen_hash);
  return res.json({ entries: mine.map(publicBlockView) });
});

router.get('/api/v1/audit/ledger', requireAuth, requireRole('SYS_ADMIN', 'DEPT_ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const dept = req.user!.role === 'DEPT_ADMIN' ? req.user!.department_id : undefined;
  const inScope = (b: AuditBlock) =>
    !dept || b.department === dept || ((b.metadata?.consent as any)?.departments ?? []).includes(dept);
  return res.json({
    total_blocks: auditLedger.getBlockCount(),
    scope: dept ? `department:${dept}` : 'global',
    blocks: auditLedger.getBlocks(clampLimit(req.query.limit), inScope),
  });
});

router.get('/api/v1/audit/export', requireAuth, requireRole('SYS_ADMIN'), (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Content-Disposition', `attachment; filename="mahalink-audit-${new Date().toISOString().slice(0, 10)}.jsonl"`);
  return res.send(auditLedger.allBlocks().map((b) => JSON.stringify(b)).join('\n') + '\n');
});

router.post('/api/v1/audit/verify', requireAuth, verifyLimiter, (_req: Request, res: Response) => res.json(auditLedger.verifyChainIntegrity()));

// Receipt verification: is this block hash still part of an intact chain?
router.get('/api/v1/audit/proof/:hash', requireAuth, (req: Request, res: Response) => {
  if (!/^[a-f0-9]{64}$/.test(req.params.hash)) throw httpError(400, 'INVALID_HASH', 'Block hash must be 64 hex characters.');
  const block = auditLedger.findByHash(req.params.hash);
  const chain = auditLedger.verifyChainIntegrity();
  return res.json({
    found: Boolean(block),
    chain_intact: chain.isValid,
    block: block ? { index: block.index, timestamp: block.timestamp, action: block.action, department: block.department } : null,
  });
});

// ============================================================================
// 7. Live Inspection Console (Server-Sent Events)
// ============================================================================
router.get('/api/v1/events/stream', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const remove = EventBroadcaster.addClient(res, req.user!);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', data: { role: req.user!.role } })}\n\n`);
  req.on('close', remove);
});

export default router;
