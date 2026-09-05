import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { certificateAdapter } from '../adapters/certificateAdapter';
import { educationAdapter } from '../adapters/educationAdapter';
import { revenueAdapter } from '../adapters/revenueAdapter';
import { rtoAdapter } from '../adapters/rtoAdapter';
import { EventBroadcaster } from '../services/audit/eventBroadcaster';
import { auditLedger } from '../services/audit/hashChain';
import { AuthenticatedRequest, requireAuth, requireRole } from '../services/auth/rbacGuard';
import { DEMO_PERSONAS, handleSSOLogin } from '../services/auth/ssoBridge';
import { ConsentManager } from '../services/consent/consentManager';
import { WorkflowEngine } from '../services/workflow/workflowEngine';
import { createRateLimiter } from './rateLimiter';
import { validateBody } from './validationGuard';

const router = Router();

// Rate limiters
const authLimiter = createRateLimiter({ maxRequests: 60, windowSeconds: 60, name: 'auth' });
const workflowLimiter = createRateLimiter({ maxRequests: 60, windowSeconds: 60, name: 'workflow' });

// ============================================================================
// 1. Health & Status Probing
// ============================================================================
router.get('/health', async (req: Request, res: Response) => {
  const [revStatus, rtoStatus, certStatus, eduStatus] = await Promise.all([
    revenueAdapter.ping(),
    rtoAdapter.ping(),
    certificateAdapter.ping(),
    educationAdapter.ping(),
  ]);

  const auditCheck = auditLedger.verifyChainIntegrity();

  const allAdaptersUp = revStatus.status === 'UP' && rtoStatus.status === 'UP' && certStatus.status === 'UP' && eduStatus.status === 'UP';

  return res.status(allAdaptersUp ? 200 : 503).json({
    status: allAdaptersUp ? 'healthy' : 'degraded',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    memory: {
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
      heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 10) / 10,
    },
    adapters: {
      revenue_postgres: revStatus,
      rto_mysql: rtoStatus,
      certificates_mongo: certStatus,
      education_csv: eduStatus,
    },
    audit_ledger: {
      total_blocks: auditLedger.getBlockCount(),
      chain_integrity: auditCheck.isValid ? 'verified' : 'tampered',
    },
  });
});

// ============================================================================
// 2. Authentication & Meri Pehchaan SSO Bridge
// ============================================================================
const SSOLoginSchema = z.object({
  persona_id: z.string().optional(),
  custom_name: z.string().optional(),
  custom_aadhaar: z.string().optional(),
  district: z.string().optional(),
});

router.post('/api/v1/auth/sso/login', authLimiter, validateBody(SSOLoginSchema), (req: Request, res: Response) => {
  handleSSOLogin(req, res);
});

router.get('/api/v1/auth/personas', (req: Request, res: Response) => {
  return res.status(200).json({ personas: DEMO_PERSONAS });
});

// ============================================================================
// 3. Workflow Catalog
// ============================================================================
router.get('/api/v1/workflows', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const journeys = WorkflowEngine.getJourneys();
  return res.status(200).json({ workflows: journeys });
});

router.get('/api/v1/workflows/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const journey = WorkflowEngine.getJourney(req.params.id);
  if (!journey) {
    return res.status(404).json({ error: 'WORKFLOW_NOT_FOUND', message: `Workflow ${req.params.id} does not exist.` });
  }
  return res.status(200).json({ workflow: journey });
});

// ============================================================================
// 4. DEPA Consent Management Endpoints
// ============================================================================
const GrantConsentSchema = z.object({
  journey_id: z.string(),
  purpose: z.string(),
  departments: z.array(z.string()).min(1),
  scope: z.array(z.string()).min(1),
  validity_minutes: z.number().int().min(5).max(30).default(15),
});

router.post(
  '/api/v1/consent/grant',
  requireAuth,
  workflowLimiter,
  validateBody(GrantConsentSchema),
  (req: AuthenticatedRequest, res: Response) => {
    const citizenHash = req.user!.citizen_hash;

    const { jti, token, record } = ConsentManager.grantConsent({
      citizen_hash: citizenHash,
      journey_id: req.body.journey_id,
      purpose: req.body.purpose,
      departments: req.body.departments,
      scope: req.body.scope,
      validity_minutes: req.body.validity_minutes,
    });

    // Record audit event
    auditLedger.append({
      actor_id: citizenHash,
      action: 'CONSENT_GRANT',
      journey_id: req.body.journey_id,
      purpose: req.body.purpose,
      consent_jti: jti,
      payload_digest: token.slice(-16),
      metadata: { departments: req.body.departments },
    });

    EventBroadcaster.emit('EVENT_CONSENT_MINT', {
      jti,
      departments: req.body.departments,
      expires_in_minutes: req.body.validity_minutes,
    });

    return res.status(200).json({
      status: 'CONSENT_GRANTED',
      consent_jti: jti,
      consent_token: token,
      record,
    });
  }
);

router.post('/api/v1/consent/revoke/:jti', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const citizenHash = req.user!.citizen_hash;
  const result = ConsentManager.revokeConsent(req.params.jti, citizenHash);

  if (!result.success) {
    return res.status(403).json({ error: 'REVOCATION_FAILED', message: result.message });
  }

  auditLedger.append({
    actor_id: citizenHash,
    action: 'CONSENT_REVOKE',
    purpose: 'Citizen initiated consent withdrawal',
    consent_jti: req.params.jti,
    payload_digest: 'REVOKED',
  });

  EventBroadcaster.emit('EVENT_CONSENT_REVOKE', {
    jti: req.params.jti,
    revoked_by: req.user!.full_name,
  });

  return res.status(200).json(result);
});

router.get('/api/v1/consent/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const citizenHash = req.user!.citizen_hash;
  const consents = ConsentManager.getCitizenConsents(citizenHash);
  return res.status(200).json({ consents });
});

// ============================================================================
// 5. Workflow Execution & Once-Only Auto-Fill Engine
// ============================================================================
const ExecuteJourneySchema = z.object({
  consent_token: z.string(),
});

router.post(
  '/api/v1/workflows/:id/execute',
  requireAuth,
  workflowLimiter,
  validateBody(ExecuteJourneySchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await WorkflowEngine.executeJourney({
        journey_id: req.params.id,
        citizen: {
          full_name: req.user!.full_name,
          aadhaar_hash: req.user!.citizen_hash,
        },
        consent_token: req.body.consent_token,
      });

      return res.status(200).json({
        status: 'EXECUTION_SUCCESS',
        result,
      });
    } catch (error: any) {
      next(error);
    }
  }
);

// ============================================================================
// 6. Cryptographic Audit Ledger & Tamper Verification
// ============================================================================
router.get('/api/v1/audit/ledger', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const blocks = auditLedger.getBlocks(limit);
  return res.status(200).json({
    total_blocks: auditLedger.getBlockCount(),
    blocks,
  });
});

router.post('/api/v1/audit/verify', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const check = auditLedger.verifyChainIntegrity();
  return res.status(200).json(check);
});

// ============================================================================
// 7. Live Inspection Console SSE Stream
// ============================================================================
router.get('/api/v1/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  EventBroadcaster.addClient(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'MahaLink Live Stream Active' })}\n\n`);

  req.on('close', () => {
    EventBroadcaster.removeClient(res);
  });
});

export default router;
