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
**Problema:** Los assets estáticos (como imágenes) o el código JavaScript no se actualizan en producción o arrojan error a pesar de haber hecho `git pull` y `npm run build` en la VM.
**Causa:** Cloudflare o los navegadores móviles guardan una caché muy agresiva (`Cf-Cache-Status: HIT`) de los archivos, por lo que sirve versiones antiguas.
**Solución Rápida:** Purgar caché en Cloudflare o entrar en modo incógnito/datos móviles. Para assets estáticos, renombrar el archivo de la imagen.

**Problema:** Al aprobar patrocinadores o guardar preregistros, la pantalla lanza un error genérico ("Hubo un error al registrar/aprobar") pero los datos **sí** se guardan en la base de datos (Firebase).
**Causa:** Un error de sintaxis en JavaScript (como una variable no definida, ej. `ReferenceError: isApproved is not defined`) ocurre *después* de hacer la escritura en Firebase, provocando que el código caiga en el bloque `catch` y muestre el mensaje de error, interrumpiendo el flujo de éxito de la interfaz.
**Solución:** Revisar los `catch (error)` e imprimir el error real en consola. El problema no son los permisos de Firebase, sino lógica de UI rota.

**Problema:** Errores genuinos de permisos (`permission-denied`) al intentar aprobar patrocinadores o modificar usuarios.
**Causa:** Las reglas de Firestore exigen que el usuario esté autenticado (`request.auth != null`). Si la sesión de Firebase Auth del admin caducó o no se ha inicializado correctamente, Firebase bloquea la escritura.
**Solución:** Asegurarse de que el cierre de sesión (`auth.signOut()`) no ocurrió por inactividad y que la regla de Firestore permite escrituras al rol adecuado.

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

### 2. Cuentas Demo de Patrocinadores (Auto-destruibles)
- **Objetivo:** Permitir la creación de cuentas "Demo" desde el modal administrativo de patrocinadores para hacer demostraciones de venta a prospectos.
- **Mecanismo propuesto:** Añadir un flag `isDemo: true` al crearlas. Requerirá implementar un script de limpieza (cron job en la VM o Firebase Cloud Functions) que analice la base de datos y borre a los usuarios del sistema Auth y sus documentos en Firestore si tienen más de 1 hora de haber sido creados.
- **Estado:** En pausa. Plan de implementación redactado.

---

## 📅 Resumen de Cambios Recientes (Para contexto futuro)
**Última actualización: 07 de Julio de 2026**

- **Implementación de Mini-CRM (Seguimiento de Leads):** Se desarrolló un sistema integrado de seguimiento telefónico (CRM) dentro de las tablas de Preregistros (`AdminPreRegistrations.jsx`) e Invitados de Patrocinadores (`AdminGuests.jsx`).
  - Permite al Staff añadir notas, registrar el resultado de la llamada (Ej. Contestó, Buzón, etc.) y marcar si requieren seguimiento posterior, almacenándolo todo en un array interno (`followUps`) dentro de cada documento en Firestore para optimizar costos de base de datos.
  - Se creó un modal universal (`AdminFollowUpModal.jsx`) que muestra el historial completo de interacciones en tiempo real.
  - Se actualizaron las funciones de **Exportar a Excel** para incluir los detalles del último seguimiento y la cantidad total de llamadas realizadas a cada prospecto.
- **Reporte de Marketing Mejorado:** Se agregó la columna "Empresa" a la tabla del Reporte de Marketing (obtenida del preregistro), así como en su respectiva función de exportación a CSV para un análisis de campaña más detallado.

**Cambios Anteriores (02 de Julio de 2026):**

- **Notificaciones Administrativas Centralizadas:** Se modificó la lógica de envíos de correo en `ContactPage.jsx`, `AuthPage.jsx` (patrocinadores nuevos) y `App.jsx` (preregistros) para que todos los avisos y alertas del sistema lleguen exclusivamente a la cuenta administrativa `karen.torres@rinsa.red`.

- **Seguridad Master Admin Completada:** Se implementó exitosamente la validación de inicio de sesión con **Firebase Auth** para el panel de administración. El usuario maestro ahora utiliza un correo oficial (`marktuay@gmail.com`) y se verifica con la base de datos de Firebase, cerrando la brecha de seguridad.
- **Creación de Sub-Usuarios (Instancia Secundaria):** Para permitir que el Administrador Maestro cree nuevos miembros del equipo desde la pantalla de "Gestión de Usuarios" sin que Firebase Auth lo desloguee accidentalmente de su sesión actual, se implementó el patrón de **Instancia Secundaria** (Secondary App) en `AdminUsers.jsx`.
- **Inactividad y Presencia (Pines de Estado):** Se agregó un sistema global en `AdminHub.jsx` que registra la actividad del usuario (`mousemove`, `keydown`, `click`). 
  - Si un usuario está inactivo por más de **10 minutos**, el sistema hace un cierre de sesión forzoso automáticamente (`auth.signOut()`).
  - Cada minuto de actividad actualiza el campo `lastActive` en Firestore. Esto permite mostrar visualmente en la tabla de Gestión de Usuarios un **Pin Verde 🟢** (conectado hace menos de 5 min) o **Pin Gris ⚪** (desconectado).
  - **Ampliación a Patrocinadores:** Este mismo sistema de inactividad y rastreo de presencia se replicó en el panel de clientes (`SponsorDashboard.jsx`). Ahora los administradores pueden ver los pines de conexión en vivo desde el Directorio de Patrocinadores (`AdminSponsors.jsx`).
- **Corrección de Sesión (Logout):** Se corrigió un detalle en el botón "Salir" del Administrador (`App.jsx`). Antes solo limpiaba la vista pero dejaba la sesión de Firebase Auth abierta, lo que causaba conflictos si el admin también era patrocinador. Ahora ejecuta un cierre de sesión completo.
- **UI Ampliada:** Se ensanchó el contenedor maestro de la tabla de usuarios (`max-w-6xl` y `lg:grid-cols-4`) para mejorar la visibilidad de los datos y evitar recortes en pantallas más estrechas.
- **Reglas de Seguridad:** Se restauraron las reglas definitivas en Firestore (`allow read, write: if request.auth != null;`) dado que la integración con Auth está completa.

**Cambios Anteriores (30 de Junio de 2026):**

- **Prevención de Preregistros Duplicados:** Se implementó una validación en tiempo real en el formulario de preregistro (`App.jsx`) que verifica en Firestore si el correo electrónico (email) ingresado ya existe. Si el correo se encuentra, se bloquea la creación del registro y el envío de correos, mostrando una alerta elegante (Toast) al usuario. Esto previene el spam accidental por doble clic o recargas de página.
- **Reglas de Seguridad (Firestore):** Se actualizaron las reglas de seguridad de Firestore, saliendo del "Modo de Prueba" por defecto que caduca a los 30 días. La nueva configuración permite lectura pública global (necesaria para el mapa), escritura pública restrictiva (solo para pre-registros, contactos y correos), y obliga a estar autenticado para modificar información sensible como usuarios, stands y leads.
- **Logos Múltiples por Patrocinador (Marcas Adicionales):** Se modificó la arquitectura de la base de datos y el panel de patrocinadores (`InteractiveMap.jsx`) para permitir que los patrocinadores suban hasta 4 logos. El primer logo (obligatorio) se guarda en la variable `logo` y se renderiza en el mapa interactivo y en el carrusel de la página pública. Los logos adicionales (opcionales) se guardan en el array `additionalLogos` y se inyectan dinámicamente justo después del logo principal de forma exclusiva en el Reel infinito (`App.jsx`).
- **Optimización de Rendimiento (Load Time):** Se reemplazó el video de fondo del Hero (`video2expoferre.mp4` de 30MB) por una versión optimizada (`video3expoferre.mp4`) que reduce drásticamente el peso de la página y los tiempos de carga de la web.

**Cambios Anteriores (29 de Junio de 2026):**
- **UI / Landing Page:** Se actualizó el video principal (Hero) a `video2expoferre.mp4`, se rediseñó la sección de información dividiéndola en dos columnas con el mapa interactivo ampliado, y se eliminó información desactualizada de los salones. Además, se unificó la tipografía de todos los párrafos introductorios.
- **Mapa Interactivo (Stands):** Sincronización 100% de categorías (Plata, Oro, Diamante), precios y dimensiones contra el plano vectorial SVG real. Se corrigió la lógica en `InteractiveMap.jsx` para forzar a usar las propiedades locales sobreescribiendo valores cacheados u obsoletos persistentes en la base de datos de Firestore.
- **Patrocinadores:** Se implementó el flujo completo de creación manual de cuentas por parte de administración y su posterior aprobación. El QR del patrocinador ahora está oculto hasta su aprobación.
- **Correos Automáticos:** Integración con Firebase *Trigger Email* (insertando documentos en la colección `mail`) para envíos silenciosos y automatizados de credenciales y avisos de aprobación.
- **Panel de Administración (Optimizaciones):** Se amplió el contenedor del directorio de patrocinadores (`AdminSponsors.jsx`) a 95% de la pantalla para evitar cortes de texto en tablas largas (scroll horizontal). Se agregaron filtros de búsqueda en tiempo real, gestión de "No_Show", reenvío de códigos QR y borrado de registros en el panel de Preregistros. Se optimizó el diseño del **Reporte de Marketing** implementando Flexbox en las tarjetas de estadísticas para que se adapten automáticamente en una sola fila cuando se reciben registros de múltiples campañas UTM (ej: Facebook, LinkedIn, TikTok).
- **Solución de Caché:** Se implementaron técnicas de versionado de archivos para bypass de la caché estricta de Cloudflare en producción.

---

## 🗺️ Radiografía del Sistema (Mapa de Archivos y Componentes)

Para facilitar la navegación y el mantenimiento del código por parte de futuros desarrolladores o agentes de IA, aquí se detalla la estructura principal del proyecto (`/src`):

### 🌐 Archivos Raíz (`/src/`)
- `App.jsx`: Contiene el enrutador principal (`react-router-dom`), la lógica de la **Landing Page pública** completa (Hero, Información, Ubicación, CTA) y el layout global.
- `App.css` y `index.css`: Archivos de configuración de estilos globales y variables de Tailwind CSS.
- `main.jsx`: Punto de entrada de la aplicación React.
- `firebase.js`: Configuración del SDK de Firebase e inicialización de servicios (Firestore, Auth, Storage).

### 🛠️ Carpeta de Componentes (`/src/components/`)
Se divide en 4 grandes grupos lógicos:

#### 1️⃣ Panel de Administración (Super Admin)
Todos los componentes que inician con `Admin...`. Son accesibles sólo por administradores y staff (`role === 'admin'`).
- **`AdminPanel.jsx`**: Layout base y menú de navegación del administrador.
- **`AdminHub.jsx`**: Dashboard general con las métricas principales y KPIs del evento.
- **Patrocinadores:**
  - `AdminSponsorsHub.jsx`: Contenedor de las pestañas de patrocinadores.
  - `AdminSponsors.jsx`: Tabla directorio de los patrocinadores registrados (aprobación y control de correos `mail`).
  - `AdminSponsorDetails.jsx`: Vista detallada de las actividades y leads capturados por un patrocinador específico.
- **Asistentes y Registros:**
  - `AdminPreRegistrations.jsx`: Gestión de todos los usuarios públicos pre-registrados al evento.
  - `AdminCheckIn.jsx`: Módulo para que el staff de puerta valide y escanee QRs en la entrada del evento.
  - `AdminGuests.jsx`: Gestión de asistentes invitados de cortesía (por patrocinadores).
- **Gestión Interna y de Contenidos:**
  - `AdminSpeakers.jsx`: Configuración de conferencistas y agenda (CRUD).
  - `AdminStaff.jsx`: Alta y gestión del equipo de staff/operaciones.
  - `AdminUsers.jsx`: Vista genérica o base de usuarios.
- **Reportes y Analíticas:**
  - `AdminAttendanceReport.jsx`: Reportes detallados de asistencia.
  - `AdminMarketingReport.jsx`: Métricas de marketing y leads a nivel global.
  - `AdminGlobalLeads.jsx`: Visión maestra de todos los leads capturados.
  - `AdminContact.jsx`: Mensajes recibidos a través de la página de contacto.

#### 2️⃣ Panel Privado del Patrocinador
Componentes accesibles únicamente por usuarios que han sido aprobados con rol de patrocinador.
- **`SponsorDashboard.jsx`**: Layout base y navegación privada del patrocinador.
- **`InteractiveMap.jsx`**: Mapa interactivo tipo "Canvas" para reservar y ubicar stands.
- **`SponsorScanner.jsx`**: Escáner de QR que utiliza la cámara del dispositivo para capturar Leads en su propio stand.
- **`SponsorActivity.jsx`**: Tabla de los leads capturados, estadísticas propias y exportación a Excel.
- **Formularios de Alta (Sub-cuentas):**
  - `StaffRegistration.jsx`: El patrocinador da de alta a los miembros de su equipo para que le ayuden a escanear.
  - `GuestForm.jsx`: El patrocinador genera entradas de cortesía.
  - `SpeakerForm.jsx`: Solicitud para proponer una charla o conferencista.

#### 3️⃣ Utilidades y Módulos Compartidos
Piezas de interfaz que se reciclan en distintas partes de la aplicación.
- **`ScannerModule.jsx`**: Lógica core e interfaz gráfica de lector de códigos de barras / QR (usado en `AdminCheckIn` y `SponsorScanner`).
- **`CreateSponsorModal.jsx`**: Formulario modal para dar de alta manualmente a nuevos patrocinadores.
- **`BadgeTemplate.jsx` y `PrintableBadgeList.jsx`**: Componentes ocultos para renderizar y enviar las gafetes/credenciales a impresión física.

#### 4️⃣ Páginas Públicas y Estáticas
- **`AuthPage.jsx`**: Interfaz de Login y Registro de patrocinadores.
- **`ContactPage.jsx`**: Formulario para envíar solicitudes e inquietudes (Landing).
- **`PrivacyPolicy.jsx`** y **`TermsOfService.jsx`**: Documentos legales.

---
