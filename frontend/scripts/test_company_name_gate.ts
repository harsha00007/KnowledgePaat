import { calculateUserAccess, canViewCompanyName } from '../lib/subscription';
import { PLANS, PLAN_LEVELS, normalizePlanId, satisfiesPlanRequirement } from '../config/plans';

console.log('====================================================');
console.log('RUNNING COMPANY NAME PRIVACY & ENTITLEMENT TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1 — FREE USER
// -----------------------------------------------------------------------------
console.log('\n--- TEST 1: FREE USER ---');
const freeAccess = calculateUserAccess({ plan: 'free', status: 'active' });
assert(canViewCompanyName(freeAccess, 'free') === true, 'Free user CAN view Free job company');
assert(canViewCompanyName(freeAccess, 'starter') === false, 'Free user CANNOT view Starter job company');
assert(canViewCompanyName(freeAccess, 'pro') === false, 'Free user CANNOT view Pro job company');
assert(canViewCompanyName(freeAccess, 'premium') === false, 'Free user CANNOT view Premium job company');

// -----------------------------------------------------------------------------
// TEST 2 — STARTER USER
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: STARTER USER ---');
const starterAccess = calculateUserAccess({ plan: 'starter', status: 'active', end_date: new Date(Date.now() + 86400000).toISOString() });
assert(canViewCompanyName(starterAccess, 'free') === true, 'Starter user CAN view Free job company');
assert(canViewCompanyName(starterAccess, 'starter') === true, 'Starter user CAN view Starter job company');
assert(canViewCompanyName(starterAccess, 'pro') === false, 'Starter user CANNOT view Pro job company');
assert(canViewCompanyName(starterAccess, 'premium') === false, 'Starter user CANNOT view Premium job company');

// -----------------------------------------------------------------------------
// TEST 3 — PRO USER
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: PRO USER ---');
const proAccess = calculateUserAccess({ plan: 'pro', status: 'active', end_date: new Date(Date.now() + 86400000).toISOString() });
assert(canViewCompanyName(proAccess, 'free') === true, 'Pro user CAN view Free job company');
assert(canViewCompanyName(proAccess, 'starter') === true, 'Pro user CAN view Starter job company');
assert(canViewCompanyName(proAccess, 'pro') === true, 'Pro user CAN view Pro job company');
assert(canViewCompanyName(proAccess, 'premium') === false, 'Pro user CANNOT view Premium job company');

// -----------------------------------------------------------------------------
// TEST 4 — PREMIUM USER
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: PREMIUM USER ---');
const premiumAccess = calculateUserAccess({ plan: 'premium', status: 'active', end_date: new Date(Date.now() + 86400000).toISOString() });
assert(canViewCompanyName(premiumAccess, 'free') === true, 'Premium user CAN view Free job company');
assert(canViewCompanyName(premiumAccess, 'starter') === true, 'Premium user CAN view Starter job company');
assert(canViewCompanyName(premiumAccess, 'pro') === true, 'Premium user CAN view Pro job company');
assert(canViewCompanyName(premiumAccess, 'premium') === true, 'Premium user CAN view Premium job company');

// -----------------------------------------------------------------------------
// TEST 5 — EXPIRED SUBSCRIPTION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: EXPIRED PRO SUBSCRIPTION ---');
const expiredAccess = calculateUserAccess({ plan: 'pro', status: 'active', end_date: new Date(Date.now() - 86400000).toISOString() });
assert(expiredAccess.effectivePlan === 'free', 'Expired Pro subscription effectivePlan drops to free');
assert(canViewCompanyName(expiredAccess, 'free') === true, 'Expired user CAN view Free job company');
assert(canViewCompanyName(expiredAccess, 'starter') === false, 'Expired user CANNOT view Starter job company');
assert(canViewCompanyName(expiredAccess, 'pro') === false, 'Expired user CANNOT view Pro job company');
assert(canViewCompanyName(expiredAccess, 'premium') === false, 'Expired user CANNOT view Premium job company');

// -----------------------------------------------------------------------------
// TEST 6 — CANCELLED SUBSCRIPTION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: CANCELLED PREMIUM SUBSCRIPTION ---');
const cancelledAccess = calculateUserAccess({ plan: 'premium', status: 'cancelled' });
assert(cancelledAccess.effectivePlan === 'free', 'Cancelled subscription effectivePlan drops to free');
assert(canViewCompanyName(cancelledAccess, 'premium') === false, 'Cancelled user CANNOT view Premium job company');

// -----------------------------------------------------------------------------
// TEST 7 — SEARCH LEAKAGE PROTECTION
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: SEARCH LEAKAGE PROTECTION ---');
const sampleJobs = [
  { id: '1', title: 'Frontend Developer', company_name: 'Acme Corp', minimum_plan: 'free', required_skills: ['React'] },
  { id: '2', title: 'Backend Engineer', company_name: 'Stark Industries', minimum_plan: 'starter', required_skills: ['Node.js'] },
  { id: '3', title: 'DevOps Specialist', company_name: 'Wayne Enterprises', minimum_plan: 'pro', required_skills: ['Docker'] },
  { id: '4', title: 'AI Architect', company_name: 'Cyberdyne Systems', minimum_plan: 'premium', required_skills: ['PyTorch'] }
];

function searchJobsForUser(query: string, userAcc: any) {
  const q = query.toLowerCase();
  return sampleJobs.filter(job => {
    const canSee = canViewCompanyName(userAcc, job.minimum_plan);
    return job.title.toLowerCase().includes(q) ||
           (canSee && job.company_name.toLowerCase().includes(q)) ||
           job.required_skills.some(s => s.toLowerCase().includes(q));
  });
}

// Free user searching for 'Wayne' (Pro company) -> Should NOT match by company name
const freeSearchForWayne = searchJobsForUser('Wayne', freeAccess);
assert(freeSearchForWayne.length === 0, 'Free user searching for hidden company "Wayne" returns 0 results (no leakage)');

// Pro user searching for 'Wayne' -> Should match
const proSearchForWayne = searchJobsForUser('Wayne', proAccess);
assert(proSearchForWayne.length === 1 && proSearchForWayne[0].id === '3', 'Pro user searching for "Wayne" returns Wayne Enterprises');

// Free user searching for 'Docker' (skill on Wayne job) -> Matches, but company will be locked in UI
const freeSearchForDocker = searchJobsForUser('Docker', freeAccess);
assert(freeSearchForDocker.length === 1 && freeSearchForDocker[0].id === '3', 'Free user searching for "Docker" returns job without leaking company');

console.log('\n====================================================');
console.log(`RESULTS: ${passCount} / ${totalTests} tests passed (${Math.round(passCount / totalTests * 100)}%)`);
console.log('====================================================\n');
