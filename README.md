# IrriGo - Sistema Inteligente de Riego Agricola

IrriGo es una aplicacion web para monitorear, administrar y analizar predios agricolas. Permite registrar usuarios, crear predios, compartir acceso mediante codigos, gestionar areas de riego, consultar sensores, revisar alertas, generar reportes y visualizar informacion en un mapa.

El sistema esta pensado para dos roles principales:

- Administrador: crea y administra predios, areas, configuraciones de cultivo y codigos de acceso.
- Lector: se une a un predio mediante codigo y puede consultar informacion sin modificar parametros criticos.

## Tecnologias

### Backend

- Python 3
- Flask
- Flask-CORS
- mysql-connector-python
- Werkzeug para hashing de contrasenas
- PyJWT, si esta instalado, para tokens JWT
- itsdangerous como fallback de tokens
- Open-Meteo API para datos climaticos

### Frontend

- React 19
- Vite 7
- TailwindCSS 4
- Heroicons
- Leaflet y React-Leaflet
- jsPDF y jspdf-autotable
- SheetJS/xlsx

### Base de datos

- MySQL 8
- Docker Compose opcional para levantar MySQL local

## Estructura principal

```text
.
├── main.py                         # API Flask
├── IrriGo.sql                      # Esquema MySQL y datos semilla
├── Guide.yaml                      # Documentacion OpenAPI
├── GUIA_CONFIGURACION.txt          # Guia rapida de configuracion
├── docker-compose.yml              # MySQL en Docker
├── Pruebas_Unitarias/              # Pruebas unitarias del backend
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                 # Estado global, auth y navegacion
        ├── config.js               # API_BASE_URL
        └── components/             # Vistas principales
```

## Instalacion

### 1. Levantar MySQL

Con Docker:

```bash
docker compose up -d
```

El contenedor se llama `irrigo_mysql` y expone MySQL en el puerto `3306`.

Si la base ya existia de una version anterior, puedes cargar el esquema manualmente:

```bash
docker exec -i irrigo_mysql mysql -u root < IrriGo.sql
```

Nota: `IrriGo.sql` elimina y recrea la base `IrriGo`, por lo que reinicia los datos.

### 2. Instalar dependencias del backend

```bash
pip install flask flask-cors mysql-connector-python werkzeug pyjwt
```

### 3. Ejecutar backend

```bash
python main.py
```

El backend corre por defecto en:
(si no se esta corriendo en localhost usar el link de github en publico y cambiarlo en config.js)

```text
http://localhost:3000
```

La API usa el prefijo:

```text
http://localhost:3000/api/v1
```

### 4. Instalar y ejecutar frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend normalmente queda en:

```text
http://localhost:5173
```

## Configuracion

El backend toma estas variables de entorno, con valores por defecto:

| Variable | Valor por defecto | Uso |
|---|---|---|
| `DB_HOST` | `localhost` | Host de MySQL |
| `DB_USER` | `root` | Usuario MySQL |
| `DB_PASSWORD` | vacio | Password MySQL |
| `DB_NAME` | `IrriGo` | Base de datos |
| `DB_PORT` | `3306` | Puerto MySQL |
| `JWT_SECRET_KEY` | `irrigo-dev-secret-change-in-prod` | Firma de tokens |
| `IRRIGO_AUTO_MIGRATE_ON_START` | `true` | Migra columnas faltantes al arrancar |
| `IRRIGO_BOOTSTRAP_ADMIN_ON_START` | `true` | Asegura password del admin semilla |
| `IRRIGO_ADMIN_EMAIL` | `admin@irrigo.com` | Email admin semilla |
| `IRRIGO_ADMIN_PASSWORD` | `Admin123!` | Password admin semilla |

El frontend apunta al backend desde:

```js
// frontend/src/config.js
export const API_BASE_URL = 'http://localhost:3000/api/v1';
```

## Credenciales semilla

| Rol | Email | Contrasena |
|---|---|---|
| Administrador | `admin@irrigo.com` | `Admin123!` |
| Lector | `ejemplo@cinco.com` | `ejemplo123!` |

(si Lector no funciona crear una cuenta de lector y agregar el codigo de acceso de AdminIrriGo)

## Flujo de uso

1. El usuario inicia sesion o crea una cuenta.
2. Si es una cuenta nueva, entra a onboarding.
3. En onboarding puede crear un predio propio o unirse a uno existente con codigo.
4. Si crea un predio, queda como administrador de ese predio.
5. Si se une por codigo, queda como lector.
6. La app carga el predio activo y filtra dashboards, areas, sensores, mapa, alertas y reportes por ese predio.

## Funcionalidades principales

### Autenticacion

- Registro con validacion de contrasena segura.
- Login con contrasenas hasheadas.
- Tokens de sesion.
- Endpoint `/auth/me` para restaurar sesion.

### Predios

- Cada predio tiene `CodigoAcceso` unico de 8 caracteres.
- El administrador puede compartir ese codigo con lectores.
- La creacion de predio y asignacion de admin se hace en una transaccion.
- La pantalla de Parametros muestra predios administrados y predios de solo lectura.
- En la UI se permite editar y regenerar codigo solo en predios administrados.
- El boton de borrar predios fue retirado de la UI para evitar eliminaciones peligrosas durante pruebas y presentacion.

### Areas de riego

- Cada area pertenece a un predio.
- Solo administradores pueden crear, editar o eliminar areas.
- Las areas alimentan dashboards, reportes, alertas y mapa.

### Sensores

- Los sensores pueden estar asociados a areas y modulos de control.
- Se consultan filtrados por predio activo.

### Configuracion de cultivo

- Define parametros agronomicos por area:
  - Tipo de cultivo
  - Tipo de tierra
  - Capacidad de campo
  - Punto de marchitez
  - Rango minimo y maximo de humedad
  - Lamina de riego

### Mediciones historicas

- Guardan informacion de suelo, ambiente, consumo de agua y desarrollo vegetativo.
- Se usan para dashboard, detalle de parcela y reportes.

### Alertas

- Se generan comparando humedad contra rangos de configuracion.
- Lectores pueden marcar alertas como leidas.
- Administradores pueden confirmar alertas.

### Reportes

- Filtros por fechas y areas.
- Exportacion a PDF con jsPDF.
- Exportacion a Excel con xlsx.

### Mapa

- Usa Leaflet para mostrar predios, sensores y areas.
- Filtra la informacion por predio activo.

### Perfil

- Permite consultar y editar datos personales.
- Muestra predios administrados y predios compartidos.
- Permite crear predios o solicitar acceso desde el perfil.
- Incluye opcion de paletas para accesibilidad visual.

## Modelo de datos resumido

```text
Usuario
  └── Usuario_predio
        └── Predio
              └── AreaRiego
                    ├── Sensor
                    ├── ConfiguracionCultivo
                    ├── MedicionHistorica
                    └── Alerta

ModuloControl
  └── Sensor

RegistroAuditoria
  ├── Usuario
  └── AreaRiego
```

## Endpoints principales

| Recurso | Endpoints |
|---|---|
| Auth | `POST /usuarios/login`, `GET /auth/me`, `POST /registro` |
| Predios | `GET/POST /predios`, `GET/PUT/DELETE /predios/:id`, `POST /predios/:id/regenerar-codigo` |
| Onboarding | `POST /predios/onboarding/crear`, `POST /predios/onboarding/solicitar-acceso` |
| Usuarios-Predios | `GET/POST /usuarios-predios`, `GET/PUT/DELETE /usuarios-predios/:idUsuario/:idPredio` |
| Areas | `GET/POST /areas-riego`, `GET/PUT/DELETE /areas-riego/:id` |
| Sensores | `GET/POST /sensores`, `GET/PUT/DELETE /sensores/:id` |
| Configuraciones | `GET/POST /configuraciones-cultivo`, `GET/PUT/DELETE /configuraciones-cultivo/:id` |
| Mediciones | `GET/POST /mediciones-historicas`, endpoints de historial y NDVI |
| Alertas | `GET/POST /alertas`, `PUT /alertas/:id`, `GET /alertas/verificar/:idArea` |
| Clima | `POST /clima/sincronizar/:idArea`, `GET /clima/ultimo/:idArea` |

## Pruebas y verificacion

Backend:

```bash
python -m py_compile main.py
pytest -q
```

Frontend:

```bash
cd frontend
npm run build
```

Nota: algunas pruebas unitarias antiguas pueden fallar con `401` porque fueron escritas antes de proteger rutas de edicion con JWT. El comportamiento actual de la API exige token en esas rutas.

## Solucion de problemas

### Error interno al crear predio

Revisa que la base tenga las columnas nuevas:

- `Predio.CodigoAcceso`
- `Usuario_predio.Admin`
- `Usuario_predio.Fecha_Asignacion`

El backend incluye migracion automatica al arrancar (`IRRIGO_AUTO_MIGRATE_ON_START=true`), pero si la base esta muy desfasada puedes recrearla con:

```bash
docker exec -i irrigo_mysql mysql -u root < IrriGo.sql
```

### No conecta el frontend

Verifica `frontend/src/config.js` y confirma que apunte a:

```text
http://localhost:3000/api/v1
```

### Login falla con usuarios viejos

Las contrasenas deben estar hasheadas con Werkzeug. Si hay usuarios antiguos en texto plano, no podran iniciar sesion.

