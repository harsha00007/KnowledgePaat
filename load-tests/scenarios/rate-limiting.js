import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, JSON_HEADERS } from '../config/environment.js';

export const options = {
  vus: 5,
  duration: '15s',
};

export default function () {
  // Test social links / feature flags rate-limited endpoint
  const res = http.get(`${BASE_URL}/api/social-links`, { headers: JSON_HEADERS });
  
  check(res, {
    'status is 200 or 429 (rate-limited)': (r) => r.status === 200 || r.status === 429,
  });

  // Rapid requests without sleep to trigger rate limiter
  sleep(0.05);
}
