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
- **Refactorización de Logos (Reel):** Se restauró el comportamiento de scroll horizontal infinito (marquee) para los logos de los patrocinadores, pero ahora están agrupados por categoría (Diamante, Oro, Plata, Apoyan).
- **Diseño de Logos:** Los textos indicadores de categoría se hicieron más pequeños y se alinearon a la parte superior (top) junto a la línea divisoria vertical. Se re-inyectaron logos de prueba (placeholders) de manera temporal para poder previsualizar el diseño mientras la base de datos está vacía y confirmar formato con el cliente.
- **Hero Video:** Se reemplazó el video a `presentacion-ia-karen.mp4` (4.7mb), escalado al 60%, sin controles del navegador, con un botón personalizado para mutear/desmutear. Todo esto ya está en la rama `main` de GitHub.

### Progreso Actual y Pendientes
- **Cuentas y Limpieza Demo:**
  - (Pendiente) Migración y scripts para las cuentas temporales o demos con `isDemo`.
  - (Pendiente) Job de limpieza periódica de usuarios demostrativos.

- **Preregistros y Google Sheets:**
  - **Sincronización en Tiempo Real:** Se implementó una integración en `App.jsx` que envía silenciosamente un POST al Webhook (Google Apps Script) cada vez que un visitante completa exitosamente su registro, alimentando de manera automática y gratuita un Google Sheet con los datos del visitante (Nombre, Empresa, Email, Teléfono, UTMs, etc.).

- **WhatsApp API:** (Pendiente) Integrar el envío del QR, a la espera de la configuración de la VM.
- **Correos:** (Pendiente) Aviso automático para el estatus de pre-registro -> patrocinador.
- **Logos de Patrocinadores:** (Completado) 
  - Se configuró formato 16:9 con Tailwind `aspect-video` para estandarización.
  - Se activaron y publicaron logos Diamante (incluyendo la incorporación de **BAC Credomatic** `/diamante/logo-bac.jpeg` ubicado justo antes de Noelito), Oro y Plata reales.
  - Se optimizó la animación del reel a 55s y se añadió un espaciador de 50vw para garantizar que los patrocinadores principales entren elegante y completamente visibles desde el inicio al cargar la página.
  - Se reordenó la categoría Diamante para priorizar a Sinsa.

## Próximos pasos
- Subir los logos faltantes de Oro, Plata o Apoyan (cuando el diseñador los provea) y habilitar su carga en `App.jsx`.
- Iniciar con el backend/Firebase para Cuentas Demo o migración de correos según priorice el cliente.

### 3. Envío Automático de Correo (Migración a Patrocinador)
- **Objetivo:** Enviar un correo electrónico de bienvenida automático a los usuarios cuando un administrador los migre de Preregistro a Patrocinador oficial.
- **Mecanismo propuesto:** Inyectar un documento en la colección `mail` (Trigger Email de Firebase) al completar la migración en `AdminPreRegistrations.jsx`. El correo usará una plantilla HTML personalizada que incluirá un encabezado gráfico (banner), saludo, credenciales de acceso e información logística.
- **Estado:** En espera del diseño del banner del encabezado por parte del cliente. Plan de implementación y estructura visual acordados.

---

## 📅 Resumen de Cambios Recientes (Para contexto futuro)
**Última actualización: 15 de Agosto de 2026**

- **Ordenamiento y Actualización del Reel Diamante (`App.jsx`):**
  - Se reorganizó la secuencia exacta de logotipos en la categoría **Diamante**:
    1. Grupo SUR (`/diamante/sur.png`)
    2. Kermil (`/diamante/logo-kermil.png`)
    3. Sinsa (`/diamante/sinsa.png`)
    4. Comasa (`/diamante/comasa.png`)
    5. Extel (`/diamante/extelpng.png`)
    6. BAC Credomatic (`/diamante/logo-bac.jpeg`)
    7. Ferretería Noelito (`/diamante/noelito%20.png`)
    8. Importaciones Balladares (`/diamante/importacionesballadares.png`)
    9. Romax (`/diamante/romax.jpeg`)
    10. Maximiza (`/diamante/maximiza.jpeg`)
    11. Indenicza (`/diamante/indeninicsa.png`)
    12. Arcelor (`/diamante/LOGO-ARCELOR.png` - ampliado un **20%** con `scale: 1.2`)
    13. Megalíneas (`/diamante/megalines1.png`)
    14. Flash (`/diamante/megalines.png`)
  - **Seguimiento de Assets:** Se agregaron al control de versiones (Git) todas las nuevas imágenes de patrocinadores en `public/diamante/` para despliegue inmediato en producción.

**Cambios Anteriores (14 de Agosto de 2026):**

- **Refactorización Completa del Panel de Directorio y Vista 360 de Patrocinadores (`AdminSponsors.jsx` & `AdminSponsorDetails.jsx`):**
  - **Fusión Multifuente Inteligente:** El Directorio de Patrocinadores ahora unifica en tiempo real 3 fuentes de datos: cuentas de usuarios en Firestore (`users`), estands reservados en el mapa interactivo (`events/2026/stands`) y la lista de patrocinadores oficiales confirmados de la feria (Sur, Noelito, Comasa, Extel, Sinsa, Plycem, Sicsa, JP Technology, Casco, Fernández Sera, Midenesa, etc.).
  - **Compatibilidad Bilingüe en Firestore:** Se implementaron fallbacks cruzados para soportar campos en español (`nombre`, `empresa`, `correo`, `telefono`) e inglés (`name`, `company`, `email`, `phone`), garantizando que ningún registro quede con campos vacíos.
  - **Sincronización con `reservationDetails`:** Se añadió extracción de datos anidados de reservaciones para vincular automáticamente estands (como el **Stand 38 de Ferretería Noelito / Linda Gutiérrez** o el **Stand 21 de Grupo SUR**) con sus datos de contacto, correo y teléfono, tanto en la tabla general como en la vista 360 de "Detalles".
  - **UI Adaptativa y Sin Scrollbar Horizontal:** Se ajustó la tabla a `w-full` con padding y tipografía responsive (`text-xs md:text-sm`) eliminando por completo la barra de desplazamiento horizontal. Se agregaron badges compactos para estands (`Stand 38`), roles (`Patrocinador Oficial`) y estados (`Confirmado`, `Aprobado`).
- **Restauración de Mapa Estático en Landing Page (`App.jsx`):**
  - **Restauración Temporal de SVG Estático:** Se reactivó la imagen del mapa vectorial estático `/map-expo-ferre-140826.svg` en la sección pública de la portada a solicitud del cliente mientras se afina el nuevo diseño interactivo.
  - **Mantenimiento de Código Reactivo:** Se conserva el componente [`InteractiveMap.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/InteractiveMap.jsx) intacto con la lógica de Firebase, globos con logos e interacción para integrarlo en el nuevo diseño.
  - **Marcadores de Mapa en Forma de Globos con Logo Visible:** Se transformaron los marcadores de stands reservados para mostrar directamente sus logotipos en forma de **globos de mapa (pin callouts)** con borde azul oscuro y punta indicadora.
  - **Ocultamiento de Leyenda/Cabecera en Portada:** Se removió la barra superior ("Plano de Exposición y Stands", instrucciones y leyenda de colores) en la vista pública de la portada mediante la propiedad `showHeader={false}` por defecto, logrando una integración limpia e inmersiva.
  - **Remoción de Ícono de Candado y Modal de Administración:** Se eliminaron el ícono de candado flotante (`lock`) y la ventana emergente de contraseña maestra que aparecía en la esquina inferior del mapa.
  - **Experiencia de Usuario (UX) Pública:** Ahora todos los visitantes de la landing page pueden mover, ampliar (zoom), consultar disponibilidad de estands, ver los logotipos de las marcas participantes (Sinsa, Noelito, Sur, etc.) en tiempo real e iniciar la reservación directamente desde la portada.
  - **Navegación e Identificador:** Se agregó el botón **"Plano de Stands"** en la barra de navegación principal (escritorio y menú móvil) que desplaza suavemente al ancla `#plano-stands`.
- **Webhook con Google Sheets para Preregistros:** Se integró un envio silencioso POST en `App.jsx` al Webhook de Google Apps Script para respaldar automáticamente cada preregistro público en un archivo de Google Sheets.

**Cambios Anteriores (07 de Agosto de 2026):**

**Cambios Anteriores (08 de Julio de 2026):**

- **Estandarización de Notificaciones por Correo:** Se modificaron todos los módulos (`App.jsx`, `AdminPreRegistrations.jsx`, `AuthPage.jsx`, `AdminSponsors.jsx`, `ContactPage.jsx`, `CreateSponsorModal.jsx`) para que utilicen plantillas HTML con encabezados y pies de página gráficos oficiales. Todas las notificaciones del sistema envían siempre copia a las cuentas de administración (`karen.torres@rinsa.red` y `AdmonEventKT@gmail.com`). Adicionalmente, en el correo de aprobación, el Código QR se reposicionó de forma destacada antes de la información logística del evento.
- **Gestión de Contraseñas:** 
  - Se implementó la opción "Recuperar Contraseña" en `AuthPage.jsx` mediante el servicio nativo de Firebase Auth.
  - Se añadió un botón (icono de ojo) en `AuthPage.jsx` que permite a los usuarios mostrar u ocultar su contraseña mientras la escriben, mejorando la experiencia de usuario (UX).
  - Se creó el componente `ChangePasswordForm.jsx` dentro de `SponsorDashboard.jsx` para que los patrocinadores puedan cambiar su contraseña una vez que inicien sesión de forma segura.
- **Mejoras en el Panel Administrativo y CRM:**
  - Se añadieron tarjetas de resumen visuales en la cabecera de `AdminPreRegistrations.jsx` para mostrar en tiempo real la cantidad total de preregistros y la cantidad de aprobados.
  - Se solucionó un bug lógico en el CRM (`AdminFollowUpModal.jsx`). Se integró un checkbox explícito ("Marcar como Requiere Seguimiento") que permite a los administradores encender/apagar de forma manual la bandera de estado `needsFollowUp`, logrando que el filtro "Mostrar solo Requiere Seguimiento" funcione correctamente.
- **Seguridad en Repositorio:** El usuario configuró exitosamente una llave SSH en la VM de producción para realizar descargas de código seguras desde GitHub (`git pull`) sin necesidad de re-autenticarse con tokens temporales.

**Cambios Anteriores (07 de Julio de 2026):**

- **Implementación de Mini-CRM (Seguimiento de Leads):** Se desarrolló un sistema integrado de seguimiento telefónico (CRM) dentro de las tablas de Preregistros (`AdminPreRegistrations.jsx`) e Invitados de Patrocinadores (`AdminGuests.jsx`).
  - Permite al Staff añadir notas, registrar el resultado de la llamada (Ej. Contestó, Buzón, etc.) y marcar si requieren seguimiento posterior, almacenándolo todo en un array interno (`followUps`) dentro de cada documento en Firestore para optimizar costos de base de datos.
  - Se creó un modal universal (`AdminFollowUpModal.jsx`) que muestra el historial completo de interacciones en tiempo real.
  - Se actualizaron las funciones de **Exportar a Excel** para incluir los detalles del último seguimiento y la cantidad total de llamadas realizadas a cada prospecto.
- **Reporte de Marketing Mejorado:** Se agregó la columna "Empresa" a la tabla del Reporte de Marketing (obtenida del preregistro), así como en su respectiva función de exportación a CSV para un análisis de campaña más detallado.
  - **Normalización de UTMs:** Se añadió un bloque de lógica para normalizar las fuentes (e.g. agrupando "Organico", "orgánico" bajo "Orgánico" y agrupando abreviaciones como "fb" bajo "Facebook") para que las tarjetas de resumen y la tabla muestren estadísticas precisas y sin duplicados de mayúsculas/minúsculas.

- **Prevención de Invitados Duplicados:** Se implementó en el formulario de invitados de los patrocinadores (`GuestForm.jsx`) una validación en tiempo real contra Firebase. Antes de registrar a un invitado, el sistema verifica que el correo electrónico no exista ya en la colección de `guests`. Si el correo ya fue registrado por el mismo u otro patrocinador, se bloquea el registro mostrando una alerta, previniendo gastos adicionales en catering o acreditaciones duplicadas.
- **Límites de Acreditación de Staff:** Se implementó una restricción en el registro de staff de patrocinadores (`StaffRegistration.jsx`) basada en su categoría (calculada mediante el tamaño del stand que reservaron en el mapa). Los límites dinámicos son: Plata (máximo 4 staff), Oro (máximo 6 staff) y Diamante (máximo 10 staff). El formulario deshabilita el registro y muestra contadores visuales una vez que el patrocinador alcanza su capacidad.
- **Migración Directa a Patrocinador:** En el panel de Preregistros (`AdminPreRegistrations.jsx`), los usuarios con rol de Administrador ahora pueden migrar prospectos directamente a cuentas oficiales de Patrocinador. 
  - Se diseñó un modal que solicita una contraseña inicial. 
  - Para evitar que la creación de la cuenta expulse al administrador de su sesión actual, se programó una **Instancia Secundaria de Firebase** que ejecuta la creación de la cuenta silenciosamente en segundo plano. 
  - El registro original pasa a estado "MIGRADO" en lugar de eliminarse, conservando el historial. 
  - Funcionalidad restringida por seguridad; el personal con rol `staff` no puede ver ni utilizar esta opción de migración.

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
