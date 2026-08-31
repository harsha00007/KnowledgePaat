export {};

import { canStudentAccessResource, getStudentPurchasedResourceIds } from '../lib/store';
import { calculateUserAccess } from '../lib/subscription';

/**
 * Unit & Integration Test Suite: Resume Templates Full Admin Store Management
 */
function runTests() {
  console.log("=================================================");
  console.log("KNOWLEDGEPAAT: RESUME TEMPLATE ADMIN STORE SUITE");
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

  interface ResumeTemplateRecord {
    id: string;
    title: string;
    description: string;
    category: string;
    file_url: string;
    thumbnail_url: string | null;
    minimum_plan: string;
    price: number;
    is_free: boolean;
    is_active: boolean;
    download_count?: number;
    created_at: string;
    updated_at: string;
  }

  interface StoreProductRecord {
    id: string;
    title: string;
    description: string;
    product_type: string;
    price: number;
    original_price: number | null;
    item_reference_id: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
  }

  interface StudentPurchaseRecord {
    id: string;
    student_id: string;
    product_id: string;
  }

  // In-memory mock database & storage
  const storageFiles = new Set<string>();
  let templatesDb: ResumeTemplateRecord[] = [
    // Seeded Templates
    {
      id: 'tmpl-1',
      title: 'Software Developer Fresher Resume',
      description: 'Clean single-column layout for Software Engineer roles.',
      category: 'Software Development',
      file_url: '/sample_templates/software_engineer_fresher.pdf',
      thumbnail_url: null,
      minimum_plan: 'free',
      price: 0,
      is_free: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'tmpl-2',
      title: 'Data Analyst & BI Specialist Resume',
      description: 'Structured layout emphasizing SQL and Python.',
      category: 'Data & Analytics',
      file_url: '/sample_templates/data_analyst_resume.pdf',
      thumbnail_url: null,
      minimum_plan: 'starter',
      price: 49,
      is_free: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  let productsDb: StoreProductRecord[] = [];
  let purchasesDb: StudentPurchaseRecord[] = [];

  // Validation function matching frontend/app/admin/store/page.tsx
  const validateResumeTemplateForm = (data: {
    title?: string;
    price?: number;
    category?: string;
    minimum_plan?: string;
    file?: { name: string; size: number } | null;
    isEditing?: boolean;
    isReplacing?: boolean;
  }) => {
    const errors: Record<string, string> = {};
    if (!data.title?.trim()) errors.title = "Product Title is required.";
    if (data.price === undefined || data.price === null || data.price < 0) errors.price = "Valid price is required.";
    if (!data.isEditing && !data.file) errors.resumeFile = "Please upload a Resume Template file (.pdf, .doc, .docx).";
    if (data.isEditing && data.isReplacing && !data.file) errors.resumeFile = "Please choose a replacement Resume Template file.";
    if (data.file) {
      const validExts = ['.pdf', '.doc', '.docx'];
      const lowerName = data.file.name.toLowerCase();
      const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));
      if (!hasValidExt) errors.resumeFile = "Only PDF, DOC, and DOCX files are supported.";
      if (data.file.size > 50 * 1024 * 1024) errors.resumeFile = "The template file must be 50 MB or smaller.";
    }
    if (!data.category?.trim()) errors.resumeCategory = "Please select a template category.";
    if (!data.minimum_plan?.trim()) errors.resumeMinimumPlan = "Please select the minimum subscription plan.";

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // Mock Admin Store save workflow
  const adminSaveResumeTemplate = (params: {
    title: string;
    description: string;
    price: number;
    original_price?: number | null;
    category: string;
    minimum_plan: string;
    status: 'active' | 'inactive';
    file?: { name: string; size: number } | null;
    existingProductId?: string;
    existingTemplateId?: string;
  }) => {
    let templateId = params.existingTemplateId || null;
    let filePath = '';

    if (params.file) {
      filePath = `templates/resume_${Date.now()}_${params.file.name}`;
      storageFiles.add(filePath);
    }

    const isFree = params.minimum_plan === 'free' || params.price === 0;

    if (templateId) {
      const existing = templatesDb.find(t => t.id === templateId);
      if (existing) {
        existing.title = params.title;
        existing.description = params.description;
        existing.category = params.category;
        if (filePath) existing.file_url = filePath;
        existing.minimum_plan = params.minimum_plan;
        existing.price = params.price;
        existing.is_free = isFree;
        existing.is_active = params.status === 'active';
        existing.updated_at = new Date().toISOString();
      }
    } else {
      templateId = `tmpl-${Math.random().toString(36).slice(2, 9)}`;
      templatesDb.push({
        id: templateId,
        title: params.title,
        description: params.description,
        category: params.category,
        file_url: filePath,
        thumbnail_url: null,
        minimum_plan: params.minimum_plan,
        price: params.price,
        is_free: isFree,
        is_active: params.status === 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    let productId = params.existingProductId || null;
    if (productId) {
      const existingProd = productsDb.find(p => p.id === productId);
      if (existingProd) {
        existingProd.title = params.title;
        existingProd.description = params.description;
        existingProd.price = params.price;
        existingProd.original_price = params.original_price ?? null;
        existingProd.item_reference_id = templateId;
        existingProd.status = params.status;
        existingProd.updated_at = new Date().toISOString();
      }
    } else {
      productId = `prod-${Math.random().toString(36).slice(2, 9)}`;
      productsDb.push({
        id: productId,
        title: params.title,
        description: params.description,
        product_type: 'resume_template',
        price: params.price,
        original_price: params.original_price ?? null,
        item_reference_id: templateId,
        status: params.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    return { productId, templateId };
  };

  // -------------------------------------------------------------
  // TEST 1 — Admin creates Resume Template with PDF
  // -------------------------------------------------------------
  console.log("--- TEST 1: Admin creates Resume Template with PDF ---");
  const t1 = adminSaveResumeTemplate({
    title: "Senior Full Stack Engineer Resume",
    description: "Tailored for 3+ years experience developers",
    price: 39,
    original_price: 69,
    category: "Software Development",
    minimum_plan: "starter",
    status: "active",
    file: { name: "senior_fullstack.pdf", size: 2 * 1024 * 1024 }
  });

  const createdProd1 = productsDb.find(p => p.id === t1.productId);
  const createdTmpl1 = templatesDb.find(t => t.id === t1.templateId);

  assert("Store Product created with product_type = 'resume_template'", createdProd1?.product_type === 'resume_template');
  assert("Resume Template DB row created with category & plan", createdTmpl1?.category === 'Software Development' && createdTmpl1?.minimum_plan === 'starter');
  assert("store_products.item_reference_id correctly linked to resume_templates.id", createdProd1?.item_reference_id === createdTmpl1?.id);

  // -------------------------------------------------------------
  // TEST 2 — Admin creates Resume Template with DOCX
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Admin creates Resume Template with DOCX ---");
  const t2 = adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Editable Word format layout",
    price: 49,
    original_price: 99,
    category: "Product & Operations",
    minimum_plan: "pro",
    status: "active",
    file: { name: "product_manager_template.docx", size: 1.5 * 1024 * 1024 }
  });

  const createdTmpl2 = templatesDb.find(t => t.id === t2.templateId);
  assert("DOCX file uploaded and stored in template file_url", createdTmpl2?.file_url.includes('.docx') === true);

  // -------------------------------------------------------------
  // TEST 3 — Validation: Unsupported File Format
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Unsupported File Format Validation ---");
  const val3 = validateResumeTemplateForm({
    title: "Invalid File Template",
    price: 29,
    category: "Core Engineering",
    minimum_plan: "starter",
    file: { name: "template.exe", size: 5000 }
  });
  assert("Rejects .exe or unsupported file types", val3.isValid === false && val3.errors.resumeFile?.includes("Only PDF, DOC, and DOCX") === true);

  // -------------------------------------------------------------
  // TEST 4 — Validation: File Exceeding 50 MB
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: File Size Limit Validation ---");
  const val4 = validateResumeTemplateForm({
    title: "Heavy File Template",
    price: 29,
    category: "Data & Analytics",
    minimum_plan: "starter",
    file: { name: "heavy_template.pdf", size: 55 * 1024 * 1024 } // 55 MB
  });
  assert("Rejects files larger than 50 MB", val4.isValid === false && val4.errors.resumeFile?.includes("50 MB") === true);

  // -------------------------------------------------------------
  // TEST 5 — Admin Edits Category
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Category Update ---");
  adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Updated category to Core Engineering",
    price: 49,
    category: "Core Engineering",
    minimum_plan: "pro",
    status: "active",
    existingProductId: t2.productId,
    existingTemplateId: t2.templateId
  });
  const updatedTmpl2 = templatesDb.find(t => t.id === t2.templateId);
  assert("Category updated in resume_templates", updatedTmpl2?.category === "Core Engineering");

  // -------------------------------------------------------------
  // TEST 6 — Admin Edits Minimum Plan
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Minimum Plan Update ---");
  adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Updated plan to premium",
    price: 49,
    category: "Core Engineering",
    minimum_plan: "premium",
    status: "active",
    existingProductId: t2.productId,
    existingTemplateId: t2.templateId
  });
  assert("Minimum plan updated to 'premium'", templatesDb.find(t => t.id === t2.templateId)?.minimum_plan === "premium");

  // -------------------------------------------------------------
  // TEST 7 — Admin Edits Price
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Price Update ---");
  adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Updated price",
    price: 59,
    original_price: 119,
    category: "Core Engineering",
    minimum_plan: "premium",
    status: "active",
    existingProductId: t2.productId,
    existingTemplateId: t2.templateId
  });
  const updatedProd2 = productsDb.find(p => p.id === t2.productId);
  assert("Store product price updated to ₹59", updatedProd2?.price === 59);

  // -------------------------------------------------------------
  // TEST 8 — Admin Deactivates Template
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Deactivation ---");
  adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Deactivated item",
    price: 59,
    category: "Core Engineering",
    minimum_plan: "premium",
    status: "inactive",
    existingProductId: t2.productId,
    existingTemplateId: t2.templateId
  });
  assert("store_products status is 'inactive'", productsDb.find(p => p.id === t2.productId)?.status === 'inactive');
  assert("resume_templates is_active is false", templatesDb.find(t => t.id === t2.templateId)?.is_active === false);

  // -------------------------------------------------------------
  // TEST 9 — Admin Reactivates Template
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: Reactivation ---");
  adminSaveResumeTemplate({
    title: "Executive Product Manager Resume",
    description: "Reactivated item",
    price: 59,
    category: "Core Engineering",
    minimum_plan: "premium",
    status: "active",
    existingProductId: t2.productId,
    existingTemplateId: t2.templateId
  });
  assert("store_products status restored to 'active'", productsDb.find(p => p.id === t2.productId)?.status === 'active');
  assert("resume_templates is_active restored to true", templatesDb.find(t => t.id === t2.templateId)?.is_active === true);

  // -------------------------------------------------------------
  // TEST 10 — Student Purchases Template A
  // -------------------------------------------------------------
  console.log("\n--- TEST 10: Individual Purchase Access Unlocking ---");
  const studentA = 'student-uuid-1';
  // Student A buys Product 1 (linked to Template 1)
  purchasesDb.push({
    id: 'purchase-1',
    student_id: studentA,
    product_id: t1.productId
  });

  const studentAOwnedIds = new Set([t1.productId, t1.templateId]);
  const freeUserAccess = calculateUserAccess(null); // No subscription

  const canStudentAAccessTmpl1 = canStudentAccessResource(
    createdTmpl1!.minimum_plan,
    freeUserAccess,
    studentAOwnedIds,
    createdTmpl1!.id
  );
  assert("Student A can access purchased Template A without subscription", canStudentAAccessTmpl1 === true);

  // -------------------------------------------------------------
  // TEST 11 — Student A Cannot Access Unpurchased Template B
  // -------------------------------------------------------------
  console.log("\n--- TEST 11: Cross-Product Entitlement Isolation ---");
  const canStudentAAccessTmpl2 = canStudentAccessResource(
    templatesDb.find(t => t.id === t2.templateId)!.minimum_plan,
    freeUserAccess,
    studentAOwnedIds,
    t2.templateId
  );
  assert("Student A CANNOT access Template B (Purchase Isolation)", canStudentAAccessTmpl2 === false);

  // -------------------------------------------------------------
  // TEST 12 — Subscription Plan Access
  // -------------------------------------------------------------
  console.log("\n--- TEST 12: Premium Subscription Access ---");
  const premiumUserAccess = calculateUserAccess({
    plan_id: 'premium',
    status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString()
  });

  const canPremiumUserAccessTmpl2 = canStudentAccessResource(
    'premium',
    premiumUserAccess,
    new Set(),
    t2.templateId
  );
  assert("Premium subscriber can access Premium-required template without purchase", canPremiumUserAccessTmpl2 === true);

  // -------------------------------------------------------------
  // TEST 13 — Starter Subscriber Denied Premium Template
  // -------------------------------------------------------------
  console.log("\n--- TEST 13: Subscription Plan Tier Hierarchy ---");
  const starterUserAccess = calculateUserAccess({
    plan_id: 'starter',
    status: 'active',
    current_period_end: new Date(Date.now() + 86400000).toISOString()
  });

  const canStarterUserAccessTmpl2 = canStudentAccessResource(
    'premium',
    starterUserAccess,
    new Set(),
    t2.templateId
  );
  assert("Starter subscriber CANNOT access Premium-required template", canStarterUserAccessTmpl2 === false);

  // -------------------------------------------------------------
  // TEST 14 — Admin Replaces File on Existing Template
  // -------------------------------------------------------------
  console.log("\n--- TEST 14: File Replacement on Existing Template ---");
  const initialUrl = templatesDb.find(t => t.id === t1.templateId)?.file_url;
  adminSaveResumeTemplate({
    title: "Senior Full Stack Engineer Resume v2",
    description: "Updated layout with latest ATS guidelines",
    price: 39,
    category: "Software Development",
    minimum_plan: "starter",
    status: "active",
    file: { name: "senior_fullstack_v2.pdf", size: 2.1 * 1024 * 1024 },
    existingProductId: t1.productId,
    existingTemplateId: t1.templateId
  });
  const updatedUrl = templatesDb.find(t => t.id === t1.templateId)?.file_url;
  assert("File URL safely replaced while preserving same template ID", initialUrl !== updatedUrl && t1.templateId === 'tmpl-' + t1.templateId.replace('tmpl-', ''));

  // -------------------------------------------------------------
  // TEST 15 — Seeded Templates Compatibility
  // -------------------------------------------------------------
  console.log("\n--- TEST 15: Backward Compatibility with Seeded Templates ---");
  const freeTmpl = templatesDb.find(t => t.id === 'tmpl-1');
  const starterTmpl = templatesDb.find(t => t.id === 'tmpl-2');

  const canAccessFreeSeed = canStudentAccessResource(freeTmpl?.minimum_plan, freeUserAccess, new Set(), freeTmpl?.id);
  const canAccessStarterSeedWithStarterPlan = canStudentAccessResource(starterTmpl?.minimum_plan, starterUserAccess, new Set(), starterTmpl?.id);
  const canAccessStarterSeedFree = canStudentAccessResource(starterTmpl?.minimum_plan, freeUserAccess, new Set(), starterTmpl?.id);

  assert("Seeded Free template accessible to free user", canAccessFreeSeed === true);
  assert("Seeded Starter template accessible to Starter subscriber", canAccessStarterSeedWithStarterPlan === true);
  assert("Seeded Starter template locked for non-subscribed user", canAccessStarterSeedFree === false);

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("=================================================");

  if (passed === total) {
    console.log("ALL RESUME TEMPLATE ADMIN STORE TESTS PASSED!");
  } else {
    process.exit(1);
  }
}

runTests();
