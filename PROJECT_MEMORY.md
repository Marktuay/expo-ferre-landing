# Expo Ferre 2026 - Project Memory & Context

Este archivo funciona como la "memoria" del proyecto. Contiene el estado actual de la plataforma, la arquitectura utilizada y el roadmap (lo que falta por hacer) para que cualquier inteligencia artificial pueda retomar el trabajo exactamente donde se quedó.

## 🛠 Arquitectura y Stack Tecnológico
- **Frontend:** React + Vite, TailwindCSS (configurado para diseño responsivo). Desplegado y alojado en una Máquina Virtual (VM) de Google Cloud.
- **Backend / Base de Datos:** Firebase (Firestore y Auth) utilizado **únicamente** para autenticación y para guardar los datos recogidos en los formularios.
- **Control de Versiones:** Git (GitHub).

## ✅ Estado Actual (Implementado)

### 1. Landing Page (Pública)
- Cuenta regresiva dinámica para el evento.
- Información del evento y mapa estático.
- **Formulario de Preregistro:** Permite a los visitantes registrarse (guarda en la colección `preregistrations` con estatus `pending`). Al registrarse, capturan sus datos de contacto y esperan aprobación.
- **SEO Técnico:** Archivos `robots.txt`, `sitemap.xml` y Meta Tags configurados para indexación en Google.
- **Optimización para Campañas (RRSS):** Soporte para anclaje automático (`#preregistro-form` y `#awards`) con *smooth scroll* garantizado y corrección de persistencia de vista de administrador para evitar redirecciones erróneas a clientes nuevos.

## 🐛 Troubleshooting y Problemas Conocidos
**Problema:** Los assets estáticos (como imágenes) no se actualizan en producción o arrojan error a pesar de haber hecho `git pull` y `npm run build` en la VM.
**Causa:** Cloudflare guarda una caché muy agresiva (`Cf-Cache-Status: HIT`) de los archivos, por lo que sirve versiones antiguas o páginas de error `404/index.html` cacheadas previamente.
**Solución Rápida:** Renombrar el archivo de la imagen (ej: `logo.jpeg` a `logo-v2.jpeg`) y actualizar la ruta en el código de React. Esto fuerza a la CDN y a los navegadores a solicitar el nuevo archivo saltándose toda la caché.

### 2. Panel de Patrocinadores (Acceso Privado)
- **Autenticación:** Login y Registro propio para patrocinadores.
- **Dashboard:**
  - **Mi Código QR:** Se genera y muestra permanentemente en el header.
  - **Mapa Interactivo:** Para reservar ubicaciones de stands (guarda en `reservations`).
  - **Conferencias:** Formulario para registrar charlas (guarda en `speakers`).
  - **Staff:** Formulario para registrar a su equipo (guarda en `staff`).
  - **Lista de Invitados VIP:** Formulario completo para registro de invitados VIP (conectado a Firebase), además de una vista administrativa `AdminGuests.jsx` para gestionarlos.
  - **Captura de Leads (Escáner):** Módulo nativo (`SponsorScanner.jsx`) que permite a los patrocinadores capturar prospectos escaneando los QR de los visitantes directamente desde su celular.

### 3. Panel de Administración (Intranet)
- Menú principal con tarjetas tipo "Hub" para navegar.
- **Módulos:**
  - **Preregistros:** Tabla de visitantes inscritos con buscador en tiempo real (por nombre, empresa, email y teléfono). 
    - **Gestión:** Al aprobar (`status: 'approved'`), envía el Código QR por correo. Cuenta con un botón para **Reenviar el Código QR** a los ya aprobados.
    - **Control de Asistencia / Suplencias:** Si alguien transfiere su invitación o no asiste, se puede marcar como **No Asistió** (`status: 'no_show'`) para anular ese registro sin eliminarlo, exigiendo un nuevo registro in-situ para la nueva persona. La exportación a Excel respeta los filtros aplicados en pantalla.
  - **Contacto:** Tabla de mensajes de contacto de la landing.
  - **Reporte de Marketing (Leads):** Panel con reportería de UTMs (campañas de Instagram, Facebook, LinkedIn), listando prospectos con datos completos como Email y Teléfono.
  - **Hub de Patrocinadores (Submenú):** Agrupa 4 secciones:
    1. *Directorio:* Lista de patrocinadores registrados (`users`).
       - **Creación Manual:** El equipo puede registrar patrocinadores directamente. Esto utiliza una instancia secundaria temporal de Firebase Auth para no perder la sesión activa del administrador.
       - **Notificaciones (Trigger Email):** Al crear o aprobar a un patrocinador, el sistema inyecta un documento en la colección `mail` para que la extensión "Trigger Email" envíe el correo de forma automática y silenciosa.
    2. *Reservaciones:* Panel con dos pestañas (Lista de stands reservados y **Mapa Interactivo** para administrar reservas y ocupación gráficamente).
    3. *Conferencias:* Charlas propuestas.
    4. *Staff:* Personal acreditado por los patrocinadores.
  - **Check-In (Escáner QR):** Módulo funcional utilizando la cámara del dispositivo para escanear Códigos QR, buscar asistentes en la base de datos y registrar su asistencia en tiempo real con estadísticas.
- **Exportación:** Todas las tablas de administración tienen la capacidad de exportar sus datos a archivos Excel (`.xlsx`), incluyendo las últimas adiciones de campos (ej. Teléfono en Leads).

---

## 🚀 Roadmap (Siguientes Pasos Pendientes)

### 1. Integración de WhatsApp API (Gateway Open Source)
- **Objetivo:** Enviar un mensaje automatizado con el código QR y los detalles logísticos del evento cada vez que alguien se registre.
- **Estado:** En pausa a la espera de que el cliente adquiera y configure una Máquina Virtual (Google Cloud `e2-medium` recomendada) con el número de WhatsApp usando un API como *Evolution API* o *Baileys*.

---
*Última actualización: 28 de Junio de 2026*
