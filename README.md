# 🚜 IrriGo - Sistema de Monitoreo Agrícola

Este repositorio contiene el MVP (Producto Mínimo Viable) de IrriGo, una plataforma integral para la gestión de riego inteligente. El sistema utiliza una arquitectura profesional desacoplada para garantizar escalabilidad y facilidad de despliegue.

---

## 🏗️ Arquitectura del Sistema

* **Frontend:** Interfaz reactiva desarrollada en React + Vite con estilos de Tailwind CSS.
* **Backend:** API REST robusta construida con Python y Flask.
* **Base de Datos:** Motor MySQL 8.0 virtualizado mediante contenedores de Docker.

---

## 🚀 Pasos para la Replicación (En GitHub Codespaces)

Sigue estos pasos en orden para encender el sistema completo:

### 1. Levantar la Infraestructura (Base de Datos)

Abre una terminal y ejecuta el siguiente comando para iniciar el contenedor de MySQL:

```bash
docker-compose up -d
```

> **Nota:** Docker leerá automáticamente el archivo `setup.sql` para inyectar las tablas y los datos semilla del Rancho "La Esperanza".

### 2. Configurar y Encender el Backend (Python)

En la misma terminal (o una nueva), instala las dependencias y arranca la API:

```bash
# Instalar librerías necesarias
pip install mysql-connector-python flask flask-cors

# Ejecutar el servidor de la API
python "mainTarea (1).py"
```

El servidor indicará que está escuchando en el puerto **3000**.

### 3. Configurar y Encender el Frontend (React)

Abre una nueva terminal, entra a la carpeta del frontend y arranca el servidor de desarrollo:

```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Configuración Crítica de Red (Codespaces)

> **IMPORTANTE:** Para que el sistema funcione en la nube, debes configurar la visibilidad de los puertos manualmente:
>
> 1. Ve a la pestaña **Ports (Puertos)** en la parte inferior de VS Code.
> 2. Busca el puerto **3000** (Python) y el puerto **5173** (React).
> 3. Haz clic derecho en la columna *Visibility* de cada uno y cámbialos a **Public**.

**Enlace de Datos:**

1. Copia la *Forwarded Address* del puerto **3000**.
2. Abre el archivo `src/components/AreasRiego.jsx`.
3. En la línea **14**, pega esa dirección antes del endpoint `/api/v1/areas-riego`.

---

## 🛠️ Solución de Problemas Comunes

* **Error:** Lost connection to MySQL

  * **Causa:** El contenedor está terminando de bootear.
  * **Solución:** Espera 10 segundos y reinicia el script de Python.

* **Error:** Table AreaRiego doesn't exist

  * **Causa:** Fallo en la inyección inicial del SQL.
  * **Solución:** Ejecuta:

```bash
docker exec -it irrigo_mysql mysql -u root IrriGo < setup.sql
```

* **Error:** Failed to fetch / SyntaxError

  * **Causa:** El puerto **3000** sigue en modo Privado.
  * **Solución:** Cambia la visibilidad del puerto a **Public** en la pestaña *Ports*.

---

## 📊 Datos de Prueba

El sistema se inicializa con datos reales del sector agrícola en Chihuahua:

* **Predio:** Rancho La Esperanza.
* **Áreas de Control:**

  * Parcela Norte (Estado Óptimo).
  * Parcela Oeste (Estado Crítico).

---
