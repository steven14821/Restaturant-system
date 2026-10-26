import { NextResponse } from 'next/server';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Health check real: comprueba que la app responde Y que la base de datos
 * contesta. `/menu` no sirve para esto porque es una página estática que
 * devuelve 200 aunque PostgreSQL esté caído.
 */
export async function GET() {
  try {
    await q('SELECT 1 AS ok');
    return NextResponse.json({
      ok: true,
      db: 'up',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.error('[api/health] base de datos caída:', mensaje);

    let motivo = mensaje;
    if (mensaje.includes('Falta DATABASE_URL')) {
      motivo = 'DATABASE_URL no está configurada.';
    } else if (mensaje.includes('tenant/user') || mensaje.includes('ENOTFOUND')) {
      motivo = 'El proyecto de Supabase no existe o está pausado.';
    }

    return NextResponse.json(
      { ok: false, db: 'down', error: motivo, timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
