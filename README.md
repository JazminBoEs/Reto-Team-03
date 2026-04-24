# 🌾 IrriGo — Sistema Inteligente de Riego Agrícola

IrriGo es una plataforma web diseñada para la monitorización en tiempo real, gestión y análisis de parcelas agrícolas. Permite a los agricultores visualizar el estado de humedad del suelo, controlar módulos de riego, recibir alertas climáticas, exportar reportes profesionales y gestionar sus parcelas con un sistema de roles (Administrador / Lector).

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, Vite 7, TailwindCSS 4, Heroicons, React-Leaflet (Mapas) |
| **Backend** | Python (Flask), Werkzeug (Hashing de contraseñas), Flask-CORS |
| **Base de Datos** | MySQL 8.0 (Dockerizado) |
| **Reportes** | jsPDF + jspdf-autotable (PDF), SheetJS/xlsx (Excel) |
| **Clima** | Open-Meteo API (sincronización automática cada 10 min) |

---

## 🚀 Guía de Instalación y Ejecución Paso a Paso

Necesitarás **3 terminales** abiertas simultáneamente. Asegúrate de tener instalados: **Docker**, **Python 3.8+** y **Node.js 18+**.

### Paso 1: Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd Reto-Team-03-main
```

### Paso 2: Levantar la Base de Datos (Terminal 1)

El proyecto usa Docker para MySQL. Desde la carpeta raíz del proyecto:

```bash
# 1. Levantar el contenedor de MySQL
docker compose up -d

# 2. Esperar ~10 segundos a que MySQL inicie, luego inyectar el esquema y datos semilla
docker exec -i irrigo_mysql mysql -u root < IrriGo.sql
```

> **Nota:** Si recibes un error de conexión, espera unos segundos más y vuelve a intentar. MySQL puede tardar en inicializar la primera vez.

### Paso 3: Iniciar el Backend (Terminal 2)

```bash
# 1. Instalar dependencias de Python
pip install flask flask-cors mysql-connector-python werkzeug

# 2. Ejecutar el servidor (se levanta en el puerto 3000)
python main.py
```

Deberías ver algo como:
```
 * Running on http://0.0.0.0:3000
 * Restarting with stat
```

### Paso 4: Iniciar el Frontend (Terminal 3)

```bash
# 1. Entrar a la carpeta del frontend
cd frontend

# 2. Instalar dependencias de Node.js
npm install

# 3. Iniciar el servidor de desarrollo
npm run dev
```

Deberías ver algo como:
```
  VITE v7.3.1  ready in 500ms
  ➜  Local:   http://localhost:5173/
```

### Paso 5: Abrir la aplicación

Abre tu navegador en **http://localhost:5173** y listo.

---

## 🔐 Credenciales de Acceso

Las contraseñas están hasheadas con `werkzeug.security` (no texto plano). Usa estas cuentas predefinidas:

| Rol | Email | Contraseña |
|---|---|---|
| **Administrador** | `admin@irrigo.com` | `admin123` |
| **Lector** | `jazmin@example.com` | `jazmin123` |

> **¿Quieres generar nuevos hashes?** Ejecuta `python hash_passwords.py` y copia los hashes al archivo `IrriGo.sql`.

---

## ✨ Características de la Aplicación

### 🔐 Sistema de Autenticación
- **Inicio de sesión** con validación de credenciales hasheadas (werkzeug)
- **Registro de nuevas cuentas** con validación de campos y contraseña
- **Cierre de sesión** que limpia el estado de la aplicación
- **Roles diferenciados**: Administrador y Lector con permisos distintos

### 📊 Dashboard Principal
- Métricas en tiempo real: humedad promedio, índice NDVI, consumo acumulado, evapotranspiración
- **Resumen climático local** sincronizado con Open-Meteo (temperatura, viento, radiación solar)
- Navegación rápida a áreas de riego y reportes

### 🗺️ Mapa Interactivo
- Visualización de predios y parcelas con **Leaflet**
- Marcadores interactivos con popups de información
- Navegación directa al detalle de cada parcela

### 🌱 Áreas de Riego
- Listado dinámico de parcelas con estado visual (óptimo, advertencia, crítico)
- Métricas por parcela: humedad, NDVI, consumo de agua
- Click en cualquier parcela para ver su **detalle completo**

### 📋 Detalle de Parcela
- Información general: hectáreas, tipo de cultivo, tipo de tierra
- **Panel Suelo**: humedad, potencial hídrico, electroconductividad, NDVI
- **Panel Riego**: estado del módulo, consumo actual y acumulado
- **Panel Ambiente**: datos climáticos de Open-Meteo con fallback a sensor local
- Gráficas de historial de humedad (24h) y evolución NDVI (7 días)
- Botón "Editar Parámetros" **solo visible para administradores**

### 🔔 Centro de Alertas (Sistema de 2 pasos)
- **Filtros** por severidad (Alta, Media, Baja) y estado (Pendientes, Leídas, Confirmadas)
- **Lector** puede marcar alertas como "Enterado" → la alerta queda como leída
- **Admin** ve un badge "Marcada por lector" y debe **confirmar** para que la alerta desaparezca
- Botón de "Marcar todas como leídas"
- **Badge** con conteo de alertas pendientes en el Sidebar

### 📈 Reportes y Análisis
- Filtros por rango de fechas y área de riego
- Métricas calculadas: humedad promedio, temperatura, agua usada, eficiencia NDVI
- Gráfica de tendencias semanales con datos reales
- Tabla de estadísticas agrupadas por área
- **Exportar PDF**: Documento profesional con encabezado, resumen y tabla de datos
- **Exportar Excel**: Archivo .xlsx con dos hojas (Mediciones + Resumen por Área)

### ⚙️ Parámetros del Sistema (Solo Admin)
- **Gestión de Predios**: Crear, editar y eliminar predios con coordenadas
- **Gestión de Áreas de Riego**: Crear, editar y eliminar parcelas asignadas a predios
- **Configuración de Cultivos**: Tipo de cultivo/tierra, capacidad de campo, punto de marchitez, rangos de humedad, lámina de riego
- Modales interactivos para creación y edición

### 👤 Perfil de Usuario
- Visualización y edición de datos personales (nombre, email, teléfono)
- **Guardado real** vía API (PUT al backend)
- Rol dinámico (Administrador/Lector) basado en la BD
- Panel de dispositivos conectados

### 👁️ Vistas por Rol

| Funcionalidad | Admin | Lector |
|---|---|---|
| Dashboard, Áreas, Mapa, Reportes | ✅ | ✅ |
| Exportar PDF y Excel | ✅ | ✅ |
| Editar parámetros de parcela | ✅ | ❌ |
| Sección "Parámetros" en Sidebar | ✅ | ❌ |
| Confirmar alertas (desaparecen) | ✅ | ❌ |
| Marcar alertas como leídas | ✅ | ✅ |
| Editar perfil propio | ✅ | ✅ |

---

## 📁 Estructura del Proyecto

```text
Reto-Team-03-main/
│
├── docker-compose.yml          # Contenedor Docker para MySQL 8.0
├── IrriGo.sql                  # Esquema de BD + datos semilla (contraseñas hasheadas)
├── main.py                     # API REST completa en Flask (Python)
├── hash_passwords.py           # Script auxiliar para generar hashes de contraseñas
├── Guide.yaml                  # Documentación OpenAPI/Swagger de la API
├── Pruebas_Unitarias/          # Pruebas unitarias del backend
│
└── frontend/                   # Aplicación React + Vite
    ├── package.json            # Dependencias: React, Leaflet, jsPDF, xlsx, etc.
    ├── vite.config.js          # Configuración de Vite
    ├── tailwind.config.js      # Configuración de TailwindCSS v4
    ├── index.html              # Punto de entrada HTML
    │
    └── src/
        ├── main.jsx            # Entry point de React
        ├── App.jsx             # Orquestador principal: auth, routing, estado global
        ├── config.js           # URL centralizada del API (localhost:3000)
        ├── index.css           # Tema global: colores, animaciones, estilos Leaflet
        ├── App.css             # Estilos adicionales
        │
        ├── assets/
        │   └── logo.png        # Logo de IrriGo
        │
        ├── data/
        │   └── mockData.js     # Datos mock de respaldo
        │
        └── components/
            ├── Login.jsx           # Pantalla de inicio de sesión
            ├── Registro.jsx        # Pantalla de creación de cuenta
            ├── Sidebar.jsx         # Navegación lateral con roles y badge de alertas
            ├── Dashboard.jsx       # Panel principal con métricas y clima
            ├── AreasRiego.jsx      # Listado dinámico de parcelas
            ├── DetalleParcela.jsx   # Vista detallada de una parcela (suelo/riego/ambiente)
            ├── MapaDePredio.jsx     # Mapa interactivo con Leaflet
            ├── Alertas.jsx         # Centro de alertas con sistema de 2 pasos
            ├── Reportes.jsx        # Reportes con exportación PDF/Excel
            ├── Parametros.jsx      # CRUD de predios, áreas y configuraciones (Admin)
            ├── Perfil.jsx          # Gestión del perfil del usuario autenticado
            └── UseClima.js         # Hook personalizado para sincronizar clima (Open-Meteo)
```

---

## 🗄️ Modelo de Base de Datos

```text
Usuario ──M:N── Predio          (vía Usuario_predio con campo Admin)
                  │
                  ├── AreaRiego ── ConfiguracionCultivo (1:1)
                  │       │
                  │       ├── MedicionHistorica (datos de sensores + clima)
                  │       ├── Sensor
                  │       └── Alerta (con Leida + Confirmada_Admin)
                  │
                  └── ModuloControl ── Sensor
                                    └── AreaRiego

RegistroAuditoria ── Usuario + AreaRiego
```

### Tablas principales:
| Tabla | Descripción |
|---|---|
| `Usuario` | Usuarios del sistema (nombre, email, contraseña hasheada) |
| `Predio` | Predios agrícolas con coordenadas GPS |
| `Usuario_predio` | Relación M:N con campo `Admin` (define el rol) |
| `AreaRiego` | Parcelas de riego dentro de un predio |
| `ModuloControl` | Módulos IoT de control de hardware |
| `Sensor` | Sensores físicos desplegados en campo |
| `ConfiguracionCultivo` | Parámetros agronómicos por área (humedad, lámina, etc.) |
| `MedicionHistorica` | Historial de telemetría (suelo + clima) |
| `Alerta` | Notificaciones con sistema de 2 pasos (Leida + Confirmada_Admin) |
| `RegistroAuditoria` | Bitácora de cambios |

---

## 🔌 Endpoints de la API

La API REST corre en `http://localhost:3000/api/v1`. Documentación completa en `Guide.yaml` (formato OpenAPI 3.0).

| Recurso | Endpoints |
|---|---|
| Usuarios | `GET/POST /usuarios`, `GET/PUT/DELETE /usuarios/:id`, `POST /usuarios/login` |
| Predios | `GET/POST /predios`, `GET/PUT/DELETE /predios/:id` |
| Usuarios-Predios | `GET/POST /usuarios-predios`, `GET/PUT/DELETE /usuarios-predios/:idU/:idP` |
| Módulos Control | `GET/POST /modulos-control`, `GET/PUT/DELETE /modulos-control/:id` |
| Áreas de Riego | `GET/POST /areas-riego`, `GET/PUT/DELETE /areas-riego/:id` |
| Sensores | `GET/POST /sensores`, `GET/PUT/DELETE /sensores/:id` |
| Config. Cultivo | `GET/POST /configuraciones-cultivo`, `GET/PUT/DELETE /configuraciones-cultivo/:id` |
| Mediciones | `GET/POST /mediciones-historicas`, `GET/PUT/DELETE /mediciones-historicas/:id` |
| Alertas | `GET/POST /alertas`, `GET/PUT/DELETE /alertas/:id` |
| Auditoría | `GET/POST /registros-auditoria`, `GET/PUT/DELETE /registros-auditoria/:id` |
| Clima | `POST /clima/sincronizar/:idArea`, `GET /clima/ultimo/:idArea` |