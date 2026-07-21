# Qaskly

Qaskly es una plataforma de presentaciones interactivas en tiempo real, inspirada en Mentimeter. Permite que un presenter cree slides, lance una sesión live y reciba respuestas de la audiencia desde el celular, con resultados en vivo e históricos al terminar.

## Estado productivo

Despliegue público actual en Railway:

- Web: https://qaskly-front-production.up.railway.app
- API health: https://qaskly-back-production.up.railway.app/api/v1/health
- API base: `https://qaskly-back-production.up.railway.app/api/v1`
- WebSocket endpoint: `https://qaskly-back-production.up.railway.app`

Verificación de producción realizada el 19 de junio de 2026:

```bash
curl -I -L https://qaskly-front-production.up.railway.app
curl https://qaskly-back-production.up.railway.app/api/v1/health
```

El frontend respondió `HTTP/2 200` y el backend respondió `{"status":"ok","service":"qaskly-api"}`.

Los servicios Railway se configuran como monorepo compartido:

- Frontend service: root directory `/`, config file path `/apps/web/railway.toml`.
- Backend service: root directory `/`, config file path `/apps/api/railway.toml`.
- Ambos builds conservan acceso a `packages/shared`, por lo que no se usa root directory aislado en `/apps/web` o `/apps/api`.

## Producto y propuesta de valor

Qaskly resuelve el problema de transformar presentaciones pasivas en sesiones participativas. El presenter prepara preguntas, comparte un código de sala o QR, controla el avance de slides y ve respuestas en tiempo real. La audiencia no necesita cuenta: entra por código y responde desde su dispositivo.

Funcionalidades principales:

- Autenticación passwordless por email OTP con Auth0 para presenters.
- Dashboard protegido para crear, editar, duplicar y eliminar presentaciones.
- Editor de slides con tipos soportados: opción múltiple, respuesta abierta, nube de palabras, escala, ranking, adivina el número y matriz 2x2.
- Congelamiento de contenido después de iniciar una live session, preservando consistencia de resultados.
- Sala pública de audiencia por código, con reconexión mediante `participantToken`.
- Control presenter live con endpoints REST, QR/link de acceso y sincronización por Socket.IO.
- Waiting room inmersiva con reacciones emoji live-only para participantes.
- Resultados live e históricos agregados desde respuestas durables.
- Cache de vistas protegidas estables para mejorar navegación repetida sin sacrificar frescura después de mutaciones.

## Cumplimiento Tarea 3

| Requisito | Implementación en Qaskly | Justificación |
| --- | --- | --- |
| Producto coherente | Plataforma de presentaciones interactivas con authoring, live session, audience room y results | Todas las piezas apuntan al mismo flujo: crear, presentar, responder y revisar resultados |
| Autenticación y seguridad | Auth0 SDK v4, email OTP passwordless, rutas protegidas, API owner-only con JWT Auth0 | Las acciones sensibles requieren presenter autenticado; la audiencia usa tokens anónimos limitados al room |
| Bonus auth passwordless | Login/signup por correo con código OTP, sin contraseñas propias | Reduce fricción y evita almacenar passwords en Qaskly |
| Patrones de renderizado | SSG/static, SSR/RSC, CSR y fetch cache taggeado de Next.js | Cada patrón se usa donde aporta al producto: SEO/performance, datos protegidos, interacción live o cache controlado |
| Persistencia | PostgreSQL + Prisma con User, Presentation, Slide, LiveSession, Participant y Response | Modelo relacional con más de 4 entidades reales del dominio y relaciones de ownership/session |
| CRUD y validaciones | Presentation CRUD/duplicate, slide CRUD en UI, reorder/profile update/delete a nivel API, live session lifecycle y responses | El CRUD está asociado a objetos funcionales del producto, no a tablas accesorias |
| Especialización avanzada | Real-time con Socket.IO + Redis para estado efímero, presencia y throttling | La experiencia live necesita sincronización inmediata entre presenter y audience |
| Despliegue y CD | Railway con servicios separados web/API, Postgres, Redis y config-as-code por app | El entorno público permite evaluación directa y reproduce builds desde el monorepo |
| Responsive UI | Landing, auth, dashboard, maker, live, join y results usan layouts responsive | Los flujos principales son usables en desktop y móvil |

No se implementó GraphQL ni cola de procesamiento. La API REST, Socket.IO y Redis cubren mejor el alcance de Qaskly para esta entrega, evitando tecnología adicional sin aporte directo.

## Arquitectura y patrones

```mermaid
flowchart LR
  Presenter[Presenter browser] --> Web[Next.js App Router]
  Audience[Audience browser] --> Web
  Web --> Auth0[Auth0 email OTP]
  Web --> API[NestJS REST API]
  Web <-->|Socket.IO| API
  API --> PG[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Auth0JWKS[Auth0 JWKS/JWT validation]

  subgraph Railway
    Web
    API
    PG
    Redis
  end
```

### Patrones de renderizado

| Patrón | Rutas o componentes | Razón |
| --- | --- | --- |
| SSG/static | `/`, `/icon.svg` | Contenido público y estable. Mejora primera carga, SEO y entrega de assets sin depender de sesión |
| SSR/RSC dinámico | `/app`, `/app/presentations`, `/app/presentations/[id]/maker`, `/results`, `/results/[sessionId]`, `/login` | Vistas protegidas o personalizadas por usuario. El token de API se obtiene server-side y nunca llega al cliente |
| Fetch cache taggeado | Listado de presentations, maker bootstrap, historical results | Reutiliza datos estables por 60 segundos y se invalida por tags/path tras create/update/delete/duplicate/start/end |
| CSR interactivo | Maker editor, presenter live controller, audience room, response forms, socket state | Requiere estado local, interacción inmediata y updates en vivo sin recargar la página |
| WebSocket realtime | Eventos live presenter y participation de audience | Propaga slide started/closed, response submitted, results updated, participants y reactions |

El cache de vistas protegidas excluye presenter live, audience room, submit responses, reactions y WebSocket state. Redis no se usa como cache de vistas protegidas; se reserva para live ephemeral state, presencia y throttling.

### Flujo realtime principal

```mermaid
sequenceDiagram
  participant P as Presenter
  participant W as Next.js Web
  participant A as NestJS API
  participant R as Redis
  participant D as PostgreSQL
  participant U as Audience

  P->>W: Start live session
  W->>A: POST /sessions/:id/start
  A->>D: Persist session status LIVE
  A->>R: Cache reconstructible live state
  A-->>P: Session state
  U->>A: join_session via Socket.IO
  A->>R: Presence update
  A-->>U: session_joined
  U->>A: submit_response
  A->>D: Persist durable response
  A-->>P: response_received + results_updated
  A-->>U: response_submitted
```

### Flujo live de slides

```mermaid
sequenceDiagram
  participant P as Presenter
  participant W as Next.js Web
  participant A as NestJS API
  participant D as PostgreSQL
  participant R as Redis
  participant U as Audience

  P->>W: Crear sala live
  W->>A: POST /presentations/:id/sessions
  A->>D: Insert LiveSession status CREATED
  A-->>P: room code + joinUrl
  U->>A: join_session { code, participantToken? }
  A->>D: Crea/reconecta Participant
  A->>R: Actualiza presencia
  A-->>U: session_joined waiting
  A-->>P: participant_joined

  P->>W: Iniciar presentacion
  W->>A: POST /sessions/:id/start
  A->>D: status LIVE
  P->>W: Abrir slide
  W->>A: POST /sessions/:id/next-slide
  A->>D: currentSlideId=slideId, responsesOpen=true
  A->>R: Cache live state reconstruible
  A-->>U: slide_started
  A-->>P: slide_started

  U->>A: submit_response { sessionId, slideId, token, value }
  A->>D: Insert Response durable
  A-->>U: response_submitted
  A-->>P: response_received + results_updated

  P->>W: Cerrar respuestas
  W->>A: POST /sessions/:id/close-slide
  A->>D: responsesOpen=false
  A-->>P: slide_closed + result
  A-->>U: slide_closed

  alt Hay siguiente slide
    P->>W: Siguiente
    W->>A: POST /sessions/:id/next-slide
    A->>D: currentSlideId=next, responsesOpen=true
    A-->>U: slide_started
    A-->>P: slide_started
  else No hay siguiente slide
    W->>A: POST /sessions/:id/next-slide o /end
    A->>D: status ENDED
    A-->>U: session_ended
    A-->>P: session_ended
  end
```

### Flujo de reacciones en waiting room

```mermaid
sequenceDiagram
  participant U as Participant browser
  participant LS as localStorage
  participant W as Next.js audience UI
  participant S as Socket.IO
  participant A as NestJS API
  participant D as PostgreSQL
  participant R as Redis
  participant P as Presenter waiting room

  U->>W: Entra por codigo/QR
  W->>A: POST /public/sessions/:code/join
  A->>D: Crea/reconecta Participant
  A-->>W: sessionId, participantId, participantToken
  W->>LS: Guarda participantToken por room code

  U->>W: Click emoji en phase waiting
  W->>S: send_reaction { sessionId, participantToken, emoji }
  S->>A: handleAudienceSendReaction
  A->>D: Valida LiveSession.status == CREATED
  A->>D: Valida participantToken contra clientTokenHash
  A->>D: Actualiza Participant.lastSeenAt
  A->>R: Consume token bucket reaction

  alt Token disponible
    R-->>A: accepted
    A-->>P: reaction_received { sessionId, participantId, emoji }
    P->>P: Agrega evento React transient max 18
    P->>P: Render overlay bottom-center en abanico
    P->>P: Elimina evento al terminar animacion
  else Burst agotado o payload invalido
    R-->>A: rejected
    A-->>U: error VALIDATION_ERROR
    P--xP: No recibe reaction_received
  end

  Note over R: Redis guarda solo throttle temporal TTL 15s
  Note over D: No existe tabla Reaction y no se crean Response ni analytics
```

## Stack

- TypeScript
- Next.js App Router
- NestJS
- PostgreSQL
- Redis
- Prisma
- Socket.IO
- Tailwind CSS
- Docker Compose
- pnpm workspaces

## Estructura

```txt
qaskly/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   └── shared/
├── docker-compose.yml
├── package.json
├── README.md
├── .gitignore
└── .env.example
```

## Setup local

### Prerrequisitos

- Node.js compatible con Prisma 7: `^22.12` o `>=24.0`.
- pnpm. Si no esta instalado, usar `corepack enable`.
- Docker y Docker Compose para levantar PostgreSQL y Redis.

### Primer arranque

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Esto levanta:

- PostgreSQL local en `localhost:5432`.
- Redis local en `localhost:6379`.
- API NestJS en `http://localhost:3001/api/v1`.
- Web Next.js en `http://localhost:3000`.

Verificaciones rapidas:

- Frontend: http://localhost:3000
- Health API: http://localhost:3001/api/v1/health
- API health esperado: `{"status":"ok","service":"qaskly-api"}`

Con el `.env` copiado tal cual desde `.env.example` puedes revisar landing,
health, build y tests. Para entrar a `/app` y probar el flujo presenter
completo necesitas configurar Auth0.

### Configuracion Auth0 para probar login local

1. Crear una Auth0 Application de tipo **Regular Web Application**.
2. Crear o habilitar una Auth0 API y usar su identifier como `AUTH0_AUDIENCE`.
3. Habilitar la connection passwordless de email y asignarla a la application.
4. Configurar la application con estos valores:

```txt
Allowed Callback URLs: http://localhost:3000/auth/callback
Allowed Logout URLs: http://localhost:3000
Allowed Web Origins: http://localhost:3000
```

5. Activar el Authentication Profile `Identifier First`.
6. Completar estas variables en `.env`:

```txt
AUTH0_DOMAIN=<tenant Auth0, por ejemplo dev-abc123.us.auth0.com>
AUTH0_CLIENT_ID=<client id de la application>
AUTH0_CLIENT_SECRET=<client secret de la application>
AUTH0_SECRET=<secreto local, por ejemplo salida de openssl rand -hex 32>
AUTH0_AUDIENCE=<identifier de la Auth0 API>
```

Despues de cambiar `.env`, reiniciar `pnpm dev`.

Comandos útiles durante desarrollo:

```bash
pnpm dev:web
pnpm dev:api
pnpm --filter @qaskly/web lint
pnpm --filter @qaskly/web build
pnpm --filter @qaskly/api lint
pnpm --filter @qaskly/api test
pnpm --filter @qaskly/shared test
```

Si la base local queda en un estado raro durante desarrollo, detener los
servicios, borrar el volumen de Postgres y repetir migraciones:

```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
```

## Variables de entorno

Las variables esperadas están documentadas en `.env.example`. En desarrollo,
los scripts de `apps/web` y `apps/api` cargan el `.env` del root con
`dotenv -e ../../.env`; Nest tambien lo carga desde `ConfigModule` con
`../../.env` como primera opcion. Los tests del API no llaman a Auth0:
el bootstrap fuerza `AUTH_TEST_BYPASS=true`, `AUTH0_DOMAIN=auth.test.local` y
`AUTH0_AUDIENCE=qaskly-api-test`.

```txt
DATABASE_URL=postgresql://qaskly:qaskly@localhost:5432/qaskly
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
PORT=3001

AUTH0_DOMAIN=your-tenant.region.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_SECRET=replace-with-32-byte-hex-session-secret
AUTH0_AUDIENCE=https://qaskly-api
APP_BASE_URL=http://localhost:3000

SESSION_CODE_LENGTH=6
SESSION_STATE_TTL_SECONDS=86400
PARTICIPANT_TOKEN_TTL_SECONDS=604800
RESPONSE_THROTTLE_TTL_SECONDS=2

NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

Auth0 local debe usar una application web con callback
`http://localhost:3000/auth/callback`, logout y web origin
`http://localhost:3000`. La connection passwordless de email debe estar
habilitada, asignada a esa application y llamarse `email`; tambien debe estar
activo el Authentication Profile `Identifier First`.

## Deploy Railway

Qaskly se despliega como monorepo compartido: los servicios web y API deben usar el root del repositorio para que `apps/*` pueda resolver `packages/shared`.

Servicios recomendados:

- API service: root directory `/`, config file path `/apps/api/railway.toml`.
- Web service: root directory `/`, config file path `/apps/web/railway.toml`.

No configures root directory como `/apps/api` o `/apps/web`, porque Railway aislaria el build y ocultaria `packages/shared`.

URLs productivas actuales:

```txt
WEB_URL=https://qaskly-front-production.up.railway.app
API_URL=https://qaskly-back-production.up.railway.app
API_HEALTH=https://qaskly-back-production.up.railway.app/api/v1/health
```

Variables del API service:

```txt
DATABASE_URL=<Railway Postgres DATABASE_URL>
REDIS_URL=<Railway Redis REDIS_URL>
FRONTEND_URL=https://qaskly-front-production.up.railway.app
AUTH0_DOMAIN=<tenant Auth0>
AUTH0_AUDIENCE=<API audience Auth0>
SESSION_CODE_LENGTH=6
SESSION_STATE_TTL_SECONDS=86400
PARTICIPANT_TOKEN_TTL_SECONDS=604800
RESPONSE_THROTTLE_TTL_SECONDS=2
```

Variables del Web service:

```txt
APP_BASE_URL=https://qaskly-front-production.up.railway.app
AUTH0_DOMAIN=<tenant Auth0>
AUTH0_CLIENT_ID=<client id Auth0>
AUTH0_CLIENT_SECRET=<client secret Auth0>
AUTH0_SECRET=<32-byte session secret>
AUTH0_AUDIENCE=<API audience Auth0>
NEXT_PUBLIC_API_URL=https://qaskly-back-production.up.railway.app
NEXT_PUBLIC_WS_URL=https://qaskly-back-production.up.railway.app
```

El API ejecuta `prisma migrate deploy` como pre-deploy command. El web escucha el `PORT` inyectado por Railway con fallback local a `3000`.

Auth0 debe permitir el origen público del frontend:

```txt
Allowed Callback URLs:
https://qaskly-front-production.up.railway.app/auth/callback

Allowed Logout URLs:
https://qaskly-front-production.up.railway.app

Allowed Web Origins:
https://qaskly-front-production.up.railway.app
```

## Comandos principales

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

## Arquitectura backend

El backend expone HTTP y Socket.IO desde NestJS bajo el limite `/api/v1`. PostgreSQL es la fuente durable para presenters, presentations, slides, live sessions, participants y responses. Redis se usa para estado efimero reconstruible: cache de session live, presencia y throttling de responses/reactions.

El flujo principal queda dividido asi:

- Presenter autenticado por Auth0 JWT administra su perfil local y solo opera resources propios.
- Presentation reusable contiene 1 a 20 slides validadas por contratos compartidos en `@qaskly/shared`.
- Al crear la primera live session, las slides de la presentation quedan congeladas; cambios de contenido posteriores requieren duplicar.
- LiveSession persiste `currentSlideId` y `responsesOpen`, por lo que audience state se reconstruye como `waiting`, `active`, `closed` o `ended`.
- Participant anonimo recibe un `participantToken`; el backend guarda solo `clientTokenHash` para permitir reconexion sin duplicar participant.
- Response es durable y unica por `sessionId`, `slideId` y `participantId`.
- Results se recalculan desde PostgreSQL; Redis no participa como cache de resultados.
- Reactions son live-only en waiting room: validan emoji permitido, session `CREATED`, token y throttle; emiten evento al presenter y no crean filas durables.

Notas realtime:

- Rooms Socket.IO: `session:{sessionId}:presenter`, `session:{sessionId}:audience` y `session:{sessionId}:all`.
- La UI presenter usa REST para lifecycle y Socket.IO para recibir eventos live.
- Los comandos presenter del gateway persisten el cambio de lifecycle antes de emitir `slide_started`, `slide_closed` o `session_ended`; se mantienen como superficie realtime equivalente cubierta por tests.
- `submit_response` emite `response_submitted` al requester y `response_received` + `results_updated` al presenter solo despues de guardar la response.
- Errores REST y websocket usan el contrato `{ code, message, details? }`; eventos rechazados solo notifican al socket solicitante.

## Prisma

El API usa Prisma 7 con `prisma-client`, `prisma.config.ts` y adapter PostgreSQL (`@prisma/adapter-pg`). El schema durable vive en `apps/api/prisma/schema.prisma`; el cliente generado vive en `apps/api/src/generated/prisma` y se refresca con:

```bash
pnpm db:generate
```

Despues de modificar el schema Prisma, ejecuta `pnpm db:generate` y commitea el cliente generado junto con el cambio de schema.

## Flujo TDD backend

Las tareas backend se implementan con tests request-level antes del codigo de produccion. Para el API, el comando principal es:

```bash
pnpm --filter @qaskly/api test
```

Los tests levantan una app Nest en memoria con prefijo `/api/v1`, `ValidationPipe` global y helpers controlados de autenticacion de presenter. Requieren `DATABASE_URL` apuntando a una base de test o desarrollo descartable; el helper de test limpia las tablas persistentes antes de cada suite.

## API presenter authoring

Base path backend: `/api/v1`.

Perfil autenticado:

- `GET /me`: retorna el presenter actual y sincroniza su perfil local.
- `PATCH /me`: actualiza `name`, `profession`, `birthday` y `usagePurpose`.
- `DELETE /me`: elimina el perfil local del presenter autenticado.

Presentations:

- `POST /presentations`: crea una presentation del presenter actual.
- `GET /presentations?page=1&pageSize=20`: lista solo presentations propias.
- `GET /presentations/:id`: retorna una presentation propia con slides ordenadas.
- `PATCH /presentations/:id`: actualiza `title`, `description`, `themeKey` y `status`.
- `DELETE /presentations/:id`: elimina una presentation propia.
- `POST /presentations/:id/duplicate`: crea una copia editable con slides copiadas.

Slides:

- `POST /presentations/:id/slides`: crea una slide propia y valida `config` segun `type`.
- `PATCH /slides/:id`: actualiza `title`, `prompt`, `position`, `type` o `config`.
- `DELETE /slides/:id`: elimina una slide propia y compacta posiciones.
- `PATCH /presentations/:id/slides/reorder`: reordena todas las slides de una presentation propia.

Presenter authoring exige autenticacion, aplica ownership en cada operacion y responde errores como `{ code, message, details? }`.

## API live sessions

Presenter live sessions usan el mismo base path `/api/v1` y exigen presenter autenticado propietario de la presentation o session.

REST:

- `POST /presentations/:id/sessions`: crea una live session en estado `CREATED`, genera `code` unico de 6 caracteres y `joinUrl` derivada para QR.
- `GET /sessions/:id`: retorna estado propio de session, `currentState`, slide activa y flags de respuesta.
- `POST /sessions/:id/start`: marca la session como `LIVE` en estado audience `waiting`.
- `POST /sessions/:id/start-slide`: body `{ "slideId": "..." }`; activa una slide de la presentation y abre respuestas.
- `POST /sessions/:id/close-slide`: body opcional `{ "slideId": "..." }`; cierra respuestas de la slide activa.
- `POST /sessions/:id/next-slide`: avanza a la siguiente slide y abre respuestas; si no hay siguiente slide, termina como `COMPLETED`.
- `POST /sessions/:id/end`: body opcional `{ "reason": "COMPLETED" | "MANUAL" | "ERROR" }`; termina en `ENDED` si esta en la ultima slide, o `INCOMPLETE` si se corta antes.

WebSocket presenter commands backend:

- `join_presenter_session`: payload `{ sessionId }`; autoriza owner y une el socket a `session:{sessionId}:presenter`.
- `start_slide`: payload `{ sessionId, slideId }`; persiste slide activa y emite `slide_started` a presenter y audience.
- `close_slide`: payload `{ sessionId, slideId }`; persiste cierre y emite `slide_closed`.
- `next_slide`: payload `{ sessionId }`; persiste avance y emite `slide_started`, o `session_ended` si no hay siguiente slide.
- `end_session`: payload `{ sessionId, reason? }`; persiste cierre y emite `session_ended`.

Errores REST y WebSocket usan `{ code, message, details? }`. El estado live cacheado en Redis es reconstruible desde PostgreSQL.

## API audience participation

Public audience routes no exigen autenticacion y usan room code bajo `/api/v1`.

REST:

- `GET /public/sessions/:code`: retorna estado publico de la session como `waiting`, `active`, `closed` o `ended`, incluyendo la slide activa cuando existe.
- `POST /public/sessions/:code/join`: body opcional `{ "participantToken": "...", "displayName": "..." }`; crea participante anonimo o reconecta el mismo participante con token persistido en cliente.
- `POST /public/sessions/:code/responses`: body `{ "participantToken": "...", "slideId": "...", "value": { ... } }`; valida `value` contra el contrato shared del `SlideType` activo y guarda una sola response por participante/slide.
- `POST /public/sessions/:code/reactions`: body `{ "participantToken": "...", "emoji": "👍" }`; acepta solo `👍`, `❤️`, `😂`, `😮` o `👏` mientras la session esta en waiting room pre-start (`CREATED`) y retorna `{ sessionId, participantId, emoji }`.

Participant tokens se entregan al cliente una vez y solo se guarda `clientTokenHash` en PostgreSQL. Session terminada o incompleta no acepta join ni responses nuevas; `GET` publico puede seguir devolviendo estado `ended`.

Response submit rechaza:

- room code invalido o session no live: `INVALID_ROOM_CODE`.
- slide no activa o distinta a la actual: `INACTIVE_SLIDE`.
- slide cerrada: `CLOSED_SLIDE`.
- payload incompatible con el slide type: `INVALID_RESPONSE_PAYLOAD`.
- segunda response del mismo participante en la misma slide: `DUPLICATE_RESPONSE`.
- submits repetidos demasiado rapidos: `VALIDATION_ERROR`.

Reactions son efectos live-only para el presenter waiting room. No crean filas durables, no usan tabla Prisma, no modifican `Response` y no cambian resultados. Redis se usa solo como token bucket por participante/session: permite un burst de 15 reacciones aceptadas, recarga 1 token cada 500ms y mantiene la llave temporal con TTL de 15 segundos. Reacciones sobre el burst responden `VALIDATION_ERROR` solo al requester.

WebSocket audience commands:

- `join_session`: payload `{ code, participantToken?, displayName? }`; une el socket a `session:{sessionId}:audience` y `session:{sessionId}:all`, responde `session_joined` y notifica `participant_joined` al presenter room.
- `leave_session`: payload `{ sessionId, participantId, participantToken }`; valida el token, saca el socket de los rooms audience/all, actualiza presencia activa y notifica `participant_left` al presenter room.
- `submit_response`: payload `{ sessionId, slideId, participantToken, value }`; persiste la response, responde `response_submitted` al socket solicitante y emite `response_received` + `results_updated` al presenter room solo si la response fue aceptada.
- `send_reaction`: payload `{ sessionId, participantToken, emoji }`; valida token, session `CREATED`, allowed emoji y throttle; emite `reaction_received` al presenter room solo si la reaction fue aceptada.

WebSocket presenter reaction event:

- `reaction_received`: `{ sessionId, emoji, participantId? }`.

Rejected invalid, non-waiting, forged-token or throttled reactions only emit `error` to the requester; `reaction_received` is not emitted.

## API results

Results usan respuestas durables como fuente de verdad. El API recalcula agregados desde PostgreSQL para evitar cache stale; Redis queda para estado live, presencia y throttling donde aporta valor claro.

REST owner-only:

- `GET /presentations/:id/sessions`: lista sesiones historicas propias de una presentation con metricas para tabla.
- `GET /sessions/:id/results`: retorna resultados de todas las slides de una session propia, live o historica.
- `GET /sessions/:id/slides/:slideId/results`: retorna el agregado de una slide propia, live o historica.

Shape de result log:

```json
{
  "sessionId": "...",
  "presentationId": "...",
  "participantCount": 12,
  "responseCount": 24,
  "startedAt": "2026-06-18T12:00:00.000Z",
  "endedAt": "2026-06-18T12:15:00.000Z",
  "completionState": "completed",
  "engagementRate": 80
}
```

Shape de session:

```json
{
  "sessionId": "...",
  "presentationId": "...",
  "status": "LIVE",
  "slides": [
    {
      "slideId": "...",
      "position": 1,
      "type": "MULTIPLE_CHOICE",
      "result": { "type": "MULTIPLE_CHOICE", "totalResponses": 1 }
    }
  ]
}
```

Shapes por slide type:

- Multiple choice: `{ type, totalResponses, options: [{ id, label, count, percentage }] }`.
- Word cloud: `{ type, totalResponses, totalWords, words: [{ text, count }] }`.
- Open ended: `{ type, totalResponses, responses: [{ id, participantId, text, createdAt }] }`.
- Scales: `{ type, totalResponses, average, distribution: [{ value, count }] }`.
- Ranking: `{ type, totalResponses, items: [{ id, label, averageRank, rankCounts: [{ rank, count }] }] }`.
- Guess the number: `{ type, totalResponses, averageGuess, correctValue, guesses: [{ value, count, isCorrect }] }`.
- 2x2: `{ type, totalResponses, averageX, averageY, points: [{ responseId, participantId, x, y }] }`.

WebSocket presenter events:

- `response_received`: `{ sessionId, slideId, responseId }`.
- `results_updated`: `{ sessionId, slideId, results }`.

Rejected duplicate, invalid, inactive, closed, or throttled responses only emit an error to the requester; presenter result events are not emitted.

## Protected view cache

Las vistas protegidas del presenter reutilizan datos estables por 60 segundos en el limite web de Next.js, usando `fetch` taggeado y refresh explicito despues de mutaciones. La autenticacion sigue siendo server-side: `getApiAccessToken()` se llama solo en server components o server actions, y las respuestas siguen pasando por endpoints owner-only del API.

Vistas incluidas:

- `/app`
- `/app/presentations`
- `/app/presentations/[presentationId]/maker`
- `/app/presentations/[presentationId]/results`
- `/app/presentations/[presentationId]/results/[sessionId]`

Grupos de frescura:

- `presenter-home`: landing protegida del presenter.
- `presentations-list`: listado y paginacion de presentations.
- `presentation-detail:{presentationId}`: bootstrap de maker, slides y estado read-only.
- `presentation-results:{presentationId}`: tabla historica de sessions.
- `session-results:{sessionId}`: detalle historico de una session.

Refresh despues de acciones:

- Create presentation: `presenter-home`, `presentations-list`.
- Update metadata: `presentations-list`, `presentation-detail:{presentationId}`.
- Delete presentation: `presenter-home`, `presentations-list`, `presentation-detail:{presentationId}`, `presentation-results:{presentationId}`.
- Duplicate presentation: `presenter-home`, `presentations-list`, `presentation-detail:{newPresentationId}`.
- Create/update/delete slides: `presentation-detail:{presentationId}`.
- Create/start first live session: `presentations-list`, `presentation-detail:{presentationId}`.
- End session: `presentation-results:{presentationId}`, `session-results:{sessionId}`.

Quedan excluidos del cache de vistas protegidas: presenter live route, audience room, submit responses, reactions y WebSocket state. Redis no se usa para este cache; queda limitado a estado live efimero, presencia y throttling.

## Regla MVP para edicion despues de presentar

Una presentation puede ejecutarse multiples veces, pero su contenido queda congelado desde que se crea su primera live session. Despues de eso no se pueden crear, editar, borrar ni reordenar slides. La metadata segura, como titulo o tema, puede ajustarse; para cambiar preguntas o configuraciones, duplica la presentation y edita la copia antes de presentarla.

## Smoke validation backend

Estos scenarios resumen el quickstart academico y pueden correrse con el API local, Postgres y Redis disponibles.

Preparacion:

```bash
pnpm install
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Validacion automatizada recomendada:

```bash
pnpm --filter @qaskly/api lint
pnpm --filter @qaskly/api test
pnpm --filter @qaskly/shared test
pnpm lint
pnpm build
```

Smoke checks:

- Migracion: `pnpm db:migrate` debe aplicar desde una base vacia o responder que no hay migraciones pendientes.
- API health: `curl http://localhost:3001/api/v1/health` debe responder `{"status":"ok","service":"qaskly-api"}`.
- Presenter authoring: crear una presentation con theme valido, agregar multiple choice, word cloud y scales, recargar, y confirmar orden persistido; configs invalidas y slide 21 deben rechazarse.
- Owner denial: autenticar otro presenter e intentar leer, mutar, duplicar, iniciar session o leer results ajenos; debe volver error `{ code, message, details? }` sin filtrar datos.
- Live session: owner crea session, inicia, abre slide, cierra responses, avanza y termina; audience recibe `waiting`, `active`, `closed` y `ended` segun lifecycle.
- Public join/reconnect: participant entra por room code, recibe `participantToken`, recarga y reusa el token; debe conservar el mismo participant.
- Duplicate response: enviar dos responses para la misma slide con el mismo token; la segunda debe devolver `DUPLICATE_RESPONSE`.
- Closed slide: cerrar responses y luego enviar response; debe devolver `CLOSED_SLIDE`.
- Results: enviar responses desde varios participants, observar `results_updated`, terminar session y consultar historical results como owner; non-owner debe ser denegado.
- Reactions: enviar `👍`, `❤️`, `😂`, `😮` y `👏` en waiting room antes de iniciar slides; un burst de 15 debe pasar, luego debe aplicar throttle con refill de 500ms y devolver `VALIDATION_ERROR` solo al requester cuando se excede.

Cobertura automatizada actual:

- Request tests cubren presenter profile, presentation CRUD/duplicate/freeze, slide CRUD/reorder, session lifecycle, participant join/reconnect, responses, results y reactions.
- Websocket tests cubren presenter lifecycle events, audience join/leave/submit, result updates y reaction events.
- Unit tests cubren aggregation de results para los 7 slide types.

## Smoke validation frontend

Comandos de cierre:

```bash
pnpm --filter @qaskly/web lint
pnpm --filter @qaskly/web build
pnpm lint
pnpm build
```

Smoke checks principales:

- Landing: abrir `/` en mobile, confirmar hero/CTA/FAQ y navegar a `/login`.
- Auth: completar email OTP y confirmar entrada a `/app`; signed-out debe ser redirigido al intentar abrir rutas protegidas.
- App shell: navegar home y presentations en mobile/tablet/desktop; `Configuración` queda visible pero disabled por decision MVP.
- Presentations: validar empty state, grid de hasta 8 cards por pagina, paginacion y apertura al maker.
- Maker: crear/editar multiple choice, open ended, word cloud, scales, ranking, guess the number y 2x2; guardar cambios; verificar preview, thumbnails, labels y estados de error.
- Published maker: tras crear una live session, maker queda read-only; `Duplicar y editar` debe crear una copia y redirigir al maker de la copia.
- Theme: boton `Tema` permite elegir el tema visual de la presentation cuando el maker esta editable.
- Live: presenter y dos participants completan dos slides; presenter ve participants/result updates sin reload; audience ve waiting, answering, submitted/closed y thank-you.
- Results: abrir tabla historica, entrar a detail, confirmar summary cards y visualizaciones por slide; no debe existir accion de eliminar result logs.

Alcance diferido:

- Settings profile y danger zone quedan fuera del cierre actual. El item de sidebar se mantiene disabled para no exponer una ruta incompleta.
- El cache de vistas protegidas ya cubre `/app`, `/app/presentations`, bootstrap de maker e historical results con refresh explicito. Live presenter/audience sigue fuera de ese cache para preservar interaccion realtime.

## Resumen de arquitectura actual

- Next.js App Router sirve la experiencia del presenter y la audiencia.
- NestJS expone API REST y gateway Socket.IO.
- PostgreSQL es la persistencia durable principal.
- Redis guarda estado live reconstruible, presencia y throttling; no almacena resultados durables ni cache de vistas protegidas.
- Socket.IO sostiene las interacciones en tiempo real entre presenter y audience.
- Railway despliega frontend, backend, Postgres y Redis como servicios productivos.

## Declaración de uso de IA

Durante el desarrollo se usaron herramientas de asistencia de IA como apoyo de ingeniería, no como reemplazo de revisión humana. El equipo mantuvo responsabilidad sobre decisiones, validaciones, commits y pruebas.

Uso declarado:

- Modelos de la familia GPT-5/5.5 con effort medium, high y xhigh según complejidad: planificación de PRD/specs, análisis de arquitectura, debugging, generación de checklists, revisión de gaps, asistencia en tests y scaffolding de código estándar.
- Claude Sonnet en effort high y Claude Opus en effort high, en sus versiones disponibles al equipo, como apoyo para componentes UI, flujos UX, textos de interfaz, revisión de experiencia responsive y alternativas de diseño.
- Las salidas de IA se usaron como guías y orientación para los PRD/specs creados por desarrolladores, propuestas de implementación, depuración y documentación.
- Todo cambio relevante fue revisado contra el código existente, ejecutado en el entorno local y validado con comandos de lint, build o tests cuando correspondía.
- No se incorporaron fragmentos externos sin revisión; las decisiones finales de producto, arquitectura, seguridad y alcance fueron tomadas por el equipo desarrollador.
