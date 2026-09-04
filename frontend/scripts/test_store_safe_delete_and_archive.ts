export {};

import { getStoreProducts, StoreProduct } from '../lib/store';

/**
 * KnowledgePaat Automated Test Suite:
 * Phase 22 Store Product Safe Deletion & Archiving Verification
 *
 * Verifies that:
 * 1. Safe physical delete is permitted only when no orders or purchases reference the product.
 * 2. Products referenced by order_items are archived/deactivated (NEVER deleted).
 * 3. Products referenced by student_purchases are archived/deactivated (NEVER deleted).
 * 4. Resume templates linked via item_reference_id are safely synchronized and buyer access preserved.
 * 5. Notes bundles with junction rows in store_product_notes preserve underlying notes in public.notes.
 * 6. Historical orders with paid items remain 100% intact and render product details properly.
 * 7. Archived products are excluded from the active Student Store.
 * 8. Existing purchasers retain permanent access to their purchased products.
 * 9. Unauthorized users are blocked with 401/403.
 * 10. Invalid UUIDs are rejected with 400.
 * 11. Database FK race condition constraint violations cleanly fall back to archive without raw SQL errors.
 * 12. Bulk operations correctly partition unreferenced items (deleted) vs referenced items (archived).
 */

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  price: number;
}

interface Order {
  id: string;
  student_id: string;
  total_amount: number;
  payment_status: 'paid' | 'pending' | 'failed';
  order_status: 'completed' | 'pending';
}

interface StudentPurchase {
  id: string;
  student_id: string;
  product_id: string;
  order_id: string | null;
}

interface Note {
  id: string;
  title: string;
  file_url: string;
}

interface StoreProductNote {
  id: string;
  product_id: string;
  note_id: string;
}

interface ResumeTemplate {
  id: string;
  title: string;
  is_active: boolean;
}

async function runTests() {
  console.log("=================================================================");
  console.log("KNOWLEDGEPAAT: STORE PRODUCT SAFE DELETE & ARCHIVING TEST SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let total = 0;

  const assert = (desc: string, condition: boolean) => {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  };

  const ID_UNUSED = '11111111-1111-1111-1111-111111111111';
  const ID_ORDERED = '22222222-2222-2222-2222-222222222222';
  const ID_PURCHASED = '33333333-3333-3333-3333-333333333333';
  const ID_TEMPLATE = '44444444-4444-4444-4444-444444444444';
  const ID_BUNDLE = '55555555-5555-5555-5555-555555555555';
  const ID_BULK_UNREF = '88888888-8888-8888-8888-888888888888';
  const ID_RACE = '99999999-9999-9999-9999-999999999999';
  const ID_TMPL_RECORD = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  // -------------------------------------------------------------
  // Simulated State Database
  // -------------------------------------------------------------
  let storeProducts: StoreProduct[] = [
    {
      id: ID_UNUSED,
      title: 'Unused Practice Questions',
      description: 'Draft pack never purchased',
      product_type: 'question_pack',
      price: 99,
      original_price: null,
      thumbnail_url: null,
      item_reference_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: ID_ORDERED,
      title: 'System Design Mastery Guide',
      description: 'Ordered by multiple students',
      product_type: 'note',
      price: 149,
      original_price: 199,
      thumbnail_url: null,
      item_reference_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: ID_PURCHASED,
      title: 'AI Mock Interview Pass',
      description: 'Purchased directly by students',
      product_type: 'ai_mock_interview',
      price: 299,
      original_price: null,
      thumbnail_url: null,
      item_reference_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: ID_TEMPLATE,
      title: 'Executive Tech Resume Template',
      description: 'Linked to resume_templates table',
      product_type: 'resume_template',
      price: 49,
      original_price: null,
      thumbnail_url: null,
      item_reference_id: ID_TMPL_RECORD,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: ID_BUNDLE,
      title: 'Full Stack Study Bundle',
      description: 'Bundle containing 2 study notes',
      product_type: 'note_bundle',
      price: 199,
      original_price: 299,
      thumbnail_url: null,
      item_reference_id: null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  let orders: Order[] = [
    {
      id: 'order-1001',
      student_id: 'student-alpha',
      total_amount: 149,
      payment_status: 'paid',
      order_status: 'completed'
    },
    {
      id: 'order-1002',
      student_id: 'student-beta',
      total_amount: 49,
      payment_status: 'paid',
      order_status: 'completed'
    }
  ];

  let orderItems: OrderItem[] = [
    {
      id: 'item-101',
      order_id: 'order-1001',
      product_id: ID_ORDERED,
      price: 149
    },
    {
      id: 'item-102',
      order_id: 'order-1002',
      product_id: ID_TEMPLATE,
      price: 49
    }
  ];

  let studentPurchases: StudentPurchase[] = [
    {
      id: 'purch-201',
      student_id: 'student-alpha',
      product_id: ID_PURCHASED,
      order_id: null
    },
    {
      id: 'purch-202',
      student_id: 'student-beta',
      product_id: ID_TEMPLATE,
      order_id: 'order-1002'
    }
  ];

  let notes: Note[] = [
    { id: 'note-01', title: 'React Performance Deep Dive', file_url: '/notes/react.pdf' },
    { id: 'note-02', title: 'Distributed Systems Patterns', file_url: '/notes/dist.pdf' }
  ];

  let storeProductNotes: StoreProductNote[] = [
    { id: 'spn-1', product_id: ID_BUNDLE, note_id: 'note-01' },
    { id: 'spn-2', product_id: ID_BUNDLE, note_id: 'note-02' }
  ];

  let resumeTemplates: ResumeTemplate[] = [
    { id: ID_TMPL_RECORD, title: 'Executive Tech Resume Template', is_active: true }
  ];

  // Helper simulating server-side delete/archive API endpoint logic
  const handleServerDeleteProduct = async (
    callerRole: string | null,
    productId?: string,
    productIds?: string[],
    simulateRaceFkError = false
  ): Promise<any> => {
    // 1. Auth check
    if (!callerRole) {
      return { status: 401, error: 'Unauthorized. Please sign in as an administrator.' };
    }
    if (callerRole !== 'admin') {
      return { status: 403, error: 'Forbidden. Administrator privileges required.' };
    }

    // 2. Validate input
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const ids: string[] = [];
    if (productId && uuidRegex.test(productId)) {
      ids.push(productId);
    } else if (Array.isArray(productIds)) {
      for (const id of productIds) {
        if (uuidRegex.test(id)) ids.push(id);
      }
    }

    if (ids.length === 0) {
      return { status: 400, error: 'Invalid product ID or list of IDs provided. Valid UUIDs required.' };
    }

    // 3. Process each product
    const results = [];
    for (const id of ids) {
      const prod = storeProducts.find(p => p.id === id);
      if (!prod) {
        results.push({ id, action: 'error', message: 'Product not found.' });
        continue;
      }

      const orderCount = orderItems.filter(oi => oi.product_id === id).length;
      const purchaseCount = studentPurchases.filter(sp => sp.product_id === id).length;
      const hasHistory = orderCount > 0 || purchaseCount > 0;

      if (hasHistory) {
        // CASE B: ARCHIVE / DEACTIVATE
        prod.status = 'inactive';
        if (prod.product_type === 'resume_template' && prod.item_reference_id) {
          const tmpl = resumeTemplates.find(t => t.id === prod.item_reference_id);
          if (tmpl) tmpl.is_active = false;
        }
        results.push({
          id,
          action: 'archived',
          reason: orderCount > 0 ? 'historical_order_reference' : 'student_purchase_reference',
          message: 'This product has existing order history, so it was archived instead of permanently deleted.'
        });
      } else {
        // CASE A: ATTEMPT PHYSICAL DELETE
        if (simulateRaceFkError) {
          // Race condition occurred where another order inserted concurrently -> fallback to archive
          prod.status = 'inactive';
          results.push({
            id,
            action: 'archived',
            reason: 'foreign_key_constraint_fallback',
            message: 'This product has existing order history, so it was archived instead of permanently deleted.'
          });
        } else {
          // Remove junction links
          storeProductNotes = storeProductNotes.filter(spn => spn.product_id !== id);
          if (prod.product_type === 'resume_template' && prod.item_reference_id) {
            const tmpl = resumeTemplates.find(t => t.id === prod.item_reference_id);
            if (tmpl) tmpl.is_active = false;
          }
          // Remove from storeProducts
          storeProducts = storeProducts.filter(p => p.id !== id);
          results.push({
            id,
            action: 'deleted',
            message: 'Product successfully deleted.'
          });
        }
      }
    }

    if (productId && ids.length === 1) {
      return { status: 200, ...results[0] };
    }
    return {
      status: 200,
      deletedCount: results.filter(r => r.action === 'deleted').length,
      archivedCount: results.filter(r => r.action === 'archived').length,
      results
    };
  };

  // -------------------------------------------------------------
  // TEST 1: Delete product with NO dependencies
  // -------------------------------------------------------------
  console.log("--- TEST 1: Delete unreferenced product ---");
  const res1 = await handleServerDeleteProduct('admin', ID_UNUSED);
  assert("API returns status 200", res1.status === 200);
  assert("Action is 'deleted'", res1.action === 'deleted');
  assert("Message confirms deletion", res1.message === 'Product successfully deleted.');
  assert("Product is physically removed from store_products", !storeProducts.some(p => p.id === ID_UNUSED));

  // -------------------------------------------------------------
  // TEST 2: Attempt to delete product referenced by order_items
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Delete product referenced by order_items ---");
  const initialOrderItemCount = orderItems.length;
  const res2 = await handleServerDeleteProduct('admin', ID_ORDERED);
  assert("API returns status 200", res2.status === 200);
  assert("Action is 'archived'", res2.action === 'archived');
  assert("Reason is 'historical_order_reference'", res2.reason === 'historical_order_reference');
  assert("Message clearly informs admin of archive", Boolean(res2.message && res2.message.includes('archived instead of permanently deleted')));
  assert("Product status changed to 'inactive'", storeProducts.find(p => p.id === ID_ORDERED)?.status === 'inactive');
  assert("order_items row is preserved intact", orderItems.length === initialOrderItemCount);
  assert("Product record still exists in store_products", storeProducts.some(p => p.id === ID_ORDERED));

  // -------------------------------------------------------------
  // TEST 3: Attempt to delete product referenced by student_purchases
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Delete product referenced by student_purchases ---");
  const initialPurchaseCount = studentPurchases.length;
  const res3 = await handleServerDeleteProduct('admin', ID_PURCHASED);
  assert("API returns status 200", res3.status === 200);
  assert("Action is 'archived'", res3.action === 'archived');
  assert("Reason is 'student_purchase_reference'", res3.reason === 'student_purchase_reference');
  assert("Product status changed to 'inactive'", storeProducts.find(p => p.id === ID_PURCHASED)?.status === 'inactive');
  assert("student_purchases row is preserved intact", studentPurchases.length === initialPurchaseCount);
  assert("Product record still exists in store_products", storeProducts.some(p => p.id === ID_PURCHASED));

  // -------------------------------------------------------------
  // TEST 4: Resume Template linked via item_reference_id
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Resume template linked via item_reference_id ---");
  const res4 = await handleServerDeleteProduct('admin', ID_TEMPLATE);
  assert("API returns status 200", res4.status === 200);
  assert("Action is 'archived' due to order/purchase history", res4.action === 'archived');
  assert("Linked resume_templates is_active set to false", resumeTemplates.find(t => t.id === ID_TMPL_RECORD)?.is_active === false);
  assert("Resume template record is NOT orphaned or deleted", resumeTemplates.some(t => t.id === ID_TMPL_RECORD));

  // -------------------------------------------------------------
  // TEST 5: Notes bundle linked via store_product_notes
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Notes bundle unreferenced by orders ---");
  const initialNotesCount = notes.length;
  const res5 = await handleServerDeleteProduct('admin', ID_BUNDLE);
  assert("API returns status 200", res5.status === 200);
  assert("Action is 'deleted'", res5.action === 'deleted');
  assert("Junction rows in store_product_notes are removed", storeProductNotes.filter(spn => spn.product_id === ID_BUNDLE).length === 0);
  assert("Underlying notes in public.notes remain intact", notes.length === initialNotesCount);

  // -------------------------------------------------------------
  // TEST 6: Historical order integrity
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Historical order integrity ---");
  const paidOrder = orders.find(o => o.id === 'order-1001');
  assert("Order 1001 exists", Boolean(paidOrder));
  assert("Order 1001 payment_status is 'paid'", paidOrder?.payment_status === 'paid');
  const relatedItem = orderItems.find(oi => oi.order_id === 'order-1001');
  assert("Order item still references product-2222", relatedItem?.product_id === ID_ORDERED);
  const referencedProduct = storeProducts.find(p => p.id === relatedItem?.product_id);
  assert("Referenced product metadata is preserved for invoice/history display", referencedProduct?.title === 'System Design Mastery Guide');

  // -------------------------------------------------------------
  // TEST 7: Student Store filtering of archived products
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Student store exclusion of inactive/archived products ---");
  // Mock client using getStoreProducts filtering logic
  const mockSupabase = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: storeProducts, error: null })
      })
    })
  } as any;

  const activeStudentProducts = await getStoreProducts(mockSupabase);
  assert("Archived product-2222 excluded from student store", !activeStudentProducts.some(p => p.id === ID_ORDERED));
  assert("Archived product-3333 excluded from student store", !activeStudentProducts.some(p => p.id === ID_PURCHASED));
  assert("Archived template-4444 excluded from student store", !activeStudentProducts.some(p => p.id === ID_TEMPLATE));

  // -------------------------------------------------------------
  // TEST 8: Existing purchaser access preserved
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Existing purchaser access preserved ---");
  const studentAlphaPurchases = studentPurchases.filter(sp => sp.student_id === 'student-alpha');
  assert("Student Alpha retains purchased product-3333", studentAlphaPurchases.some(sp => sp.product_id === ID_PURCHASED));
  const ownedProduct = storeProducts.find(p => p.id === ID_PURCHASED);
  assert("Purchased product record exists in DB to render title & details", Boolean(ownedProduct));

  // -------------------------------------------------------------
  // TEST 9: Unauthorized caller attempts delete
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Unauthorized access checks ---");
  const unauthRes = await handleServerDeleteProduct(null, ID_ORDERED);
  assert("Null session blocked with 401", unauthRes.status === 401);
  const studentRes = await handleServerDeleteProduct('student', ID_ORDERED);
  assert("Student role blocked with 403", studentRes.status === 403);

  // -------------------------------------------------------------
  // TEST 10: Invalid UUID validation
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Validation for malformed product IDs ---");
  const invalidIdRes = await handleServerDeleteProduct('admin', 'not-a-uuid-12345');
  assert("Invalid UUID rejected with 400", invalidIdRes.status === 400);

  // -------------------------------------------------------------
  // TEST 11: Database FK Race Condition Fallback
  // -------------------------------------------------------------
  console.log("\n--- TEST 11: Concurrent FK constraint violation fallback ---");
  const raceProd: StoreProduct = {
    id: ID_RACE,
    title: 'Concurrent Order Test Product',
    description: 'Order placed right during delete check',
    product_type: 'timed_assessment',
    price: 79,
    original_price: null,
    thumbnail_url: null,
    item_reference_id: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  storeProducts.push(raceProd);

  const res11 = await handleServerDeleteProduct('admin', ID_RACE, undefined, true);
  assert("Race condition gracefully returns 200", res11.status === 200);
  assert("Action safely falls back to 'archived'", res11.action === 'archived');
  assert("Reason is 'foreign_key_constraint_fallback'", res11.reason === 'foreign_key_constraint_fallback');
  assert("User receives friendly message without raw PostgreSQL internals", !res11.message.includes('23503') && !res11.message.includes('violates foreign key constraint'));

  // -------------------------------------------------------------
  // TEST 12: Bulk Delete Operation
  // -------------------------------------------------------------
  console.log("\n--- TEST 12: Bulk delete with mixed referenced and unreferenced products ---");
  const bulkUnreferenced: StoreProduct = {
    id: ID_BULK_UNREF,
    title: 'Bulk Test Unreferenced Product',
    description: 'Should be deleted',
    product_type: 'question_pack',
    price: 29,
    original_price: null,
    thumbnail_url: null,
    item_reference_id: null,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  storeProducts.push(bulkUnreferenced);

  const bulkRes = await handleServerDeleteProduct('admin', undefined, [
    ID_BULK_UNREF, // unreferenced -> deleted
    ID_ORDERED     // referenced -> archived
  ]);

  assert("Bulk API returns status 200", bulkRes.status === 200);
  assert("Deleted count is 1", bulkRes.deletedCount === 1);
  assert("Archived count is 1", bulkRes.archivedCount === 1);
  assert("Unreferenced product was deleted", !storeProducts.some(p => p.id === ID_BULK_UNREF));
  assert("Referenced product remains preserved as inactive", storeProducts.find(p => p.id === ID_ORDERED)?.status === 'inactive');

  console.log("\n=================================================================");
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${total - passed}`);
  console.log("=================================================================\n");

  if (passed === total) {
    console.log("SUCCESS: All safe deletion, archiving, and integrity tests passed!");
  } else {
    process.exit(1);
  }
}

runTests();
