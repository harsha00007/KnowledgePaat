import '../utils/supabase/dnsPin';
(globalThis as any).WebSocket = class MockWebSocket {};
import { checkRateLimit, RateLimitConfig } from '../lib/rateLimit';

async function main() {
  const args = process.argv.slice(2);
  const keyIndex = args.indexOf('--key');
  const limitIndex = args.indexOf('--limit');
  const windowIndex = args.indexOf('--window');
  const sensitiveIndex = args.indexOf('--sensitive');

  if (keyIndex === -1) {
    console.error('Missing --key');
    process.exit(1);
  }

  const key = args[keyIndex + 1];
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 4;
  const windowSeconds = windowIndex !== -1 ? parseInt(args[windowIndex + 1], 10) : 10;
  const isSensitive = sensitiveIndex !== -1 ? args[sensitiveIndex + 1] === 'true' : true;

  const config: RateLimitConfig = { limit, windowSeconds, isSensitive };

  const result = await checkRateLimit(key, config);
  console.log(JSON.stringify({ pid: process.pid, key, result }));
}

main().catch((err) => {
  console.error(JSON.stringify({ pid: process.pid, error: err.message }));
  process.exit(1);
});
