import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environment.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  // 1. Homepage
  let res = http.get(`${BASE_URL}/`, { headers: DEFAULT_HEADERS });
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 2. Jobs Page
  res = http.get(`${BASE_URL}/jobs`, { headers: DEFAULT_HEADERS });
  check(res, {
    'jobs page status is 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 3. Notes Page
  res = http.get(`${BASE_URL}/notes`, { headers: DEFAULT_HEADERS });
  check(res, {
    'notes page status is 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 4. Interview Prep Page
  res = http.get(`${BASE_URL}/interview-preparation`, { headers: DEFAULT_HEADERS });
  check(res, {
    'interview-prep status is 200': (r) => r.status === 200,
  });
  sleep(0.5);

  // 5. Pricing Page
  res = http.get(`${BASE_URL}/pricing`, { headers: DEFAULT_HEADERS });
  check(res, {
    'pricing page status is 200': (r) => r.status === 200,
  });
  sleep(0.5);
}
