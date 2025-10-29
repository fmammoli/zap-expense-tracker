import { drive_v3 } from "googleapis";

export async function getOrCreateFolder(
  drive: drive_v3.Drive,
  folderName = "crococontaRecibos"
): Promise<{ id: string; webViewLink?: string | undefined | null }> {
  // 1) procura pasta existente
  const listRes = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name, webViewLink)",
    spaces: "drive",
    pageSize: 10,
  });

  const existing = listRes.data.files && listRes.data.files[0];
  if (existing && existing.id) {
    return { id: existing.id, webViewLink: existing.webViewLink };
  }

  // 2) cria a pasta se não existir
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, webViewLink",
  });

  if (!createRes.data.id) {
    throw new Error("Failed to create Drive folder");
  }

  return { id: createRes.data.id, webViewLink: createRes.data.webViewLink };
}
