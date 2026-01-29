import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Security: Verify CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedToken) {
    console.log('Cron cleanup: Unauthorized attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Calculate date 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const cutoffDate = tenDaysAgo.toISOString();

    console.log('Cron cleanup: Starting cleanup for listings older than', cutoffDate);

    // Find and update stale listings
    const { data: staleListings, error: fetchError } = await supabase
      .from('listings')
      .select('id, neighborhood, borough, updated_at')
      .eq('status', 'Active')
      .lt('updated_at', cutoffDate);

    if (fetchError) {
      console.error('Cron cleanup: Error fetching stale listings', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch listings', details: fetchError.message },
        { status: 500 }
      );
    }

    const staleCount = staleListings?.length || 0;
    console.log(`Cron cleanup: Found ${staleCount} stale listings`);

    if (staleCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stale listings found',
        expired: 0
      });
    }

    // Update status to 'Expired'
    const staleIds = staleListings.map((l) => l.id);

    const { error: updateError } = await supabase
      .from('listings')
      .update({ status: 'Expired' })
      .in('id', staleIds);

    if (updateError) {
      console.error('Cron cleanup: Error updating listings', updateError);
      return NextResponse.json(
        { error: 'Failed to update listings', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`Cron cleanup: Successfully expired ${staleCount} listings`);

    return NextResponse.json({
      success: true,
      message: `Expired ${staleCount} stale listings`,
      expired: staleCount,
      cutoffDate,
      expiredListings: staleListings.map((l) => ({
        id: l.id,
        location: `${l.neighborhood}, ${l.borough}`,
        lastUpdated: l.updated_at
      }))
    });

  } catch (error) {
    console.error('Cron cleanup: Unexpected error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
