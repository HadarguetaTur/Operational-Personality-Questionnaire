import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get lead info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, name, email, drive_folder_url')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Don't create duplicate folders
    if (lead.drive_folder_url) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        folderUrl: lead.drive_folder_url,
      });
    }

    const hasGoogleCreds = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN;

    if (!hasGoogleCreds) {
      console.log(`[Drive] Google not configured. Folder creation for lead ${leadId} skipped.`);
      return NextResponse.json({
        success: false,
        message: 'Google Drive not configured',
      });
    }

    const { createLeadFolder } = await import('@/lib/google/drive');

    const { folderId, folderUrl } = await createLeadFolder(lead.name, lead.email);

    // Update lead with Drive folder URL
    await supabase
      .from('leads')
      .update({ drive_folder_url: folderUrl })
      .eq('id', leadId);

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      try {
        const { sendEmail } = await import('@/lib/google/gmail');
        await sendEmail({
          to: adminEmail,
          subject: `ליד חדש: ${lead.name} - תיקיה נוצרה`,
          htmlBody: `
            <div dir="rtl" style="font-family: Arial, sans-serif;">
              <h2>ליד חדש הגיש טופס המשך</h2>
              <p><strong>שם:</strong> ${lead.name}</p>
              <p><strong>אימייל:</strong> ${lead.email}</p>
              <p><strong>תיקיית דרייב:</strong> <a href="${folderUrl}">${folderUrl}</a></p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[Drive] Failed to send admin notification:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      folderId,
      folderUrl,
    });
  } catch (error) {
    console.error('[Drive] create-folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
