import type { Inventario } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};

export type RegistrarIngredienteDto = {
  nombre: string;
  unidad_medida?: string;
  cantidad_inicial?: number;
  cantidad_minima?: number;
  codigo_de_barras?: string;
};

export type AgregarStockDto = {
  codigo_de_barras: string;
  cantidad: number;
};
