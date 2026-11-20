import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const res0 = await base44.asServiceRole.entities.Company.list('-created_date', 1);
    const list = Array.isArray(res0) ? res0 : (res0?.items || []);
    const company = list[0] || null;
    if (!company) return Response.json({ skipped: 'no company' });
    if (company.verse_rotation_active === false) return Response.json({ skipped: 'paused' });
    if (company.verse_next_change && new Date(company.verse_next_change).getTime() > Date.now()) {
      return Response.json({ skipped: 'not due' });
    }

    const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: 'Elige un versículo bíblico alentador, breve (máximo 220 caracteres), en español (versión Reina-Valera o similar), distinto a este: "' + (company.verse_text || 'Jeremías 29:11') + '". Devuelve el texto del versículo sin comillas y su referencia (libro capítulo:versículo).',
      response_json_schema: {
        type: 'object',
        properties: { text: { type: 'string' }, reference: { type: 'string' } },
        required: ['text', 'reference'],
      },
    });
    const text = String(res?.text || '').trim();
    const reference = String(res?.reference || '').trim();
    if (!text || !reference || text.length > 400) {
      return Response.json({ skipped: 'invalid result' });
    }

    const next = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.Company.update(company.id, {
      verse_text: text,
      verse_reference: reference,
      verse_next_change: next,
    });
    return Response.json({ updated: true, reference, next });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}