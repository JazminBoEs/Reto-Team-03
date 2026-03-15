# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# 🌱 IrriGo - Sistema de Monitoreo Agrícola

Bienvenido al repositorio oficial de **IrriGo**. Este proyecto integra nuestros servicios web y la interfaz gráfica para la gestión inteligente de parcelas, humedad y consumo de agua.

## 📂 Estructura del Proyecto

El repositorio funciona bajo una arquitectura de Monorepo:
* `/` (Raíz): Contiene el backend, archivos `.yaml` de configuración y `main.py`.
* `/frontend`: Contiene la interfaz de usuario desarrollada con **React, Vite y Tailwind CSS**.

---

## 🚀 Cómo ejecutar la Interfaz Gráfica (Frontend)

Para ver el Panel Principal y las Áreas de Riego en tu computadora, sigue estos pasos:

### 1. Requisitos Previos
Asegúrate de tener instalado [Node.js](https://nodejs.org/es/) en tu equipo. Esto nos permite usar el gestor de paquetes `npm`.

### 2. Instalación de Dependencias
Abre tu terminal en la carpeta raíz del proyecto y navega hacia la carpeta del frontend para instalar las librerías necesarias (esto solo se hace la primera vez):

```bash
#1. Entra a la carpeta del frontend
cd frontend

# 2. Instala las dependencias (React, Heroicons, Tailwind, etc.)
npm install
3. Levantar el Servidor Local
Una vez que termine la instalación, ejecuta el servidor de desarrollo:

Bash

npm run dev
4. Ver el Proyecto
La terminal te mostrará un enlace local (usualmente http://localhost:5173).
Mantén presionada la tecla Ctrl (o Cmd en Mac) y haz clic en el enlace, o cópialo y pégalo en tu navegador.
