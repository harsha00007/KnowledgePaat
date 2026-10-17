import type { RoadmapContentDefinition } from '../types';

export const apiSecurityRoadmap: RoadmapContentDefinition = {
  title: 'API Security',
  slug: 'api-security',
  short_description:
    'Production engineering standard: OWASP API Top 10, JWT hardening, rate limiting, SQL injection defense, CORS, and secret management.',
  description:
    'Comprehensive best-practice roadmap for securing modern web and microservice APIs. Master vulnerability mitigation across broken object level authorization (BOLA), rate limiting, credential handling, and automated security scans.',
  category: 'Cybersecurity',
  difficulty: 'Intermediate',
  estimated_duration: '4 Weeks',
  seo_title: 'API Security Best Practices Roadmap | KnowledgePaat',
  seo_description:
    'Production guide to API security: OWASP API Top 10, authentication hardening, BOLA prevention, and rate limiting.',
  is_active: true,
  type: 'BEST_PRACTICE',
  sections: [
    {
      title: '01 OWASP API Top 10 & Threat Modeling',
      slug: '01-owasp-api-top-10',
      description: 'The most dangerous vulnerabilities in modern APIs and how attackers exploit them.',
      sequence: 1,
      is_required: true,
      nodes: [
        {
          title: 'Broken Object Level Authorization (BOLA / IDOR)',
          slug: 'bola-idor-prevention',
          description: 'Ensure users can only access their own records by checking ownership at the database/service layer.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 90,
          sequence: 1,
          is_required: true,
          topics: ['IDOR Vulnerability Examples', 'Enforcing Tenant / User Ownership in SQL', 'UUIDs vs Incremental IDs (Obfuscation vs Auth)'],
        },
      ],
    },
    {
      title: '02 Authentication & Token Hardening',
      slug: '02-auth-token-hardening',
      description: 'JWT signing algorithms, short expiration windows, refresh tokens, and revocation.',
      sequence: 2,
      is_required: true,
      nodes: [
        {
          title: 'JWT Best Practices & Token Rotation',
          slug: 'jwt-hardening-rotation',
          description: 'Use RS256/EdDSA asymmetric keys, short-lived access tokens, httpOnly secure cookies, and token revocation lists.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 120,
          sequence: 1,
          is_required: true,
          topics: ['Asymmetric Signing (RS256)', 'httpOnly SameSite Cookies vs localStorage', 'Refresh Token Rotation', 'Blacklisting Revoked Tokens in Redis'],
          prerequisites: ['bola-idor-prevention'],
        },
      ],
    },
    {
      title: '03 Rate Limiting, CORS & Input Sanitization',
      slug: '03-rate-limiting-sanitization',
      description: 'Defending against DDoS, credential stuffing, injection attacks, and cross-origin exploits.',
      sequence: 3,
      is_required: true,
      nodes: [
        {
          title: 'Rate Limiting, Schema Validation & CORS',
          slug: 'rate-limiting-cors-validation',
          description: 'Token bucket / sliding window rate limiting in Redis, strict schema validation, and locked-down CORS policies.',
          node_type: 'SKILL',
          difficulty: 'Intermediate',
          estimated_minutes: 150,
          sequence: 1,
          is_required: true,
          topics: ['Sliding Window Rate Limiting', 'Strict JSON Schema / Zod Validation', 'CORS Origin Whitelisting (No Access-Control-Allow-Origin: *)', 'Security Headers (CSP, HSTS)'],
          prerequisites: ['jwt-hardening-rotation'],
        },
      ],
    },
  ],
};
