import http from 'k6/http';
import { check, sleep, group } from 'k6';

// Targets real deployed cloud infrastructure
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://csjywuflkvohytbvglxf.supabase.co';
const SUPABASE_KEY = __ENV.SUPABASE_KEY || 'sb_publishable_k7fUFPAJoKrn4_ghTkJDqw_ejUHMOHA';
const DEPLOYED_APP_URL = __ENV.DEPLOYED_APP_URL || __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Baseline: 10 VUs
    { duration: '20s', target: 50 },  // 50 VUs
    { duration: '30s', target: 100 }, // 100 VUs
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Accept': 'application/json',
    'User-Agent': 'k6-infrastructure-benchmark/1.0',
  };

  group('1. Live Cloud Database Query — Active Jobs Catalog', function () {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/jobs?status=eq.Active&order=posted_at.desc&limit=20`,
      { headers }
    );
    check(res, {
      'supabase jobs query 200': (r) => r.status === 200,
    });
  });
  sleep(0.5);

  group('2. Live Cloud Database Query — Study Notes Directory', function () {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/notes?status=eq.Active&order=created_at.desc&limit=20`,
      { headers }
    );
    check(res, {
      'supabase notes query 200': (r) => r.status === 200,
    });
  });
  sleep(0.5);

  group('3. Live Cloud Database Query — Interview Prep Questions', function () {
    const res = http.get(
      `${SUPABASE_URL}/rest/v1/interview_questions?status=eq.Active&limit=20`,
      { headers }
    );
    check(res, {
      'supabase questions query 200': (r) => r.status === 200,
    });
  });
  sleep(0.5);

  group('4. Application Route / Discovery Layer', function () {
    const appHeaders = {
      'Accept': 'text/html,application/xhtml+xml',
      'User-Agent': 'k6-infrastructure-benchmark/1.0',
    };
    const res = http.get(`${DEPLOYED_APP_URL}/`, { headers: appHeaders });
    check(res, {
      'app gateway 200': (r) => r.status === 200,
    });
  });
  sleep(1);
}
