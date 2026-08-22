export {};

/**
 * Unit & Integration Test Suite: Store Product Edit, PDF Replacement & Bundle Content Management
 */
function runTests() {
  console.log("=================================================");
  console.log("GRADZENX: STORE PRODUCT EDIT & REPLACEMENT SUITE");
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

  interface NoteRecord {
    id: string;
    title: string;
    category: string;
    description: string;
    file_url: string;
    file_size: string;
    minimum_plan: string;
    status: string;
  }

  interface StoreProductRecord {
    id: string;
    title: string;
    description: string;
    product_type: 'note' | 'note_bundle' | 'question_pack' | 'interview_bundle';
    price: number;
    original_price: number | null;
    item_reference_id: string | null;
    status: 'active' | 'inactive';
  }

  interface JunctionRecord {
    product_id: string;
    note_id: string;
  }

  interface StudentPurchaseRecord {
    student_id: string;
    product_id: string;
  }

  // In-memory mock database & storage
  let storageFiles = new Set<string>();
  let notesDb: NoteRecord[] = [];
  let productsDb: StoreProductRecord[] = [];
  let junctionsDb: JunctionRecord[] = [];
  let purchasesDb: StudentPurchaseRecord[] = [];

  // -------------------------------------------------------------
  // TEST 1 — Study Note Creation
  // -------------------------------------------------------------
  console.log("--- TEST 1: Study Note Creation ---");

  const createStudyNoteProduct = (
    title: string,
    price: number,
    category: string,
    fileName: string,
    fileSizeMb: number
  ) => {
    // 1. Upload to storage
    const storagePath = `notes/store_${Date.now()}_${fileName}`;
    storageFiles.add(storagePath);

    // 2. Insert Note
    const noteId = `note-${Date.now()}`;
    const newNote: NoteRecord = {
      id: noteId,
      title,
      category,
      description: `Study Note for ${title}`,
      file_url: storagePath,
      file_size: `${fileSizeMb.toFixed(1)} MB`,
      minimum_plan: 'free',
      status: 'Active'
    };
    notesDb.push(newNote);

    // 3. Insert Product
    const productId = `prod-${Date.now()}`;
    const newProd: StoreProductRecord = {
      id: productId,
      title,
      description: `Comprehensive study guide for ${title}`,
      product_type: 'note',
      price,
      original_price: price + 20,
      item_reference_id: noteId,
      status: 'active'
    };
    productsDb.push(newProd);

    // 4. Insert Junction
    junctionsDb.push({ product_id: productId, note_id: noteId });

    return { product: newProd, note: newNote };
  };

  const { product: prod1, note: note1 } = createStudyNoteProduct(
    "Python Interview Guide",
    29,
    "Technical Interview",
    "python_interview_guide_v1.pdf",
    2.4
  );

  assert("Product record created with product_type = 'note'", prod1.product_type === 'note');
  assert("Note record created and linked via item_reference_id", prod1.item_reference_id === note1.id);
  assert("Storage file exists in private notes bucket", storageFiles.has(note1.file_url));
  assert("Junction row exists in store_product_notes", junctionsDb.some(j => j.product_id === prod1.id && j.note_id === note1.id));

  // -------------------------------------------------------------
  // TEST 2 — Study Note Edit Metadata
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Study Note Edit Metadata ---");

  const updateStudyNoteMetadata = (
    productId: string,
    newTitle: string,
    newCategory: string,
    newDescription: string,
    newPlan: string
  ) => {
    const prod = productsDb.find(p => p.id === productId);
    if (!prod) throw new Error("Product not found");

    prod.title = newTitle;
    prod.description = newDescription;

    if (prod.item_reference_id) {
      const note = notesDb.find(n => n.id === prod.item_reference_id);
      if (note) {
        note.title = newTitle;
        note.category = newCategory;
        note.description = newDescription;
        note.minimum_plan = newPlan;
      }
    }
  };

  updateStudyNoteMetadata(
    prod1.id,
    "Python 3.12 Master Interview Guide",
    "Programming",
    "Updated comprehensive guide for modern Python interviews.",
    "starter"
  );

  const updatedNote1 = notesDb.find(n => n.id === note1.id)!;
  const updatedProd1 = productsDb.find(p => p.id === prod1.id)!;

  assert("Existing Note title updated without creating a new record", updatedNote1.title === "Python 3.12 Master Interview Guide");
  assert("Existing Note category updated to 'Programming'", updatedNote1.category === "Programming");
  assert("Existing Note minimum_plan updated to 'starter'", updatedNote1.minimum_plan === "starter");
  assert("Total notes count in database remains exactly 1", notesDb.length === 1);
  assert("Product ID and Note ID are unchanged", updatedProd1.id === prod1.id && updatedNote1.id === note1.id);

  // -------------------------------------------------------------
  // TEST 3 — Study Note Replace PDF (Safe Replacement)
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Study Note Replace PDF ---");

  const oldStoragePath = note1.file_url;

  const replaceNotePdf = (
    productId: string,
    newFileName: string,
    newFileSizeMb: number
  ) => {
    const prod = productsDb.find(p => p.id === productId);
    if (!prod) throw new Error("Product not found");
    const note = notesDb.find(n => n.id === prod.item_reference_id);
    if (!note) throw new Error("Note not found");

    // 1. Upload new file first
    const newStoragePath = `notes/store_${Date.now()}_${newFileName}`;
    storageFiles.add(newStoragePath);

    // 2. Update DB record
    const previousPath = note.file_url;
    note.file_url = newStoragePath;
    note.file_size = `${newFileSizeMb.toFixed(1)} MB`;

    // 3. Delete old file ONLY after successful DB update
    if (previousPath && previousPath !== newStoragePath) {
      storageFiles.delete(previousPath);
    }

    return { newStoragePath, noteId: note.id };
  };

  const { newStoragePath, noteId: noteIdAfterReplace } = replaceNotePdf(
    prod1.id,
    "python_interview_guide_v2_2026.pdf",
    3.2
  );

  assert("New storage file is registered in storage", storageFiles.has(newStoragePath));
  assert("Old storage file is safely cleaned up after replacement", !storageFiles.has(oldStoragePath));
  assert("Note record references the new storage path", updatedNote1.file_url === newStoragePath);
  assert("Note file size updated to 3.2 MB", updatedNote1.file_size === "3.2 MB");
  assert("Logical Note ID remains identical after PDF replacement", noteIdAfterReplace === note1.id);

  // -------------------------------------------------------------
  // TEST 4 — Failed Replacement Safety
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Failed Replacement Safety ---");

  const attemptInvalidPdfReplacement = (fileSizeMb: number, extension: string) => {
    if (extension !== '.pdf') {
      return { success: false, error: "Only PDF (.pdf) files are supported." };
    }
    if (fileSizeMb > 50) {
      return { success: false, error: "File size exceeds maximum allowed 50 MB." };
    }
    return { success: true };
  };

  const fail1 = attemptInvalidPdfReplacement(65, '.pdf');
  const fail2 = attemptInvalidPdfReplacement(2.0, '.docx');

  assert("Oversized 65MB file is rejected before upload", fail1.success === false && fail1.error === "File size exceeds maximum allowed 50 MB.");
  assert("Non-PDF docx file is rejected before upload", fail2.success === false && fail2.error === "Only PDF (.pdf) files are supported.");
  assert("Existing active PDF remains untouched during failed upload attempt", storageFiles.has(newStoragePath));

  // -------------------------------------------------------------
  // TEST 5 — Existing Purchase Access Retention
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Existing Purchase Access Retention ---");

  // Student purchased prod1 before PDF replacement
  purchasesDb.push({ student_id: 'student-charlie', product_id: prod1.id });

  // Resolve unlocked notes for Charlie
  const getUnlockedNoteIdsForStudent = (studentId: string) => {
    const studentProds = purchasesDb.filter(p => p.student_id === studentId).map(p => p.product_id);
    const unlocked = new Set<string>();

    studentProds.forEach(pId => {
      // 1. Direct item_reference_id
      const p = productsDb.find(prod => prod.id === pId);
      if (p?.item_reference_id) unlocked.add(p.item_reference_id);

      // 2. Junction notes
      junctionsDb.filter(j => j.product_id === pId).forEach(j => unlocked.add(j.note_id));
    });

    return unlocked;
  };

  const charlieUnlockedNotes = getUnlockedNoteIdsForStudent('student-charlie');
  assert("Charlie retains instant access to Note 1 after PDF replacement", charlieUnlockedNotes.has(note1.id));
  assert("Charlie's purchase record remains valid without rebuying", purchasesDb.some(p => p.student_id === 'student-charlie' && p.product_id === prod1.id));

  // -------------------------------------------------------------
  // TEST 6 — Notes Bundle Editing (Add, Remove, Multi-Upload)
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Notes Bundle Editing ---");

  // Create initial 3 notes
  const noteSQL: NoteRecord = { id: 'note-sql', title: 'SQL Joins', category: 'Aptitude', description: '', file_url: 'notes/sql.pdf', file_size: '1.2 MB', minimum_plan: 'free', status: 'Active' };
  const noteDBMS: NoteRecord = { id: 'note-dbms', title: 'DBMS Norm', category: 'Technical Interview', description: '', file_url: 'notes/dbms.pdf', file_size: '2.0 MB', minimum_plan: 'free', status: 'Active' };
  const noteOS: NoteRecord = { id: 'note-os', title: 'OS Concepts', category: 'Technical Interview', description: '', file_url: 'notes/os.pdf', file_size: '1.8 MB', minimum_plan: 'free', status: 'Active' };
  notesDb.push(noteSQL, noteDBMS, noteOS);

  const bundleProduct: StoreProductRecord = {
    id: 'prod-bundle-db',
    title: 'Core CS Notes Bundle',
    description: 'All core CS subjects in one bundle',
    product_type: 'note_bundle',
    price: 49,
    original_price: 99,
    item_reference_id: null,
    status: 'active'
  };
  productsDb.push(bundleProduct);

  // Initial bundle contains: SQL, DBMS, OS (3 notes)
  junctionsDb.push(
    { product_id: bundleProduct.id, note_id: noteSQL.id },
    { product_id: bundleProduct.id, note_id: noteDBMS.id },
    { product_id: bundleProduct.id, note_id: noteOS.id }
  );

  let bundleAttachedIds = junctionsDb.filter(j => j.product_id === bundleProduct.id).map(j => j.note_id);
  assert("Initial bundle contains 3 notes", bundleAttachedIds.length === 3);

  // Edit bundle: Remove OS (note-os), Add Python (note1.id)
  junctionsDb = junctionsDb.filter(j => !(j.product_id === bundleProduct.id && j.note_id === noteOS.id));
  junctionsDb.push({ product_id: bundleProduct.id, note_id: note1.id });

  bundleAttachedIds = junctionsDb.filter(j => j.product_id === bundleProduct.id).map(j => j.note_id);
  assert("Bundle after edit contains 3 notes (OS removed, Python added)", bundleAttachedIds.length === 3);
  assert("Bundle contains Python (note1)", bundleAttachedIds.includes(note1.id));
  assert("Bundle no longer contains OS (note-os)", !bundleAttachedIds.includes(noteOS.id));
  assert("Underlying OS note record remains preserved in notes library", notesDb.some(n => n.id === noteOS.id));

  // -------------------------------------------------------------
  // TEST 7 — Bundle Purchase Entitlement
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Bundle Purchase Entitlement ---");

  purchasesDb.push({ student_id: 'student-dave', product_id: bundleProduct.id });

  const daveUnlockedNotes = getUnlockedNoteIdsForStudent('student-dave');
  assert("Dave has unlocked SQL from the bundle", daveUnlockedNotes.has('note-sql'));
  assert("Dave has unlocked DBMS from the bundle", daveUnlockedNotes.has('note-dbms'));
  assert("Dave has unlocked Python from the bundle", daveUnlockedNotes.has(note1.id));
  assert("Dave has NOT unlocked OS from the bundle", !daveUnlockedNotes.has('note-os'));

  // -------------------------------------------------------------
  // TEST 8 — Product Deactivation
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Product Deactivation ---");

  bundleProduct.status = 'inactive';

  const activeStoreProducts = productsDb.filter(p => p.status === 'active');
  assert("Inactive bundle is excluded from active store listings", !activeStoreProducts.some(p => p.id === bundleProduct.id));
  assert("Active single note product remains listed in store", activeStoreProducts.some(p => p.id === prod1.id));
  assert("Dave (prior buyer) still maintains access to purchased bundle notes", getUnlockedNoteIdsForStudent('student-dave').has('note-sql'));

  console.log("\n=================================================");
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
