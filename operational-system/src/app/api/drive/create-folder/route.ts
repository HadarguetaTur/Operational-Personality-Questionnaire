import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { runDriveFolderForLead } from '@/lib/followup/sideEffects';
import { driveCreateFolderSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'בקשה לא תקינה' }, { status: 400 });
    }

    const parsed = driveCreateFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'פרטים לא תקינים' },
        { status: 400 },
      );
    }

    const result = await runDriveFolderForLead(parsed.data.leadId);
    if (!result.success && !result.skipped) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: result.success,
      folderUrl: result.folderUrl,
      alreadyExists: result.alreadyExists ?? false,
      skipped: result.skipped ?? false,
    });
  } catch (error) {
    console.error('[Drive] create-folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
