'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { menuService } from '@/services/menuService';
import { recommendationService } from '@/services/otherServices';
import { api } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { formatearMoneda } from '@/utils/format';
import type { Platillo, PlatoRecomendado, Categoria, Mesa } from '@/models/types';

interface Props {
  numeroMesa?: number | null;
}

interface Grupo {
  id: number;
  nombre: string;
  platos: Platillo[];
}

/**
 * Listado del menú (platillos reales de la BD, agrupados por categoría)
 * con botón "agregar al carrito" funcional. Se reutiliza en el menú
 * público (/menu?mesa=N) y en el del cliente (/cliente/menu).
 */
export default function ListadoMenu({ numeroMesa }: Props) {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [recomendaciones, setRecomendaciones] = useState<PlatoRecomendado[]>([]);
  const [mensajeIA, setMensajeIA] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  // Cambiar este contador vuelve a ejecutar la carga (botón "Reintentar").
  const [intento, setIntento] = useState(0);
  const [mesa, setMesaInfo] = useState<Mesa | null>(null);
  const [mesaError, setMesaError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const { agregar, cantidadTotal, setMesa } = useCart();

  const mesaIvalida = numeroMesa != null && Number.isInteger(numeroMesa) && numeroMesa > 0;

  useEffect(() => {
    setCargando(true);
    setError('');

    const recoP = recommendationService
      .obtener(4)
      .then((r) => {
        setMensajeIA(r.mensaje);
        return r.recomendaciones;
      })
      .catch(() => []);
    Promise.all([menuService.listar(true), menuService.listarCategorias(), recoP])
      .then(([m, c, r]) => {
        setPlatillos(m.platillos);
        setCategorias(c.categorias);
        setRecomendaciones(r);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setCargando(false));
  }, [intento]);

  useEffect(() => {
    if (!mesaIvalida) return;
    api
      .get<{ mesa: Mesa }>(`/tables/by-number/${numeroMesa}`)
      .then(({ mesa }) => {
        setMesaInfo(mesa);
        setMesa({ id: mesa.id, numero: mesa.numero });
      })
      .catch((err) => setMesaError((err as Error).message));
  }, [numeroMesa, mesaIvalida, setMesa]);

  function handleAgregar(p: Platillo) {
    agregar(p, 1);
    setMensaje(`"${p.nombre}" agregado al carrito.`);
    setTimeout(() => setMensaje(''), 2000);
  }

  const grupos: Grupo[] = categorias
    .map((cat) => ({
      id: cat.id,
      nombre: cat.nombre,
      platos: platillos.filter((p) => p.categoria_id === cat.id),
    }))
    .filter((g) => g.platos.length > 0);

  const sinCategoria = platillos.filter((p) => p.categoria_id == null);
  if (sinCategoria.length > 0) {
    grupos.push({ id: 0, nombre: 'Del día', platos: sinCategoria });
  }

  return (
    <div className="container py-4 position-relative">
      <span
        className="rv-mano rv-mano-pomodoro"
        style={{ display: 'block', textAlign: 'center', margin: '1rem 0 0.5rem', fontSize: '1.5rem', transform: 'rotate(-2deg)' }}
      >
        hoy: espaguetis, ragú y un buen vino
      </span>

      {mensaje && (
        <div className="rv-card-panel d-flex align-items-center gap-2 p-3 mb-4" style={{ background: 'var(--rv-crema)', borderLeft: '4px solid var(--rv-oliva)' }}>
          <i className="bi bi-check-circle" style={{ color: 'var(--rv-oliva)', fontSize: '1.3rem' }}></i>
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{mensaje}</span>
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        {mesa ? (
          <div className="rv-card-panel d-flex align-items-center gap-2 p-3">
            <i className="bi bi-qr-code" style={{ color: 'var(--rv-pomodoro)' }}></i>
            <span>
              Estás en la <strong>mesa {mesa.numero}</strong> (capacidad {mesa.capacidad}).
            </span>
          </div>
        ) : (
          <span />
        )}
        <Link href="/cliente/carrito" className="rv-btn rv-btn-pomodoro" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <i className="bi bi-cart"></i> Carrito
          {cantidadTotal > 0 && <span className="badge bg-light text-dark ms-1">{cantidadTotal}</span>}
        </Link>
      </div>

      {mesaError && (
        <div className="rv-card-panel d-flex align-items-center gap-2 p-3 mb-4" style={{ background: 'var(--rv-crema)', borderLeft: '4px solid var(--rv-pomodoro)' }}>
          <i className="bi bi-exclamation-triangle" style={{ color: 'var(--rv-pomodoro)' }}></i> {mesaError}
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status" />
          <p className="rv-mano rv-mano-oliva mt-3" style={{ fontSize: '1.3rem' }}>
            preparando la carta...
          </p>
        </div>
      ) : error ? (
        <div className="rv-listado-platos" style={{ maxWidth: 520, margin: '2rem auto' }}>
          <div className="rv-listado-cuerpo" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <i className="bi bi-exclamation-triangle" style={{ fontSize: '2.2rem', color: 'var(--rv-pomodoro)' }}></i>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: '0.8rem' }}>No pudimos cargar la carta</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--rv-tinta-2)', margin: '0.5rem 0 0' }}>{error}</p>
            <button
              type="button"
              className="rv-btn rv-btn-pomodoro mt-3"
              onClick={() => setIntento((n) => n + 1)}
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : platillos.length === 0 ? (
        <div className="rv-listado-platos" style={{ maxWidth: 480, margin: '2rem auto' }}>
          <div className="rv-listado-cuerpo" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <i className="bi bi-egg-fried" style={{ fontSize: '2.2rem', color: 'var(--rv-tinta-2)', opacity: 0.5 }}></i>
            <h3 style={{ fontFamily: 'var(--font-display)', marginTop: '0.8rem' }}>El menú está vacío</h3>
            <p className="rv-mano rv-mano-oliva" style={{ fontSize: '1.2rem', margin: '0.5rem 0 0' }}>
              vuelve más tarde — el cocinero está en el mercado
            </p>
          </div>
        </div>
      ) : (
        <>
          {recomendaciones.length > 0 && (
            <section className="mb-5">
              <div className="d-flex align-items-baseline gap-2 mb-3">
                <p className="rv-eyebrow rv-eyebrow-dark">Lo más pedido de la semana</p>
                <span className="puntos" style={{ flex: '1 auto', borderBottom: '1px dotted rgba(43, 28, 14, 0.4)', transform: 'translateY(-0.2em)' }}></span>
              </div>
              <div className="rv-listado-platos">
                <div className="rv-listado-cabecera">
                  <p className="rv-eyebrow mb-1">La casa recomienda <i className="bi bi-stars"></i></p>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.4rem' }}>
                    Recomendados de la semana
                  </h3>
                  {mensajeIA && (
                    <p className="rv-mano rv-mano-oliva" style={{ fontSize: '1.05rem', margin: '0.15rem 0 0', lineHeight: 1.4 }}>
                      {mensajeIA}
                    </p>
                  )}
                </div>
                <div className="rv-listado-cuerpo">
                  <ul className="rv-lista">
                    {recomendaciones.map((p) => (
                      <li key={p.id}>
                        <div>
                          <span className="rv-lista-nombre">{p.nombre}</span>
                          {p.descripcion && <span className="rv-lista-desc">{p.descripcion}</span>}
                          {p.motivacion && <span className="rv-lista-desc" style={{ fontStyle: 'italic', color: 'var(--rv-oliva)' }}>{p.motivacion}</span>}
                        </div>
                        <div className="d-flex align-items-center" style={{ gap: '0.6rem', justifyContent: 'flex-end' }}>
                          <span className="rv-lista-precio">{formatearMoneda(p.precio)}</span>
                          <span className="puntos" style={{ minWidth: '0.5rem', borderBottom: '1px dotted rgba(43, 28, 14, 0.4)', transform: 'translateY(-0.3em)' }}></span>
                          <button
                            className="rv-btn rv-btn-pomodoro"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                            disabled={!p.disponible}
                            onClick={() => handleAgregar(p)}
                            title={p.disponible ? 'Agregar al carrito' : 'Agotado'}
                          >
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
          {grupos.map((g) => (
            <section key={g.id} className="mb-4">
              <div className="d-flex align-items-baseline gap-2 mb-3">
                <p className="rv-eyebrow rv-eyebrow-dark">{g.nombre}</p>
                <span className="puntos" style={{ flex: '1 auto', borderBottom: '1px dotted rgba(43, 28, 14, 0.4)', transform: 'translateY(-0.2em)' }}></span>
              </div>
              <div className="rv-listado-platos">
                <div className="rv-listado-cabecera">
                  <p className="rv-eyebrow mb-1">Se sirve hoy</p>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '1.4rem' }}>
                    {g.nombre}
                  </h3>
                </div>
                <div className="rv-listado-cuerpo">
                  <ul className="rv-lista">
                    {g.platos.map((p) => (
                      <li key={p.id}>
                        <div>
                          <span className="rv-lista-nombre">{p.nombre}</span>
                          {p.descripcion && <span className="rv-lista-desc">{p.descripcion}</span>}
                        </div>
                        <div className="d-flex align-items-center" style={{ gap: '0.6rem', justifyContent: 'flex-end' }}>
                          <span className="rv-lista-precio">{formatearMoneda(p.precio)}</span>
                          <span className="puntos" style={{ minWidth: '0.5rem', borderBottom: '1px dotted rgba(43, 28, 14, 0.4)', transform: 'translateY(-0.3em)' }}></span>
                          <button
                            className="rv-btn rv-btn-pomodoro"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                            disabled={!p.disponible}
                            onClick={() => handleAgregar(p)}
                            title={p.disponible ? 'Agregar al carrito' : 'Agotado'}
                          >
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ))}
        </>
      )}

      {cantidadTotal > 0 && (
        <div className="text-center mt-4 mb-3">
          <Link href="/cliente/carrito" className="rv-btn rv-btn-pomodoro">
            <i className="bi bi-cart"></i> Ver carrito ({cantidadTotal})
          </Link>
        </div>
      )}

      <p className="rv-carta-pie mt-4">
        la pasta se hace el mismo día — si se acaba, se acaba
      </p>
    </div>
  );
}