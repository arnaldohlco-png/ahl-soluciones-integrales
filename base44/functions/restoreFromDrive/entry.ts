import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ENTITY_NAMES, OPTIONAL_ENTITIES, BUILT_IN_FIELDS, BACKUP_VERSION, MAX_BACKUP_BYTES } from '../../shared/backupEntities.ts';

function validateBackup(backup) {
  const problems = [];
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    return ["El archivo no tiene el formato de un respaldo."];
  }
  if (backup._version !== BACKUP_VERSION) {
    problems.push(`Versión de respaldo no compatible (se esperaba ${BACKUP_VERSION}, se encontró ${backup._version ?? 'ninguna'}).`);
  }
  for (const name of ENTITY_NAMES) {
    const records = backup[name];
    if (records === undefined && OPTIONAL_ENTITIES.includes(name)) continue;
    if (!Array.isArray(records)) {
      problems.push(`Falta la entidad ${name} o está dañada.`);
      continue;
    }
    if (records.some((r) => !r || typeof r !== 'object' || Array.isArray(r))) {
      problems.push(`La entidad ${name} contiene registros mal formados.`);
    }
    if (backup._counts && typeof backup._counts[name] === 'number' && backup._counts[name] !== records.length) {
      problems.push(`La entidad ${name} no coincide con el conteo esperado.`);
    }
  }
  return problems;
}

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
        headers: { "Authorization": `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(30000),
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

      const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
        headers: { "Authorization": `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(120000),
      });
      if (!fileRes.ok) {
        const errText = await fileRes.text();
        return Response.json({ error: "No se pudo descargar el respaldo", details: errText }, { status: 502 });
      }
      const text = await fileRes.text();
      if (text.length > MAX_BACKUP_BYTES) {
        return Response.json({ error: "El respaldo es demasiado grande. No se modificó ningún dato." }, { status: 400 });
      }
      let backup;
      try {
        backup = JSON.parse(text);
      } catch (_) {
        return Response.json({ error: "El archivo no es un JSON válido. No se modificó ningún dato." }, { status: 400 });
      }

      // Validación completa ANTES de cualquier operación destructiva
      const problems = validateBackup(backup);
      if (problems.length > 0) {
        return Response.json({
          error: "Respaldo inválido. No se modificó ningún dato: " + problems.join(" "),
          problems,
        }, { status: 400 });
      }

      const results = {};
      for (const name of ENTITY_NAMES) {
        if (!Array.isArray(backup[name])) continue;
        try {
          const clean = backup[name].map((r) => {
            const copy = { ...r };
            for (const f of BUILT_IN_FIELDS) delete copy[f];
            return copy;
          });
          await base44.asServiceRole.entities[name].deleteMany({});
          let restored = 0;
          for (let i = 0; i < clean.length; i += 500) {
            const created = await base44.asServiceRole.entities[name].bulkCreate(clean.slice(i, i + 500));
            restored += created.length;
          }
          results[name] = { restored, expected: clean.length };
        } catch (e) {
          results[name] = { error: e.message };
        }
      }
      const failed = Object.entries(results).filter(([, v]) => v.error || v.restored !== v.expected).map(([k]) => k);
      return Response.json({ success: failed.length === 0, failed, results });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}