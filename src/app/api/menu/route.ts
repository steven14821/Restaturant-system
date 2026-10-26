import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';
import { listarPlatillos, crearPlatillo } from '@/controllers/menuController';

/** RF01 — Consulta pública del menú digital (no requiere autenticación) */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const soloDisponibles = searchParams.get('disponibles') !== 'false';
  const categoriaId = searchParams.get('categoria_id');

  try {
    const platillos = await listarPlatillos({
      soloDisponibles,
      categoriaId: categoriaId ? Number(categoriaId) : undefined,
    });
    return NextResponse.json({ platillos });
  } catch (err) {
    console.error('[api/menu] error:', err);
    return NextResponse.json({ error: mensajeErrorBaseDatos(err) }, { status: 500 });
  }
}

/** RF14 — Crear platillo (solo administrador) */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['ADMINISTRADOR']);
  if ('error' in auth) return auth.error;

  try {
    const data = await req.json();
    if (!data.nombre || data.precio === undefined) {
      return NextResponse.json({ error: 'nombre y precio son obligatorios.' }, { status: 400 });
    }
    const platillo = await crearPlatillo(data);
    return NextResponse.json({ platillo }, { status: 201 });
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
  return `No se pudo cargar el menú: ${msg}`;
}
