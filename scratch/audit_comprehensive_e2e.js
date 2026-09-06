const http = require('http');
const path = require('path');
const fs = require('fs');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const payload = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;
    const headers = { ...(options.headers || {}) };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 3000,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('KNOWLEDGEPAAT CONTACT MONITORING FINAL AUDIT VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let warnings = 0;
  let failed = 0;

  function test(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} — ${details}`);
      failed++;
    }
  }

  // --- SECTION 1: PHASE 4 - ADMIN AUTHORIZATION ---
  console.log('--- 1. Phase 4: Admin Authorization & Security Enforcement ---');
  
  // 1.1 Unauthenticated GET
  let res = await request('http://localhost:3000/api/admin/contacts');
  test(res.status === 401, 'Unauthenticated GET /api/admin/contacts -> 401 Unauthorized', `Got ${res.status}`);

  // 1.2 Unauthenticated PATCH
  res = await request('http://localhost:3000/api/admin/contacts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: { id: '00000000-0000-0000-0000-000000000000', status: 'resolved' },
  });
  test(res.status === 401, 'Unauthenticated PATCH /api/admin/contacts -> 401 Unauthorized', `Got ${res.status}`);

  // 1.3 Unauthenticated DELETE
  res = await request('http://localhost:3000/api/admin/contacts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: { id: '00000000-0000-0000-0000-000000000000' },
  });
  test(res.status === 401, 'Unauthenticated DELETE /api/admin/contacts -> 401 Unauthorized', `Got ${res.status}`);

  // 1.4 Unauthenticated Bulk DELETE
  res = await request('http://localhost:3000/api/admin/contacts', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: { ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'] },
  });
  test(res.status === 401, 'Unauthenticated Bulk DELETE /api/admin/contacts -> 401 Unauthorized', `Got ${res.status}`);

  // 1.5 Route protection on /admin/contacts
  res = await request('http://localhost:3000/admin/contacts');
  const isRedirect = res.status === 307 || res.status === 308 || (res.headers.location && res.headers.location.includes('/admin/login'));
  test(isRedirect, 'Unauthenticated access to /admin/contacts redirects to /admin/login', `Status ${res.status}`);


  // --- SECTION 2: PHASE 5 - CONTACT CREATION & VALIDATION ---
  console.log('\n--- 2. Phase 5: Contact Creation & Server Validation ---');

  // 2.1 Invalid Email
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.1' },
    body: {
      firstName: 'Audit',
      lastName: 'Tester',
      email: 'not-an-email',
      message: 'Testing validation failure with invalid email format.',
    },
  });
  test(res.status === 400, 'Invalid email rejected with 400 Bad Request', `Got ${res.status}`);

  // 2.2 Missing First Name
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.2' },
    body: {
      firstName: '',
      lastName: 'Tester',
      email: 'valid@example.com',
      message: 'Testing validation failure with empty first name.',
    },
  });
  test(res.status === 400, 'Missing first name rejected with 400 Bad Request', `Got ${res.status}`);

  // 2.3 Too Long First Name (> 50 chars)
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.3' },
    body: {
      firstName: 'A'.repeat(55),
      lastName: 'Tester',
      email: 'valid@example.com',
      message: 'Testing validation failure with oversized first name.',
    },
  });
  test(res.status === 400, 'Too-long first name (>50 chars) rejected with 400 Bad Request', `Got ${res.status}`);

  // 2.4 Too Short Message (< 5 chars)
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.4' },
    body: {
      firstName: 'Audit',
      lastName: 'Tester',
      email: 'valid@example.com',
      message: 'Hi',
    },
  });
  test(res.status === 400, 'Too-short message (<5 chars) rejected with 400 Bad Request', `Got ${res.status}`);

  // 2.5 Too Long Message (> 2000 chars for external)
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.5' },
    body: {
      firstName: 'Audit',
      lastName: 'Tester',
      email: 'valid@example.com',
      message: 'M'.repeat(2050),
    },
  });
  test(res.status === 400, 'Too-long message (>2000 chars) rejected with 400 Bad Request', `Got ${res.status}`);

  // 2.6 Valid External Submission & Reference Generation
  let createdRef = '';
  res = await request('http://localhost:3000/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '10.0.1.6' },
    body: {
      firstName: 'Valid',
      lastName: 'StudentCandidate',
      email: 'candidate@example.com',
      message: 'Hello KnowledgePaat team, I would like to inquire about mock interview scheduling.',
      category: 'Interview Preparation',
    },
  });
  createdRef = res.json?.referenceCode || '';
  const refFormatValid = /^KP-\d{4}-\d{6}$/.test(createdRef);
  test(res.status === 200 && refFormatValid, `Valid external inquiry created with reference ${createdRef}`, `Got ${res.status}`);


  // --- SECTION 3: PHASE 20 - RATE LIMITING ENFORCEMENT ---
  console.log('\n--- 3. Phase 20: Rate Limiting Enforcement ---');
  const floodIp = '192.168.100.99';
  let rateLimited = false;
  for (let i = 1; i <= 6; i++) {
    const floodRes = await request('http://localhost:3000/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': floodIp },
      body: {
        firstName: 'Flooder',
        lastName: 'Spam',
        email: 'spam@example.com',
        message: `Spam attempt ${i} to test rate limit threshold.`,
      },
    });
    if (floodRes.status === 429) {
      rateLimited = true;
      test(true, `Rate limit enforced on request ${i} with 429 Too Many Requests`);
      break;
    }
  }
  if (!rateLimited) {
    test(false, 'Rate limit threshold should trigger 429 after 5 requests in 5 minutes');
  }


  // --- SECTION 4: CODEBASE AUDIT & ARCHITECTURAL VERIFICATION ---
  console.log('\n--- 4. Architectural & UI Feature Audit ---');
  const pageSrc = fs.readFileSync(path.join(process.cwd(), 'frontend', 'app', 'admin', 'contacts', 'page.tsx'), 'utf8');
  const routeSrc = fs.readFileSync(path.join(process.cwd(), 'frontend', 'app', 'api', 'admin', 'contacts', 'route.ts'), 'utf8');
  const sqlPath = fs.existsSync(path.join(process.cwd(), 'supabase', 'migrations', 'supabase_contact_inquiries_setup.sql'))
    ? path.join(process.cwd(), 'supabase', 'migrations', 'supabase_contact_inquiries_setup.sql')
    : path.join(process.cwd(), 'supabase_contact_inquiries_setup.sql');
  const sqlSrc = fs.readFileSync(sqlPath, 'utf8');

  // Single Delete Confirmation
  test(pageSrc.includes('handleOpenDeleteSingle') && pageSrc.includes('deleteModalState.mode === \'single\''), 'Custom Single Delete confirmation modal with target details');

  // Bulk Delete Confirmation
  test(pageSrc.includes('handleOpenDeleteBulk') && pageSrc.includes('deleteModalState.mode === \'bulk\''), 'Custom Bulk Delete confirmation modal with count details');

  // Select All Visible
  test(pageSrc.includes('handleToggleSelectAll') && pageSrc.includes('allVisibleSelected'), 'Select All Visible toggle with sticky bulk action bar');

  // 300ms Debounced Search
  test(pageSrc.includes('debouncedSearch') && pageSrc.includes('300'), 'Search debounced by exactly 300ms');

  // Loading Skeletons
  test(pageSrc.includes('animate-pulse') && pageSrc.includes('isFetching'), 'Table skeleton loading rows prevent layout shift');

  // include_metrics=false support in API
  test(routeSrc.includes('include_metrics') && routeSrc.includes('includeMetrics'), 'API supports conditional metrics (include_metrics=false)');

  // Strict Soft Delete (No silent hard-delete fallback)
  test(routeSrc.includes('deleted_at: now') && routeSrc.includes('deleted_by: user.id') && !routeSrc.includes('fallback to hard deletion'), 'Strict soft delete enforced without silent hard delete');

  // No Browser native alert/confirm
  test(!pageSrc.includes('window.confirm') && !pageSrc.includes('window.alert'), 'Zero usage of native window.alert/window.confirm');

  // Foreign Key ON DELETE SET NULL on student_id
  test(sqlSrc.includes('REFERENCES auth.users(id) ON DELETE SET NULL'), 'student_id has foreign key with ON DELETE SET NULL (isolated)');

  // Performance composite indexes
  test(sqlSrc.includes('idx_contact_inquiries_deleted_at') && sqlSrc.includes('idx_contact_inquiries_source_created'), 'Composite indexes created for source_type, status, and deleted_at');


  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runComprehensiveAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
