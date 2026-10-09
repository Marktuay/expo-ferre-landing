# 💼 Informe Ejecutivo de Alcance y Valoración Económica
## EXPO FERRE 2026 — Plataforma Integral de Acreditación, Patrocinadores y Logística
*Fecha: 9 de Octubre de 2026*  
*Documento preparado para: Justificación de Alcance y Ajuste Comercial*

---

## 1. 📌 Resumen Ejecutivo
El proyecto inicialmente pactado bajo un presupuesto base de **$1,400 USD** contemplaba exclusivamente el desarrollo de un **Sitio Web / Landing Page informativa** para el evento EXPO FERRE 2026.

A lo largo del proceso operativo y de cara a las necesidades reales de los organizadores y de las **27 marcas patrocinadoras**, el proyecto evolucionó de ser una página web estática a convertirse en un **Sistema Operativo / ERP a medida para la Gestión, Acreditación, Difusión Multicanal y Control de Puerta del Evento**.

---

## 2. 🔍 Comparativa de Alcance: Inicial vs. Entregado

| Aspecto | Alcance Inicial Pactado ($1,400 USD) | Sistema Integral Desarrollado (Actual) |
| :--- | :--- | :--- |
| **Naturaleza del Producto** | Sitio Web / Landing Page informativa | Plataforma Web + Intranet Administrativa + Portal de Expositores (SaaS/ERP a medida) |
| **Usuarios y Roles** | Visitante público único | 5 niveles de acceso: Público, Patrocinadores, Jurados, Staff Técnico y Super Administrador Maestro |
| **Mapa del Evento** | Imagen gráfica estática o plano referencial | Mapa interactivo dinámico en tiempo real con zoom/paneo táctil, asignación de stands y pines oficiales |
| **Gestión de Expositores** | No contemplado | Portal privado para 27 patrocinadores con acreditación de personal de staff según categoría y registro de ponencias |
| **Pases y Acreditación** | Formulario simple de preregistro en espera | Motor de invitaciones directas con tokens criptográficos de uso único auto-destructibles |
| **Co-Branding de Marcas** | Logotipos genéricos en el pie o reel | Banners de Header (1200x450px) y Footer (1200x250px) personalizados por patrocinador, stands y discursos oficiales |
| **Canales de Comunicación** | Ninguno (solo recepción de emails de contacto) | Integración oficial con **WhatsApp Business API (WATI)** + Motor de envíos masivos de correo con throttling antispam |
| **Automatización** | Sin automatizaciones | Bot desatendido en la nube (PM2) con ejecución en dos ventanas diarias (10:00 AM y 3:00 PM), cooldown de 48h y protección antispam |
| **Credenciales del Asistente** | Confirmación estándar por pantalla | Generador de gafete digital autónomo con descarga en alta resolución a la galería del móvil (HTML5 Canvas) e impresión optimizada / PDF para PC |
| **Premios del Sector** | No contemplado | Módulo privado para 12 jurados calificadores con evaluación en 3 categorías, ranking ponderado en vivo y notificaciones por email |
| **Importación de Datos** | Registro manual uno a uno | Parser inteligente de archivos Excel multi-pestaña con asignación automática por patrocinador y escrituras atómicas en base de datos |
| **Inteligencia y Reportes** | Lista plana en base de datos | Informes ejecutivos multi-hoja en Excel con atribución de conversión por canal (WhatsApp vs Correo vs Directo) y fecha/hora exacta |
| **Operación en Puerta** | No contemplado | Módulo de Check-In con escáner QR mediante cámara para validación en tiempo real en la entrada del evento |
| **Infraestructura y Seguridad** | Hosting web tradicional | Servidor Virtual en Google Cloud (Compute Engine), gestión PM2, respaldos automáticos diarios de 12 colecciones y bloqueo fail-closed |

---

## 3. 📊 Desglose de Valoración por Módulos (Precios de Mercado)

Si cada módulo desarrollado se cotizara como adenda o desarrollo independiente a precios estándar del mercado de software:

| Módulo / Funcionalidad Desarrollada | Valor de Mercado Estimado |
| :--- | :---: |
| **1. Landing Page Informativa + Formulario Web (Alcance Original)** | **$1,400 USD** |
| **2. Motor de Invitaciones Directas Co-Brandeado** <br>• Tokens únicos de autodestrucción.<br>• Co-branding de 27 patrocinadores (Header, Footer, Stands, Speeches).<br>• Lector de Excel multi-pestaña y procesamiento atómico por lotes en Firestore. | **+$1,000 USD** |
| **3. Integración Oficial de WhatsApp API (WATI) + Bot Desatendido** <br>• Conexión por API oficial y plantilla aprobada ante Meta.<br>• Bot programado en servidor (PM2) con doble ventana diaria y cooldown de 48h.<br>• Despacho masivo y 1-click por contacto. | **+$900 USD** |
| **4. Portal Privado de Patrocinadores y Mapa Interactivo en Tiempo Real** <br>• Acreditación de staff con cuotas por categoría (Diamante, Oro, Plata).<br>• Gestión de 35 stands y mapa dinámico con soporte táctil (`react-zoom-pan-pinch`). | **+$700 USD** |
| **5. Generador Autónomo de Pases y Credenciales Digitales** <br>• Renderizado Canvas de alta resolución para guardado directo en galería móvil.<br>• Estilos de impresión `@media print` y exportación PNG para computadoras. | **+$450 USD** |
| **6. Plataforma de Jurados & Premios a la Excelencia Ferretera** <br>• Portal confidencial para 12 jurados.<br>• Ponderación de votos en vivo y alertas automáticas por correo al comité. | **+$500 USD** |
| **7. Inteligencia de Negocios y Reportes Ejecutivos en Excel** <br>• Exportación consolidada multi-hoja con atribución de canal y hora de registro.<br>• Buscador y filtros dinámicos en intranet. | **+$350 USD** |
| **8. Infraestructura Cloud, Respaldos Automáticos y Escáner QR de Puerta** <br>• Despliegue en Google Cloud VM y cron nocturno de 12 colecciones.<br>• Escáner QR con cámara para control de asistencia presencial en los accesos. | **+$600 USD** |
| **VALOR TOTAL REAL DEL SISTEMA ENTREGADO** | **$5,900 USD** |

---

## 4. 💡 Opciones y Estrategias Comerciales de Cobro

Para presentar el ajuste económico al cliente o comité organizador de forma transparente y constructiva, se sugieren las siguientes 3 alternativas:

### 🟢 Opción A: Ajuste Global del Proyecto (Estrategia Recomendada)
* **Monto Total a Cobrar:** **$3,200 – $3,800 USD**  
* **Diferencia adicional sobre el monto base:** **+$1,800 a +$2,400 USD**
* **Justificación:** Se reconoce el proyecto no como una página web, sino como la plataforma integral que resolvió la logística de acreditación, pases de 27 empresas patrocinadoras y la automatización por WhatsApp. Representa un descuento de más del 35% respecto a su valor real de mercado.

### 🟡 Opción B: Base Web + Adenda de Acreditación y WhatsApp (Estrategia Modular)
* **Base Web Pactada:** **$1,400 USD**
* **Adenda Tecnológica:** *"Módulo de Acreditación Digital, Pases Co-Brandeados y Automatización WATI API"*: **+$1,600 USD**
* **Monto Total a Cobrar:** **$3,000 USD**
* **Justificación:** Permite al cliente justificar administrativamente el pago separando el concepto de diseño web del módulo de software operativo y automatización.

### 🔵 Opción C: Paquete Llave en Mano + Soporte Operativo en Vivo (16 y 17 de Octubre)
* **Monto Total a Cobrar:** **$3,800 – $4,200 USD**
* **Alcance:**
  1. Todo el sistema tecnológico y las automatizaciones entregadas.
  2. Presencia técnica y acompañamiento durante los dos días del evento (16 y 17 de Octubre en Crowne Plaza) para operar o supervisar el escáner QR de acreditación en puerta, soporte a patrocinadores y monitoreo de la infraestructura en la nube.

---

## 5. 🎯 Argumentos Clave para la Negociación con el Cliente
1. **Ahorro de Costos Externos:** Si la organización hubiera contratado servicios externos de acreditación y software de eventos (como Eventtia o plataformas especializadas), habrían pagado entre $2.00 y $5.00 USD por asistente registrado más licencias mensuales por expositor, superando fácilmente los $3,000 USD solo en software de terceros.
2. **Propiedad y Personalización Total:** El sistema es 100% propio de EXPO FERRE, sin comisiones por asistente, sin suscripciones recurrentes de terceros y adaptado exactamente a las marcas de los 27 patrocinadores y stands de la feria.
3. **Impacto en Patrocinadores:** Se le entregó a cada patrocinador Diamante, Oro y Plata una herramienta co-brandeada con sus marcas, lo que elevó directamente el valor comercial de los paquetes de patrocinio que vendió la feria.
