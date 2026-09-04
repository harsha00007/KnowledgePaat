import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_POLICIES } from '@/lib/rateLimit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DeleteResult {
  id: string;
  action: 'deleted' | 'archived';
  reason?: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate Admin
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in as an administrator.' }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profErr || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Administrator privileges required.' }, { status: 403 });
    }

    // 2. Rate limit
    const rl = await checkRateLimit(`admin_store_delete:${user.id}`, RATE_LIMIT_POLICIES.ADMIN_SETTINGS);
    if (!rl.success) {
      return rateLimitResponse(rl);
    }

    // 3. Parse and validate request
    const body = await req.json().catch(() => ({}));
    const { productId, productIds } = body;

    const idsToProcess: string[] = [];
    if (productId && typeof productId === 'string' && UUID_REGEX.test(productId.trim())) {
      idsToProcess.push(productId.trim());
    } else if (Array.isArray(productIds)) {
      for (const id of productIds) {
        if (typeof id === 'string' && UUID_REGEX.test(id.trim())) {
          idsToProcess.push(id.trim());
        }
      }
    }

    if (idsToProcess.length === 0) {
      return NextResponse.json({ error: 'Invalid product ID or list of IDs provided. Valid UUIDs required.' }, { status: 400 });
    }

    if (idsToProcess.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 products can be processed per batch.' }, { status: 400 });
    }

    // 4. Helper function to safely delete or archive a single product
    const processSingleProduct = async (id: string): Promise<DeleteResult> => {
      // 4a. Fetch product metadata
      const { data: product, error: fetchErr } = await supabase
        .from('store_products')
        .select('id, title, product_type, item_reference_id, status')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !product) {
        throw new Error('Product not found.');
      }

      // 4b. Check dependencies in order_items and student_purchases
      const [orderItemsRes, purchasesRes] = await Promise.all([
        supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
        supabase.from('student_purchases').select('id', { count: 'exact', head: true }).eq('product_id', id),
      ]);

      const orderCount = orderItemsRes.count || 0;
      const purchaseCount = purchasesRes.count || 0;
      const hasDependencies = orderCount > 0 || purchaseCount > 0;

      // 4c. CASE B: Has Historical Dependencies -> ARCHIVE / DEACTIVATE
      if (hasDependencies) {
        const { error: archiveErr } = await supabase
          .from('store_products')
          .update({ status: 'inactive' })
          .eq('id', id);

        if (archiveErr) throw archiveErr;

        // If linked to a resume template, synchronize is_active = false
        if (product.product_type === 'resume_template' && product.item_reference_id) {
          try {
            await supabase
              .from('resume_templates')
              .update({ is_active: false })
              .eq('id', product.item_reference_id);
          } catch {
            // Graceful fallback if template row does not exist
          }
        }

        return {
          id,
          action: 'archived',
          reason: orderCount > 0 ? 'historical_order_reference' : 'student_purchase_reference',
          message: 'This product has existing order history, so it was archived instead of permanently deleted.',
        };
      }

      // 4d. CASE A: No Historical Dependencies -> SAFE PHYSICAL DELETE
      try {
        // Step 1: Remove junction records from store_product_notes (leaves actual notes in public.notes intact)
        try {
          await supabase
            .from('store_product_notes')
            .delete()
            .eq('product_id', id);
        } catch {
          // Graceful fallback if junction table is missing
        }

        // Step 2: If resume template, synchronize is_active = false
        if (product.product_type === 'resume_template' && product.item_reference_id) {
          try {
            await supabase
              .from('resume_templates')
              .update({ is_active: false })
              .eq('id', product.item_reference_id);
          } catch {
            // Graceful fallback
          }
        }

        // Step 3: Delete product row from store_products
        const { error: deleteErr } = await supabase
          .from('store_products')
          .delete()
          .eq('id', id);

        if (deleteErr) {
          // Check for foreign key constraint violation (race condition where an order was placed concurrently)
          const errMsg = deleteErr.message?.toLowerCase() || '';
          if (
            deleteErr.code === '23503' ||
            errMsg.includes('violates foreign key constraint') ||
            errMsg.includes('order_items') ||
            errMsg.includes('student_purchases')
          ) {
            // Fallback to archive immediately
            await supabase
              .from('store_products')
              .update({ status: 'inactive' })
              .eq('id', id);

            return {
              id,
              action: 'archived',
              reason: 'foreign_key_constraint_fallback',
              message: 'This product has existing order history, so it was archived instead of permanently deleted.',
            };
          }
          throw deleteErr;
        }

        return {
          id,
          action: 'deleted',
          message: 'Product successfully deleted.',
        };
      } catch (err: any) {
        const errMsg = err?.message?.toLowerCase() || '';
        if (
          err?.code === '23503' ||
          errMsg.includes('violates foreign key constraint') ||
          errMsg.includes('order_items') ||
          errMsg.includes('student_purchases')
        ) {
          await supabase
            .from('store_products')
            .update({ status: 'inactive' })
            .eq('id', id);

          return {
            id,
            action: 'archived',
            reason: 'foreign_key_constraint_fallback',
            message: 'This product has existing order history, so it was archived instead of permanently deleted.',
          };
        }
        throw err;
      }
    };

    // If single productId was passed
    if (productId && idsToProcess.length === 1) {
      const result = await processSingleProduct(idsToProcess[0]);
      return NextResponse.json({
        success: true,
        action: result.action,
        reason: result.reason,
        message: result.message,
      });
    }

    // If batch productIds was passed
    const results: DeleteResult[] = [];
    for (const id of idsToProcess) {
      try {
        const res = await processSingleProduct(id);
        results.push(res);
      } catch (itemErr: any) {
        results.push({
          id,
          action: 'archived',
          reason: 'error_fallback',
          message: 'Failed to delete product. Kept safely.',
        });
      }
    }

    const deletedCount = results.filter(r => r.action === 'deleted').length;
    const archivedCount = results.filter(r => r.action === 'archived').length;

    return NextResponse.json({
      success: true,
      deletedCount,
      archivedCount,
      totalProcessed: results.length,
      results,
      message: `Processed ${results.length} product(s): ${deletedCount} deleted, ${archivedCount} archived.`,
    });
  } catch (err: any) {
    console.error('API Error in admin store product delete:', err);
    return NextResponse.json(
      { error: 'Unable to remove this product right now. Please try again.' },
      { status: 500 }
    );
  }
}
