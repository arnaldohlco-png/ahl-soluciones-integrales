import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { ENTITY_NAMES, BACKUP_VERSION } from '../../shared/backupEntities.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const backup = {
      _version: BACKUP_VERSION,
      _exportedAt: new Date().toISOString(),
      _exportedBy: user.email,
      _entities: ENTITY_NAMES,
    };
    const counts = {};
    for (const name of ENTITY_NAMES) {
      const all = [];
      let cursor = undefined;
      do {
        const page = await base44.asServiceRole.entities[name].filter({}, { sort: 'created_date', limit: 500, cursor });
        all.push(...page.items);
        cursor = page.has_more ? page.next_cursor : undefined;
      } while (cursor);
      backup[name] = all;
      counts[name] = all.length;
    }
    backup._counts = counts;
    return Response.json(backup);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}