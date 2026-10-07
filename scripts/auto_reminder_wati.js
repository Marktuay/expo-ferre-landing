// scripts/auto_reminder_wati.js
// Automatización de Recordatorios Diarios por WhatsApp Oficial (WATI API)
// Diseñado para correr de forma desatendida vía Cron/PM2 o ejecución manual:
//   node scripts/auto_reminder_wati.js [--dry-run] [--limit=50]
//
// Reglas de Protección y Seguridad:
// 1. Estado estrictamente 'pending' (quienes ya tienen gafete 'used' NUNCA son tocados).
// 2. Cooldown de al menos 48 horas desde su último mensaje.
// 3. Máximo 2 recordatorios por persona para evitar reportes de spam.
// 4. Límite diario configurable (por defecto 50 mensajes diarios para cuidar créditos y cuota diaria).
// 5. Cadencia segura de 1.5s entre mensajes (pacing controlado).

import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';

const DEFAULT_WATI_CONFIG = {
  endpoint: 'https://live-mt-server.wati.io/10262044',
  token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1bmlxdWVfbmFtZSI6Im1hcmt0dWF5QGdtYWlsLmNvbSIsIm5hbWVpZCI6Im1hcmt0dWF5QGdtYWlsLmNvbSIsImVtYWlsIjoibWFya3R1YXlAZ21haWwuY29tIiwiYXV0aF90aW1lIjoiMTAvMDEvMjAyNiAyMzo0NDowNCIsInRlbmFudF9pZCI6IjEwMjYyMDQ0IiwiZGJfbmFtZSI6Im10LXByb2QtVGVuYW50cyIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkFETUlOSVNUUkFUT1IiLCJleHAiOjI1MzQwMjMwMDgwMCwiaXNzIjoiQ2xhcmVfQUkiLCJhdWQiOiJDbGFyZV9BSSJ9.TPPSPtWfRnQhrER55s2zCR6DsjLJFDK6yINBsz0qPKo',
  templateName: 'invitacion_expoferre'
};

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const DAILY_LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function cleanPhoneNumber(rawPhone) {
  if (!rawPhone) return { phone: '', isValid: false };
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  if (cleaned.length === 8) cleaned = '505' + cleaned;
  if (cleaned.startsWith('00505')) cleaned = cleaned.substring(2);
  const isValid = cleaned.length >= 10 && cleaned.length <= 15;
  return { phone: cleaned, isValid };
}

function getInviteUrl(token) {
  return `https://expoferrenicaragua.com/?invite=${encodeURIComponent(token)}`;
}

async function sendWatiMessage(phone, guestName, sponsorName, inviteUrl) {
  const url = `${DEFAULT_WATI_CONFIG.endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`;
  const payload = {
    template_name: DEFAULT_WATI_CONFIG.templateName,
    broadcast_name: `Recordatorio_${Date.now()}`,
    parameters: [
      { name: '1', value: guestName },
      { name: '2', value: sponsorName },
      { name: '3', value: inviteUrl }
    ]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': DEFAULT_WATI_CONFIG.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  const isSuccess = data.result === true || data.result === 'success' || (res.ok && !data.items && data.validWhatsAppNumber !== false);

  if (!res.ok || !isSuccess) {
    const errorMsg = data.info || (data.items ? data.items.map(i => i.description).join(', ') : `Error HTTP ${res.status}`);
    return { success: false, error: errorMsg };
  }

  return { success: true, data };
}

async function runAutoReminder() {
  const startTime = new Date();
  console.log(`=======================================================`);
  console.log(`🤖 BOT AUTOMÁTICO DE RECORDATORIOS EXPOFERRE (WATI)`);
  console.log(`Fecha/Hora: ${startTime.toLocaleString()}`);
  console.log(`Modo: ${isDryRun ? '🔍 SIMULACIÓN (DRY-RUN - Sin enviar mensajes)' : '🚀 EN VIVO (Despacho real)'}`);
  console.log(`Límite diario de seguridad: ${DAILY_LIMIT} mensajes`);
  console.log(`=======================================================\n`);

  // 1. Inicializar Firestore
  const configContent = fs.readFileSync('src/firebase.js', 'utf8');
  const match = configContent.match(/const firebaseConfig = ({[\s\S]*?});/);
  const cfg = eval('(' + match[1] + ')');
  const app = initializeApp(cfg);
  const db = getFirestore(app);

  // 2. Consultar invitaciones
  console.log('1. Consultando invitaciones en Firestore...');
  const snap = await getDocs(collection(db, 'events/2026/directInvites'));
  console.log(`Total registros en base de datos: ${snap.size}`);

  const now = Date.now();
  const candidates = [];

  snap.forEach(d => {
    const inv = { id: d.id, ...d.data() };

    // Filtro 1: Debe estar en estado pendiente
    if (inv.status !== 'pending') return;

    // Filtro 2: Debe tener teléfono válido
    const phoneInfo = cleanPhoneNumber(inv.telefono || inv.phone);
    if (!phoneInfo.isValid) return;

    // Filtro 3: Debe haber recibido al menos un mensaje previo
    if (!inv.whatsappSent && !inv.whatsappSentAt) return;

    // Filtro 4: Cooldown de al menos 48 horas
    const lastSentMillis = inv.whatsappSentAt?.toMillis 
      ? inv.whatsappSentAt.toMillis() 
      : (inv.whatsappSentAt ? new Date(inv.whatsappSentAt).getTime() : 0);

    const hoursPassed = (now - lastSentMillis) / (1000 * 60 * 60);
    if (hoursPassed < 48) return;

    // Filtro 5: Máximo 2 recordatorios (sendCount < 3)
    const sendCount = inv.whatsappSendCount || 1;
    if (sendCount >= 3) return;

    candidates.push({
      id: inv.id,
      nombre: (inv.nombre || 'Estimado(a) Invitado(a)').trim(),
      empresa: inv.empresa || '',
      sponsorName: inv.sponsorName || 'El Comité Organizador de EXPO FERRE',
      phone: phoneInfo.phone,
      sendCount,
      hoursPassed: Math.round(hoursPassed)
    });
  });

  console.log(`\n2. Candidatos que califican para recordatorio hoy: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log('✨ No hay invitados que requieran recordatorio en este momento (todos están al día o en cooldown de 48h).');
    process.exit(0);
  }

  // Ordenar por quienes llevan más tiempo esperando (mayor hoursPassed)
  candidates.sort((a, b) => b.hoursPassed - a.hoursPassed);

  const targets = candidates.slice(0, DAILY_LIMIT);
  console.log(`🎯 Lote a procesar hoy: ${targets.length} invitados.\n`);

  let sentOk = 0;
  let sentFailed = 0;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const inviteUrl = getInviteUrl(t.id);
    const guestLabel = t.nombre;
    const sponsorLabel = t.sponsorName;

    console.log(`[${i + 1}/${targets.length}] ${guestLabel} (${t.empresa || 'Invitado'}) -> ${t.phone} (Último envío hace ${t.hoursPassed}h)`);

    if (isDryRun) {
      console.log(`   [DRY-RUN] Simulado envío exitoso.`);
      sentOk++;
      continue;
    }

    try {
      const res = await sendWatiMessage(t.phone, guestLabel, sponsorLabel, inviteUrl);

      if (res.success) {
        // Registrar en Firestore
        await updateDoc(doc(db, 'events/2026/directInvites', t.id), {
          whatsappSent: true,
          whatsappSentAt: serverTimestamp(),
          whatsappSentVia: 'wati_auto_cron',
          whatsappPhone: t.phone,
          whatsappSendCount: t.sendCount + 1,
          lastReminderAt: serverTimestamp()
        });

        console.log(`   ✅ Entregado exitosamente por WATI`);
        sentOk++;
      } else {
        console.log(`   ❌ Error WATI: ${res.error}`);
        sentFailed++;
      }
    } catch (err) {
      console.log(`   ❌ Error de ejecución: ${err.message}`);
      sentFailed++;
    }

    // Pacing seguro entre mensajes (1.5 segundos)
    if (i < targets.length - 1) {
      await sleep(1500);
    }
  }

  console.log(`\n=======================================================`);
  console.log(`📊 RESUMEN FINAL DEL DÍA:`);
  console.log(`Total procesados: ${targets.length}`);
  console.log(`Exitosos: ${sentOk}`);
  console.log(`Fallidos: ${sentFailed}`);
  console.log(`Pendientes restantes para siguientes días: ${candidates.length - targets.length}`);
  console.log(`=======================================================`);

  if (!isDryRun) {
    try {
      await setDoc(doc(db, 'events/2026/systemStatus', 'watiReminders'), {
        lastRunAt: serverTimestamp(),
        lastRunDate: new Date().toISOString().slice(0, 10),
        processedCount: targets.length,
        successCount: sentOk,
        failedCount: sentFailed,
        pendingRemaining: candidates.length - targets.length,
        status: 'completed'
      }, { merge: true });
      console.log('📌 Estado de ejecución registrado en Firestore (systemStatus/watiReminders).');
    } catch (logErr) {
      console.warn('Advertencia: No se pudo registrar estado en Firestore:', logErr.message);
    }
  }

  process.exit(0);
}

runAutoReminder().catch(err => {
  console.error('Error fatal en el bot de recordatorios:', err);
  process.exit(1);
});
