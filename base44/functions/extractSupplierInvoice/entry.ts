import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Recibe el file_uri de un PDF de factura de proveedor (subido a almacenamiento privado),
// genera una URL firmada y extrae proveedor, número, fecha y líneas (sku, descripción, cantidad, precio unitario).
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUri = body?.file_uri;
    if (!fileUri || typeof fileUri !== 'string') {
      return Response.json({ error: 'file_uri es requerido' }, { status: 400 });
    }

    // Crear URL firmada para que el servicio de extracción pueda leer el PDF privado.
    const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: fileUri,
      expires_in: 600
    });
    const fileUrl = signed?.signed_url;
    if (!fileUrl) {
      return Response.json({ error: 'No se pudo generar la URL del archivo' }, { status: 500 });
    }

    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: 'object',
        properties: {
          proveedor: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              document_number: { type: 'string' }
            }
          },
          numero: { type: 'string' },
          fecha: { type: 'string', description: 'YYYY-MM-DD' },
          lineas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string' },
                descripcion: { type: 'string' },
                cantidad: { type: 'number' },
                precio_unitario: { type: 'number' }
              }
            }
          }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}