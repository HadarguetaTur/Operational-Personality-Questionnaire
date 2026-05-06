import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleAuth } from './auth';

/**
 * Creates a folder in Google Drive and returns its URL and ID.
 */
export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ folderId: string; folderUrl: string }> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const parents = parentFolderId ? [parentFolderId] : [];
  const baseFolderId = process.env.GOOGLE_DRIVE_BASE_FOLDER_ID;
  if (!parentFolderId && baseFolderId) {
    parents.push(baseFolderId);
  }

  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parents.length > 0 ? parents : undefined,
    },
    fields: 'id, webViewLink',
  });

  const folderId = response.data.id ?? '';
  const folderUrl = response.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;

  return { folderId, folderUrl };
}

/**
 * Uploads a file to Google Drive.
 */
export async function uploadFileToDrive(params: {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  folderId: string;
}): Promise<{ fileId: string; fileUrl: string }> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const readable = new Readable();
  readable.push(params.fileBuffer);
  readable.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: readable,
    },
    fields: 'id, webViewLink',
  });

  const fileId = response.data.id ?? '';
  const fileUrl = response.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, fileUrl };
}

/**
 * Creates a lead folder structure in Google Drive.
 * Pattern: Base Folder / Lead Name - Date / (files go here)
 */
export async function createLeadFolder(
  leadName: string,
  leadEmail: string
): Promise<{ folderId: string; folderUrl: string }> {
  const date = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
  const folderName = `${leadName} - ${leadEmail} - ${date}`;

  return createDriveFolder(folderName);
}
