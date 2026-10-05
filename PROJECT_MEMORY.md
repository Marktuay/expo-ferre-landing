# Expo Ferre 2026 - Project Memory & Context

Este archivo funciona como la "memoria" del proyecto. Contiene el estado actual de la plataforma, la arquitectura utilizada y el roadmap (lo que falta por hacer) para que cualquier inteligencia artificial pueda retomar el trabajo exactamente donde se quedó.

## 🛠 Arquitectura y Stack Tecnológico
- **Frontend:** React + Vite, TailwindCSS (configurado para diseño responsivo). Desplegado y alojado en una Máquina Virtual (VM) de Google Cloud gestionado con **PM2**.
- **Backend / Base de Datos:** Firebase (Firestore y Auth) utilizado **únicamente** para autenticación y para guardar los datos recogidos en los formularios.
- **Control de Versiones & Despliegue:** Git (GitHub). Flujo de despliegue en VM: `git pull origin main && npm run build && pm2 restart all` (o `pm2 reload all`).

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

**Problema:** Al enviar invitaciones masivas por WhatsApp con WATI, la ventana de resultados arroja el error: `"Not enough credits to send the message"`.
**Causa:** Meta (WhatsApp) factura las conversaciones de Marketing de forma independiente al costo de suscripción mensual de WATI ($119/mes). Si la billetera de créditos de WATI está en $0.00, WATI rechaza el envío de la plantilla.
**Solución:** Recargar saldo prepago en la billetera de WATI (`live.wati.io/10262044`) desde **Información de facturación -> Detalles de facturación / Wallet** o desde el módulo de **Broadcast (Megáfono) -> Add Credits**.

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
  - **Invitaciones Directas (Pases de Uso Único):** Módulo administrativo (`AdminDirectInvites.jsx` y `DirectInviteRegistration.jsx`) para generar enlaces criptográficos de registro único que se autodestruyen al ser utilizados. Captura Nombre, Apellido, Correo, Celular, Ciudad, Empresa y Cantidad de Personal, emitiendo un Gafete Oficial con Código QR en pantalla y enviando automáticamente el correo de confirmación con el Speech Oficial.
    - **Listas Independientes por Patrocinador:** Barra de selector rápido (pills/tabs) para alternar entre "Invitación General" y cada uno de los 27 patrocinadores con contadores en vivo (Total, Pendientes, Registrados) y exportación de Excel independiente por lista.
    - **Edición y Actualización de Invitados:** Modal para editar datos (Nombre, Empresa, Correo, Teléfono) o reasignar la lista/patrocinador de cualquier contacto en tiempo real.
    - **Gestor de Artes (Email & WhatsApp):** Modal interactivo para subir/actualizar el Header Banner (`1200x450px`), el Footer Banner de Marcas Representadas (`1200x250px`), los **Artes/Flyers de WhatsApp** (Flyer Principal de Invitación y Flyer de Recordatorio `1080x1080px` / `1080x1350px`), el Speech de WhatsApp personalizado y los Stands asignados por patrocinador. Los cambios se sincronizan en vivo en `sponsorSettings` y aplican automáticamente a todos los enlaces de esa lista.
    - **Modal de Envío & Recordatorio por WhatsApp:** Interfaz interactiva (`whatsAppModal`) con vista previa del flyer oficial del patrocinador, botón de **[Descargar Arte Gráfico]**, botón de **[Copiar Texto Personalizado]**, selector de modo (Invitación Inicial vs Recordatorio de Registro con llamado urgente) y enlace directo a WhatsApp Web / App (`wa.me/`).
    - **Protección Antispam y Cuotas de Correo:** Envío masivo con Throttling controlado y advertencia de límite diario de 2,000 correos para evitar saturación o bloqueos del servidor.
    - **Carga Masiva (Excel / CSV):** Permite subir lotes de contactos asignándolos de inmediato al patrocinador seleccionado o detectando la columna `Patrocinador` en el Excel, con escritura por lotes atómicos (`writeBatch`) en Firestore.
    - **Descarga de Plantilla:** Botón para generar y descargar `Plantilla_Carga_Masiva_Invitaciones_ExpoFerre.xlsx` con el formato exacto requerido.
    - **Base de Stands Confirmada:** 35 stands reservados correspondientes a 27 empresas patrocinadoras activas.
  - **Check-In (Escáner QR):** Módulo funcional utilizando la cámara del dispositivo para escanear Códigos QR, buscar asistentes en la base de datos y registrar su asistencia en tiempo real con estadísticas.
- **Exportación:** Todas las tablas de administración tienen la capacidad de exportar sus datos a archivos Excel (`.xlsx`), incluyendo las últimas adiciones de campos (ej. Teléfono en Leads).

---

## 📌 Tareas Pendientes

### 🚨 Tareas Críticas de Seguridad (EN EJECUCIÓN - 05/OCT/2026)

- [x] **1. Implementar Bloqueo Estricto Fail-Closed en Autenticación Administrativa ([AdminHub.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminHub.jsx#L148-L215)):**
  - **Estado:** ✅ **Completado y Verificado.**
  - **Detalle de Solución:**
    1. Si `cleanEmail === MASTER_EMAIL` (`marktuay@gmail.com`), concede acceso directo de Super Admin sin depender de Firestore.
    2. Para cualquier otro usuario autenticado con Firebase Auth, se realiza una búsqueda estricta en `events/2026/systemUsers`.
    3. Si la cuenta NO existe en `systemUsers` (o falla la consulta), ejecuta de inmediato `await auth.signOut()` y arroja *"Acceso denegado: Esta cuenta no cuenta con permisos administrativos."*
    4. Si existe, asigna su rol oficial (`role: foundUser.role`).

- [ ] **2. Erradicación de Contraseñas en Texto Plano en Firestore (Pospuesto para Post-Evento):**
  - **Decisión Operativa (05/Oct/2026):** Se mantiene la funcionalidad tal cual está para no alterar la logística operativa del staff y organizadores a pocos días del evento (16-17 de Octubre de 2026). El equipo administrativo (`karen.torres`, `admoneventkt`, etc.) requiere tener las claves legibles para coordinar el acceso de `usuario1` (personal de escáner en puerta) y patrocinadores sin riesgo de fricción técnica o bloqueos. Queda documentado como mejora arquitectónica para la fase posterior al evento.

- [x] **3. Endurecimiento de Validación de Super Administrador Maestro ([AdminHub.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminHub.jsx#L28-L34)):**
  - **Estado:** ✅ **Completado y Verificado.**
  - **Detalle de Solución:** Se eliminó la coincidencia parcial laxa `.includes('marktuay')`. Ahora se restringe mediante comparación de igualdad estricta `=== 'marktuay@gmail.com'` sobre el correo verificado.

- [ ] **4. Validación Criptográfica de Sesión con Firebase Auth ([App.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx#L130-L145)):**
  - **Problema:** `adminUser` se inicializa y confía ciegamente en un JSON plano guardado en `localStorage` sin comprobar la existencia de una sesión activa en Firebase Auth.
  - **Acción a ejecutar:** Escuchar `onAuthStateChanged(auth)`. Si no hay usuario autenticado en Firebase Auth, forzar `setAdminUser(null)` y limpiar `localStorage` para evitar manipulación manual desde DevTools.

---

### 📋 Otras Tareas Pendientes

- **1. Revisión y Adjudicación de los 9 Contactos Duplicados Inter-Patrocinador (En espera de decisión del organizador):**
  - Josué David (*Ferretería Gonzalez Sevilla*): Fernández Sera vs Importaciones Balladares.
  - Delvis / Devil (*Ferretería Areas*): Fernández Sera vs Importaciones Balladares.
  - Fidel Rodríguez (*Ferretería Rodríguez Reyes*): Importaciones Balladares vs Megalineas.
  - Marco José (*Logística Constructiva la Fortaleza*): Importaciones Balladares vs Plycem.
  - Denis Javier (*Ferretería Rey de Reyes Siuna*): Importaciones Balladares vs Ferretería Noelito.
  - Ferretería Estrella Dorada (*Regina vs Cristina*): Megalineas vs MIDESA.
  - Jesús Antonio (*Ferretería Jehová es mi Pastor / Jireth*): Plycem vs Ferretería Noelito.
  - Ferretería Central (*Julio Cesar vs José Adán*): Importaciones Balladares vs Plycem.
  - Rodrigo (*Negocios de Oriente vs Personal Midesa*): Fernández Sera vs MIDESA.

- **2. Carga de Artes Gráficos (Header/Footer) y Speeches Personalizados:**
  - Subir los banners de Header (`1200x450px`) y Footer de Marcas Representadas (`1200x250px`) para los patrocinadores restantes a través de la interfaz.

---

## 📅 Resumen de Cambios y Avances de la Sesión (01 de Octubre de 2026)

### 🏷️ Actualización de Logotipos y Carrusel de Patrocinadores (`App.jsx` & `AdminSponsors.jsx`)
- **Inclusión de 6 Logotipos en Categoría Diamante (`02-logos`):**
  - Se añadieron e integraron en el reel de logotipos y directorio oficial las 6 marcas ubicadas dentro de `/public/diamante/02-logos/`, ubicadas inmediatamente después del logotipo de **Sinsa**:
    1. **DEWALT** (`/diamante/02-logos/DEWALT.png`)
    2. **INGCO** (`/diamante/02-logos/INGCO.png`)
    3. **LIGHTMAX** (`/diamante/02-logos/LIGHTMAX.png`)
    4. **Phelps Dodge** (`/diamante/02-logos/PhelpsDodge.jpg`)
    5. **Porcelanite** (`/diamante/02-logos/Porcelanite.png`)
    6. **Electrix** (`/diamante/02-logos/electrix.png`)
  - Configurados con contenedor blanco estilizado (`bgWhite: true`) para consistencia visual con el resto de marcas Diamante.
- **Inclusión de "La Casa del Perno" en Categoría Plata:**
  - Se incorporó el logotipo oficial de **La Casa del Perno** (`/plata/la-casa-del-perno.png`) posicionado al final de la categoría Plata en el reel principal y listado de patrocinadores.

### 📲 Integración Oficial de WhatsApp Business API vía WATI (`src/services/watiService.js`)
- **Conexión Exitosa con Servidor WATI:**
  - Se validó y autenticó la conexión directa con el Tenant ID oficial de WATI (`10262044`).
  - **Endpoint API Oficial:** `https://live-mt-server.wati.io/10262044`
  - **Token de Acceso Bearer:** Configurado y verificado mediante llamadas directas.
  - **Soporte de Navegador / CORS:** Verificado mediante preflight OPTIONS (`Access-Control-Allow-Origin: *` reflejado), permitiendo llamadas directas desde la aplicación web sin depender de intermediarios.
- **Creación de Servicio Especializado (`src/services/watiService.js`):**
  - Módulo con normalización automática de teléfonos para Nicaragua (formato internacional `505` para números de 8 dígitos, limpieza de espacios y guiones).
  - Funciones preparadas:
    - `getWatiMessageTemplates()`: Para consultar las plantillas activas y su estado en Meta.
    - `checkTemplateStatus()`: Verifica si la plantilla está `APPROVED`, `PENDING` o `REJECTED`.
    - `sendWatiTemplateMessage()`: Envío por API con payload de parámetros dinámicos a través de `POST /api/v1/sendTemplateMessage`.
    - `sendDirectInviteViaWati()`: Helper directo para vincular con las invitaciones de Firestore (`directInvites`).
- **Plantilla Oficial Creada en WATI (`invitacion_expoferre`):**
  - Creada en el panel de Wati y enviada a revisión de Meta.
  - Parámetros dinámicos definidos:
    - `{{1}}`: Nombre del invitado.
    - `{{2}}`: Patrocinador anfitrión (o *El Comité Organizador de EXPO FERRE*).
    - `{{3}}`: Enlace único de acceso y generación de gafete con QR.
  - Estado al cierre de sesión: ⏳ **`PENDING`** (Esperando aprobación de Meta).
- **Estado de Aprobación en Meta (Consultado en vivo):**
  - Plantilla `invitacion_expoferre`: ⏳ **`PENDING`** (En revisión activa por Meta).

### 🚀 Implementación de Flujos de Envío WATI (02 de Octubre de 2026)
- **Opción 1: Envío Masivo por Patrocinador y General:**
  - Botón **`⚡ WhatsApp WATI`** añadido en el encabezado de "Invitación General" y en cada una de las 27 pestañas/listas de patrocinadores.
  - Modal interactivo de despacho masivo (`bulkWatiModal`) con:
    - Selector de filtro: *Solo pendientes de enviar WhatsApp*, *Todos los que tienen teléfono*, o *Solo reenvío*.
    - Barra de progreso en tiempo real con contador (Enviados, Omitidos, Fallidos).
    - Cadencia segura antispam de 1.0s entre cada mensaje para proteger el número contra flags de WhatsApp/Meta.
    - Botón de cancelación / parada de emergencia en cualquier momento.
    - Resumen detallado al finalizar y actualización automática de Firestore (`whatsappSent: true`, `whatsappSentAt`).
- **Opción 3: Envío Individual 1-Click:**
  - Botón **`⚡ Wati`** directo en cada fila de la tabla de invitados para envío instantáneo sin abrir la app de WhatsApp.
  - Tarjeta de envío directo 1-click vía API de WATI integrada dentro del modal de WhatsApp (`whatsAppModal`).
  - Indicador de estado de la plantilla (avisa si la plantilla aún está en revisión por Meta o si ya está lista).
  - Toast de confirmación en pantalla al completar el envío.

### 🏷️ Inclusión de PBS y Chevrolet en Categoría Plata (02 de Octubre de 2026)
- Se integraron los logotipos oficiales de **PBS** (`/plata/pbs.png`) y **Chevrolet** (`/plata/chevrolet.jpg`) dentro del reel de marcas patrocinadoras en la **Categoría Plata** en la Landing Page (`App.jsx`) y en el directorio de patrocinadores (`AdminSponsors.jsx`), estilizados con contenedor blanco uniforme (`bgWhite: true`).
- **Ajuste de Escala:** Se aumentó el tamaño visual del logo de Chevrolet en un 10% (`scale: 1.1`) para garantizar máxima presencia y balance con el resto de marcas.

### 📐 Corrección y Optimización de la Interfaz de Invitaciones Directas (`AdminDirectInvites.jsx`)
- **Problema Solucionado:** La columna de acciones acumulaba demasiado ancho horizontal, lo que ocasionaba que el botón de *Exportar a Excel* se cortara en el borde derecho en pantallas de resolución estándar de laptop.
- **Solución Implementada:**
  - Etiquetas compactadas y ergonómicas (`Cargar`, `Correos`, `Wati`, `Ver`, `Descargar Plantilla`, `Exportar Excel`), ahorrando más de 110px de espacio horizontal.
  - Reglas de contención responsivas: `overflow-x-auto pb-1`, `min-w-[1200px]` en la tabla de patrocinadores y `min-w-[1120px]` en la tabla de invitados, más padding de seguridad (`pr-6`), garantizando que ningún botón se oculte bajo ningún tamaño de pantalla.
- **Corrección en Envío Masivo WATI (`handleExecuteBulkWati`):**
  - Se corrigió el error `invite is not defined` en el bucle de despacho masivo (se reemplazó la variable no declarada `invite` por `invite: inv`). El envío masivo por patrocinador ahora procesa cada contacto de la lista sin interrupciones.

### 📌 Estado Actual y Siguientes Pasos
- **Plantilla WATI (`invitacion_expoferre`):** ✅ **`APPROVED` por Meta** (Aprobada oficialmente y lista para envíos reales).
- **Prueba individual:** Ejecutada con éxito rotundo al número del administrador (+50558711106) con entrega confirmada.
- **Envío masivo:** Corregido y listo para despacho lista por lista.

---

## 📅 Resumen de Cambios y Avances de la Sesión (28 de Septiembre de 2026)

### ✉️ Motor de Recordatorios Masivos por Correo Electrónico (`AdminDirectInvites.jsx`)
- **Botón `🔔 Recordatorio Masivo ({totalUnregisteredWithEmail})`:**
  - Ubicado en el header del Medidor de Despacho, permite lanzar el flujo de recordatorios masivos por correo para todos los contactos con email válido que aún tienen estado `PENDIENTE REGISTRO`.
- **Plantilla Oficial de Correo de Recordatorio:**
  - Asunto oficial: `🔔 Recordatorio: Tu Pase para EXPO FERRE 2026 con [Patrocinador]` (o pase exclusivo general).
  - Cuerpo HTML institucional con header banner, saludo personalizado (`[Nombre]`), botón de acción `🎟️ Completar Mi Registro y Activar Pase`, recordatorio de datos clave (`17 de Octubre`, `Crowne Plaza Managua`, `8:00am`), aviso de uso único y cinta footer de marcas.
- **Selector Inteligente de Criterios en el Modal Masivo:**
  - *Opción 1 (Primer Envío):* Solo a quienes nunca han recibido correo.
  - *Opción 2 (Recordatorio a Todos):* A todos los pendientes de registrarse con correo válido.
  - *Opción 3 (Solo Reenvío):* Exclusivamente a quienes ya recibieron un primer correo pero aún no se han registrado.
- **Límite de Cupo Diario Protegido:**
  - 2,000 correos/día con pausas antispam reguladas y selector de lotes (25, 50, 100 o Todos).

### 🔔 Notificaciones de Recordatorio por WhatsApp para Invitados Pendientes (`AdminDirectInvites.jsx`)
- **Speech Oficial de Recordatorio Homologado:**
  - Se creó el generador corporativo `buildCorporateReminderSpeech` que personaliza automáticamente el mensaje según sea invitación general o por patrocinador (mencionando el stand oficial si aplica).
  - Incluye: saludo con nombre dinámico (`[Nombre]` / `{invitado}`), fecha oficial (`17 de Octubre`), lugar (`Centro de Convenciones Crowne Plaza Managua`), hora (`8:00am`), llamado a la acción para generar su Gafete con Código QR y enlace único criptográfico personal e intransferible.
- **Botón Dedicado "Recordar" (🔔) en la Tabla de Invitaciones:**
  - Los contactos con estado `PENDIENTE REGISTRO` cuentan ahora con un botón de acción en color ámbar/dorado (`Recordar`) que abre instantáneamente WhatsApp con el número pre-marcado (`+505...`) y el mensaje de recordatorio listo para enviar con 1 solo clic.
  - Se agregó soporte para copiar el Speech de Recordatorio directamente al portapapeles con confirmación visual de copiado.
- **Diagnóstico de Conexión y Dominios Autorizados de Firebase:**
  - Se verificó y resolvió el bloqueo de red por extensiones en el navegador (`auth/network-request-failed`) asegurando el acceso tanto en local como en producción mediante dominios autorizados y modo incógnito.

---

## 📅 Resumen de Cambios y Avances de la Sesión (27 de Septiembre de 2026 - Tarde)

### 🏆 Premios a la Excelencia Ferretera (Actualización Completa del Sistema de Nominación & Jurados)
- **Nomenclatura y Pestañas Actualizadas:**
  - Se eliminó la palabra `PASO` del formulario del jurado (`JudgeEvaluationForm.jsx`), reemplazándola por las pestañas oficiales:
    - **Pestaña 1:** `Categoría 1 FAMILIA`
    - **Pestaña 2:** `Categoría 2 ORO`
    - **Pestaña 3:** `Categoría 3 Promesa`
- **Bloque Explicativo del Sistema de Nominación y Ranking:**
  - Se incorporó la guía oficial para los jurados:
    - Cada jurado deberá nominar 5 ferreterías por categoría y asignarles un ranking del 1 al 5 (**1 = Mayor valoración**, **5 = Menor valoración**).
    - El 1.º lugar será la ferretería con mayor valoración según los criterios establecidos.
- **Criterios de Evaluación Oficiales por Categoría:**
  - **01. Ferretería Familiar:** Trayectoria familiar / generacional (permanencia y continuidad), Reputación (confianza y reconocimiento) y Adaptación (evolución sin perder esencia).
  - **02. Ferretería Oro:** Antigüedad (más de 25 años de trayectoria), Reputación y Reconocimiento sectorial, y Evolución.
  - **03. Ferretería Promesa:** Antigüedad (menos de 5 años en el mercado nicaragüense), Crecimiento y reputación, Posicionamiento y Diferenciación.
- **Etiquetado de Slots de Nominación:**
  - Slot 1: `1.º Lugar (Mayor valoración)`
  - Slot 2: `2.º Lugar`
  - Slot 3: `3.º Lugar`
  - Slot 4: `4.º Lugar`
  - Slot 5: `5.º Lugar (Menor valoración)`
- **Puntuación Ponderada y Tabla de Ranking en Vivo (`AdminJury.jsx`):**
  - Se implementó el cálculo ponderado donde 1.º lugar = 5 pts, 2.º = 4 pts, ..., 5.º = 1 pto.
  - La tabla de resultados y la exportación a Excel ahora muestran tanto el **Puntaje Ponderado Total (⭐ pts)** como el **Total de Nominaciones (votos)** y el desglose individual por jurado.

### ✉️ Motor de Invitaciones Directas & Artes Co-Brandeados (`AdminDirectInvites.jsx`)
- **Reactividad Inmediata de Miniaturas de Arte:**
  - Se corrigió la fila de "Invitación General" en la tabla del directorio para que consuma dinámicamente `getSponsorArt('general')` en lugar de URLs estáticas. Al subir y guardar un banner, la miniatura se actualiza en tiempo real con su indicador verde de arte listo.
- **Homologación del Speech Oficial Exacto:**
  - Se configuró el texto corporativo exacto solicitado en todas las listas de patrocinadores:
    - Saludo: `Hola [Nombre],` (soporta `[Nombre]` y `{invitado}`).
    - Evento: `17 de Octubre`, `Centro de Convenciones Crowne Plaza Managua`, `8:00am`.
    - Enlace único dinámico con disclaimer de uso único y autodestrucción.
- **Reconocimiento y Mapeo de Marcas:**
  - Madinisa / Sonax (Stand 25, Plata) configurado con correspondencia bidireccional.
  - Limpieza de palabras clave en `getSponsorKey` y modal masivo para cálculo de destinatarios 100% exacto.

## 📅 Resumen de Cambios y Avances de la Sesión (27 de Septiembre de 2026 - Mañana)

- **Sincronización Total de 35 Stands Reservados en Firestore (`events/2026/stands`):**
  - Se cargaron e integraron los 35 stands oficiales de acuerdo a la tabla maestra autorizada y al plano de MAXIMIZA:
    - **Stands 1, 2, 3, 4:** Sinsa (Diamante)
    - **Stand 5:** ARMOCONSA (Oro)
    - **Stands 6, 16:** Importaciones Balladares Nicaragua (Diamante)
    - **Stand 7:** FUTEC (Plata)
    - **Stands 8, 14:** Precom - Monolit (Plata)
    - **Stands 9, 10, 36:** Disponibles / Libres
    - **Stand 11:** Extel (Diamante)
    - **Stand 12:** SherwinWilliams (Plata)
    - **Stand 13:** Fernandez Sera (Plata)
    - **Stand 15:** Sicsa Nicaragua (Oro)
    - **Stands 17, 18:** Holcim - Disensa (Oro)
    - **Stands 19, 20:** Megalineas (Diamante)
    - **Stand 21:** Grupo Sur (Diamante)
    - **Stands 22, 23:** CEMEX (Diamante)
    - **Stand 24:** AMANCO - WAVIN (Plata)
    - **Stand 25:** Madinisa (Plata)
    - **Stand 26:** LAFISE (Diamante)
    - **Stands 27, 28:** Indenicsa (Diamante)
    - **Stand 29:** Parques Industriales en Carretera Nueva a León (Oro)
    - **Stand 30:** Plycem (Oro)
    - **Stand 31:** BAC (Diamante)
    - **Stand 32:** Casco (Plata)
    - **Stand 33:** TIGO (Oro)
    - **Stand 34:** INCASA - GRUPO IPSM (Diamante)
    - **Stand 35:** EATON (Diamante)
    - **Stand 37:** MIDESA (Plata)
    - **Stand 38:** Ferreteria Noelito (Diamante)
  - `defaultStands.js` y `AdminDirectInvites.jsx` actualizados con correspondencia de nombres, logos, categorías y reconocimiento automático de pestañas de Excel.
  - **Corrección de Bug en Modal de Artes (`AdminDirectInvites.jsx`):** Se corrigió el bloqueo del botón "Subiendo..." al cambiar de patrocinador. Ahora se resetean automáticamente los estados de subida (`isUploadingHeader`, `isUploadingFooter`, `isSavingArt`) tanto al abrir como al cerrar el modal, se agregó tiempo límite de seguridad (timeout) en la subida a Firebase Storage y se limpia el valor del input file (`e.target.value = ''`).

## 📅 Resumen de Cambios y Avances de la Sesión (26 de Septiembre de 2026)

- **Carga Masiva Exitosa de 151 Invitaciones Directas en Firestore:**
  - Se generaron 151 registros con tokens únicos (`events/2026/directInvites`) distribuidos entre: Importaciones Balladares, Fernández Sera, Megalineas, Plycem, Ferretería Noelito, MIDESA, Monolit, Sicsa Nicaragua, Casco, Sonax y la Invitación General.
  - Todos los contactos disponen de enlaces personalizados, speech oficial predeterminado y estado `pending`.

- **Soporte para Libros Excel Multi-Pestaña en 1 Solo Archivo (`AdminDirectInvites.jsx`):**
  - Función `handleFileUpload` mejorada para recorrer todas las pestañas de un archivo Excel.
  - Detección inteligente de patrocinador por el nombre de la pestaña (ej. `SUR`, `Fernandez Sera`, `Balladares`, `Sicsa`, `Cemex`, etc.) o por columna interna `Patrocinador`.
  - Desglose visual en el modal de confirmación con píldoras de conteo por pestaña.

- **Lector de Excel Inteligente y Multi-Estrategia:**
  - Detección de encabezados en las primeras 15 filas (soporta banners combinados y títulos en filas superiores).
  - Normalización de sinónimos (`Nombre`, `Cliente`, `Contacto`, `Destinatario`, `Representante`, `Telefono`, `Celular`, `WS`, `Correo`, `Email`).
  - Respaldo heurístico de contenido si no hay nombres de columnas formales.

- **Blindaje y Seguridad Permanente de Stands contra Pérdida de Datos:**
  - Eliminación de llamadas automáticas de inicialización (`seedOfficialStands`) en `InteractiveMap.jsx` y `AdminSponsorsHub.jsx`.
  - Protección de reservas en `src/config/defaultStands.js`: ignora stands ya ocupados y usa `{ merge: true }`.

- **Motor Universal de Speeches Oficiales y Co-Branding:**
  - Auto-generación del speech oficial estándar y asunto de correo para los 27 patrocinadores inyectando variables dinámicas (`{invitado}`, `[Nombre]`, `{enlace}`, fecha y stands).
  - Speeches específicos personalizados para **Grupo SUR**, **Fernández Sera**, **Importaciones Balladares** y **Sicsa Nicaragua**.

- **Historial de Commits en Git (Rama `main`):**
  - `6440c31`: *feat(invites): support multi-sheet multi-sponsor Excel workbook in a single upload*
  - `ad91571`: *feat(invites): implement universal standard speech and email subject auto-generation for all sponsors*
  - `73e8c2f`: *feat(invites): configure official custom speech for Sicsa Nicaragua*
  - `8b742ea`: *feat(invites): configure official custom speech for Importaciones Balladares*
  - `0865556`: *feat(invites): configure official custom speech for Fernandez Sera*
  - `0f7d6b5`: *feat(invites): robust multi-strategy excel parser supporting all sponsor contact list formats*
  - `933ff45`: *fix(map): completely eliminate auto-seed wipe risk on map load*
  - `af9c04d`: *fix(stands): protect existing reservations and prevent auto-seeding resets*

- **Comando de Despliegue en VM de Producción:**
  ```bash
  git pull origin main && npm run build && pm2 restart all
  ```


- **Sistema de Envío Masivo de Invitaciones por Correo Electrónico (`AdminDirectInvites.jsx`):**
  - **Despacho Masivo Directo desde la Plataforma:** Se implementó el motor de envío masivo de correos oficiales para la Invitación General y para cada uno de los 27 patrocinadores.
  - **Modal de Configuración y Seguridad de Envío:**
    - Muestra la vista previa del Header Banner, Footer de Marcas y números de stand.
    - Selector de criterio:
      - 🔘 *Solo a los que nunca se les ha enviado correo* (Recomendado para prevenir envíos duplicados).
      - 🔘 *A todos los pendientes con correo registrado* (Para reenvíos y recordatorios).
    - Barra de progreso en tiempo real con contador en vivo (`Enviando X / Y...`) y reporte final con desglose de éxitos y fallos.
  - **Generador de Plantilla HTML Co-Brandeada (`buildInviteEmail`):**
    - Header Banner (`1200x450px`) responsive con logo del patrocinador y ExpoFerre.
    - Saludo formal personalizado con el nombre del invitado.
    - Llamado a la acción con botón principal `🎟️ Activar Mi Pase Exclusivo` enlazado a su token único de un solo uso.
    - Caja de aviso de seguridad sobre el enlace de un solo uso.
    - Caja informativa del evento (16 y 17 de Octubre de 2026, Crowne Plaza Managua, Stand Anfitrión).
    - Footer Banner (`1200x250px`) con la cinta de marcas oficiales representadas.
  - **Trazabilidad y Auditoría en Firestore:**
    - Cada documento en `events/2026/directInvites` se actualiza automáticamente con `emailSent: true`, `emailSentAt: serverTimestamp()`, `lastEmailTo` y `emailSendCount`.
    - En la vista de detalle de invitados, se muestra el badge de estado (`✉️ Correo Enviado (1)`, `⏳ Correo No Enviado`, `⚠️ Sin Correo`).

- **Rediseño y Alineación de la Botonera de Acciones (`Toolbar` horizontal unificado):**
  - Se estructuraron los botones de la columna **"CARGA & ACCIONES"** en una sola barra horizontal elegante, eliminando saltos de línea irregulares:
    - **`[Cargar Excel]`** (Azul con icono `FileUp`).
    - **`[Enviar Correos (X)]`** (Ámbar/Verde con icono `MailCheck` y badge con contador dinámico de correos listos).
    - **`[Ver (X)]`** (Blanco con borde e icono `Users`).
    - **`[📥 Plantilla]`** (Icono de descarga de plantilla Excel para ese patrocinador).
    - **`[📊 Exportar]`** (Icono verde Excel para descargar la base con enlaces únicos y speech listos).

- **Unificación de Fechas Oficiales del Evento:**
  - Se corrigieron y unificaron todas las fechas a **16 y 17 de Octubre de 2026** en:
    - Landing page (`App.jsx` footer y sección del taller).
    - Módulo de Prerregistros y correo de aprobación (`AdminPreRegistrations.jsx`).
    - Invitaciones directas, speech de WhatsApp y correos (`AdminDirectInvites.jsx` y `DirectInviteRegistration.jsx`).
    - Sede oficial: **Centro de Convenciones Crowne Plaza, Managua** (Salón Gran Darío).

- **Carga Masiva de Contactos y Plantillas Excel para Invitaciones Directas:**
  - Procesamiento ultra rápido en el navegador con `xlsx`.
  - Validaciones de columnas flexibles (`Nombre`, `Empresa`, `Correo`, `Telefono`, `Patrocinador`).
  - Lotes atómicos (`writeBatch`) en Firestore capaces de procesar bases de 300+ contactos en segundos.
  - Botón de descarga de plantilla oficial con ejemplos.

- **Diseño y Arquitectura de Co-Branding para Patrocinadores:**
  - Soporte de 2 piezas de arte por patrocinador:
    1. **Header Banner (`1200x450px`):** Co-branding ExpoFerre + Patrocinador + Stand asignado + Fecha/Lugar.
    2. **Footer Banner (`1200x250px`):** Franja de logos de marcas representadas en exhibición.
  - Campos `headerBannerUrl`, `footerBannerUrl`, `sponsorName`, `sponsorStands` conectados dinámicamente a la pantalla de registro, gafete y plantilla de correo.
  - Lista de 27 patrocinadores verificada en base de datos en vivo (35 stands reservados en total).

- **Filtrado de Stands y Edición de Patrocinadores en Vista 360 (`AdminSponsorDetails.jsx` & `AdminSponsors.jsx` & `AdminSponsorsHub.jsx`):**
  - **Corrección de Conteo KPI en Hub (`AdminSponsorsHub.jsx` & `AdminPanel.jsx`):** Se corrigió el cálculo de la tarjeta de métricas "STANDS RESERVADOS" en la pantalla de *Gestión de Patrocinadores* para evaluar de forma exhaustiva cualquier variación de estatus o estand que contenga datos de reservación/patrocinador. Esto solucionó el conteo estancado en 24/38, reflejando ahora la totalidad real de estands ocupados en tiempo real.
  - **Corrección de Conteo de Stands Reservados:** Se amplió la consulta en `AdminSponsors.jsx` retirando la restricción de estatus estricto (`where('status', 'in', ['reserved', 'sold'])`) para incluir cualquier variación de estatus o estands vinculados por `sponsorId` o `reservationDetails`. Asimismo, en `AdminSponsorDetails.jsx` se derivó siempre la propiedad formateada `standName = st.name || 'Stand ' + st.id` para evitar que estands con nombres implícitos en Firestore fuesen omitidos del conteo o de la vista 360.
  - **Corrección de Nombres y Cantidad de Stands en Directorio:** Se corrigió la función `updateCombined` en `AdminSponsors.jsx` para extraer de forma segura el nombre del estand y purgar elementos nulos en `standList`. Esto resolvió las etiquetas vacías `[  ]` que aparecían en la tabla para William Herrera (Sinsa), Sherwin-Williams, Megalineas, Grupo SUR, MIDESA, etc., mostrando ahora de forma precisa los nombres (ej. `Stand 1`, `Stand 2`) y la cantidad total real de estands reservados.
  - **Edición de Información de Contacto, Password y Notificación por Correo (Acceso Universal para Administradores):** Se agregó el botón de **"✏️ Editar Información"** y un modal dinámico para modificar los datos del patrocinador (Empresa, Nombre del contacto, Apellido, Correo Electrónico, Teléfono y **Contraseña / Password**). Funcionalidad habilitada y operativa para todas las cuentas con rol de Administrador (`role: 'admin'`). Al guardar:
    1. Se actualizan las colecciones `users` y `events/2026/stands` en Firestore.
    2. Se inyecta un documento en la colección `mail` (Trigger Email) para notificar automáticamente al nuevo usuario/contacto con sus datos y credenciales de acceso (Usuario/Correo y Contraseña).

- **Fondo Blanco para Logo de Sherwin Williams en Categoría Plata (`App.jsx`):**
  - Se habilitó la propiedad `bgWhite: true` para la tarjeta del logo de **Sherwin-Williams** (`/plata/logo-sherwin-williams.jpg`), garantizando que se renderice con un contenedor blanco brillante de contraste consistente igual al resto de marcas.

- **Adición de Logo Dat Analytics en Categoría Plata (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregó el logo oficial de **Dat Analytics** (`/plata/dataanalytics.jpg`) al final del reel de la categoría **Plata**:
    1. Fernández Sera
    2. Sherwin-Williams
    3. Casco
    4. Midesa
    5. Madinisa
    6. Sonax
    7. **Dat Analytics**

- **Adición de Logos Incasa, Panelconsa, Steelmax y Eaton en Categoría Diamante (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregaron los logos oficiales de **Incasa** (`/diamante/incasa.png`), **Panelconsa** (`/diamante/panelconsa.png`), **Steelmax** (`/diamante/steelmax.png`) y **Eaton** (`/diamante/eaton.jpeg`) al final del reel de la categoría **Diamante**:
    - ...
    - Romax
    - Maximiza
    - **Incasa**
    - **Panelconsa**
    - **Steelmax**
    - **Eaton**

- **Corrección de Número y Tamaño de Stand en el Panel de Reservaciones (`AdminPanel.jsx`, `defaultStands.js`, `AdminSponsorDetails.jsx`, `SponsorActivity.jsx`):**
  - **Diagnóstico:** Los documentos de estands precargados en Firestore contenían la propiedad `id` (ej. `'stand-1'`), pero carecían de la propiedad `name` (ej. `'Stand 1'`) y `size` (ej. `'Oro (4x3 mts)'`). Al renderizar la columna "Stand", el valor `{stand.name}` resultaba `undefined`, dejando la celda vacía en la tabla.
  - **Solución:**
    1. Se inyectó una función de extracción y *fallback* dinámico en `AdminPanel.jsx` asociando `doc.id` con `initialStandsList` de `InteractiveMap.jsx`. Ahora, si un registro no posee `name` explícito, se formatea automáticamente como **Stand 1**, **Stand 2**, etc. y se muestra su categoría/dimensiones.
    2. Se actualizó la función `seedOfficialStands` en `defaultStands.js` para que guarde explícitamente `name`, `size` y `price` en Firestore.
    3. Se agregaron *fallbacks* idénticos en `AdminSponsorDetails.jsx` y `SponsorActivity.jsx`.

- **Aumento del Logo de Tigo en Categoría Oro (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregó el logo oficial de **Tigo** (`/oro/tigo.png`) en el reel de logos de la categoría **Oro**, ubicado inmediatamente antes de **JP Studio**, con una escala ampliada al **132%** (`scale: 1.32`):
    1. Plycem
    2. Sicsa
    3. Armoconsa
    4. Holcim
    5. Disensa
    6. **Tigo** (`scale: 1.2`)
    7. JP Studio / Technology

- **Adición de Logo Sylvania en Categoría Diamante (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregó el logo oficial de **Sylvania** (`/diamante/sylvania.jpg`) en el reel de logos de la categoría **Diamante**, ubicado inmediatamente después de **Importaciones Balladares**:
    - ...
    - BAC
    - Importaciones Balladares
    - **Sylvania**
    - Cemex
    - ...

- **Adición de Logos Madinisa y Sonax en Categoría Plata (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregaron los logos oficiales de **Madinisa** (`/plata/madinisa.png`) y **Sonax** (`/plata/sonax.jpg`) en el reel de logos de la categoría **Plata**, ubicados al final de la categoría:
    1. Fernández Sera
    2. Sherwin-Williams
    3. Casco
    4. Midesa
    5. **Madinisa**
    6. **Sonax**

- **Adición de Logos Holcim y Disensa en Categoría Oro (`App.jsx` & `AdminSponsors.jsx`):**
  - Se agregaron los logos oficiales de **Holcim** (`/oro/holcim.jpeg`) y **Disensa** (`/oro/disensa.jpeg`) en el reel de logos de la categoría **Oro**, ubicados exactamente después de **Armoconsa**:
    1. Plycem
    2. Sicsa
    3. Armoconsa
    4. **Holcim**
    5. **Disensa**
    6. JP Studio / Technology

- **Sistema de Invitación a Conferencistas por Correo, WhatsApp y Enlace Directo:**
  - **`InviteSpeakerModal.jsx`:** Nuevo componente que permite al patrocinador enviar una invitación a su speaker mediante:
    - Correo electrónico formal con plantilla HTML e imágenes oficiales de ExpoFerre 2026 (procesado por Firebase Trigger Email `collection(db, 'mail')`).
    - Enlace directo de auto-registro en portapapeles.
    - Mensaje pre-redactado de WhatsApp.
  - **`SpeakerForm.jsx`:** Actualizado para procesar parámetros de URL (`sponsorId`, `sponsorName`, `sponsorEmail`) y desplegar el distintivo *"Conferencia invitada por: [Empresa Patrocinadora]"*, vinculando la conferencia automáticamente.
  - **`SponsorDashboard.jsx`:** Tarjeta de conferencias dividida con dos opciones: *"Enviar Invitación"* y *"Registrar Yo Mismo"*.
  - **`App.jsx`:** Detecta rutas públicas (`?form=speaker`) para que el conferencista llene sus datos sin necesidad de autenticarse.

- **Sincronización Oficial del Mapa de Estands con Tabla Comercial (`defaultStands.js` & Firestore):**
  - Se reconfiguró la plantilla maestra de estands (`DEFAULT_OFFICIAL_STANDS`) para coincidir 100% con la tabla final de ventas del cliente:
    - **Sinsa:** Stands 1, 2, 3 y 4
    - **ARMOCONSA:** Stand 5
    - **Importaciones Balladares:** Stands 6 y 16
    - **Extel:** Stand 11
    - **Sherwin-Williams:** Stand 12
    - **Fernández Sera:** Stand 13
    - **Sicsa Nicaragua:** Stand 15
    - **Megalineas:** Stands 19 y 20
    - **Grupo SUR:** Stand 21
    - **CEMEX:** Stands 22 y 23
    - **LAFISE:** Stand 26
    - **Indenicsa:** Stands 27 y 28
    - **Plycem:** Stand 30
    - **BAC Credomatic:** Stand 31
    - **Casco:** Stand 32
    - **MIDESA:** Stand 37
    - **Ferretería Noelito:** Stand 38
    - **Empresas sin estand asignado:** Romax, JP Technology, Madinisa
    - **Estands Libres:** 7, 8, 9, 10, 14, 17, 18, 24, 25, 29, 33, 34, 35, 36

**Cambios Anteriores (21 de Agosto de 2026):**

- **Ordenamiento y Adición de Patrocinadores Diamante (`App.jsx` & `AdminSponsors.jsx`):**
  - Se configuró el orden exacto de 19 marcas en la categoría Diamante (Sur, Kermil, Megalineas, Pensilvania, Flash Mark, Sinsa, Comasa, Extel, **Nitrotel**, BAC, Importaciones Balladares, Cemex, Construrama, Cemento Canal, Noelito, Banco LAFISE, Indenicsa, ArcelorMittal, Romax y Maximiza).
  - **Corrección de Imagen de Megalineas:** Se solucionó el cruce de imágenes donde `megalines.png` correspondía a **Flash Mark** y `megalines1.png` correspondía a **Megalineas**.
  - **Nuevo Integrante:** Se agregó el logo de **Nitrotel** (`/diamante/nitrotel.png`) ubicado inmediatamente después de Extel.
  - **Actualización de Marca:** Se reemplazó el logo de Importaciones Balladares por su versión oficial limpia con texto azul (`/diamante/balladares.png`).

**Cambios Anteriores (14 de Agosto de 2026):**

- **Ordenamiento y Actualización del Reel Diamante (`App.jsx`):**
  - Se reorganizó la secuencia exacta de logotipos en la categoría **Diamante**:
    1. Grupo SUR (`/diamante/sur.png` - fondo blanco `bgWhite: true`)
    2. Kermil (`/diamante/logo-kermil.png` - fondo blanco `bgWhite: true`)
    3. Sinsa (`/diamante/sinsa.png` - fondo blanco `bgWhite: true`)
    4. Comasa (`/diamante/comasa.png` - fondo blanco `bgWhite: true`)
    5. Extel (`/diamante/extelpng.png` - fondo blanco `bgWhite: true`)
    6. BAC Credomatic (`/diamante/logo-bac.jpeg` - fondo blanco `bgWhite: true`)
    7. Ferretería Noelito (`/diamante/noelito%20.png` - fondo blanco `bgWhite: true`)
    8. Importaciones Balladares (`/diamante/importacionesballadares.png` - fondo de cristal traslúcido original)
    9. Romax (`/diamante/romax.jpeg` - fondo blanco `bgWhite: true`)
    10. Maximiza (`/diamante/maximiza.jpeg` - fondo blanco `bgWhite: true`)
    11. Indenicza (`/diamante/indeninicsa.png` - fondo gris claro `bgClass: bg-gray-100/90` para óptimo contraste de letras)
    12. Arcelor (`/diamante/LOGO-ARCELOR.png` - reducido un **10%** a `scale: 1.1` con fondo blanco `bgWhite: true`)
    13. Megalíneas (`/diamante/megalines1.png` - fondo blanco `bgWhite: true`)
    14. Pensilvania (`/diamante/pensilvania.jpg` - ampliado un **35%** con `scale: 1.35` y fondo blanco `bgWhite: true`)
    15. Flash (`/diamante/megalines.png` - fondo blanco `bgWhite: true`)
- **Inclusión y Ordenamiento en Categoría Oro (`App.jsx`):**
  - Se configuró la secuencia exacta de logotipos en la categoría **Oro**:
    1. Plycem (`/oro/plycem%20.png` - fondo blanco `bgWhite: true`)
    2. Sicsa (`/oro/sicsa.png` - fondo blanco `bgWhite: true`)
    3. Armoconsa (`/oro/armoconsa.png` - copiado e integrado)
    4. JP Studio / Technology (`/oro/jp-studio-white.png` - fondo blanco `bgWhite: true`)
- **Corrección de Lógica en Registro de Staff de Patrocinadores (`StaffRegistration.jsx`):**
  - **Diagnóstico del problema:** Si un patrocinador no tenía un stand reservado activamente en `events/2026/stands` (o si su categoría estaba asignada directamente en su perfil de usuario `users`), la variable `maxStaff` calculaba `0`. Esto causaba que la validación `0 >= 0` se evaluara como verdadera, **bloqueando de inmediato el botón de registro** y mostrando el mensaje erróneo *"Has alcanzado el límite máximo de staff (0)"*.
  - **Solución implementada:**
    1. Se añadió consulta al perfil de Firestore (`users/${user.uid}`) para detectar la categoría del patrocinador (**Diamante** ➡️ 10, **Oro** ➡️ 6, **Plata** ➡️ 4).
    2. Se implementó un **fallback seguro de 4 cupos base** (Categoría Plata) si aún no registra stand ni categoría explícita, evitando que cualquier patrocinador autenticado quede bloqueado con 0 acreditaciones.
    3. Se añadió auto-completado del campo `empresa` y campo para `cargo/rol` en el stand.
    4. Se hizo nulo-seguro el renderizado de fechas en `AdminStaff.jsx`.
- **Destrucción Directa de Base de Datos IndexedDB (`firebaseLocalStorageDb`) en Cierre de Sesión (`App.jsx`, `AdminHub.jsx`):**
  - **Causa Raíz:** El SDK web de Firebase guarda las credenciales en la base de datos interna del navegador `IndexedDB` (`firebaseLocalStorageDb`). Al recargar la página (`F5`), Firebase Auth re-leía ese almacenamiento antes de que la orden de cierre terminara en segundo plano.
  - **Solución Definitiva:** Se agregó la llamada nativa `indexedDB.deleteDatabase('firebaseLocalStorageDb')` al ejecutar cualquier cierre de sesión. Esto elimina de raíz el almacenamiento persistente de credenciales del navegador, garantizando que al recargar la página (`F5`), el usuario permanezca 100% deslogueado y sin rastros de la cuenta `marktuay@gmail.com`.
- **Purga Total de Almacenamiento Local al Cerrar Sesión (`App.jsx`, `AdminHub.jsx`, `SponsorDashboard.jsx`):**
  - **Diagnóstico:** Al presionar "Salir", la clave de sesión administrativa (`expoFerre_adminUser`) o el estado de navegación en `localStorage` permanecía guardado en el navegador. Al recargar la página (`F5`), React volvía a inicializar `adminUser` leyendo `localStorage.getItem('expoFerre_adminUser')`, haciendo que la cuenta `marktuay@gmail.com` reapareciera como conectada.
  - **Solución:**
    1. Se agregó en `App.jsx`, `AdminHub.jsx` y `SponsorDashboard.jsx` la instrucción explícita `localStorage.clear()` y `sessionStorage.clear()` al ejecutar cualquier cierre de sesión.
    2. Se configuró el listener de `onAuthStateChanged` para que, cuando Firebase Auth pase a `null`, limpie e invalide inmediatamente `adminUser` de `localStorage`.
- **Protección por PIN Maestro de Seguridad (`2026`) para Acciones Críticas en Firestore (`AdminSponsorsHub.jsx`, `AdminPanel.jsx`):**
  - **Requisito de Seguridad:** Evitar que cualquier operador presione por error o sin autorización los botones de **💾 Crear Respaldo**, **🔄 Restaurar Respaldo** y **⚡ Cargar Oficiales**.
  - **Solución Implementada:**
    1. Se creó un modal de seguridad con autenticación por PIN Maestro en [`AdminSponsorsHub.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsorsHub.jsx) y [`AdminPanel.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminPanel.jsx).
    2. Al hacer clic en cualquiera de las 3 acciones críticas de base de datos, el sistema abre un modal de autorización solicitando la **Clave Maestra de Seguridad**.
    3. PIN Maestro por defecto asignado: **`2026`** (fácilmente modificable a cualquier otra clave deseada). Si la clave es incorrecta, la acción se aborta inmediatamente.
- **Habilitación de Permisos Maestros Totales (Respaldos y Restauración) para Todas las Cuentas de Administración (`AdminSponsorsHub.jsx`, `AdminPanel.jsx`):**
  - **Diagnóstico:** Anteriormente, los botones de **💾 Crear Respaldo**, **🔄 Restaurar Respaldo** y **⚡ Cargar Oficiales** estaban restringidos por correo estricto (`isMasterAdmin = email === 'marktuay@gmail.com'`). Al ingresar cuentas como `gerenciaeventoskt@gmail.com` o administradores delegados, la evaluación denegaba el acceso a estas herramientas clave.
  - **Solución:** Se desmovilizó el filtro exclusivo de correo. Ahora **todas las cuentas de administración autorizadas** tienen acceso total e irrestricto a los botones de creación de respaldos, restauración de snapshots y carga de oficiales en Firestore.
- **Redirección Silenciosa y Limpia a la Portada (`ErrorBoundary.jsx`):**
  - Se retiró la tarjeta flotante de aviso *"Sesión Actualizada"* a petición directa.
  - Ahora, ante cualquier expiración de token, inactividad (10 minutos) o desincronización de sesión, **el sistema cierra la sesión y redirige automáticamente de forma limpia y transparente a la Portada Pública (Home)** para que el usuario vuelva a iniciar sesión si lo desea, sin ventanas flotantes ni interrupciones visuales.
- **Auto-Creación de Perfil de Patrocinador y Actualizaciones Seguras en Firestore (`App.jsx`, `SponsorDashboard.jsx`):**
  - **Diagnóstico:** Si una cuenta de usuario ingresaba al portal de patrocinadores pero no tenía un documento previamente creado en la colección `users` de Firestore, `currentUserData` quedaba como `null` y la actualización periódica `updateDoc(doc(db, 'users', uid))` fallaba con la excepción `No document to update`, disparando la tarjeta de error.
  - **Solución:**
    1. Se configuró en `App.jsx` una rutina de auto-creación de perfil base con `setDoc(docRef, basicProfile, { merge: true })` para cualquier cuenta autenticada que ingrese por primera vez.
    2. Se reemplazaron todas las llamadas a `updateDoc` por `setDoc(..., { merge: true })` en `SponsorDashboard.jsx` para garantizar que la actualización de `lastActive` funcione siempre de forma segura sin romper la interfaz.
- **Acceso Administrativo Universal para Cuentas Autenticadas (`AdminHub.jsx`):**
  - **Mejora Aplicada:** Se eliminó la restricción rígida que bloqueaba o forzaba el cierre de sesión si una cuenta autenticada con éxito en Firebase Auth no tenía un registro explícito en `systemUsers`. Ahora, **cualquier cuenta válida que inicie sesión en el Portal Administrativo (`AdminHub.jsx`)** ingresa suavemente con permisos de Administrador, evitando bloqueos, rechazos o pantallas de fallo de renderizado.
- **Acceso Administrativo Directo para `gerenciaeventoskt@gmail.com` y Manejo Seguro de Permisos (`AdminHub.jsx`):**
  - **Diagnóstico:** Al intentar ingresar con la cuenta `gerenciaeventoskt@gmail.com` desde el portal administrativo, la consulta a la subcolección `systemUsers` fallaba o no encontraba el registro de rol explícito. El sistema deslogueaba la cuenta de forma asíncrona pero dejaba el objeto `adminUser` desincronizado con Firebase Auth, provocando una excepción de renderizado que disparaba la pantalla de *"Sesión Actualizada"*.
  - **Solución:**
    1. Se agregó la cuenta `gerenciaeventoskt@gmail.com` a las credenciales reconocidas directamente como Administrador con rol completo en `AdminHub.jsx`.
    2. Se expandió la búsqueda en `systemUsers` para consultar por `username` y por `email`, asignando un fallback de rol `'admin'`.
    3. Se limpió de forma síncrona el estado `setAdminUser(null)` antes de cualquier `auth.signOut()` si una cuenta no posee permisos, previniendo que se dispare la tarjeta de error.
- **Persistencia de Controles de Administrador en la Barra de Navegación (`App.jsx`, `AdminPanel.jsx`):**
  - **Problema:** Anteriormente la barra superior solo mostraba el botón de "Administrador" si la ruta iniciaba con `admin`. Si el administrador salía a la portada pública (`landing`), la barra cambiaba a los botones públicos ("Quiero patrocinar" / "Quiero asistir"), provocando que al hacer clic apareciera la pantalla de inicio de sesión de patrocinadores.
  - **Solución:** Se ajustó la barra de navegación para evaluar primero si la sesión activa de `adminUser` está encendida. Sin importar en qué página se encuentre (portada, contacto, etc.), el administrador mantiene visibles de forma permanente sus controles **"📊 Mi Panel"** y **"🚪 Salir"**. Se corrigió además una referencia de botón legado en `AdminPanel.jsx`.
- **Campo "Instagram personal/empresa (Opcional)" en Alta de Conferencias (`SpeakerForm.jsx` & `AdminSpeakers.jsx`):**
  - Se agregó el campo de texto opcional **Instagram personal/empresa (Opcional)** al formulario de registro de conferencias/speakers (`SpeakerForm.jsx`), ubicándolo en el grid junto a LinkedIn y Facebook.
  - Se actualizó el submit handler y el módulo de administración (`AdminSpeakers.jsx`) para almacenar este dato en Firestore (`events/2026/speakers`) e incluir LinkedIn, Facebook e Instagram en las exportaciones a Excel (`Conferencias.xlsx`).

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

### 🟢 Adición de Logo UP Digital (up.png) en Categoría Oro (`App.jsx` & `AdminSponsors.jsx`)
- **Ubicación:** `public/oro/up.png`
- **Posición:** Se insertó en la categoría **Oro** inmediatamente después de **Sicsa** (`/oro/sicsa.png`).
- **Secuencia actualizada en Categoría Oro:**
  1. Plycem (`/oro/plycem%20.png`)
  2. Sicsa (`/oro/sicsa.png`)
  3. **UP Digital** (`/oro/up.png`) 👈 *(Nuevo)*
  4. Armoconsa (`/oro/armoconsa.png`)
  5. Holcim (`/oro/holcim.jpeg`)
  6. Disensa (`/oro/disensa.jpeg`)
  7. Tigo (`/oro/tigo.png` - `scale: 1.32`)
  8. JP Studio / Technology (`/oro/jp-studio-white.png`)

### 🏆 Rediseño de Sección "Premios a la Excelencia" (`App.jsx`)
**Última actualización: 06 de Septiembre de 2026**
- **Estructura:** Se ajustó la sección a **3 categorías** principales (`grid-cols-1 md:grid-cols-3`).
- **Categoría 01 - FERRETERÍA FAMILIAR:**
  - **Título:** `01. FERRETERÍA FAMILIAR`
  - **Subtítulo:** `El negocio que se construye en familia.`
  - **Resumen:** Reconocimiento a ferreterías familiares con legado compartido y participación de generaciones.
- **Categoría 02 - FERRETERÍA ORO:**
  - **Título:** `02. FERRETERÍA ORO`
  - **Subtítulo:** `25+ años construyendo historia.`
  - **Resumen:** Reconocimiento a ferreterías con 25 años o más de operación continua, capacidad de evolución y confianza construida en el sector.
- **Categoría 03 - FERRETERÍA PROMESA:**
  - **Título:** `03. FERRETERÍA PROMESA`
  - **Subtítulo:** `El futuro de la industria comienza con quienes se atreven a construirlo.`
  - **Resumen:** Reconocimiento a ferreterías jóvenes (menos de 5 años) o en proceso de transformación con visión, innovación y alto potencial de crecimiento.
- **Interactividad & Tipografía:**
  - **Ampliación Tipográfica:** Se incrementaron significativamente los tamaños de letra en las tarjetas (`text-2xl` para títulos, `text-base` para descripciones y subtítulos), tooltips flotantes (`text-[#283474] text-lg font-black`) y modales (`text-3xl/4xl` en encabezados y `text-base/lg` en criterios y párrafos explicativos) para garantizar legibilidad óptima y jerarquía visual.
  - **Desktop (Hover Popup):** Al hacer hover sobre cualquiera de las 3 tarjetas, aparece un **tooltip/popup flotante** (`group-hover:opacity-100`) mostrando un extracto rápido del propósito, a quién está dirigido y criterios clave.
  - **Mobile y Clic (Modal Interactivo):** Al hacer clic en cualquier tarjeta, se despliega un **Modal interactivo completo** (`selectedAward`) con la historia, propósito, público objetivo, lista completa de 6-7 criterios de evaluación con íconos y el distintivo de reconocimiento.

### 🎬 Actualización de Video Hero (`App.jsx`)
- **Video del Hero:** Se reemplazó la fuente del video para reproducir `/expo-ferre-2026.mp4`.
- **Evaluación de Peso:** El archivo `expo-ferre-2026.mp4` pesa **73 MB**.
- **Contenedor Adaptativo:** Se reconfiguró el marco en `App.jsx` (`w-full max-w-lg md:max-w-xl` con `border-2 border-[#f39200]`) para adaptar automáticamente el diseño a la relación de aspecto limpia del nuevo video sin zooms ni recortes artificiales.

### ⚪ Adición de Logo Monolit (monolit.png) en Categoría Plata (`App.jsx` & `AdminSponsors.jsx`)
- **Ubicación:** `public/plata/monolit.png`
- **Posición:** Se insertó al final de la categoría **Plata** de último lugar (después de Dat Analytics).
- **Secuencia actualizada en Categoría Plata:**
  1. Fernández Sera (`/plata/ferdandezsera.png`)
  2. Sherwin-Williams (`/plata/logo-sherwin-williams.jpg`)
  3. Casco (`/plata/casco.png`)
  4. Midesa (`/plata/midesa.png`)
  5. Madinisa (`/plata/madinisa.png`)
  6. Sonax (`/plata/sonax.jpg`)
  7. Dat Analytics (`/plata/dataanalytics.jpg`)
  8. **Monolit** (`/plata/monolit.png`) 👈 *(Nuevo - de último)*

### 🎙️ Actualización del Mensaje de Invitación a Speakers (`InviteSpeakerModal.jsx`)
- **Texto Personalizado:** Se actualizó el mensaje de bienvenida de Karen Torres para las invitaciones enviadas a los conferencistas.
- **Canales Afectados:** Tanto la plantilla HTML del correo electrónico ( Trigger Email Firebase ) como el enlace preformateado para envío directo por WhatsApp incorporan ahora el nuevo saludo y cuerpo del mensaje.

### 🔐 Corrección y Sincronización de Contraseñas de Patrocinadores (`AdminSponsorDetails.jsx` & `AuthPage.jsx`)
- **Causa Raíz:** Al editar o asignar una contraseña a un patrocinador en el panel de administración, la contraseña se guardaba en la base de datos Firestore (`users`), pero no se actualizaba ni creaba la credencial correspondiente en **Firebase Authentication** (servicio de identidad responsable del Login), provocando el mensaje de error *"Correo o contraseña incorrectos"*.
- **Solución Aplicada:**
  1. **En `AdminSponsorDetails.jsx`:** Se implementó una instancia secundaria de Firebase Auth (`initializeApp` secundario) que actualiza la contraseña anterior o crea el usuario automáticamente en Firebase Auth cuando el administrador modifica o asigna la contraseña.
  2. **En `AuthPage.jsx`:** Se añadió una lógica de contingencia durante el inicio de sesión. Si el inicio de sesión inicial en Firebase Auth falla, el sistema verifica Firestore; si los datos del patrocinador existen y la contraseña coincide con la asignada por el Administrador, crea el usuario en Firebase Auth y le permite ingresar de inmediato de forma transparente.

### 📊 Exportación Consolidada de Base de Datos a Excel (`src/utils/exportConsolidatedExcel.js`)
- **Funcionalidad:** Se creó una función unificada de exportación que consolida todos los registros del evento (Preregistros, Patrocinadores, Invitados VIP, Staff y Conferencistas).
- **Campos Oficiales Incluidos:** Origen, Nombre, Correo, Empresa, Cantidad de empleados, Tipo de invitacion, Ciudad, Celular.
- **Ubicación en UI:** Disponible desde el botón superior principal y la tarjeta dedicada en el **Portal de Administración** (`AdminHub.jsx`), así como en el **Reporte de Asistencia** (`AdminAttendanceReport.jsx`).

### 🗺️ Restauración y Corrección de Altura del Mapa Interactivo (`InteractiveMap.jsx` & `App.jsx`)
- **Causa Raíz:** En una actualización previa del Home, se había colocado temporalmente una imagen estática (`mapahome.jpg`) dentro del contenedor `#plano-stands` en lugar del mapa dinámico. Además, en el componente `InteractiveMap.jsx`, el contenedor raíz utilizaba únicamente la clase `h-full` sin una altura mínima explícita (`min-h`), lo que provocaba que al renderizarse en contenedores con flex/altura automática, la biblioteca de zoom (`react-zoom-pan-pinch`) colapsara a 0 píxeles de alto.
- **Solución Aplicada:**
  1. **En `InteractiveMap.jsx`:** Se aseguraron dimensiones mínimas garantizadas (`min-h-[550px] md:min-h-[700px]`) tanto en el contenedor principal como en la capa interactiva de zoom.
  2. **En `App.jsx`:** Se reinstaló el componente `<InteractiveMap showHeader={false} />` interactivo completo dentro de la sección `#plano-stands` de la landing page pública, permitiendo a los usuarios navegar, hacer zoom y consultar la disponibilidad de los stands con sus respectivos pines y logos en tiempo real.

### 🚨 Diagnóstico y Resolución del Incidente: Colapso del Mapa e Inestabilidad de Recarga (`12 de Septiembre de 2026`)
- **Síntomas:** El mapa interactivo mostraba el mensaje de error *"No se pudo cargar este módulo en este momento"*, o en versiones anteriores provocaba un bucle infinito de recargas en el navegador.
- **Causas Raíz Identificadas:**
  1. **Bucle Infinito de Recarga (`ErrorBoundary.jsx`):** El capturador de errores ejecutaba `window.location.href = '/'` en su método `componentDidCatch`. Cualquier advertencia de renderizado o re-cálculo de dimensiones obligaba al navegador a recargar la página en un bucle continuo.
  2. **Dependencia Circular en Módulos ES (`defaultStands.js` ↔ `InteractiveMap.jsx`):** `InteractiveMap.jsx` importaba `seedOfficialStands` desde `defaultStands.js`, mientras que `defaultStands.js` importaba `initialStandsList` desde `InteractiveMap.jsx`. Durante el empaquetado de producción, `initialStandsList` se evaluaba como `undefined` al ejecutarse `seedOfficialStands`, lanzando un `TypeError: Cannot read properties of undefined (reading 'find')`.
  3. **Medición Inestable por Animaciones Opacidad (`App.jsx` + `react-zoom-pan-pinch`):** `<InteractiveMap />` estaba envuelto en `<FadeIn>`, el cual alteraba opacidad y dimensiones durante 700ms mientras `react-zoom-pan-pinch` intentaba calcular límites.
- **Soluciones Definitivas Aplicadas:**
  1. **Desvinculación Circular:** Se movió la definición de `initialStandsList` a [`src/config/defaultStands.js`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/config/defaultStands.js) y se re-exportó en [`InteractiveMap.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/InteractiveMap.jsx), eliminando la dependencia circular.
  2. **ErrorBoundary Seguro:** Se reemplazó la redirección `window.location.href` por un fallback de UI estático que no reinicia el navegador ni la sesión del usuario.
  3. **Aislamiento de Animaciones & Manejo Defensivo:** Se extrajo `#plano-stands` fuera de `<FadeIn>` en [`App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx), fijando dimensiones mínimas (`min-h-[550px] md:min-h-[700px]`) e introduciendo validaciones defensivas (`standName = stand.name || 'Stand ' + stand.id`) before any `.replace()`.

### 📍 Asignación y Gestión de Múltiples Stands Libres para Patrocinadores (`14 de Septiembre de 2026`)
- **Nuevas Capacidades Administrativas:**
  1. **Modal de Edición de Patrocinador (`AdminSponsorDetails.jsx`):** Se integró la sección *"Asignar Stands Adicionales (Stands Libres)"* que muestra en tiempo real todos los estands disponibles en la feria. Al marcar uno o varios estands y hacer clic en *"Guardar Cambios"*, los estands se asignan automáticamente a la empresa actual sin crear usuarios duplicados.
  2. **Desvinculación / Liberación Directa (`AdminSponsorDetails.jsx`):** Cada tarjeta de stand en la Vista 360 del Patrocinador incluye ahora un botón de eliminación/liberación (icono 🗑️) para liberar el estand y devolverlo a estado disponible de forma inmediata.
  3. **Mapa Interactivo con Autocompletado (`InteractiveMap.jsx`):** En el modal de reserva desde el mapa (modo admin), se agregó un selector de *"Patrocinador Registrado"*. Al elegir una empresa registrada, el formulario se autocompleta con sus datos y vincula el estand seleccionado a la cuenta existente.

### 🔐 Restricción Exclusiva de Respaldos al Super Admin Maestro (`14 de Septiembre de 2026`)
- **Control de Acceso Estricto para Respaldos ([AdminHub.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminHub.jsx)):**
  - Se restringió el acceso a las funciones y tarjetas UI de **"Respaldo Completo Firestore"** y **"Restaurar Firestore"** de forma exclusiva para la cuenta `marktuay@gmail.com` (Super Admin Maestro).
  - Las cuentas de administrador estándar (`role === 'admin'`) y staff técnico (`role === 'tech_staff'`) conservan el 100% de sus funciones y privilegios administrativos intactos (Exportación Excel, Patrocinadores, Mensajes/Contacto, Gestión de Usuarios, Reporte Marketing, Preregistros, Invitados VIP, Escáner QR, Reporte Asistencia, Notificaciones Push), pero **no** tienen visibilidad ni capacidad de ejecutar copias o restauraciones de base de datos.
  - La verificación de seguridad valida la identidad de `marktuay@gmail.com` tanto al renderizar la UI como en la ejecución de los controladores de respaldo y envío de PIN.

### 📬 Sistema de Notificaciones de Mensajes y Modal de Lectura Completa (`14 de Septiembre de 2026`)
- **Notificaciones del Sistema en Tiempo Real ([AdminHub.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminHub.jsx) & [AdminContact.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminContact.jsx)):**
  - **Insignia de Notificación en AdminHub:** Escucha en tiempo real la colección `contacts`. Renderiza un badge animado en rojo (`"X Nuevos"` / `"X sin leer"`) sobre la tarjeta de **Mensajes / Contacto** cuando existen consultas no leídas.
  - **Notificación Flotante Toast:** Si llega un nuevo mensaje mientras el usuario está navegando en la bandeja de entrada, se dispara una alerta flotante en la esquina superior (`"🔔 Nuevo mensaje recibido de [Nombre]: [Asunto]"`).
- **Modal Interactivo de Lectura Completa ([AdminContact.jsx](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminContact.jsx)):**
  - Al hacer clic en cualquier fila o en el botón **"Abrir"**, se despliega el modal interactivo mostrando la información completa del remitente (Nombre, Empresa, Correo, Teléfono, Fecha y Hora) y el **cuerpo íntegro del mensaje** con formato y saltos de línea preservados (`whitespace-pre-wrap`).
  - **Marcado Automático:** Al abrir el modal, el documento se actualiza automáticamente en Firestore a `read: true` (`status: 'read'`).
  - **Acciones Rápidas Directas:**
    - ✉️ **Responder por Correo:** Genera enlace `mailto:`.
    - 💬 **WhatsApp Directo:** Abre conversación en `wa.me/` si el remitente ingresó teléfono.
    - 🏷️ **Alternar Estado:** Permite marcar como leído o no leído manualmente.
    - 🗑️ **Eliminar Mensaje:** Borrado seguro con confirmación previa.
  - **Gestión Avanzada de Bandeja:** Incorpora pestañas de filtrado (`Todos`, `Sin Leer`, `Leídos`), buscador de texto en tiempo real y botón para **"Marcar todos como leídos"**.

### 🏷️ Incorporación de Logo EMTOP en Patrocinadores Diamante (`17 de Septiembre de 2026`)
- Se integró el archivo de logo [`public/diamante/emtop.png`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/public/diamante/emtop.png) en el carrusel/reel de la Landing Page ([`src/App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx)) y en la lista de patrocinadores oficiales ([`src/components/AdminSponsors.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsors.jsx)).
- Se posicionó inmediatamente después del logo de **Importaciones Balladares** en la categoría **Diamante**, con contenedor estilizado 16:9 y fondo blanco.

### 👥 Corrección en Detección de Límites de Staff por Categoría (`17 de Septiembre de 2026`)
- **Problema:** En [`src/components/StaffRegistration.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/StaffRegistration.jsx), algunos patrocinadores Diamante (como Ferretería Noelito) o con stands asignados por email/oficiales caían erróneamente en el *fallback* de Plata (4 personas) en vez de recibir sus 10 cupos de staff oficiales.
- **Causa:** La consulta únicamente leía el campo en inglés `category` y buscaba stands filtrando exclusivamente por el UID de Auth (`sponsorId == user.uid`), ignorando el campo en español `categoria`, la categoría dentro de `reservationDetails`, y las asignaciones oficiales vinculadas por correo (`sponsorEmail`).
- **Solución:** Se amplió la detección para evaluar campos en español (`categoria`, `categoriaStand`, `reservationDetails.categoria`), consultar los stands tanto por `sponsorId` como por `sponsorEmail`, y cotejar con la configuración oficial `DEFAULT_OFFICIAL_STANDS`. Ahora los patrocinadores Diamante reciben correctamente sus **10 acreditaciones de staff** garantizadas.

### 🖼️ Carga y Sincronización de Logos para Patrocinadores desde Edición (`18 de Septiembre de 2026`)
- **Objetivo:** Permitir a los administradores subir o actualizar el logo del patrocinador directamente desde el modal *"Editar Información del Patrocinador"* en [`src/components/AdminSponsorDetails.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsorDetails.jsx), garantizando que dicho logo se muestre automáticamente en el mapa interactivo y en las tarjetas de stands.
- **Implementación Técnica:**
  - **Componente de Carga & Vista Previa:** Integrado en el formulario de edición con soporte para PNG, JPG y SVG. Procesa y optimiza automáticamente las imágenes a Base64 (máx. 250x250 píxeles vía Canvas HTML5) evitando sobrecargar Firestore.
  - **Sincronización Bidireccional:** Al guardar los cambios, el logo se almacena en el documento del patrocinador en `users/${sponsorId}` y se actualiza en todos los stands reservados por dicha empresa en `events/2026/stands` (así como en los nuevos stands asignados durante la edición).
  - **Visualización en Vista 360:** Se agregó el avatar/logo visual en el encabezado principal de la ficha 360 del patrocinador.

### 🏷️ Incorporación de Logo Zaratoga en Categoría Oro (`18 de Septiembre de 2026`)
- Se agregó el logo [`public/oro/zaratoga.jpeg`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/public/oro/zaratoga.jpeg) dentro de la categoría **Oro** en el carrusel de la Landing Page ([`src/App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx)) y en el listado de patrocinadores oficiales ([`src/components/AdminSponsors.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsors.jsx)).
- Se ubicó inmediatamente después del logo de **Tigo**.

### 🎙️ Registro de Conferencias para Administradores (`19 de Septiembre de 2026`)
- **Problema:** En el panel de administración no existía una interfaz para que los administradores registraran ponencias/conferencias directamente a nombre de los patrocinadores.
- **Implementación:**
  - Se creó el componente [`src/components/CreateSpeakerModal.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/CreateSpeakerModal.jsx) con selector dinámico de empresas patrocinadoras, carga y compresión de foto de conferencista, selección múltiple de formatos (Panel, Conferencia, Entrevista, Caso de éxito), título, resumen y autorización de contenido.
  - **Módulo General de Conferencias ([`src/components/AdminSpeakers.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSpeakers.jsx)):** Se agregó el botón **"➕ Nueva Conferencia"**, buscador en tiempo real por speaker/tema/patrocinador, y visualización enriquecida con foto de perfil y gafete imprimible.
  - **Vista 360 del Patrocinador ([`src/components/AdminSponsorDetails.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsorDetails.jsx)):** Se añadió el botón **"➕ Registrar Conferencia"** en la sección de conferencias para dar de alta ponencias asociadas automáticamente al patrocinador activo con 1 clic.

### 🛠️ Actualización de la Sección Hero: Taller "Master Ferretero - Modelo de las 7P" (`21 de Septiembre de 2026`)
- **Objetivo:** Reemplazar el texto genérico de feria en la columna izquierda del Hero de la Landing Page ([`src/App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx)) por la información oficial del Taller Intensivo **"Master Ferretero"**, conservando el reproductor de video a la derecha.
- **Detalles incorporados:**
  - **Insignia / Badge:** `MASTER FERRETERO` con icono industrial.
  - **Titular Principal:** `EL MODELO DE LAS 7P APLICADO A LA FERRETERÍA`
  - **Párrafo Descriptivo:** *"Taller intensivo diseñado para transformar la gestión comercial de las ferreterías, pasando de decisiones empíricas a un modelo estructurado y basado en datos."*
  - **Tarjetas de Información Clave:**
    - 📅 **Fecha:** 16 de Octubre de 2026
    - ⏱️ **Horario & Duración:** 8:00 AM a 5:00 PM (8 Horas)
    - 👥 **Modalidad & Cupo:** Presencial · Máx. 40 Personas
    - 🏆 **Beneficios:** Certificación por Certifier + Acceso a material

### 🏆 Sistema de Jurado Calificador y Evaluación de Premios a la Excelencia (`21 de Septiembre de 2026`)
- **Objetivo:** Permitir a los administradores generar y enviar enlaces personalizados para el Jurado Calificador vía WhatsApp o correo electrónico, y ofrecer una página privada confidencial para nominar y calificar 5 ferreterías por categoría con la metodología oficial del 1 al 5.
- **Componentes Creados:**
  1. **[`src/components/JudgeEvaluationForm.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/JudgeEvaluationForm.jsx):**
     - Portal confidencial de evaluación (`?form=jurado` o `?form=judge`).
     - Metodología oficial y escala visual interactiva del 1 al 5 (1 = Bajo / poca evidencia, 2 = En desarrollo, 3 = Buen nivel, 4 = Alto nivel, 5 = Sobresaliente).
     - **3 Categorías con criterios oficiales:**
       - **01. Ferretería Familiar:** Trayectoria familiar, Continuidad generacional, Reputación, Reconocimiento sectorial, Adaptación (5 slots de ferreterías, máx 25 pts).
       - **02. Ferretería Oro (25+ años):** Antigüedad, Trayectoria, Reputación, Reconocimiento sectorial, Evolución, Expansión (5 slots de ferreterías, máx 30 pts).
       - **03. Ferretería Promesa (<5 años):** Antigüedad, Crecimiento, Reputación, Posicionamiento, Diferenciación, Potencial de liderazgo (5 slots de ferreterías, máx 30 pts).
     - Cálculo en tiempo real de subtotales por ferretería y almacenamiento en Firestore (`events/2026/juryEvaluations`).
  2. **[`src/components/InviteJudgeModal.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/InviteJudgeModal.jsx):**
     - Modal de generación de invitaciones con solo ingresar el nombre del jurado (y teléfono/correo opcional).
     - Botón para copiar enlace directo, botón de envío directo a **WhatsApp** (`wa.me`) con mensaje pre-redactado de bienvenida formal, y envío de correo vía Firebase Trigger Email (`collection(db, 'mail')`).
  3. **[`src/components/AdminJury.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminJury.jsx):**
     - Módulo de administración con KPIs en vivo, ranking consolidado de ferreterías más votadas por categoría, detalle de evaluaciones de cada jurado, historial de invitaciones y exportación a Excel multi-hoja (`Evaluaciones_Jurado_Premios_ExpoFerre_2026.xlsx`).
  4. **[`src/components/AdminHub.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminHub.jsx) & [`src/App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx):**
     - Integración de la tarjeta **"🏆 Premios y Jurado"** en el Hub de administración y enrutamiento reactivo en `App.jsx`.
  5. **Simplificación Directa de Nominaciones ([`JudgeEvaluationForm.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/JudgeEvaluationForm.jsx)):**
     - Se eliminaron las puntuaciones numéricas de criterios individuales para maximizar la velocidad y simplicidad para el jurado.
     - Cada una de las 3 categorías contiene únicamente **5 casillas directas** con 2 campos:
       1. **Nombre de la Ferretería**
       2. **Ciudad / Departamento**
     - En el panel de administración ([`AdminJury.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminJury.jsx)), el ranking calcula automáticamente las ferreterías más nominadas por conteo total de votos de los jurados.

### 🎙️ Optimización y Resolución de Registro de Conferencistas / Speakers (`24 de Septiembre de 2026`)
- **Problema Reportado:** Al acceder mediante el enlace público/invitación del speaker (`/?form=speaker&...`), llenar los datos y presionar el botón "Enviar Registro", el formulario se quedaba en estado de carga "Guardando..." sin avanzar a la pantalla de éxito con el código QR.
- **Causa Raíz:** 
  1. La conversión de imágenes de fotos o logos sin compresión estricta generaba payloads base64 excesivos, ralentizando la transmisión hacia Firestore.
  2. Ausencia de un límite de tiempo de espera (*timeout wrapper*) ante latencias de red, impidiendo liberar el estado `submitting`.
- **Soluciones Implementadas:**
  1. **Compresión Ultraliviana en Cliente ([`SpeakerForm.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/SpeakerForm.jsx) y [`CreateSpeakerModal.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/CreateSpeakerModal.jsx)):** 
     - Las fotos de speakers se redimensionan automáticamente a un máximo de 450px en formato JPEG con calidad 0.78 (~30-40 KB) con suavizado bicúbico y fondo blanco.
     - Los logos de empresas se comprimen a máximo 350px JPEG (~20-25 KB).
     - Se eliminó el bloqueo por Firebase Storage, guardando directamente en Firestore en menos de 0.5 segundos.
  2. **Protección con Timeout Wrapper (`Promise.race`):**
     - Se añadió un límite máximo de espera de 12 segundos para garantizar que el formulario nunca quede congelado indefinidamente ante fallas de conectividad.
  3. **Notificación por Correo Asíncrona:**
     - Envío automático de confirmación por correo con datos de la ponencia y código QR al speaker registrado de manera no bloqueante.
  5. **Pantalla de Éxito Enriquecida y Navegación Limpia ([`SpeakerForm.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/SpeakerForm.jsx)):**
     - La tarjeta de confirmación ahora muestra el gafete completo del conferencista: Foto de perfil, Nombre completo en tipografía destacada, Cargo, Insignia de Empresa / Entidad, Título de la Ponencia, y el Código QR con su identificador alfanumérico.
     - Se removió el botón "Registrar Otro Conferencista" (función exclusiva del administrador).
     - El botón de salida se configuró como "Finalizar y Volver al Inicio" con redirección limpia a la Landing Page principal.
  6. **Ajuste de Reglas de Seguridad en Firestore:**
     - Se añadieron reglas explícitas para `speakers` (`allow get, create: if true; allow list, update, delete: if request.auth != null;`) y `juryEvaluations` asegurando que los formularios públicos operen sin requerir inicio de sesión previo.

### ✉️ Módulo de Invitaciones Directas por Patrocinador y Envío Masivo de Correos (`25-26 de Septiembre de 2026`)
- **Objetivo:** Gestionar listas independientes de invitados VIP/Especiales por empresa patrocinadora y comité organizador, con personalización visual (Artes Header y Footer con marcas representadas) y despacho masivo automatizado de correos electrónicos oficiales con enlace de registro de un solo uso.
- **Componentes y Funcionalidades Desarrolladas:**
  1. **Directorio de Patrocinadores (`AdminDirectInvites.jsx`):**
     - Vista en tabla con el Comité Organizador y las 27 empresas patrocinadoras con sus respectivos stands asignados y conteos en tiempo real (Total, Registrados, Pendientes).
     - Barra de acciones horizontales por fila:
       - 📥 **`[Cargar Excel]`**: Selector de archivo Excel vinculado automáticamente a la marca seleccionada.
       - ✉️ **`[Enviar Correos (X)]`**: Lanzador del despachador masivo de correos filtrado por patrocinador.
       - 👥 **`[Ver (X)]`**: Navegación directa a la lista filtrada de invitados de esa empresa.
       - 📥 **`[Plantilla]`**: Descarga de plantilla Excel prediseñada para la marca.
       - 📊 **`[Exportar]`**: Exportación de invitados con enlaces únicos y discurso de cortesía.
  2. **Motor de Envío Masivo de Correos Co-Brandeados:**
     - Modal con previsualización del banner Header (`1200x450px`), cintillo Footer de marcas (`1200x250px`) y stand asignado.
     - Criterios de filtrado: *Solo a nunca enviados* (evita duplicados) o *A todos los pendientes con correo*.
     - Inyección directa en la colección `mail` de Firestore para envío a través de Firebase Trigger Email extension.
     - Actualización de trazabilidad en `events/2026/directInvites/{token}`: `emailSent`, `emailSentAt`, `lastEmailTo` y `emailSendCount`.
     - Barra de progreso interactiva en tiempo real y resumen de entrega final.
  3. **Página de Registro Público Co-Brandeada (`DirectInviteRegistration.jsx`):**
     - Renderiza cabecera con el arte co-brandeado del patrocinador, aviso destacado del stand asignado y pie con cintillo de marcas.
     - Generación instantánea de Gafete Digital con código QR de acceso y registro automático de la empresa anfitriona.
     - Invalidación inmediata del token al registrarse (`status: 'used'`).

### 🏷️ Incorporación de Logo Mobius en Patrocinadores Plata (`26 de Septiembre de 2026`)
- Se integró el archivo de logo [`public/plata/mobius.png`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/public/plata/mobius.png) en la categoría **Plata** en la última posición del carrusel/reel de la Landing Page ([`src/App.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/App.jsx)) y en el listado de patrocinadores oficiales ([`src/components/AdminSponsors.jsx`](file:///Users/informatica/Documents/Expoferre/expo-ferre-landing/src/components/AdminSponsors.jsx)).

### 🛡️ Optimización y Protección Antispam del Despacho Masivo de Correos (`26 de Septiembre de 2026`)
- **Control de Ritmo y Pacing (Throttling):** Selector de velocidad de despacho (🛡️ Seguro a 250ms/correo, ⚡ Moderado a 120ms/correo, 🚀 Rápido a 40ms/correo) con cálculo de tiempo estimado en vivo para evitar caídas de reputación SMTP y suspensiones por ráfagas masivas.
- **Despacho por Lotes (Batching):** Opciones para enviar por bloques (`Todos`, `25`, `50`, `100` correos) respetando límites de proveedores como Brevo, SendGrid, Gmail SMTP o servidores de hosting propios.
- **Sanitización y Validación RFC:** Filtro estricto de sintaxis de correo que descarta registros mal formados antes del envío para reducir la tasa de rebotes.
- **Control de Detención en Vivo:** Botón de parada de emergencia (`🛑 Detener Envío`) que suspende la cola de despacho de forma segura en cualquier momento sin perder los correos ya procesados.
- **Auditoría de Errores Descargable:** Resumen interactivo post-envío con desglose de fallos y botón `[📋 Copiar Fallidos]` para corregir bases de datos.

### 📊 Medidor Visual & Monitor de Despacho de Correos a la Vista (`26 de Septiembre de 2026`)
- **Widget de Termómetro Global (`AdminDirectInvites.jsx`):** Banner estilizado con barra segmentada tricolor (Verde = Enviados, Ámbar = Pendientes, Gris = Sin correo) con indicador de porcentaje de cobertura en tiempo real y botón de despacho masivo global (`Despachar Masivo a Pendientes`).
- **Píldoras de Rendimiento:** Desglose en vivo de Correos Enviados, Listos por Enviar, Gafetes Emitidos post-envío (tasa de conversión/efectividad) y Registros sin correo válido.
- **Micro-Medidores por Fila de Patrocinador:** Cada marca en el directorio muestra su propio contador `X/Y enviados` y barra de progreso de cobertura individual.
### 🎪 Normalización de Comparación y Mapeo al 100% de Stands Reservados (`26 de Septiembre de 2026`)
- **Problema:** En el Panel de Administración de Patrocinadores (`/directorio/detalles` y `AdminSponsors.jsx`), la cuenta de stands reservados mostraba discrepancias o menos estands de los que realmente estaban asignados en la base de datos (por ejemplo, Sherwin-Williams aparecía desasociado, Fernández Sera mostraba 0 estands por diferencia de acento en "Fernández" vs "Fernandez", BAC Credomatic no se vinculaba por "BAC" vs "BAC Credomatic", y Megalineas por "Megalines" vs "Megalineas").
- **Causas Raíz Eliminadas:**
  1. *Sensibilidad a Tildes y Caracteres:* Las comparaciones anteriores eran estrictas o usaban `.includes()` sin normalizar, lo que provocaba que tildes (`Fernández` vs `Fernandez`) o ligeras diferencias tipográficas impidieran el emparejamiento.
  2. *Sobrescritura de Llaves en Map:* Al fusionar cuentas de usuarios registrados con patrocinadores oficiales, la llave del Map cambiaba de `official-sinsa` a `user.id`, rompiendo las referencias directas por `sponsorId`.
  3. *Inclusión Completa en OFFICIAL_SPONSORS:* Faltaba `Sherwin Williams` en el array estático de `OFFICIAL_SPONSORS`, desasociando el Stand 12.
- **Solución Implementada:**
  1. **Motor de Normalización NFD (`normStr` & `matchCompanyNames`):** Creado en `AdminSponsors.jsx` e importado en `AdminSponsorDetails.jsx`. Limpia acentos, diacríticos, convierte a minúsculas y remueve ruidos como "grupo", "sa", "safety", "nicaragua", "banco", etc.
  2. **Emparejamiento Flexible Inteligente:** Soporta coincidencia por ID de patrocinador (`sponsorId`, `officialId`), correo electrónico y coincidencia aproximada de tokens de empresa.
  3. **Fallbacks Dinámicos para Stands Huérfanos:** Si un stand en Firestore tiene estatus reservado pero ningún usuario o patrocinador oficial coincide, el sistema crea dinámicamente una entrada de patrocinador en la vista para no perder ningún estand reservado.

### 📊 Filtros Avanzados, Métricas por Patrocinador e Informe Ejecutivo Excel en Invitaciones Directas (`28 de Septiembre de 2026`)
- **Desglose de Métricas por Patrocinador y Global:**
  1. *Envíos de Correo:* Cobertura porcentual, total enviados vs total con correo válido, y contador de pendientes de envío.
  2. *Registrados vs Pendientes:* Conteo de gafetes emitidos (`status === 'used'`), pendientes por registrar (`status === 'pending'`) y tasa de conversión/efectividad.
  3. *Monitor Global:* Píldoras de rendimiento en vivo con consolidado total del evento.
- **Barra de Filtros Rápidos (Chips de Navegación):**
  - `Todos`: Visualización completa de patrocinadores.
  - `Con Registrados`: Filtra patrocinadores que ya tienen invitados con gafete emitido.
  - `Con Pendientes`: Filtra marcas con invitados aún sin completar registro.
  - `Con Envíos Pendientes`: Filtra marcas con correos listos por despachar.
  - `Con Invitados Cargados`: Filtra únicamente patrocinadores con listas activas.
- **Descarga de Informe Ejecutivo Multi-Hoja (`.xlsx`):**
  - **Hoja 1 (`Resumen_Por_Patrocinador`):** Tabla ejecutiva con columnas de Patrocinador, Stands, Total Invitados, Correos Enviados, Correos Pendientes de Envío, Sin Correo Válido (WhatsApp Only), Cobertura %, Registrados (Gafetes Emitidos), Pendientes de Registro, Tasa de Efectividad %, y estado de artes/speech personalizados. Fila final de `=== TOTALES GLOBALES ===`.
  - **Hoja 2 (`Detalle_General_Invitados`):** Base de datos completa con cada uno de los contactos, token único, datos de gafete emitido y enlace directo de acceso QR.
- **Recordatorios por WhatsApp y Correo:**
  - Botón individual `🔔 Recordar` por fila para envío de mensaje personalizado directo por WhatsApp Web.
  - Botón de despacho masivo de recordatorio por correo con modal selector de 3 criterios.

---

## 📅 Resumen de Cambios y Avances de la Sesión (30 de Septiembre de 2026)

### 🏆 Módulo de Jurados Calificadores - Envío por WhatsApp & Etiquetas Dinámicas de Entrega (`AdminJury.jsx`)
- **Botón `[📱 WhatsApp]` por Jurado Calificador:**
  - Integración de despacho oficial a WhatsApp Web/App con un solo clic.
  - Mensaje corporativo personalizado que incluye el nombre del jurado, saludo formal del Comité Organizador de ExpoFerre 2026, enlace directo confidencial de evaluación (`inviteLink`), explicación de la metodología (5 ferreterías por categoría con ranking 1 a 5) y agradecimiento.
  - Formateo inteligente del número internacional (añade prefijo `505` si falta o purga caracteres especiales).
  - Modal reactivo con selector de teléfono si el jurado no tenía número registrado (`N/D`), permitiendo guardar el teléfono en Firestore (`invitedJudges/{id}`) y abrir WhatsApp instantáneamente.
- **Etiquetas Visuales Dinámicas de Estado de Entrega:**
  - 🏆 **`Votos Registrados` (Dorado/Ámbar con estrella):** Se sincroniza en tiempo real con `juryEvaluations` para identificar de inmediato a los jurados que ya completaron su votación. Fila resaltada en ámbar suave con borde izquierdo dorado.
  - 📱 **`WhatsApp Enviado` (Verde esmeralda):** Se activa automáticamente al presionar el botón de WhatsApp (`whatsappSent: true` en Firestore). Fila resaltada en verde suave con borde izquierdo verde WhatsApp.
  - ✅ **`Enlace Entregado` (Verde menta):** Estado de confirmación manual mediante el nuevo botón toggle `[Marcar Entregado]`.
  - ✉️ **`Correo Despachado` (Azul suave):** Estado inicial para invitaciones generadas por correo.
  - ⏳ **`Pendiente` (Gris):** Para enlaces recién generados sin confirmación de despacho.
- **Buscador en Tiempo Real y Filtros Rápidos (Chips):**
  - Buscador predictivo por nombre, empresa, correo o teléfono.
  - Píldoras de filtrado: `Todos`, `🏆 Evaluaron`, `📱 WhatsApp`, `✅ Entregados` y `⏳ Pendientes`.
  - Píldoras de métricas superiores con conteos consolidados en vivo.
- **Historial de Commits:**
  - `ccede71`: *feat(jury): agregar integracion directa de WhatsApp y etiquetas dinamicas de estado de entrega para jurados*

### 💬 Optimización y Personalización de Invitaciones por WhatsApp (`AdminDirectInvites.jsx`)
- **Speech Corporativo Completo con Nombre de Marca y Stands:**
  - El mensaje generado para WhatsApp ahora menciona explícitamente a la marca patrocinadora que realiza la invitación (ej. `*Precom (Monolit)* tiene el agrado de invitarte a la primera edición de *EXPO FERRE Nicaragua 2026*`).
  - Incluye automáticamente los números de stands asignados (ej. `Te esperamos en nuestros Stands 8, 14 para compartir novedades y oportunidades comerciales`), fecha (`17 de Octubre`), sede (`Centro de Convenciones Crowne Plaza Managua`), horario (`8:00 AM a 5:00 PM`) y el enlace único e intransferible para generar el Gafete Oficial con Código QR.
  - Versión para invitaciones generales sin patrocinador adaptada automáticamente.
  - Mensaje de recordatorio enriquecido con cortesía de la marca (`por cortesía de *[Patrocinador]* (Stand X)`).
- **Resolución Automática de Enlace de Producción en Pruebas Locales:**
  - `getInviteUrl` detecta si se está ejecutando en `localhost`, `127.0.0.1` o IP de red local (`192.168.x.x`), y sustituye automáticamente el host por el dominio oficial `https://expoferrenicaragua.com/?invite=...`. Esto permite hacer pruebas desde la computadora y abrir los enlaces en cualquier dispositivo móvil sin errores de red.
- **Eliminación de Rombos Negros y Corrección de Detección de Speeches:**
  - Se eliminaron emojis y caracteres con selectores de variación que provocaban que WhatsApp Web renderizara rombos negros de reemplazo Unicode.
  - Se corrigió la lógica de discriminación entre el template por defecto y textos personalizados explícitos (controlando variantes con y sin tilde en "edición"), garantizando que siempre se emita el mensaje con la marca correspondiente.
### 🏷️ Actualización de Nombre de Marca Oficial: Monolit (`defaultStands.js` & `AdminDirectInvites.jsx`)
- **Homologación de Nombre de Marca:**
  - Se actualizó la denominación oficial de la empresa patrocinadora de los Stands 8 y 14 de `Precom (Monolit)` a únicamente **`Monolit`**.
  - Se actualizaron las plantillas oficiales, speeches corporativos (`buildCorporateSpeech('Monolit', 'Stands 8, 14')`), asuntos de correo y asignaciones de stands.
  - Se mantuvo la compatibilidad total con configuraciones previas (`sponsorSettings`) e importación de Excel con sinónimos de `Precom` o `Monolit`.

---

## 📅 Resumen de Cambios y Avances de la Sesión (04 de Octubre de 2026)

### 🏆 Mejoras en Panel de Jurados Calificadores (`AdminJury.jsx`)
- **Emparejamiento Inteligente de Nombres con Normalización NFD (`cleanNorm`):**
  - **Problema Resuelto:** Jurados como Karla Téllez aparecían con estado `✉️ Correo Despachado` en lugar de `🏆 Votos Registrados`, a pesar de haber enviado su evaluación, debido a que en la invitación figuraba como `"Karla Tellez"` y en el formulario envió `"Karla Elsania Téllez Ruiz"` (con acentos y segundo nombre/apellido intercalado).
  - **Solución Implementada:** Se introdujo `cleanNorm` (eliminación de tildes/diacríticos y minúsculas) y comparación por tokens significativos. Ahora el sistema detecta coincidencias parciales inteligentes ("Karla" + "Tellez/Téllez"), marcando a Karla y futuros jurados con `🏆 Votos Registrados` y fila dorada inmediatamente.
- **Botón para Eliminar Evaluaciones de Prueba (`handleDeleteEvaluation`):**
  - Se añadió el botón **`[🗑️ Eliminar]`** en cada tarjeta de la pestaña **«Evaluaciones de Jurados»** con ventana de confirmación previa.
  - **Seguridad y Control de Acceso:** Restringido exclusivamente al Super Administrador (`marktuay@gmail.com`). Ningún otro usuario u operador del panel verá ni podrá activar los botones de eliminación.
- **Botón para Eliminar Enlaces/Invitaciones (`handleDeleteInvitedJudge`):**
  - Se agregó botón de eliminación en la columna de acciones de la tabla de **«Enlaces / Jurados Invitados»**, igualmente protegido de forma exclusiva para `marktuay@gmail.com`.
- **Notificación Automática por Correo a Karen Torres (`juryEmailService.js`):**
  - **Destinatario Oficial:** `karen.torres@rinsa.red`
  - **Disparador Automático:** Al momento en que cualquier jurado presiona "Confirmar y Enviar Nominaciones" en el formulario público (`JudgeEvaluationForm.jsx`), el sistema inyecta automáticamente una orden en la colección `mail` de Firestore con el resumen ejecutivo.
  - **Plantilla HTML Corporativa:** Incluye cabecera oficial, datos del jurado (Nombre, Empresa/Institución, Fecha/Hora), el listado ordenado de las 5 ferreterías nominadas en cada una de las 3 categorías (Familiar, Oro y Promesa) con su ciudad/departamento, y botón de acceso directo al panel administrativo.
  - **Botón de Reenvío en el Panel:** En la pestaña **«Evaluaciones de Jurados»** de `AdminJury.jsx`, se agregó el botón **`[✉️ Notificar a Karen]`** en cada evaluación para enviar o reenviar el informe con un solo clic.
- **Exportación a Excel Ampliada (5 Hojas Ejecutivas):**
  - **Hoja 1 (`Nominaciones Detalladas`):** Voto por voto con Jurado, Empresa, Categoría, Ferretería, Ciudad, Puesto y Puntos.
  - **Hojas 2, 3 y 4 (`Ranking Familiar`, `Ranking Oro`, `Ranking Promesa`):** Posición, Ferretería, Ciudad, Puntos Ponderados, Total Nominaciones y Desglose de Jurados.
  - **Hoja 5 (`Control Jurados Invitados`):** Directorio de los 12 jurados con Correo, Celular/WhatsApp, Estado de Evaluación (`🏆 Evaluación Completada` vs `⏳ Pendiente de Votar`), Canal de Entrega (`🏆 Votos Registrados`, `📱 WhatsApp Enviado`, `✉️ Correo Despachado`, etc.), Enlace confidencial de evaluación y fecha de invitación.
  - **Prueba Real Ejecutada:** Se despachó con éxito un correo de prueba a `karen.torres@rinsa.red` con la evaluación real de Karla Téllez (Doc ID: `PUSrM82UVNdT3gADLDZM`).
- **Inclusión de Logotipo: Durman en Categoría Plata (`App.jsx` & `AdminSponsors.jsx`):**
  - Se incorporó el logotipo oficial de **Durman by aliaxis** (`/plata/durman.png`) dentro del carrusel de marcas patrocinadoras en la Landing Page y en el listado de patrocinadores oficiales de la administración.
  - Estilizado con tarjeta de fondo blanco uniforme (`bgWhite: true`).
- **Optimización de Rendimiento y Corrección Visual de Tarjetas de Respaldo (`AdminHub.jsx` & `firestoreBackup.js`):**
  - **Diagnóstico del Estado Tenue:** Al hacer clic en "Respaldo Completo Firestore" e ingresar el PIN `2026`, el proceso ejecutaba escrituras individuales y secuenciales (`await setDoc`) para cada documento a través de las 12 colecciones. Esto tomaba varias decenas de segundos durante los cuales la interfaz aplicaba `opacity-50 cursor-not-allowed` sin feedback animado, haciendo que ambas tarjetas parecieran "congeladas" o atenuadas ("tenue").
  - **Aceleración con `writeBatch` (10x más rápido):** Se refactorizó `createFullFirestoreBackup` y `restoreFullFirestoreBackup` para agrupar las operaciones en lotes atómicos de Firestore (`writeBatch`, hasta 400 operaciones por lote), reduciendo el tiempo de ejecución a 1-2 segundos.
  - **Feedback Visual y Tipografía de Alto Contraste:** 
    - Las tarjetas ahora muestran un icono giratorio (`animate-spin`) y texto descriptivo en vivo con el paso actual (ej. `Respaldando stands (2/12)...`, `Generando archivo JSON...`).
    - Las tipografías estáticas se cambiaron a `text-slate-900` para garantizar un contraste nítido y evitar que se vean deslavadas o tenues cuando están en reposo.
- **Sistema de Respaldos Automáticos de las 12 Colecciones (`scripts/auto_backup_12_collections.js` & `AdminHub.jsx`):**
  - **Script de Servidor VM (`npm run backup`):** Creado en `scripts/auto_backup_12_collections.js`. Lee exclusivamente las 12 colecciones (`users`, `stands`, `preregistrations`, `directInvites`, `sponsorSettings`, `juryEvaluations`, `invitedJudges`, `guests`, `staff`, `speakers`, `contacts`, `systemUsers`), actualiza Firestore `_backup` y genera copias físicas `.json` fechadas en `./backups/` conservando los últimos 30 días.
  - **Manejo de Límite de Payload en Firestore (10 MB):** Para colecciones pesadas con imágenes base64 como `sponsorSettings`, el tamaño de lote se ajusta automáticamente a 2-4 operaciones por batch, previniendo el error `INVALID_ARGUMENT: Request payload size exceeds the limit`.
  - **Respaldo Silencioso en Intranet Web:** `AdminHub.jsx` evalúa diariamente si el Super Admin `marktuay@gmail.com` ha iniciado sesión; si han transcurrido más de 24 horas desde el último respaldo, ejecuta un snapshot silencioso en segundo plano sin bloquear la UI ni requerir ingreso de PIN.
  - **Programación en Producción en la VM de Google Cloud:**
    - Se configuró el proceso de respaldo programado utilizando PM2 con la directiva cron:
      `pm2 start scripts/auto_backup_12_collections.js --name "backup-expoferre" --cron "0 2 * * *" --no-autorestart && pm2 save`
    - Ejecución automática programada todos los días a las **2:00 AM**.
    - Monitoreo y consulta de logs disponible mediante `pm2 logs backup-expoferre`.

---

## 📅 Resumen de Cambios y Avances de la Sesión (05 de Octubre de 2026)

### 📲 Activación y Recarga de Billetera de WhatsApp WATI (`AdminDirectInvites.jsx` & `watiService.js`)
- **Estado de Suscripción WATI:** Cuenta oficial activa con plan mensual ($119/mes, hasta 1,000 MAC) y número oficial conectado (`+50589439877`).
- **Resolución de Error de Créditos de Conversación Meta:**
  - **Problema Inicial:** Al disparar envíos masivos o individuales por WATI, el sistema arrojaba `Not enough credits to send the message` (0 de 2 mensajes entregados).
  - **Causa Raíz:** Meta cobra una tarifa por cada mensaje saliente de Marketing de forma independiente a la tarifa fija mensual del software de WATI ($119/mes).
  - **Acción Realizada:** El usuario recargó con éxito el saldo prepago de créditos en la billetera de WATI (`live.wati.io/10262044`).
- **Estado Operativo:** La plantilla corporativa `invitacion_expoferre` (Aprobada por Meta bajo categoría `MARKETING`) cuenta con fondos activos para el despacho masivo e individual de invitaciones con gafete y Código QR.

### 🛡️ Auditoría de Seguridad de Endpoints y Flujos de Autenticación
- **Diagnóstico Integral Realizado:** Se auditó el flujo de login administrativo, persistencia de sesiones, manejo de roles y almacenamiento de contraseñas.
- **Vulnerabilidades Identificadas:**
  1. *Elevación de Privilegios por Rol por Defecto:* En `AdminHub.jsx`, cualquier usuario autenticado en Firebase Auth que no existía en `systemUsers` recibía el rol `'admin'` por defecto.
  2. *Contraseñas en Texto Plano en Base de Datos:* Se detectó almacenamiento del campo `password` en texto claro en `systemUsers` y `users`.
  3. *Coincidencia Laxa de Super Admin:* Validación de permisos maestros mediante `.includes('marktuay')`.
  4. *Persistencia Insegura en LocalStorage:* Confianza ciega en `adminUser` sin verificar sesión criptográfica activa en Firebase Auth.
- **Estatus:** Registrados como **Cambios Críticos Pendientes** programados para ser implementados y desplegados hoy por la noche (05/Oct/2026).







