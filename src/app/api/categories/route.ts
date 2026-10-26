import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';
import { listarCategorias, crearCategoria } from '@/controllers/menuController';

export async function GET() {
  try {
    return NextResponse.json({ categorias: await listarCategorias() });
  } catch (err) {
    console.error('[api/categories] error:', err);
    return NextResponse.json(
      { error: mensajeErrorBaseDatos(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['ADMINISTRADOR']);
  if ('error' in auth) return auth.error;

  try {
    const { nombre, descripcion } = await req.json();
    if (!nombre) return NextResponse.json({ error: 'El nombre de la categoría es obligatorio.' }, { status: 400 });
    const categoria = await crearCategoria(nombre, descripcion);
    return NextResponse.json({ categoria }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

function mensajeErrorBaseDatos(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Falta DATABASE_URL')) {
    return 'No hay conexión configurada a la base de datos (DATABASE_URL).';
  }
  if (msg.includes('tenant/user') || msg.includes('ENOTFOUND')) {
    return 'No se pudo conectar a la base de datos: el proyecto de Supabase no existe o está pausado.';
  }
  return `No se pudieron cargar las categorías: ${msg}`;
}
