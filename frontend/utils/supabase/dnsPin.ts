/**
 * DNS Pinning Helper for Staging Supabase on Node.js
 * Safely pins lzuinimbsdxnhzmjpxmr.supabase.co to 172.64.149.246 to bypass
 * local ISP network DPI / SSL record version errors on 104.18.38.10.
 */
if (typeof window === 'undefined') {
  if (typeof (globalThis as any).WebSocket === 'undefined') {
    (globalThis as any).WebSocket = class MockWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      constructor() {}
      close() {}
      send() {}
      addEventListener() {}
      removeEventListener() {}
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeDns = typeof require !== 'undefined' ? require('node:dns') : null;
    if (nodeDns && typeof nodeDns.lookup === 'function') {
      if (typeof nodeDns.setDefaultResultOrder === 'function') {
        try {
          nodeDns.setDefaultResultOrder('ipv4first');
        } catch {}
      }

      const originalLookup = nodeDns.lookup;
      try {
        nodeDns.lookup = (hostname: string, options: any, callback: any) => {
          if (typeof options === 'function') {
            callback = options;
            options = { family: 4 };
          } else if (typeof options === 'object' && options !== null) {
            if (!options.family) {
              options.family = 4;
            }
          } else if (typeof options === 'number') {
            options = { family: options || 4 };
          }

          if (hostname === 'lzuinimbsdxnhzmjpxmr.supabase.co') {
            if (options && options.all) {
              return callback(null, [{ address: '172.64.149.246', family: 4 }]);
            }
            return callback(null, '172.64.149.246', 4);
          }
          return originalLookup(hostname, options, callback);
        };
      } catch {
        // Module object is read-only in this environment (e.g. Next.js ESM bundle)
      }

      if (nodeDns.promises && typeof nodeDns.promises.lookup === 'function') {
        const originalPromisesLookup = nodeDns.promises.lookup.bind(nodeDns.promises);
        try {
          nodeDns.promises.lookup = async (hostname: string, options: any) => {
            const opt = typeof options === 'object' && options ? { ...options, family: options.family || 4 } : { family: 4 };
            if (hostname === 'lzuinimbsdxnhzmjpxmr.supabase.co') {
              if (opt && opt.all) {
                return [{ address: '172.64.149.246', family: 4 }];
              }
              return { address: '172.64.149.246', family: 4 };
            }
            return originalPromisesLookup(hostname, opt);
          };
        } catch {
          // Module object is read-only
        }
      }
    }
  } catch {
    // Ignore in unsupported environments
  }
}
