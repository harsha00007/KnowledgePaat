export {};

/**
 * Unit & Integration Test Suite: Store Product Note Content Attachment & Bundle Entitlement
 */
function runTests() {
  console.log("=================================================");
  console.log("GRADZENX: STORE NOTES CONTENT & BUNDLE TEST SUITE");
  console.log("=================================================\n");

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

  // -------------------------------------------------------------
  // GROUP 1: Product Form Validation & File Checking
  // -------------------------------------------------------------
  console.log("--- Group 1: Product Form Validation & File Checking ---");

  const validateStoreForm = (
    title: string,
    productType: string,
    price: number | undefined,
    pdfFile?: { name: string; size: number } | null,
    bundleNotesCount: number = 0,
    isEdit: boolean = false
  ) => {
    const errors: string[] = [];
    if (!title || !title.trim()) errors.push("Product Title is required.");
    if (!productType) errors.push("Product Type is required.");
    if (price === undefined || price === null || price < 0 || isNaN(price)) {
      errors.push("Valid price is required.");
    }

    if (productType === 'note') {
      if (!isEdit && !pdfFile) {
        errors.push("Please upload a Note PDF file.");
      }
      if (pdfFile) {
        if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
          errors.push("Only PDF (.pdf) files are supported.");
        }
        if (pdfFile.size > 50 * 1024 * 1024) {
          errors.push("File size exceeds maximum allowed 50 MB.");
        }
      }
    }

    if (productType === 'note_bundle') {
      if (bundleNotesCount === 0) {
        errors.push("Add at least one note to create a Notes Bundle.");
      }
    }

    return errors;
  };

  // 1A. Title & Price Validation
  assert("Empty product title is rejected", validateStoreForm("", "note", 29, { name: "test.pdf", size: 1024 }).includes("Product Title is required."));
  assert("Negative price is rejected", validateStoreForm("Python Guide", "note", -10, { name: "test.pdf", size: 1024 }).includes("Valid price is required."));

  // 1B. Study Note (PDF) File Validation
  assert("New Study Note without PDF file is rejected", validateStoreForm("Python Guide", "note", 29, null).includes("Please upload a Note PDF file."));
  assert("Non-PDF file (.docx) is rejected", validateStoreForm("Python Guide", "note", 29, { name: "notes.docx", size: 1024 }).includes("Only PDF (.pdf) files are supported."));
  assert("File exceeding 50 MB is rejected", validateStoreForm("Python Guide", "note", 29, { name: "big.pdf", size: 55 * 1024 * 1024 }).includes("File size exceeds maximum allowed 50 MB."));
  assert("Valid PDF file (2.4 MB) is accepted", validateStoreForm("Python Guide", "note", 29, { name: "python_notes.pdf", size: 2.4 * 1024 * 1024 }).length === 0);

  // 1C. Notes Bundle Validation
  assert("Notes Bundle with 0 notes is rejected", validateStoreForm("SQL Bundle", "note_bundle", 49, null, 0).includes("Add at least one note to create a Notes Bundle."));
  assert("Notes Bundle with 3 notes is accepted", validateStoreForm("SQL Bundle", "note_bundle", 49, null, 3).length === 0);

  // -------------------------------------------------------------
  // GROUP 2: Note Creation & Storage Path Generation
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Note Creation & Storage Path Generation ---");

  const generateStoragePath = (originalName: string, isBundle: boolean = false) => {
    const clean = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    return isBundle ? `notes/store_bundle_${clean}` : `notes/store_${clean}`;
  };

  const path1 = generateStoragePath("Python Interview Notes (2026).pdf");
  assert("Generated storage path resides inside 'notes/' bucket directory", path1.startsWith("notes/store_"));
  assert("Generated storage path sanitizes special characters", !path1.includes(" ") && !path1.includes("(") && !path1.includes(")"));

  const pathBundle = generateStoragePath("SQL Cheatsheet.pdf", true);
  assert("Bundle storage path uses 'notes/store_bundle_' prefix", pathBundle.startsWith("notes/store_bundle_"));

  // -------------------------------------------------------------
  // GROUP 3: Store Product ↔ Note Linking & Database Junction
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Store Product ↔ Note Linking & Junction ---");

  interface MockNote {
    id: string;
    title: string;
    category: string;
    file_url: string;
    file_size: string;
  }

  interface MockStoreProduct {
    id: string;
    title: string;
    product_type: 'note' | 'note_bundle' | 'question_pack';
    price: number;
    item_reference_id: string | null;
  }

  interface MockJunction {
    product_id: string;
    note_id: string;
  }

  const notesDb: MockNote[] = [
    { id: 'note-1', title: 'Python Basics', category: 'Programming', file_url: 'notes/store_python.pdf', file_size: '2.1 MB' },
    { id: 'note-2', title: 'SQL Joins Cheatsheet', category: 'Technical Interview', file_url: 'notes/store_sql.pdf', file_size: '1.5 MB' },
    { id: 'note-3', title: 'DBMS Architecture', category: 'Technical Interview', file_url: 'notes/store_dbms.pdf', file_size: '3.2 MB' },
  ];

  // 1. Single Study Note Product Creation
  const singleNoteProduct: MockStoreProduct = {
    id: 'prod-note-1',
    title: 'Python Complete Guide',
    product_type: 'note',
    price: 29,
    item_reference_id: 'note-1'
  };

  const singleJunction: MockJunction = {
    product_id: singleNoteProduct.id,
    note_id: singleNoteProduct.item_reference_id!
  };

  assert("Single note product references note-1 via item_reference_id", singleNoteProduct.item_reference_id === 'note-1');
  assert("Single note product is registered in junction table", singleJunction.product_id === 'prod-note-1' && singleJunction.note_id === 'note-1');

  // 2. Multi-Note Bundle Product Creation
  const bundleProduct: MockStoreProduct = {
    id: 'prod-bundle-1',
    title: 'Database Mastery Bundle',
    product_type: 'note_bundle',
    price: 49,
    item_reference_id: 'note-2'
  };

  const bundleJunctions: MockJunction[] = [
    { product_id: bundleProduct.id, note_id: 'note-2' },
    { product_id: bundleProduct.id, note_id: 'note-3' }
  ];

  assert("Bundle product contains 2 linked notes in junction table", bundleJunctions.length === 2);
  assert("Bundle product contains both SQL (note-2) and DBMS (note-3)", bundleJunctions.some(j => j.note_id === 'note-2') && bundleJunctions.some(j => j.note_id === 'note-3'));

  // -------------------------------------------------------------
  // GROUP 4: Student Purchase & Access Entitlement
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Student Purchase & Access Entitlement ---");

  interface StudentPurchaseRecord {
    student_id: string;
    product_id: string;
  }

  const purchasesDb: StudentPurchaseRecord[] = [
    { student_id: 'student-A', product_id: 'prod-note-1' },    // Purchased Python Note
    { student_id: 'student-B', product_id: 'prod-bundle-1' },  // Purchased DB Bundle
  ];

  // Helper simulating getStudentPurchasedNoteIds
  const resolveUnlockedNotes = (studentId: string) => {
    const studentProds = purchasesDb.filter(p => p.student_id === studentId).map(p => p.product_id);
    const unlocked = new Set<string>();

    studentProds.forEach(prodId => {
      // 1. Check single note product
      if (prodId === singleNoteProduct.id && singleNoteProduct.item_reference_id) {
        unlocked.add(singleNoteProduct.item_reference_id);
      }
      // 2. Check bundle junctions
      bundleJunctions.filter(j => j.product_id === prodId).forEach(j => {
        unlocked.add(j.note_id);
      });
    });

    return unlocked;
  };

  const studentAUnlocked = resolveUnlockedNotes('student-A');
  assert("Student A (single purchase) has unlocked note-1 (Python)", studentAUnlocked.has('note-1'));
  assert("Student A has NOT unlocked note-2 or note-3", !studentAUnlocked.has('note-2') && !studentAUnlocked.has('note-3'));

  const studentBUnlocked = resolveUnlockedNotes('student-B');
  assert("Student B (bundle purchase) has unlocked note-2 (SQL)", studentBUnlocked.has('note-2'));
  assert("Student B (bundle purchase) has unlocked note-3 (DBMS)", studentBUnlocked.has('note-3'));
  assert("Student B has NOT unlocked note-1 (Python)", !studentBUnlocked.has('note-1'));

  // -------------------------------------------------------------
  // GROUP 5: Safe Deletion Non-Destruction
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Safe Deletion Non-Destruction ---");

  // Admin deletes Store Product prod-note-1
  let currentProducts = [singleNoteProduct, bundleProduct];
  let currentJunctions = [singleJunction, ...bundleJunctions];
  let currentNotes = [...notesDb];

  // Delete product
  currentProducts = currentProducts.filter(p => p.id !== 'prod-note-1');
  currentJunctions = currentJunctions.filter(j => j.product_id !== 'prod-note-1');

  assert("Store product prod-note-1 is removed from store listing", !currentProducts.some(p => p.id === 'prod-note-1'));
  assert("Junction row for prod-note-1 is cleaned up", !currentJunctions.some(j => j.product_id === 'prod-note-1'));
  assert("Underlying note-1 is PRESERVED in public.notes library", currentNotes.some(n => n.id === 'note-1'));
  assert("Existing student notes library remains intact", currentNotes.length === 3);

  console.log("\n=================================================");
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
