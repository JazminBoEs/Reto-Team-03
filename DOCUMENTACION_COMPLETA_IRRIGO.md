# Documentacion completa de IrriGo

Este documento explica IrriGo como si se lo contaramos a una persona que nunca ha visto el proyecto. Sirve para estudiar, preparar una presentacion o darle contexto completo a otro chat.

## 1. Que es IrriGo

IrriGo es un sistema web de riego agricola inteligente. Su objetivo es centralizar informacion de predios, areas de riego, sensores, clima, alertas y reportes para ayudar a tomar mejores decisiones sobre el uso del agua.

El sistema permite:

- Registrar usuarios.
- Iniciar sesion de forma segura.
- Crear predios agricolas.
- Compartir acceso a predios mediante codigos.
- Diferenciar administradores y lectores.
- Gestionar areas de riego.
- Consultar sensores.
- Ver mediciones historicas.
- Recibir alertas por condiciones de humedad.
- Exportar reportes.
- Visualizar informacion en un mapa.

La idea principal es que un administrador controla la configuracion del predio y un lector puede consultar informacion sin modificar parametros importantes.

## 2. Resumen tecnico

IrriGo tiene tres capas principales:

```text
Frontend React
    |
    | HTTP / JSON
    v
Backend Flask
    |
    | SQL
    v
Base de datos MySQL
```

El frontend corre con Vite y React. El backend corre con Flask en Python. La base de datos es MySQL y puede levantarse con Docker.

## 3. Tecnologias y librerias usadas

### Backend

| Libreria | Uso |
|---|---|
| `Flask` | Crear la API REST |
| `flask-cors` | Permitir peticiones desde el frontend |
| `mysql-connector-python` | Conexion con MySQL |
| `werkzeug.security` | Hashear y verificar contrasenas |
| `PyJWT` | Generar y validar tokens JWT si esta instalado |
| `itsdangerous` | Fallback para tokens si PyJWT no esta instalado |
| `urllib.request` | Consultar Open-Meteo sin dependencia extra |
| `decimal.Decimal` | Manejo seguro de coordenadas |
| `threading` | Insercion periodica de mediciones climaticas |

### Frontend

| Libreria | Uso |
|---|---|
| `react` | Construccion de componentes |
| `react-dom` | Render de React en navegador |
| `vite` | Servidor dev y build |
| `tailwindcss` | Estilos y utilidades CSS |
| `@heroicons/react` | Iconos de interfaz |
| `leaflet` | Mapa interactivo |
| `react-leaflet` | Integracion Leaflet + React |
| `jspdf` | Generacion de reportes PDF |
| `jspdf-autotable` | Tablas dentro del PDF |
| `xlsx` | Exportacion a Excel |

### Base de datos

- MySQL 8.0.
- Docker Compose puede levantar el contenedor `irrigo_mysql`.
- El archivo `IrriGo.sql` crea la base, tablas, llaves foraneas y datos semilla.

## 4. Archivos importantes

```text
main.py
```

Contiene la API Flask completa. Aqui estan los endpoints, autenticacion, funciones de base de datos, migracion defensiva, clima y tareas periodicas.

```text
IrriGo.sql
```

Script SQL que crea la base `IrriGo`, todas las tablas y datos iniciales.

```text
Guide.yaml
```

Documento OpenAPI/Swagger con la especificacion de la API.

```text
frontend/src/App.jsx
```

Componente principal del frontend. Maneja sesion, token, usuario actual, predio activo, rol activo y navegacion.

```text
frontend/src/config.js
```

Define `API_BASE_URL`, la URL base del backend.

```text
frontend/src/components/
```

Carpeta con las pantallas principales:

- `Login.jsx`
- `Registro.jsx`
- `Onboarding.jsx`
- `Sidebar.jsx`
- `Dashboard.jsx`
- `AreasRiego.jsx`
- `DetalleParcela.jsx`
- `MapaDePredio.jsx`
- `Alertas.jsx`
- `Reportes.jsx`
- `Parametros.jsx`
- `Perfil.jsx`
- `CambioPasswordObligatorio.jsx`
- `UseClima.js`

## 5. Como arranca el sistema

### Base de datos

Con Docker:

```bash
docker compose up -d
```

El contenedor usa MySQL 8.0, crea la base `IrriGo` y monta `IrriGo.sql` como script inicial.

Importante: si Docker ya tenia un volumen/base anterior, puede que no vuelva a ejecutar el SQL inicial. Para forzar el esquema:

```bash
docker exec -i irrigo_mysql mysql -u root < IrriGo.sql
```

### Backend

```bash
python main.py
```

Al iniciar, el backend:

1. Configura Flask y CORS.
2. Prepara serializacion JSON para fechas y decimales.
3. Lee variables de entorno.
4. Verifica/migra columnas criticas si `IRRIGO_AUTO_MIGRATE_ON_START` esta activo.
5. Asegura credenciales del usuario admin semilla si `IRRIGO_BOOTSTRAP_ADMIN_ON_START` esta activo.
6. Inicia un hilo de insercion periodica de mediciones climaticas.
7. Expone la API en `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm run dev
```

Vite inicia la app, normalmente en `http://localhost:5173`.

## 6. Autenticacion

El login esta en:

```text
POST /api/v1/usuarios/login
```

El backend:

1. Busca el usuario por email.
2. Verifica la contrasena con `check_password_hash`.
3. Carga los predios asociados al usuario.
4. Genera un token.
5. Devuelve token, usuario y estado de cambio de contrasena.

El token se guarda en `localStorage` como:

```text
irrigo_token
```

El usuario tambien se guarda en:

```text
irrigo_usuario
```

El helper `authHeaders()` en `App.jsx` arma los headers con:

```js
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

Para restaurar sesion se usa:

```text
GET /api/v1/auth/me
```

## 7. Registro y onboarding

El registro inicial crea el usuario pero no lo asigna aun a un predio.

Despues del registro, el usuario entra a `Onboarding.jsx`, donde puede:

1. Crear un predio propio.
2. Solicitar acceso a un predio existente con codigo.

### Crear predio propio

Endpoint:

```text
POST /api/v1/predios/onboarding/crear
```

Flujo:

1. El usuario manda nombre, ubicacion y coordenadas opcionales.
2. El backend valida el nombre.
3. Valida latitud y longitud si existen.
4. Genera un `CodigoAcceso` unico.
5. Inserta el predio.
6. Inserta la relacion `Usuario_predio` con `Admin = true`.
7. Todo se hace en una transaccion para evitar datos a medias.

### Solicitar acceso

Endpoint:

```text
POST /api/v1/predios/onboarding/solicitar-acceso
```

Flujo:

1. El usuario ingresa un codigo de 8 caracteres.
2. El backend busca el predio por `CodigoAcceso`.
3. Si existe, crea la relacion `Usuario_predio` con `Admin = false`.
4. El usuario queda como lector.

## 8. Roles

Los roles no estan como una columna global en `Usuario`. El rol depende del predio.

La tabla clave es:

```text
Usuario_predio
```

Campos importantes:

- `IDusuario`
- `IDpredio`
- `Admin`
- `Fecha_Asignacion`

Esto significa que un usuario puede ser:

- Admin en un predio.
- Lector en otro predio.
- Admin en varios predios.
- Lector en varios predios.

El frontend calcula el rol activo segun el predio seleccionado.

## 9. Predio activo

La app trabaja alrededor de un predio activo.

En `App.jsx` existe:

```text
predioActualId
```

Ese valor determina que datos se cargan:

- Dashboard
- Areas
- Sensores
- Mapa
- Alertas
- Reportes
- Parametros

Tambien se guarda en `localStorage`:

```text
irrigo_predio_actual
```

Si el usuario recarga la pagina, la app intenta restaurar el mismo predio. Si ya no existe o el usuario no tiene acceso, usa el primer predio disponible.

## 10. Predios en Parametros

La seccion `Parametros.jsx` permite gestionar configuraciones del sistema.

En la pestaña de predios:

- Se listan los predios a los que el usuario tiene acceso.
- Si el usuario es admin de un predio, puede editarlo y regenerar codigo.
- Si el usuario solo tiene lectura, se muestra como "Solo lectura".
- El boton de borrar predio fue retirado de la interfaz para evitar eliminaciones accidentales y problemas de integridad durante la presentacion.

Aunque el backend aun tiene endpoint `DELETE /predios/:id`, la UI ya no lo expone.

## 11. Base de datos

### Usuario

Guarda datos de usuario:

- Nombre
- Apellido
- Email
- Contrasena hasheada
- Telefono
- Fecha de creacion
- RequiereCambioPassword

### Predio

Representa una propiedad agricola:

- IDpredio
- CodigoAcceso
- NombrePredio
- Ubicacion
- Latitud
- Longitud
- FechaCreacion

### Usuario_predio

Relacion muchos a muchos entre usuarios y predios:

- IDusuario
- IDpredio
- Admin
- Fecha_Asignacion

### AreaRiego

Areas o parcelas dentro de un predio:

- ID_Area
- IDpredio
- ID_Modulo
- Nombre
- Num_Hectareas
- Estado

### Sensor

Dispositivos de medicion:

- IDsensor
- ID_Modulo
- ID_Area
- Latitud
- Longitud
- Bateria
- Senal

### ConfiguracionCultivo

Parametros agronomicos por area:

- TipoCultivo
- TipoTierra
- CapacidadCampo
- PuntoMarchitez
- RangoHumedadMIN
- RangoHumedadMAX
- LaminaRiego

### MedicionHistorica

Historial de datos:

- Temperatura del suelo
- Humedad del suelo
- Evapotranspiracion
- Conductividad
- Consumo de agua
- Desarrollo vegetativo
- Datos ambientales
- Consumo acumulado

### Alerta

Notificaciones generadas por condiciones importantes:

- ID_area
- IDusuario
- Fecha
- Tipo
- Severidad
- Mensaje
- Leida
- Confirmada_Admin

### RegistroAuditoria

Bitacora de cambios:

- Usuario
- Area
- Fecha
- Dato modificado

## 12. Relaciones importantes

```text
Usuario -- Usuario_predio -- Predio
Predio -- AreaRiego
AreaRiego -- Sensor
AreaRiego -- ConfiguracionCultivo
AreaRiego -- MedicionHistorica
AreaRiego -- Alerta
ModuloControl -- Sensor
Usuario -- RegistroAuditoria
AreaRiego -- RegistroAuditoria
```

La relacion mas importante para explicar el sistema es:

```text
Usuario_predio define permisos por predio.
```

## 13. Dashboard

El dashboard resume informacion del predio activo.

Carga:

- Mediciones historicas.
- Areas de riego.
- Alertas.
- Clima.

Muestra indicadores como:

- Humedad promedio.
- NDVI/desarrollo vegetativo.
- Consumo acumulado.
- Alertas.
- Estado climatico.

## 14. Areas de riego

La pantalla de areas muestra las parcelas del predio activo.

Cada area se puede abrir para ver detalle.

En el detalle se combinan:

- Datos del area.
- Configuracion de cultivo.
- Mediciones.
- Historial de humedad.
- Historial NDVI.
- Estado del suelo.
- Estado ambiental.
- Informacion de riego.

## 15. Alertas

Las alertas se basan principalmente en humedad del suelo comparada contra los rangos de configuracion.

Endpoint de verificacion:

```text
GET /api/v1/alertas/verificar/:idArea
```

Ejemplo:

- Si la humedad esta por debajo del minimo, crea alerta de baja humedad.
- Si la humedad esta por encima del maximo, crea alerta de alta humedad.

El flujo de confirmacion tiene dos niveles:

- Lector marca como leida.
- Admin confirma.

## 16. Reportes

La pantalla de reportes permite filtrar mediciones y exportarlas.

Librerias:

- `jsPDF` para crear PDF.
- `jspdf-autotable` para tablas en PDF.
- `xlsx` para Excel.

Los reportes usan mediciones historicas del predio activo.

## 17. Mapa

La pantalla de mapa usa Leaflet.

Muestra:

- Predios.
- Sensores.
- Areas.

Los marcadores dependen de latitud y longitud. Si un predio o sensor no tiene coordenadas, puede no aparecer en el mapa.

## 18. Perfil

El perfil permite:

- Ver datos personales.
- Editar nombre, apellido, email y telefono.
- Ver predios administrados.
- Ver predios compartidos.
- Seleccionar predio activo.
- Crear predio desde perfil.
- Solicitar acceso desde perfil.
- Cambiar paleta de colores para accesibilidad.

## 19. Clima

El backend integra Open-Meteo.

Funciones importantes:

- `_fetch_open_meteo(lat, lon)`
- `sincronizar_clima(idArea)`
- `get_ultimo_clima(idArea)`

El backend tambien tiene un hilo que cada cierto tiempo intenta insertar mediciones climaticas para un area con coordenadas validas.

## 20. Migracion defensiva del esquema

Como Docker puede conservar una base vieja, el backend incluye:

```text
ensure_runtime_schema()
```

Esta funcion revisa columnas criticas y las agrega si faltan.

Cubre casos como:

- Falta `Predio.CodigoAcceso`.
- Falta `Usuario_predio.Admin`.
- Falta `Usuario_predio.Fecha_Asignacion`.
- Faltan campos de cambio de contrasena.
- Faltan campos nuevos de alertas.

Esto ayuda a evitar errores internos si alguien corre el backend con una base antigua.

## 21. Seguridad

Puntos principales:

- Las contrasenas no se guardan en texto plano.
- Se usa hashing de Werkzeug.
- Las rutas sensibles usan `@jwt_required`.
- El token se manda como `Authorization: Bearer <token>`.
- La API valida si un usuario tiene acceso a un predio o area antes de devolver datos.
- Las operaciones de escritura importantes requieren ser administrador del predio.

## 22. Endpoints mas importantes para explicar

### Auth

```text
POST /api/v1/registro
POST /api/v1/usuarios/login
GET  /api/v1/auth/me
```

### Predios

```text
POST /api/v1/predios/onboarding/crear
POST /api/v1/predios/onboarding/solicitar-acceso
GET  /api/v1/predios
PUT  /api/v1/predios/:idPredio
POST /api/v1/predios/:idPredio/regenerar-codigo
```

### Areas y configuracion

```text
GET  /api/v1/areas-riego?idPredio=<id>
POST /api/v1/areas-riego
GET  /api/v1/configuraciones-cultivo?idPredio=<id>
POST /api/v1/configuraciones-cultivo
```

### Mediciones y alertas

```text
GET /api/v1/mediciones-historicas?idPredio=<id>
GET /api/v1/mediciones-historicas/historial/:idArea
GET /api/v1/mediciones-historicas/ndvi/:idArea
GET /api/v1/alertas?idPredio=<id>
GET /api/v1/alertas/verificar/:idArea
```

### Clima

```text
POST /api/v1/clima/sincronizar/:idArea
GET  /api/v1/clima/ultimo/:idArea
```

## 23. Flujo para demo de presentacion

Un buen flujo de demostracion seria:

1. Abrir login.
2. Iniciar sesion con admin.
3. Mostrar sidebar y predio activo.
4. Ir a dashboard y explicar indicadores.
5. Ir a areas y abrir detalle de parcela.
6. Mostrar parametros de cultivo.
7. Ir a alertas y explicar flujo lector/admin.
8. Ir a reportes y exportar PDF o Excel.
9. Ir a mapa y mostrar marcadores.
10. Ir a perfil y explicar predios administrados/compartidos.
11. Crear un nuevo usuario.
12. En onboarding, crear un predio o solicitar acceso con codigo.

## 24. Guion breve para explicar el proyecto

"IrriGo es una plataforma web para administrar predios agricolas y monitorear informacion de riego. El sistema separa usuarios administradores y lectores por predio. Un administrador puede crear un predio, configurar areas de riego, definir parametros de cultivo y compartir un codigo de acceso. Un lector usa ese codigo para consultar informacion sin modificar configuraciones criticas. La aplicacion consume una API Flask, guarda datos en MySQL y muestra dashboards, mapas, alertas y reportes exportables. La informacion se filtra siempre por el predio activo, lo que permite que un usuario tenga acceso a varios predios con roles diferentes."

## 25. Que problemas resuelve

- Centraliza informacion agricola que normalmente estaria dispersa.
- Permite controlar permisos por predio.
- Facilita monitoreo de humedad y clima.
- Ayuda a detectar condiciones fuera de rango mediante alertas.
- Permite exportar informacion para analisis o reportes.
- Da una vista visual en mapa para ubicar predios, areas y sensores.

## 26. Puntos tecnicos fuertes

- Arquitectura separada frontend/backend/base de datos.
- Tokens para sesion.
- Hashing de contrasenas.
- Roles por predio.
- Validacion de acceso por predio y area.
- Creacion transaccional de predios.
- Migracion defensiva para esquemas antiguos.
- Reportes PDF/Excel.
- Integracion con Open-Meteo.
- Mapa interactivo con Leaflet.

## 27. Limitaciones o puntos a mencionar con cuidado

- La eliminacion de predios no esta expuesta en la UI para evitar riesgos de integridad durante la demo.
- Algunas pruebas unitarias antiguas necesitan actualizarse porque ahora varias rutas requieren JWT.
- El mapa depende de que existan coordenadas validas.
- Si se usa una base vieja, conviene reiniciar con `IrriGo.sql` o dejar que corra la migracion automatica.
- Los datos de sensores pueden ser semilla o simulados dependiendo de la configuracion.

## 28. Comandos utiles

Backend:

```bash
python main.py
python -m py_compile main.py
pytest -q
```

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Base de datos:

```bash
docker compose up -d
docker exec -i irrigo_mysql mysql -u root < IrriGo.sql
```

## 29. Checklist antes de presentar

- MySQL corriendo.
- Backend corriendo en `http://localhost:3000`.
- Frontend corriendo en `http://localhost:5173`.
- `frontend/src/config.js` apunta a `http://localhost:3000/api/v1`.
- Login admin funciona.
- Hay al menos un predio con areas y mediciones.
- Mapa tiene coordenadas.
- Reportes cargan datos.
- Alertas cargan sin error.
- Perfil abre correctamente.

## 30. Explicacion super corta

IrriGo es una app React + Flask + MySQL para administrar riego agricola por predio. Usa roles por predio, codigos de acceso, sensores, mediciones historicas, alertas, reportes y mapas para que administradores y lectores puedan consultar y gestionar informacion de riego de forma organizada.

