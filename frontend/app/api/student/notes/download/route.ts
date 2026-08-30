import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { calculateUserAccess } from '@/lib/subscription';
import { normalizePlanId, satisfiesPlanRequirement } from '@/config/plans';

/**
 * POST /api/student/notes/download
 * 
 * Server-side download authorization for study notes.
 * Verifies the authenticated user has entitlement (active subscription OR purchased this specific note)
 * before generating a signed download URL.
 * 
 * Body: { noteId: string }
 * Returns: { signedUrl: string } on success
 * Returns: 401 if unauthenticated, 403 if unauthorized, 404 if note not found
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to download notes.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { noteId } = body as { noteId?: string };

    if (!noteId || typeof noteId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid noteId.' },
        { status: 400 }
      );
    }

    // 3. Fetch the note record
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, file_url, minimum_plan, access_type, status')
      .eq('id', noteId)
      .maybeSingle();

    if (noteError || !note) {
      return NextResponse.json(
        { error: 'Note not found.' },
        { status: 404 }
      );
    }

    if (!note.file_url) {
      return NextResponse.json(
        { error: 'This note does not have a downloadable file.' },
        { status: 404 }
      );
    }

    // 4. Check subscription entitlement
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const userAccess = calculateUserAccess(subData);
    const requiredPlan = note.minimum_plan || note.access_type || 'free';
    const hasSubscriptionAccess = userAccess.hasAccess(requiredPlan);

    // 5. Check purchase entitlement for this specific note
    let hasPurchaseAccess = false;

    if (!hasSubscriptionAccess) {
      // 5a. Check if user purchased a store product with item_reference_id pointing to this note
      const { data: purchasesData } = await supabase
        .from('student_purchases')
        .select('product_id')
        .eq('student_id', user.id);

      if (purchasesData && purchasesData.length > 0) {
        const purchasedProductIds = purchasesData.map(p => p.product_id).filter(Boolean);

        // Check direct item_reference_id match
        const { data: matchingProducts } = await supabase
          .from('store_products')
          .select('id, item_reference_id')
          .in('id', purchasedProductIds);

        if (matchingProducts) {
          for (const prod of matchingProducts) {
            if (prod.item_reference_id === noteId) {
              hasPurchaseAccess = true;
              break;
            }
            // Also check if this product's ID matches the note ID (synthesized notes)
            if (prod.id === noteId) {
              hasPurchaseAccess = true;
              break;
            }
          }
        }

        // 5b. Check bundle relationships via store_product_notes
        if (!hasPurchaseAccess) {
          try {
            const { data: bundleNotes } = await supabase
              .from('store_product_notes')
              .select('note_id, product_id')
              .in('product_id', purchasedProductIds);

            if (bundleNotes) {
              for (const bn of bundleNotes) {
                if (bn.note_id === noteId) {
                  hasPurchaseAccess = true;
                  break;
                }
              }
            }
          } catch {
            // store_product_notes table may not exist; graceful fallback
          }
        }

        // 5c. Check if the noteId itself is a purchased product_id (direct product purchase)
        if (!hasPurchaseAccess && purchasedProductIds.includes(noteId)) {
          hasPurchaseAccess = true;
        }
      }
    }

    // 6. Final authorization decision
    if (!hasSubscriptionAccess && !hasPurchaseAccess) {
      return NextResponse.json(
        { error: 'Access denied. An active subscription or purchase of this note is required.' },
        { status: 403 }
      );
    }

    // 7. Generate signed URL only after authorization succeeds
    // If the file_url is already an external URL, return it directly
    if (note.file_url.startsWith('http://') || note.file_url.startsWith('https://')) {
      return NextResponse.json({ signedUrl: note.file_url, title: note.title });
    }

    const { data: urlData, error: urlError } = await supabase.storage
      .from('notes')
      .createSignedUrl(note.file_url, 60);

    if (urlError || !urlData?.signedUrl) {
      console.error('Failed to generate signed URL for note download:', urlError);
      return NextResponse.json(
        { error: 'Could not generate download link. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: urlData.signedUrl,
      title: note.title,
    });

  } catch (err) {
    console.error('Notes download API error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
