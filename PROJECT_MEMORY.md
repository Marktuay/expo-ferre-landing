# Expo Ferre 2026 - Project Memory & Context

Este archivo funciona como la "memoria" del proyecto. Contiene el estado actual de la plataforma, la arquitectura utilizada y el roadmap (lo que falta por hacer) para que cualquier inteligencia artificial pueda retomar el trabajo exactamente donde se quedó.

## 🛠 Arquitectura y Stack Tecnológico
- **Frontend:** React + Vite
- **Estilos:** Tailwind CSS (con variables customizadas en `index.css` y `tailwind.config.js`).
- **Backend/Database:** Firebase (Auth para autenticación y Firestore para base de datos).
- **Hosting:** Firebase Hosting (previsto/configurado).
- **Control de Versiones:** Git (GitHub).

## ✅ Estado Actual (Implementado)

### 1. Landing Page (Pública)
- Cuenta regresiva dinámica para el evento.
- Información del evento y mapa estático.
- **Formulario de Preregistro:** Permite a los visitantes registrarse (guarda en la colección `preregistrations`). Al enviar, la pantalla muestra un **Código QR** generado automáticamente con el ID del documento en Firebase.

### 2. Panel de Patrocinadores (Acceso Privado)
- **Autenticación:** Login y Registro propio para patrocinadores.
- **Dashboard:**
  - **Mi Código QR:** Se genera y muestra permanentemente en el header.
  - **Mapa Interactivo:** Para reservar ubicaciones de stands (guarda en `reservations`).
  - **Conferencias:** Formulario para registrar charlas (guarda en `speakers`).
  - **Staff:** Formulario para registrar a su equipo (guarda en `staff`).
  - **Lista de Invitados:** (Botón placeholder "Próximamente").

### 3. Panel de Administración (Intranet)
- Menú principal con tarjetas tipo "Hub" para navegar.
- **Módulos:**
  - **Preregistros:** Tabla con todos los visitantes inscritos.
  - **Contacto:** Tabla de mensajes de contacto de la landing.
  - **Hub de Patrocinadores (Submenú):** Agrupa 4 secciones:
    1. *Directorio:* Lista de patrocinadores registrados (`users`).
    2. *Reservaciones:* Stands reservados.
    3. *Conferencias:* Charlas propuestas.
    4. *Staff:* Personal acreditado por los patrocinadores.
- **Exportación:** Todas las tablas de administración tienen la capacidad de exportar sus datos a archivos Excel (`.xlsx`).

---

## 🚀 Roadmap (Siguientes Pasos Pendientes)

### 1. Integración de WhatsApp API (Gateway Open Source)
- **Objetivo:** Enviar un mensaje automatizado con el código QR y los detalles logísticos del evento cada vez que alguien se registre.
- **Estado:** En pausa a la espera de que el cliente adquiera y configure una Máquina Virtual (Google Cloud `e2-medium` recomendada) con el número de WhatsApp usando un API como *Evolution API* o *Baileys*.
- **Desarrollo Necesario:** Una vez configurado el servidor, se deberá crear un webhook o usar Firebase Cloud Functions para hacer peticiones POST hacia el servidor de WhatsApp tras una inserción exitosa en Firestore.

### 2. Escáner QR para el Staff (Control de Acceso / Check-In)
- **Objetivo:** Permitir que los administradores y el staff abran la cámara de su celular desde el "Admin Hub" para escanear el Código QR de los asistentes en la puerta.
- **Flujo:** 
  1. Escanear QR.
  2. Buscar ID en colecciones `preregistrations` y `users`.
  3. Mostrar detalles en pantalla.
  4. Botón de **"Check-in"** para marcar `asistencia: true` y guardar el `timestamp` de ingreso.

### 3. Lista de Invitados (Panel de Patrocinadores)
- **Objetivo:** Sustituir el botón actual que dice "Próximamente" por un formulario o mecanismo de subida de CSV donde los patrocinadores declaren a sus invitados VIP.

---
*Última actualización: 17 de Junio de 2026*
