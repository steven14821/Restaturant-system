# Microservicios del sistema

Esta carpeta agrupa los microservicios del proyecto. Todos comparten un único
PostgreSQL y se comunican vía HTTP usando los tipos de
[`@restaurante/contract`](./contract/src/index.ts) y el cliente HTTP de
[`@restaurante/contract/http`](./contract/src/http.ts).

Cada servicio tiene su propio `package.json`, `tsconfig.json` y punto de entrada
`src/index.ts`, además de:

- `src/types.ts` — contrato local de entrada/salida.
- `src/service.ts` — lógica de dominio pura del servicio.
- `src/client.ts` — cliente HTTP tipado para que otros servicios lo consuman.
- `src/index.ts` — servidor Express mínimo.

## Services ordenados por importancia operativa

### 1. Auth — `services/auth-service`
**Ubicación:** `services/auth-service/`
**Qué hace:** login, registro de clientes, sesión de invitado para mesa,
`/` me`` y emisión/validación de JWT.
**Puerto por defecto:** `3001`
**Se consume desde:** gateway, otros servicios que necesitan validar token.

### 2. Pedidos — `services/order-service`
**Ubicación:** `services/order-service/`
**Qué hace:** ciclo de vida del pedido, creación, edición, confirmación,
cancelación, cambio de estado, historial y repetir pedido.
**Puerto por defecto:** `3002`
**Se consume desde:** frontend, gateway, orchestrator.

### 3. Identidad / usuarios — `services/identity-service`
**Ubicación:** `services/identity-service/`
**Qué hace:** catálogo de personas, roles, gestión de empleados, activación/
desactivación.
**Puerto por defecto:** `3003`
**Se consume desde:** admin, gateway.

### 4. Menú — `services/menu-service`
**Ubicación:** `services/menu-service/`
**Qué hace:** catálogo público, categorías, CRUD de platillos y alternar
disponibilidad.
**Puerto por defecto:** `3004`
**Se consume desde:** frontend, recomendariones, reportes.

### 5. Mesas — `services/table-service`
**Ubicación:** `services/table-service/`
**Qué hace:** estado de mesas, resolución pública por número (QR/NFC).
**Puerto por defecto:** `3005`
**Se consume desde:** frontend, mesero, orchestrator.

### 6. Notificaciones — `services/notification-service`
**Ubicación:** `services/notification-service/`
**Qué hace:** creación, listado, marcado como leído y conteo de no leídas.
**Puerto por defecto:** `3006`
**Se consume desde:** pedidos, cocina, frontend.

### 7. Inventario — `services/inventory-service`
**Ubicación:** `services/inventory-service/`
**Qué hace:** registro de insumos, stock, alertas de bajo stock, agregar por
código de barras.
**Puerto por defecto:** `3007`
**Se consume desde:** admin, reportes.

### 8. Reportes — `services/reporting-service`
**Ubicación:** `services/reporting-service/`
**Qué hace:** panel de ventas y reportes por periodo.
**Puerto por defecto:** `3008`
**Se consume desde:** admin, dashboard.

### 9. Recomendaciones — `services/recommendation-service`
**Ubicación:** `services/recommendation-service/`
**Qué hace:** recomendaciones por reglas o narrativa opcional con IA.
**Puerto por defecto:** `3009`
**Se consume desde:** frontend.

### 10. Gateway — `services/gateway-service`
**Ubicación:** `services/gateway-service/`
**Qué hace:** entrada única, enrutamiento por rol, unificación de respuesta y
cookie de sesión.
**Puerto por defecto:** `3010`
**Se consume desde:** frontend.

### 11. Orquestador de pedidos — `services/order-orchestrator-service`
**Ubicación:** `services/order-orchestrator-service/`
**Qué hace:** coordina registrar/confirmar/comprobar estado y liberación de mesa
entre servicios.
**Puerto por defecto:** `3011`
**Se consume desde:** flujos automatizados, integraciones.

## Contrato compartida

- Paquetes: [`services/contract/`](./contract/)
- HTTP client: [`services/contract/src/http.ts`](./contract/src/http.ts)
- Tipos de dominio: [`services/contract/src/index.ts`](./contract/src/index.ts)

## Variables de entorno habituales

Cada servicio acepta `<NOMBRE>_DATABASE_URL` para sobreescribir la cadena de
conexión, y `<servicio>_PORT` para elegir puerto, con valores por defecto
documentados arriba.

## Cómo localmente

Lanzar uno a la vez:

```bash
cd services/auth-service && npm run dev
cd services/order-service && npm run dev
cd services/identity-service && npm run dev
cd services/menu-service && npm run dev
cd services/table-service && npm run dev
cd services/notification-service && npm run dev
cd services/inventory-service && npm run dev
cd services/reporting-service && npm run dev
cd services/recommendation-service && npm run dev
cd services/gateway-service && npm run dev
cd services/order-orchestrator-service && npm run dev
```
