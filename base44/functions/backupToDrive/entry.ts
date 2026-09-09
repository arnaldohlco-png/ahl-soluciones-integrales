import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ENTITY_NAMES = [
  "Customer", "Motorcycle", "ServiceOrder", "Product", "Technician",
  "Supplier", "Sale", "Purchase", "Expense", "Invoice",
  "AccountReceivable", "CashMovement", "Brand", "Company",
  "TechnicianLoan", "CommissionPayment"
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Get Google Drive access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    // Export all entities
    const backup = { _exportedAt: new Date().toISOString(), _exportedBy: user.email };
    for (const name of ENTITY_NAMES) {
      try {
        const records = await base44.asServiceRole.entities[name].list("-created_date", 500);
        backup[name] = records;
      } catch (e) {
        backup[name] = { _error: e.message };
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "-");
    const fileName = `AHL_MotoControl_backup_${dateStr}_${timeStr}.json`;
    const jsonContent = JSON.stringify(backup, null, 2);

    // Multipart upload to Google Drive
    const boundary = "motocontrol_" + Math.random().toString(36).substring(2);
    const metadata = JSON.stringify({ name: fileName, mimeType: "application/json" });

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonContent}\r\n` +
      `--${boundary}--`;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return Response.json({ error: "Google Drive upload failed", details: errText }, { status: 502 });
    }

    const result = await response.json();
    return Response.json({ success: true, file: result, entityCount: ENTITY_NAMES.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}