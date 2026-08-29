import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, DEFAULT_HEADERS } from '../config/environment.js';

export const options = {
  stages: [
    { duration: '15s', target: 10 },  // Baseline: 10 VUs
    { duration: '30s', target: 50 },  // Low load: 50 VUs
    { duration: '45s', target: 100 }, // Normal load: 100 VUs
    { duration: '30s', target: 250 }, // Medium load: 250 VUs
    { duration: '30s', target: 500 }, // Peak load: 500 VUs
    { duration: '15s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'], // Less than 2% failure rate
    http_req_duration: ['p(95)<1200'], // 95% within 1.2s
  },
};

export default function () {
  group('1. Homepage & Discovery', function () {
    const res = http.get(`${BASE_URL}/`, { headers: DEFAULT_HEADERS });
    check(res, { 'homepage 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('2. Jobs Catalogue & Filter Simulation', function () {
    // Standard jobs browsing
    let res = http.get(`${BASE_URL}/jobs`, { headers: DEFAULT_HEADERS });
    check(res, { 'jobs catalogue 200': (r) => r.status === 200 });

    // Job search simulation
    res = http.get(`${BASE_URL}/jobs?category=Software+Development`, { headers: DEFAULT_HEADERS });
    check(res, { 'jobs filtered category 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('3. Study Notes & Tier Navigation', function () {
    let res = http.get(`${BASE_URL}/notes`, { headers: DEFAULT_HEADERS });
    check(res, { 'notes catalogue 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('4. Interview Preparation', function () {
    let res = http.get(`${BASE_URL}/interview-preparation`, { headers: DEFAULT_HEADERS });
    check(res, { 'interview-prep 200': (r) => r.status === 200 });
  });
  sleep(1);

  group('5. Pricing & Product Store', function () {
    let res = http.get(`${BASE_URL}/pricing`, { headers: DEFAULT_HEADERS });
    check(res, { 'pricing 200': (r) => r.status === 200 });
  });
  sleep(1.5);
}
