# ExpoFerre 2026 - Plataforma de Acreditación y Leads

Plataforma oficial de gestión, acreditación y captura de leads para **ExpoFerre Nicaragua 2026**. Desarrollada como una aplicación web progresiva (PWA) rápida y escalable, enfocada en la experiencia tanto de los administradores del evento como de los patrocinadores.

## 🚀 Características Principales

### Para Administradores del Evento
- **Control Total (Admin Hub):** Dashboard centralizado para monitorear el pulso de la expo.
- **Gestión de Patrocinadores:** Creación y asignación de perfiles para patrocinadores.
- **Reporte Global de Leads:** Vista unificada de todos los prospectos capturados por todos los patrocinadores, con trazabilidad de origen (quién lo escaneó).
- **Acreditaciones Consolidadas:** Gestión e impresión de gafetes unificada para Staff y VIPs de todos los patrocinadores.
- **Reporte de Marketing & Asistencia:** Métricas detalladas exportables sobre registros en la landing page y check-in físico en el evento.

### Para Patrocinadores
- **Dashboard Privado:** Portal exclusivo para gestionar la presencia de su marca en el evento.
- **Registro de Staff e Invitados:** Formularios de registro para personal de stand e invitados VIP.
- **Escáner Integrado (Captura de Leads):** Herramienta móvil en el navegador para escanear los gafetes (códigos QR) de los asistentes, agregar notas personalizadas y convertirlos en prospectos comerciales.
- **Exportación Directa:** Descarga del histórico de leads a Excel (`.xlsx`) en un clic.

### Para Asistentes
- **Landing Page Optimizada:** Sitio web rápido con toda la información del evento (agenda, expositores, mapa del sitio).
- **Pre-registro:** Formulario público para asegurar su acceso y recibir su código QR de entrada.

## 💻 Stack Tecnológico
- **Frontend:** React + Vite
- **Estilos:** Tailwind CSS (con utilidades avanzadas para diseño responsive y dark mode)
- **Base de Datos & Auth:** Firebase (Firestore & Firebase Authentication)
- **Optimización Web (SEO):** Implementación técnica con `robots.txt`, `sitemap.xml` y meta-etiquetas Open Graph listas para la indexación en motores de búsqueda (Google Search Console).
- **Exportación de Datos:** Carga dinámica (`import()`) de librería `xlsx` para garantizar tiempos rápidos de carga (Code-Splitting).

## ⚙️ Desarrollo Local

1. Clona el repositorio:
```bash
git clone https://github.com/Marktuay/expo-ferre-landing.git
cd expo-ferre-landing
```

2. Instala las dependencias:
```bash
npm install
```

3. Inicia el servidor de desarrollo:
```bash
npm run dev
```

4. Para construir la versión de producción (Build):
```bash
npm run build
```

## 📈 Despliegue y SEO
El proyecto está configurado y optimizado para producción. La exportación de los sitemaps y el rastreo de Googlebot están apuntados al dominio oficial de la expo: `https://expoferrenicaragua.com/`.

---
*Desarrollado para la mejora continua del ecosistema y de los eventos B2B en la industria ferretera.*
