import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ENTITY_NAMES = [
  "Customer", "Motorcycle", "ServiceOrder", "Product", "Technician",
  "Supplier", "Sale", "Purchase", "Expense", "Invoice",
  "AccountReceivable", "CashMovement", "Brand", "Company",
  "TechnicianLoan", "CommissionPayment"
];

const BUILT_IN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googledrive");

    if (action === 'list') {
      const query = encodeURIComponent("name contains 'AHL_MotoControl_backup_' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=50`;
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const errText = await response.text();
        return Response.json({ error: "Drive list failed", details: errText }, { status: 502 });
      }
      const data = await response.json();
      return Response.json({ success: true, files: data.files || [] });
    }

    if (action === 'restore') {
      const fileId = body.fileId;
      if (!fileId) return Response.json({ error: "fileId required" }, { status: 400 });

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (!fileRes.ok) {
        const errText = await fileRes.text();
        return Response.json({ error: "Download failed", details: errText }, { status: 502 });
      }
      const backup = await fileRes.json();

      const results = {};
      for (const name of ENTITY_NAMES) {
        try {
          const records = backup[name];
          if (!Array.isArray(records)) {
            results[name] = { skipped: true };
            continue;
          }
          // Delete existing records for this entity
          await base44.asServiceRole.entities[name].deleteMany({});
          // Recreate from backup (strip built-in fields to avoid conflicts)
          const cleanRecords = records.map(r => {
            const copy = { ...r };
            for (const f of BUILT_IN_FIELDS) delete copy[f];
            return copy;
          });
          let restored = 0;
          // bulkCreate in batches of 500
          for (let i = 0; i < cleanRecords.length; i += 500) {
            const batch = cleanRecords.slice(i, i + 500);
            const created = await base44.asServiceRole.entities[name].bulkCreate(batch);
            restored += created.length;
          }
          results[name] = { restored };
        } catch (e) {
          results[name] = { error: e.message };
        }
      }
      return Response.json({ success: true, results });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}