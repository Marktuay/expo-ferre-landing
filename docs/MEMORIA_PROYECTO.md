# 🧠 Memoria del Proyecto - EXPO FERRE 2026
**Directorio de Patrocinadores, Invitaciones Directas & Pases Digitales**
*Fecha de actualización: 14 de Octubre, 2026*

---

## 1. 🎟️ Flujo de Registro de Asistentes & Pase Digital (Cero WhatsApp)
- **Desvinculación Total de WhatsApp en el Registro:**
  - El asistente que completa el formulario para obtener su pase **NO** recibe ningún mensaje automático a WhatsApp ni se le muestra botón de respaldo por WhatsApp.
  - El pase se conserva directamente en la pantalla con acceso permanente reutilizable (al volver a entrar con `?invite=TOKEN`, el usuario ve su gafete activo inmediatamente).
- **Diseño Adaptativo según Dispositivo:**
  - 📱 **Móvil / Celular:** Opción directa de *"Guardar Pase en mi Galería de Fotos"* que genera una imagen en alta resolución mediante HTML5 Canvas y la descarga o comparte directamente en el carrete del teléfono.
  - 💻 **Computadora de Escritorio (PC):**
    - Botón *"Descargar Credencial Oficial (PNG)"* de alta definición.
    - Botón *"🖨️ Imprimir Pase / Guardar como PDF"*, con estilos optimizados `@media print` que aíslan exclusivamente la tarjeta de acreditación y ocultan el resto de la interfaz.

---

## 2. 🏢 Gestión Independiente por Patrocinador
- **Eliminación de Botones Masivos Globales:**
  - Se removieron los botones de envío masivo general del encabezado (`Despachar Nuevos` y `Recordatorio Masivo`).
  - La administración y los despachos se gestionan de manera **100% independiente** fila por fila para cada marca patrocinadora, respetando sus stands, banners co-brandeados y speech personalizado.
- **Carga de Archivos Excel:**
  - Los contactos cargados mediante Excel ingresan en estado `pending`, listos para ser verificados por el administrador antes de disparar envíos.

---

## 3. 📊 Monitor Global y Columnas Multicanal (Correo + WhatsApp)
- **Barra Medidora Superior:**
  - Ya no calcula únicamente correos electrónicos. Ahora mide la **cobertura global de invitados contactados** por cualquiera de las vías (`Correo O WhatsApp`).
  - Termómetro segmentado en 3 colores:
    - 🟢 **Verde (Registrados):** Asistentes con gafete emitido (`status: 'used'`).
    - 🟡 **Amarillo (En Espera):** Contactados que tienen su invitación en mano pero aún no completan su registro.
    - ⚪ **Gris (Sin Enviar aún):** Invitados que no han recibido invitación por ningún canal.
- **Columna en Tabla de Patrocinadores:**
  - Encabezado: `Envíos (Correo + WhatsApp)`.
  - Muestra el total de contactados sobre la lista con desglose exacto: `✉️ X correos | 💬 Y WA`.
  - Conteo de pendientes reales (personas sin contactar aún por ningún canal).

---

## 4. 🚀 Despacho Oficial por WATI API (WhatsApp)
- **Configuración de WATI:**
  - Endpoint: `https://live-mt-server.wati.io/10262044`
  - Plantilla oficial aprobada: `invitacion_expoferre`
  - Parámetros: `{{1}}` Nombre del invitado, `{{2}}` Patrocinador / Comité, `{{3}}` Enlace único de registro.
  - Cadencia de seguridad antispam: 1.2 segundos entre envíos.
- **Despacho Masivo Ejecutado:**
  - Se procesaron y enviaron **56 invitaciones pendientes con teléfono válido** con **100% de éxito (0 fallos)** (Comasa: 22, TIGO: 12, Holcim: 10, General: 11, Balladares: 1).
  - La cobertura global se elevó al **95%** (402 de 421 invitados contactados).
  - De los 12 restantes sin enviar: 6 pertenecen a Indenicsa (solo tienen correo, no teléfono) y 6 son acompañantes sin datos de contacto cargados.

---

---

## 5. 📥 Importaciones Masivas Aditivas de Contactos (Sin Sustituir)
- **Política de Inserción:** 100% aditiva. No se sobreescriben ni alteran pases o tokens preexistentes.
- **Lote de Patrocinadores (8 de Octubre, 2026):**
  - **Extel (Stand 11):** +24 invitaciones nuevas.
  - **INCASA / GRUPO IPSM (Stand 34):** +13 invitaciones nuevas.
  - **SherwinWilliams (Stand 12):** +14 invitaciones nuevas.
  - **SINSA (Stands 1, 2, 3, 4):** +35 invitaciones nuevas con stands Diamante y enlaces individuales únicos generados.
- **Total acumulado en base de datos (`directInvites`):** **507 invitaciones**.

---

---

## 6. 🐛 Corrección Crítica: Modal de Envío Masivo de Correos
- **Causa del Error Reportado:**
  - Al presionar el botón `[✉ Correos]` en cualquiera de las filas de patrocinadores o general, se disparaba un `ReferenceError: setBulkEmailResult is not defined` debido a que el estado `bulkEmailResult` no estaba declarado en los hooks del componente.
  - Esto provocaba que el `<ErrorBoundary>` raíz capturara el error y reemplazara la vista con *"No se pudo cargar este módulo en este momento"*.
- **Solución Aplicada:**
  - Se declaró el hook reactivo: `const [bulkEmailResult, setBulkEmailResult] = useState(null);` en `src/components/AdminDirectInvites.jsx`.
  - Se blindó adicionalmente la carga asíncrona de `InteractiveMap` con `<Suspense>` en `src/App.jsx`.
  - Build compilado con éxito (`npm run build`) y sincronizado en commit `d947b80`.

---

## 8. 🖼️ Banners de Patrocinadores & CDN Pública (11-12 Octubre, 2026)
- **Centralización de Banners Co-Brandeados:**
  - Los 39 patrocinadores cuentan con enlaces públicos en CDN/Cloudinary configurados en `sponsorSettings` dentro de `src/components/AdminDirectInvites.jsx`.
  - Se resolvió el problema de actualización de banners (ej. SICSA y marcas con cambios de arte gráfico).
- **Corrección de Modal de Carga de Banners:**
  - Se corrigió el bloqueo/congelamiento al subir nuevos banners y logos desde el panel administrativo, asegurando el flujo asíncrono y feedback de carga.

---

## 9. ✉️ Correcciones en Envío Directo de Correo (11-12 Octubre, 2026)
- **Cierre del Modal de Envío Individual:**
  - Se solucionó el congelamiento del modal al enviar pruebas o invitaciones directas a contactos individuales (ej. contactos de SICSA).
- **Resolución de Enlace Roto de Header en Correos:**
  - Se corrigió la URL del banner superior (`headerBannerUrl`) para garantizar que todos los clientes de correo (Gmail, Outlook, Webmail) rendericen tanto la cabecera como el pie de página sin enlaces rotos.

---

## 11. 🛡️ Separación de Preregistros e Invitaciones Especiales (12 Octubre, 2026)
- **Aislamiento en Módulo de Preregistros:**
  - Se excluyeron los registros originados por invitaciones directas/especiales (`isDirectInvite`, `type: 'direct_invite'`, `source: 'Invitación Directa'`, `inviteToken`) de la vista del módulo `AdminPreRegistrations`.
  - **Objetivo:** Evitar que el personal de registro en recepción confunda o mezcle a los visitantes generales con los invitados VIP de los patrocinadores.
  - El control, estadísticas y seguimiento de los invitados de patrocinadores se mantiene de forma 100% independiente en el módulo de **Invitaciones Directas**.

---

## 12. 🧹 Auditoría Integral de Cruces Inter-Patrocinadores y Depuración (12 Octubre, 2026)
- **Auditoría de Cruces en `directInvites`:**
  - Se identificaron y auditaron 20 casos de duplicados cruzados entre diferentes marcas patrocinadoras.
  - **Regla Operativa Aplicada:**
    1. **Respeto a Registrados (`status: 'used'`):** El contacto se mantiene de forma inalterable en el patrocinador donde ya completó su acreditación y tiene su gafete emitido.
    2. **Depuración de Pendientes (`status: 'pending'`):** En cruces donde el contacto aún no se ha registrado, se conservó en la marca que lo cargó primero y se eliminó el pase duplicado posterior para evitar confusión y pases duplicados.
  - **Casos Resueltos:**
    - *Balladares vs CEMEX:* Andrea Briones conservada en CEMEX (registrada); Julio y Digna María conservados en Balladares (registrados); Carlos Arturo conservado en CEMEX.
    - *Noelito vs Balladares:* Denis conservado en Balladares; duplicado en Noelito eliminado.
    - *Plycem vs Balladares:* José Adán conservado en Balladares; duplicado en Plycem eliminado.
    - *Fernández Sera vs Balladares (Caso 19):* José David conservado en Fernández Sera (Ferretería González Sevilla); duplicado en Balladares eliminado.
    - *Indenicsa vs COMASA (Caso 20):* Víctor Hugo conservado en Indenicsa (Ferretería La Grapa); duplicado en COMASA eliminado.
    - *SICSA:* Eliminación de pase duplicado pendiente interno (Clayton Ortiz).

---

## 13. 🏢 Unificación Oficial de COMASA en SINSA (12 Octubre, 2026)
- **Contexto Operativo:**
  - COMASA (Compañía Mayorista, S.A.) es la división mayorista de distribución perteneciente a **SINSA**.
  - No cuenta con stands físicos individuales separados, mientras que SINSA cuenta con los Stands Diamante 1, 2, 3 y 4.
- **Migración Ejecutada en Base de Datos:**
  - Todas las 22 invitaciones restantes de COMASA se unificaron dentro de SINSA (`sponsorId: 'sinsa'`, `sponsorName: 'SINSA'`, asignación de Stands Diamante 1, 2, 3, 4 y banner oficial).
  - Se preservó el atributo de trazabilidad: `division: 'COMASA (Mayorista)'`.
  - **Conteo Final:**
    - **COMASA:** 0 invitaciones.
    - **SINSA:** **36 invitaciones totales** consolidadas.

---

## 14. 🛡️ Filtro Inteligente Anti-Duplicados en Carga de Listas (12 Octubre, 2026)
- **Motor de Deduplicación y Validación en `AdminDirectInvites.jsx`:**
  - Implementación de un motor proactivo que previene cargar contactos duplicados a Firestore al subir archivos Excel independientes.
  - **Detección Cruzada Multicapa:**
    1. **Contra Invitaciones Existentes (`directInvites`):** Cruza contra las 500+ invitaciones de todas las marcas y la lista general.
    2. **Contra Asistentes Registrados (`guests`):** Cruza contra la base de asistentes que ya tienen gafete oficial emitido en ExpoFerre 2026.
    3. **Intra-lote (Mismo Archivo Excel):** Si el mismo archivo Excel repite una persona en diferentes filas, detecta y omite las repeticiones posteriores.
  - **Normalización Robusta:**
    - Teléfonos: normalizados a los últimos 8 dígitos (formato estándar de Nicaragua y prefijo `+505`).
    - Correos electrónicos: normalizados en minúsculas y sin espacios.
    - Nombres y Empresas: normalizados eliminando tildes, símbolos y palabras comunes de relleno (`Ferretería`, `Distribuidora`, `Comercial`, `Materiales de Construcción`, `S.A.`).
  - **Diagnóstico Visual en Modal de Carga:**
    - Identificación inmediata: badge `+ Nuevo` vs `🛡️ Omitido / ⚠️ Ya existe` indicando el motivo exacto y la lista con la que choca.
    - Checkbox de protección activado por defecto para garantizar la integridad de la base de datos.
    - Alerta de seguridad preventiva agregada también en la creación manual de invitaciones individuales.

---

## 15. 🛠️ Despliegue en Producción (Google Cloud VM)
- Rama activa: `main` en `https://github.com/Marktuay/expo-ferre-landing.git`
- Comando para sincronizar en servidor:
  ```bash
  git pull origin main
  npm run build
  pm2 reload all
  ```

---

## 16. 📅 Unificación de Fecha Oficial del Evento (13 de Octubre, 2026)
- **Ajuste de Calendario:**
  - Se eliminó la fecha del **16** de octubre, quedando oficialmente y de manera exclusiva el **17 de Octubre de 2026**.
  - **Archivos y Vistas Actualizadas:**
    1. `src/App.jsx`: Sección pública de *UBICACIÓN Y FECHA* (junto al formulario de preregistro / footer) ajustada a `17 de Octubre de 2026`.
    2. `src/components/AdminPreRegistrations.jsx`: Plantilla HTML de correo para confirmación de preregistro con código QR.
    3. `src/components/DirectInviteRegistration.jsx`: Correo de confirmación oficial para invitados registrados.
    4. `src/components/AdminDirectInvites.jsx`: Plantilla sugerida para mensajes de WhatsApp en el gestor de artes.

---

## 17. 🏷️ Inclusión de INISER en Reel de Logos y Patrocinadores Plata (13 de Octubre, 2026)
- **Patrocinador Añadido:**
  - Se incorporó el logotipo oficial de **INISER** (`/plata/iniser.png`) en la categoría **Plata**.
  - **Archivos Actualizados:**
    1. `public/plata/iniser.png`: Ubicación del asset gráfico oficial.
    2. `src/App.jsx`: Añadido a `initialPlaceholders` dentro de la categoría `Plata` (`order: 3`) con tarjeta estilizada en blanco (`bgWhite: true`) para su visualización en el reel animado principal.
    3. `src/components/AdminSponsors.jsx`: Añadido al listado oficial `OFFICIAL_SPONSORS` bajo la categoría `Plata`.

---

## 18. 🏆 Nueva Pestaña "Top 5 Ganadores por Categoría" en Panel de Jurados (14 de Octubre, 2026)
- **Objetivo y Contexto:**
  - Se requería una pestaña ejecutiva inmediatamente después de *"Enlaces / Jurados Invitados"* que visualizara de forma rápida y clara los 5 primeros lugares de cada una de las 3 categorías oficiales de los premios, junto con sus puntuaciones ponderadas acumuladas.
- **Implementación en [`AdminJury.jsx`](src/components/AdminJury.jsx):**
  1. **Navegación:** Pestaña `🏆 Top 5 Ganadores por Categoría` añadida en 4ª posición (`activeTab === 'winners'`).
  2. **Podio Ejecutivo de 1º Lugar:** Tarjetas destacadas en el encabezado con los campeones de cada categoría (Familiar, Oro y Promesa) con corona/medalla, nombre, ciudad y puntaje total.
  3. **Cuadros de Honor Detallados:** Tablas estilizadas con los 5 primeros lugares por categoría, destacando medallas (🥇 1º, 🥈 2º, 🥉 3º, 4º, 5º), insignias de puntaje ponderado (`⭐ X pts`), conteo de nominaciones y desglose de jurados votantes.
  4. **Exportación a Excel Optimizada:** La primera hoja del reporte Excel generado (`handleExportExcel`) exporta directamente el consolidado del *Top 5 Ganadores*.

---

## 19. 🔍 Normalización Inteligente de Votaciones y Consolidación de Votos (14 de Octubre, 2026)
- **Causa del Problema Reportado:**
  - En la categoría *Ferretería Familiar*, diferentes jurados escribieron el nombre de **SINSA** con pequeñas variaciones: `"Silva internacional- SINSA"`, `"Sinsa"`, y `"Ferretería SINSA"`.
  - El sistema anterior agrupaba los votos mediante `name.toLowerCase()`, por lo que cada variante se calculaba como una empresa independiente separada (repartiendo sus 18 puntos totales en bloques de 9, 5 y 4 pts).
  - Esto provocaba que temporalmente figurara empatada con 9 puntos con otra ferretería en lugar de consolidar su puntuación real.
- **Solución Implementada:**
  - Se introdujo el motor `canonicalStoreName(rawName)` en `AdminJury.jsx`, que remueve tildes, signos de puntuación y términos genéricos de relleno, unificando variantes de un mismo negocio (`SINSA`, `El Halcón`, `Ferretería Romo`, `Ferretería Jenny`, `Ferretería Richardson`, `Innova`, `Ferretería Noelito`, etc.).
  - **Resultado Oficial:**
    - **Ferretería Familiar:** 🥇 **SINSA** se posiciona como el ganador #1 indiscutible con **18 puntos** (4 votos: Grethel Valle [4pts], Rodrigo Hernández [4pts], Yerev Sáenz [5pts], Miguel Guzmán [5pts]).
    - **Ferretería Oro:** 🥇 **SINSA** con **20 puntos** (5 votos).
    - **Ferretería Promesa:** 🥇 **Ferretería Noelito** con **14 puntos** (3 votos).







