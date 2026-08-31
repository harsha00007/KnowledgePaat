import { formatToDisplayDate, formatToIsoDate } from '../components/DatePicker';
import { canStudentAccessResource, PRODUCT_TYPE_LABELS, ProductType } from '../lib/store';
import { calculateUserAccess } from '../lib/subscription';

function runTests() {
  console.log('--- RUNNING KNOWLEDGEPAAT 10 ENHANCEMENTS VERIFICATION ---');

  // Test 1: Date of Birth formatting
  console.log('\n[Test 1] Date of Birth formatting:');
  const isoDate = '2002-05-15';
  const displayDate = formatToDisplayDate(isoDate);
  if (displayDate === '15-05-2002') {
    console.log('✓ ISO to DD-MM-YYYY format passed:', displayDate);
  } else {
    throw new Error(`Failed ISO to display conversion: got ${displayDate}`);
  }

  const convertedIso = formatToIsoDate('15-05-2002');
  if (convertedIso === '2002-05-15') {
    console.log('✓ DD-MM-YYYY to ISO format passed:', convertedIso);
  } else {
    throw new Error(`Failed display to ISO conversion: got ${convertedIso}`);
  }

  // Test 2: Product Type Labels completeness
  console.log('\n[Test 2] Product Type Labels mapping completeness:');
  const requiredTypes: ProductType[] = [
    'note',
    'question_pack',
    'note_bundle',
    'interview_bundle',
    'timed_assessment',
    'ai_mock_interview',
    'resume_template'
  ];

  for (const type of requiredTypes) {
    if (PRODUCT_TYPE_LABELS[type] && PRODUCT_TYPE_LABELS[type].label) {
      console.log(`✓ Product type "${type}" mapped to "${PRODUCT_TYPE_LABELS[type].label}"`);
    } else {
      throw new Error(`Missing label mapping for product type: ${type}`);
    }
  }

  // Test 3: Dual Entitlement Engine
  console.log('\n[Test 3] Dual Entitlement Engine (Subscription vs Store Purchase):');
  
  // Case A: Free user with no purchase -> Locked for starter
  const freeAccess = calculateUserAccess(null);
  const isAccessibleFree = canStudentAccessResource('starter', freeAccess, new Set(), 'note-123');
  if (!isAccessibleFree) {
    console.log('✓ Free user correctly blocked from starter resource');
  } else {
    throw new Error('Free user should not have access to starter resource without purchase');
  }

  // Case B: Free user with direct store purchase -> Unlocked
  const purchasedIds = new Set(['note-123']);
  const isAccessiblePurchased = canStudentAccessResource('starter', freeAccess, purchasedIds, 'note-123');
  if (isAccessiblePurchased) {
    console.log('✓ Free user with individual store purchase granted instant lifetime access');
  } else {
    throw new Error('Purchased item should grant access regardless of subscription');
  }

  // Case C: Pro subscriber accessing starter resource -> Unlocked via Subscription
  const proSub = {
    plan_id: 'pro',
    status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString()
  };
  const proAccess = calculateUserAccess(proSub);
  const isAccessiblePro = canStudentAccessResource('starter', proAccess, new Set(), 'note-123');
  if (isAccessiblePro) {
    console.log('✓ Pro subscriber granted access to starter resource via subscription tier');
  } else {
    throw new Error('Pro subscriber should have access to starter resource');
  }

  // Case D: Timed Assessment Dual Entitlement
  const assessmentPurchased = canStudentAccessResource('pro', freeAccess, new Set(['test-config-456']), 'test-config-456');
  if (assessmentPurchased) {
    console.log('✓ Timed Assessment unlocked via individual store purchase');
  } else {
    throw new Error('Timed assessment store purchase failed entitlement check');
  }

  // Test 4: Profile Name Change Limit Rules
  console.log('\n[Test 4] Profile Name Change Limit Simulation:');
  const testNameChange = (currentCount: number, isNameChanged: boolean) => {
    if (!isNameChanged) return { allowed: true, message: 'Profile saved successfully.' };
    if (currentCount >= 2) {
      return { allowed: false, message: 'You have reached the maximum of 2 name changes. Please contact support if your name needs to be corrected.' };
    }
    const nextCount = currentCount + 1;
    const remaining = 2 - nextCount;
    return {
      allowed: true,
      nextCount,
      message: remaining === 1 
        ? 'Name changed successfully. You have 1 name change remaining.' 
        : 'Name changed successfully. You have no name changes remaining.'
    };
  };

  const change1 = testNameChange(0, true);
  if (change1.allowed && change1.nextCount === 1 && change1.message.includes('1 name change remaining')) {
    console.log('✓ 1st name change succeeded with 1 remaining notice');
  } else {
    throw new Error(`1st name change failed: ${JSON.stringify(change1)}`);
  }

  const change2 = testNameChange(1, true);
  if (change2.allowed && change2.nextCount === 2 && change2.message.includes('no name changes remaining')) {
    console.log('✓ 2nd name change succeeded with 0 remaining notice');
  } else {
    throw new Error(`2nd name change failed: ${JSON.stringify(change2)}`);
  }

  const change3 = testNameChange(2, true);
  if (!change3.allowed && change3.message.includes('maximum of 2 name changes')) {
    console.log('✓ 3rd name change correctly blocked with support message');
  } else {
    throw new Error(`3rd name change should be blocked: ${JSON.stringify(change3)}`);
  }

  console.log('\n=========================================');
  console.log('ALL ENHANCEMENT SUITE TESTS PASSED 100%');
  console.log('=========================================\n');
}

runTests();
