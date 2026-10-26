import type { Categoria, Platillo } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};

export type CrearPlatilloDto = {
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen_url?: string;
  disponible?: boolean;
  categoria_id?: number;
};

export type EditarPlatilloDto = Partial<{
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  categoria_id: number;
}>;

export type CrearCategoriaDto = {
  nombre: string;
  descripcion?: string;
};
