/**
 * KnowledgePaat k6 Load Testing Configuration
 * Environment parameters and threshold configurations.
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const DEFAULT_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'User-Agent': 'k6-load-test-agent/1.0 (KnowledgePaat Capacity Evaluation)',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'k6-load-test-agent/1.0 (KnowledgePaat Capacity Evaluation)',
};

export const THRESHOLDS = {
  // 95% of requests must finish within 1,000ms
  http_req_duration: ['p(95)<1000', 'p(99)<2500'],
  // HTTP failure rate must be under 1% for standard load
  http_req_failed: ['rate<0.01'],
};
