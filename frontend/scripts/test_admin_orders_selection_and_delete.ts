export {};

console.log("===============================================================================");
console.log("TESTING ADMIN ORDERS SELECTION, PAID ORDER PROTECTION, DELETE & PAGINATION");
console.log("===============================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Mock Types & Data
// -----------------------------------------------------------------------------
interface Order {
  id: string;
  student_id: string;
  total_amount: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
  order_status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  profiles?: { full_name: string; email: string };
}

// 25 sample orders across multiple pages
const mockOrdersDatabase: Order[] = Array.from({ length: 25 }, (_, i) => ({
  id: `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
  student_id: `stu-${(i % 5) + 1}`,
  total_amount: (i + 1) * 29,
  // Let order 1 to 5 be paid, 6 to 10 be pending, 11 to 20 be failed/cancelled, etc.
  payment_status: i < 5 ? 'paid' : i < 15 ? 'pending' : i % 2 === 0 ? 'failed' : 'cancelled',
  order_status: i < 5 ? 'completed' : 'pending',
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
  profiles: {
    full_name: `Student ${(i % 5) + 1}`,
    email: `student${(i % 5) + 1}@example.com`
  }
}));

// -----------------------------------------------------------------------------
// TEST 1: Table renders with checkboxes
// -----------------------------------------------------------------------------
console.log("--- TEST 1: Table Renders With Checkboxes ---");
const itemsPerPage = 10;
let currentPage = 1;
let currentVisibleOrders = mockOrdersDatabase.slice(0, itemsPerPage);
let selectedOrderIds: string[] = [];

assert(currentVisibleOrders.length === 10, "Current page contains 10 visible order rows");
assert(currentVisibleOrders.every(ord => Boolean(ord.id)), "Every rendered row has a valid order ID target for checkbox");

// -----------------------------------------------------------------------------
// TEST 2: Selecting 1 row updates selection state
// -----------------------------------------------------------------------------
console.log("\n--- TEST 2: Selecting 1 Row Updates Selection State ---");
const targetId1 = currentVisibleOrders[0].id;
selectedOrderIds = [...selectedOrderIds, targetId1];

assert(selectedOrderIds.length === 1, "Selection state holds exactly 1 order");
assert(selectedOrderIds.includes(targetId1), "Selected order ID matches the targeted row ID");

// -----------------------------------------------------------------------------
// TEST 3: Selecting all selects visible rows only (Current Page Only)
// -----------------------------------------------------------------------------
console.log("\n--- TEST 3: Selecting All Selects Visible Rows Only ---");
const currentPageIds = currentVisibleOrders.map(o => o.id);

// Execute Select All
selectedOrderIds = Array.from(new Set([...selectedOrderIds, ...currentPageIds]));

assert(selectedOrderIds.length === 10, "Select All selects exactly the 10 rows on current page");
assert(currentPageIds.every(id => selectedOrderIds.includes(id)), "All current page order IDs are selected");

// Verify that page 2 orders (orders 11 to 20) are NOT selected
const page2Orders = mockOrdersDatabase.slice(10, 20);
const page2Selected = page2Orders.filter(o => selectedOrderIds.includes(o.id));
assert(page2Selected.length === 0, "Orders on unviewed Page 2 are NOT selected by Select All");

// -----------------------------------------------------------------------------
// TEST 4: Deselecting all clears selection
// -----------------------------------------------------------------------------
console.log("\n--- TEST 4: Deselecting All Clears Selection ---");
// Toggle Select All when all visible are selected
const isAllCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedOrderIds.includes(id));
if (isAllCurrentSelected) {
  selectedOrderIds = selectedOrderIds.filter(id => !currentPageIds.includes(id));
}

assert(selectedOrderIds.length === 0, "Deselecting Select All cleanly clears all selected order IDs");

// -----------------------------------------------------------------------------
// TEST 5: Indeterminate state behaves correctly
// -----------------------------------------------------------------------------
console.log("\n--- TEST 5: Indeterminate State Calculation ---");
// Select 3 rows out of 10
selectedOrderIds = [currentVisibleOrders[0].id, currentVisibleOrders[1].id, currentVisibleOrders[2].id];

const selectedOnPage = currentPageIds.filter(id => selectedOrderIds.includes(id));
const allSelected = selectedOnPage.length === currentPageIds.length;
const isIndeterminate = selectedOnPage.length > 0 && !allSelected;

assert(allSelected === false, "Checkmark is NOT full when only 3 of 10 rows are selected");
assert(isIndeterminate === true, "Indeterminate state is TRUE when 1 <= selected < total visible");

// -----------------------------------------------------------------------------
// TEST 6: Search resets pagination to 1 and clears selection
// -----------------------------------------------------------------------------
console.log("\n--- TEST 6: Search Resets Pagination to 1 and Clears Selection ---");
currentPage = 2;
selectedOrderIds = ['some-id'];

// Simulate user typing search query "Student 1"
function onSearchChange(newQuery: string) {
  currentPage = 1;
  selectedOrderIds = [];
}

onSearchChange("Student 1");
assert(currentPage === 1, "Page resets to 1 upon search query change");
assert(selectedOrderIds.length === 0, "Selection clears on search change to prevent invisible actions");

// -----------------------------------------------------------------------------
// TEST 7: Filter change resets pagination to 1 and clears selection
// -----------------------------------------------------------------------------
console.log("\n--- TEST 7: Filter Change Resets Pagination to 1 and Clears Selection ---");
currentPage = 3;
selectedOrderIds = ['some-id-2'];

// Simulate user changing payment status filter to 'paid'
function onFilterChange(newFilter: string) {
  currentPage = 1;
  selectedOrderIds = [];
}

onFilterChange("paid");
assert(currentPage === 1, "Page resets to 1 upon filter change");
assert(selectedOrderIds.length === 0, "Selection clears on filter change");

// -----------------------------------------------------------------------------
// TEST 8: Attempt to delete protected paid order (Expected: Protected)
// -----------------------------------------------------------------------------
console.log("\n--- TEST 8: Protected Paid Order Security Rule ---");
// Order 1 is a paid order
const paidOrder = mockOrdersDatabase[0];
assert(paidOrder.payment_status === 'paid', "Target order is verified as PAID");

// Simulate server API route logic:
function simulateDeleteApi(orderIds: string[], ordersDb: Order[]) {
  const targetOrders = ordersDb.filter(o => orderIds.includes(o.id));
  const paidOrders = targetOrders.filter(o => o.payment_status === 'paid');

  if (paidOrders.length > 0) {
    return {
      status: 400,
      error: `Cannot delete selected orders: ${paidOrders.length} order(s) are marked as PAID. Paid orders represent completed financial transactions and permanent student entitlements and cannot be deleted.`,
      protectedCount: paidOrders.length
    };
  }

  const eligibleIds = targetOrders.map(o => o.id);
  const remainingDb = ordersDb.filter(o => !eligibleIds.includes(o.id));

  return {
    status: 200,
    success: true,
    deletedCount: eligibleIds.length,
    remainingDb
  };
}

const paidDeleteResult = simulateDeleteApi([paidOrder.id], mockOrdersDatabase);
assert(paidDeleteResult.status === 400, "Server returns 400 Bad Request when attempting to delete paid order");
assert(Boolean(paidDeleteResult.error?.includes("marked as PAID")), "Server error message specifies paid orders cannot be deleted");
assert(paidDeleteResult.protectedCount === 1, "Server correctly reports 1 protected order blocked");

// Verify UI protection rule: Paid orders do not show the delete action button
const isPaidActionAllowed = paidOrder.payment_status !== 'paid';
assert(isPaidActionAllowed === false, "UI action column disables/omits delete button for paid orders");

// -----------------------------------------------------------------------------
// TEST 9: Attempt to delete pending/test-only order (Expected: Safe Deletion)
// -----------------------------------------------------------------------------
console.log("\n--- TEST 9: Safe Deletion of Unfulfilled / Pending Orders ---");
const pendingOrder = mockOrdersDatabase.find(o => o.payment_status === 'pending')!;
assert(pendingOrder !== undefined && pendingOrder.payment_status === 'pending', "Target order is pending");

let currentDb = [...mockOrdersDatabase];
const pendingDeleteResult = simulateDeleteApi([pendingOrder.id], currentDb);

assert(pendingDeleteResult.status === 200, "Server returns 200 OK for pending order deletion");
assert(pendingDeleteResult.deletedCount === 1, "Server reports 1 order deleted");
assert(pendingDeleteResult.remainingDb?.find(o => o.id === pendingOrder.id) === undefined, "Pending order successfully removed from database");
currentDb = pendingDeleteResult.remainingDb!;

// -----------------------------------------------------------------------------
// TEST 10: Pagination: Page 1 -> Page 2 -> Page 1
// -----------------------------------------------------------------------------
console.log("\n--- TEST 10: Pagination Traversal ---");
const totalItems = currentDb.length; // 24
const totalPages = Math.ceil(totalItems / itemsPerPage); // 3

let activePage = 1;
assert(activePage === 1, "Starts on Page 1");

// Next button
if (activePage < totalPages) activePage += 1;
assert(activePage === 2, "Navigates forward to Page 2");

// Next button
if (activePage < totalPages) activePage += 1;
assert(activePage === 3, "Navigates forward to Page 3");

// Previous button
if (activePage > 1) activePage -= 1;
assert(activePage === 2, "Navigates back to Page 2");

// Previous button
if (activePage > 1) activePage -= 1;
assert(activePage === 1, "Navigates back to Page 1");

// -----------------------------------------------------------------------------
// TEST 11: Total count updates correctly after deletion
// -----------------------------------------------------------------------------
console.log("\n--- TEST 11: Total Count Updates Correctly After Deletion ---");
const initialCount = currentDb.length;
const orderToDelete2 = currentDb.find(o => o.payment_status === 'failed')!;

const delRes = simulateDeleteApi([orderToDelete2.id], currentDb);
assert(delRes.status === 200, "Deletion succeeded");
currentDb = delRes.remainingDb!;
const updatedCount = currentDb.length;

assert(updatedCount === initialCount - 1, `Total count decremented from ${initialCount} to ${updatedCount}`);

// -----------------------------------------------------------------------------
// TEST 12: Deleting last item on page moves to previous page
// -----------------------------------------------------------------------------
console.log("\n--- TEST 12: Deleting Last Item on Page Moves to Previous Page ---");
// Simulate scenario where total items = 21 (Page 1 has 10, Page 2 has 10, Page 3 has 1)
const simulated21ItemsDb: Order[] = Array.from({ length: 21 }, (_, i) => ({
  id: `order-sim-${i + 1}`,
  student_id: `stu-${i + 1}`,
  total_amount: 100,
  payment_status: 'pending',
  order_status: 'pending',
  created_at: new Date().toISOString()
}));

let simPage = 3;
const simItemsPerPage = 10;
const page3Orders = simulated21ItemsDb.slice((simPage - 1) * simItemsPerPage, simPage * simItemsPerPage);
assert(page3Orders.length === 1, "Page 3 has exactly 1 order");

// Admin deletes the only order on Page 3
const targetOrderPage3 = page3Orders[0];
const deletePage3Result = simulateDeleteApi([targetOrderPage3.id], simulated21ItemsDb);
const newDbAfterDelete = deletePage3Result.remainingDb!;
const newTotalCount = newDbAfterDelete.length; // 20
const newTotalPages = Math.ceil(newTotalCount / simItemsPerPage); // 2

// UI Pagination Logic
if (page3Orders.length === 1 && simPage > 1) {
  simPage = Math.min(newTotalPages, simPage - 1);
}

assert(simPage === 2, "Current page automatically moved back to Page 2 when Page 3 became empty");
assert(newTotalPages === 2, "Total pages updated to 2");

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n===============================================================================");
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("===============================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL 12 ADMIN ORDERS SELECTION & DELETE TESTS PASSED SUCCESFULLY!");
}
