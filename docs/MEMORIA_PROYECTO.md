# 🧠 Memoria del Proyecto - EXPO FERRE 2026
**Directorio de Patrocinadores, Invitaciones Directas & Pases Digitales**
*Fecha de actualización: 8 de Octubre, 2026*

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

## 6. 🛠️ Despliegue en Producción (Google Cloud VM)
- Rama activa: `main` en `https://github.com/Marktuay/expo-ferre-landing.git`
- Comando para sincronizar en servidor:
  ```bash
  git pull origin main
  npm run build
  pm2 reload all
  ```

