import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Elimina ÚNICAMENTE la cuenta del usuario autenticado. No toca ningún otro dato.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role === 'admin') {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      const count = Array.isArray(admins) ? admins.length : (admins.items || []).length;
      if (count <= 1) {
        return Response.json({ error: 'Eres el único administrador. Asigna otro administrador antes de eliminar tu cuenta.' }, { status: 400 });
      }
    }

    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}