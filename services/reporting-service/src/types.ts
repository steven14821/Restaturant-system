import type { ResumenVentas, ReportePeriodo } from '@restaurante/contract';

export type Props = {
  port: number;
  db: import('pg').Pool;
};
