import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { collection, doc, getDoc, getDocs, updateDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';

const playBeep = (type = 'success') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    console.error("Audio beep failed", e);
  }
};

export default function AdminCheckIn({ onBack }) {
  const [manualCode, setManualCode] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    preregistrations: { total: 0, checkedIn: 0 },
    sponsors: { total: 0, checkedIn: 0 },
    staff: { total: 0, checkedIn: 0 },
    speakers: { total: 0, checkedIn: 0 },
    guests: { total: 0, checkedIn: 0 },
    directInvites: { total: 0, checkedIn: 0 }
  });
  
  const basePath = getEventBasePath();
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { 
      qrbox: { width: 250, height: 250 }, 
      fps: 10,
      rememberLastUsedCamera: true
    }, false);

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    // Improve accessibility of the injected html5-qrcode UI
    const observer = new MutationObserver(() => {
      const scanTypeLink = document.getElementById('html5-qrcode-anchor-scan-type-change');
      if (scanTypeLink && !scanTypeLink.hasAttribute('role')) {
        scanTypeLink.setAttribute('role', 'button');
        scanTypeLink.tabIndex = 0;
        // Make sure it can be activated via keyboard
        scanTypeLink.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            scanTypeLink.click();
          }
        });
      }
    });

    const readerNode = document.getElementById('reader');
    if (readerNode) {
      observer.observe(readerNode, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubPrereg = onSnapshot(query(collection(db, `${basePath}/preregistrations`)), (snap) => {
      let checkedIn = 0;
      snap.forEach(d => { if (d.data().checkedIn) checkedIn++; });
      setStats(s => ({ ...s, preregistrations: { total: snap.size, checkedIn } }));
    });

    const unsubUsers = onSnapshot(query(collection(db, `users`)), (snap) => {
      let totalSponsors = 0;
      let checkedInSponsors = 0;
      snap.forEach(d => {
        if (d.data().role === 'sponsor') {
          totalSponsors++;
          if (d.data().checkedIn) checkedInSponsors++;
        }
      });
      setStats(s => ({ ...s, sponsors: { total: totalSponsors, checkedIn: checkedInSponsors } }));
    });

    const unsubStaff = onSnapshot(query(collection(db, `${basePath}/staff`)), (snap) => {
      let checkedIn = 0;
      snap.forEach(d => { if (d.data().checkedIn) checkedIn++; });
      setStats(s => ({ ...s, staff: { total: snap.size, checkedIn } }));
    });

    const unsubSpeakers = onSnapshot(query(collection(db, `${basePath}/speakers`)), (snap) => {
      let checkedIn = 0;
      snap.forEach(d => { if (d.data().checkedIn) checkedIn++; });
      setStats(s => ({ ...s, speakers: { total: snap.size, checkedIn } }));
    });

    const unsubGuests = onSnapshot(query(collection(db, `${basePath}/guests`)), (snap) => {
      let checkedIn = 0;
      snap.forEach(d => { if (d.data().checkedIn) checkedIn++; });
      setStats(s => ({ ...s, guests: { total: snap.size, checkedIn } }));
    });

    const unsubDirectInvites = onSnapshot(query(collection(db, `${basePath}/directInvites`)), (snap) => {
      let checkedIn = 0;
      snap.forEach(d => { if (d.data().checkedIn) checkedIn++; });
      setStats(s => ({ ...s, directInvites: { total: snap.size, checkedIn } }));
    });

    return () => {
      unsubPrereg();
      unsubUsers();
      unsubStaff();
      unsubSpeakers();
      unsubGuests();
      unsubDirectInvites();
    };
  }, [basePath]);

  const [printBadgeItems, setPrintBadgeItems] = useState(null);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);

  const collectionsToCheck = [
    { key: 'preregistrations', name: 'Preregistro (General)', path: `${basePath}/preregistrations` },
    { key: 'users', name: 'Patrocinador', path: `users` },
    { key: 'staff', name: 'Staff Técnico', path: `${basePath}/staff` },
    { key: 'speakers', name: 'Conferencista', path: `${basePath}/speakers` },
    { key: 'guests', name: 'Invitado Especial', path: `${basePath}/guests` }
  ];

  const determineBadgeRole = (colKey, data) => {
    if (colKey === 'staff') return 'STAFF';
    if (colKey === 'speakers') return 'CONFERENCISTA';
    if (colKey === 'users' || data.role === 'sponsor') return 'PATROCINADOR';
    if (
      data.isVip ||
      data.isDirectInvite ||
      data.type === 'direct_invite' ||
      data.source === 'Invitación Directa' ||
      data.position === 'Invitado Especial' ||
      data.position === 'Invitado VIP' ||
      (data.roleLabel && data.roleLabel.toUpperCase().includes('VIP')) ||
      (data.position && data.position.toLowerCase().includes('invitado'))
    ) {
      return 'INVITADO VIP';
    }
    return 'ASISTENTE';
  };

  const processQRCode = async (code) => {
    let rawCode = (code || '').trim();
    if (!rawCode || isProcessing) return;

    // 0. Si viene como URL completa (ej. https://expoferre.com/?invite=inv_xxx o ?code=VIP-xxx)
    if (rawCode.includes('?') && (rawCode.startsWith('http://') || rawCode.startsWith('https://'))) {
      try {
        const urlObj = new URL(rawCode);
        const inviteParam = urlObj.searchParams.get('invite') || urlObj.searchParams.get('code') || urlObj.searchParams.get('id');
        if (inviteParam) {
          rawCode = inviteParam.trim();
        }
      } catch (e) {
        const match = rawCode.match(/[?&](invite|code|id)=([^&#]+)/i);
        if (match && match[2]) rawCode = decodeURIComponent(match[2]).trim();
      }
    }

    // Normalizar ID limpio removiendo el prefijo VIP- si viene en el QR escaneado
    const cleanCode = rawCode.replace(/^VIP[-_:\s]+/i, '').trim();

    setIsProcessing(true);
    setLastScanResult(null);

    let foundRef = null;
    let foundData = null;
    let foundCollectionName = '';
    let foundColKey = '';

    // Probar códigos candidatos (cleanCode primero, luego rawCode si difiere)
    const candidateCodes = Array.from(new Set([cleanCode, rawCode].filter(Boolean)));

    try {
      // 1. Búsqueda directa por ID en las colecciones oficiales
      for (const testCode of candidateCodes) {
        for (const col of collectionsToCheck) {
          const docRef = doc(db, col.path, testCode);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            foundRef = docRef;
            foundData = { id: docSnap.id, ...docSnap.data() };
            foundCollectionName = col.name;
            foundColKey = col.key;
            break;
          }
        }
        if (foundRef) break;
      }

      // 2. Si no se encontró por ID directo, buscar si el código escaneado es un token de invitación
      if (!foundRef) {
        for (const testCode of candidateCodes) {
          const qInv = query(collection(db, `${basePath}/directInvites`), where('token', '==', testCode));
          const snapInv = await getDocs(qInv);
          if (!snapInv.empty) {
            const invData = snapInv.docs[0].data();
            const attendeeId = invData.registeredAttendeeId;
            if (attendeeId) {
              const attRef = doc(db, `${basePath}/preregistrations`, attendeeId);
              const attSnap = await getDoc(attRef);
              if (attSnap.exists()) {
                foundRef = attRef;
                foundData = { id: attSnap.id, ...attSnap.data() };
                foundCollectionName = 'Invitado Directo (Patrocinador)';
                foundColKey = 'preregistrations';
                break;
              }
            }
          }
        }
      }

      // 3. Si aún no se encontró, buscar en preregistrations por inviteToken
      if (!foundRef) {
        for (const testCode of candidateCodes) {
          const qPre = query(collection(db, `${basePath}/preregistrations`), where('inviteToken', '==', testCode));
          const snapPre = await getDocs(qPre);
          if (!snapPre.empty) {
            const preDoc = snapPre.docs[0];
            foundRef = preDoc.ref;
            foundData = { id: preDoc.id, ...preDoc.data() };
            foundCollectionName = 'Invitado Directo (Patrocinador)';
            foundColKey = 'preregistrations';
            break;
          }
        }
      }

      // 4. Buscar por qrCode field si está almacenado
      if (!foundRef) {
        for (const testCode of candidateCodes) {
          const qQr = query(collection(db, `${basePath}/preregistrations`), where('qrCode', '==', testCode));
          const snapQr = await getDocs(qQr);
          if (!snapQr.empty) {
            const qrDoc = snapQr.docs[0];
            foundRef = qrDoc.ref;
            foundData = { id: qrDoc.id, ...qrDoc.data() };
            foundCollectionName = 'Preregistro';
            foundColKey = 'preregistrations';
            break;
          }
        }
      }

      if (!foundRef) {
        playBeep('error');
        setLastScanResult({ type: 'error', message: `Código QR inválido o no encontrado: ${rawCode}` });
        setIsProcessing(false);
        return;
      }

      const roleLabel = determineBadgeRole(foundColKey, foundData);
      const isVip = foundColKey !== 'staff' && foundColKey !== 'speakers' && foundColKey !== 'users' && Boolean(
        roleLabel.includes('VIP') ||
        foundData.isVip ||
        foundData.isDirectInvite ||
        foundData.type === 'direct_invite' ||
        foundData.source === 'Invitación Directa'
      );

      const attendeeName = foundData.name || `${foundData.nombre || ''} ${foundData.apellido || ''}`.trim() || 'Participante';
      const attendeeCompany = foundData.company || foundData.empresa || foundData.sponsorName || '';
      const attendeePosition = foundData.position || foundData.cargo || foundData.puesto || '';

      const badgeItem = {
        id: foundData.id || cleanCode,
        name: attendeeName,
        company: attendeeCompany,
        position: attendeePosition,
        cargo: attendeePosition,
        roleLabel: isVip ? 'INVITADO VIP' : roleLabel,
        isVip: isVip
      };

      if (foundData.checkedIn) {
        playBeep('error');
        setLastScanResult({ 
          type: 'warning', 
          message: `El participante ya había ingresado previamente.`,
          name: attendeeName,
          company: attendeeCompany,
          roleLabel: isVip ? 'INVITADO VIP' : roleLabel,
          isVip: isVip,
          hasMealPass: isVip,
          collection: foundCollectionName,
          time: foundData.checkInTime?.toDate ? foundData.checkInTime.toDate().toLocaleString('es-NI', { timeZone: 'America/Managua' }) : 'Desconocido',
          badgeData: badgeItem
        });
      } else {
        await updateDoc(foundRef, {
          checkedIn: true,
          checkInTime: serverTimestamp()
        });

        // Sincronizar en directInvites si fue invitación directa
        if (foundData.inviteToken) {
          try {
            const invRef = doc(db, `${basePath}/directInvites`, foundData.inviteToken);
            await updateDoc(invRef, {
              checkedIn: true,
              checkInTime: serverTimestamp()
            });
          } catch (syncErr) {
            console.warn("Nota: No se requirió actualizar directInvites:", syncErr);
          }
        }

        playBeep('success');
        setLastScanResult({
          type: 'success',
          message: `Check-in exitoso. Gafete enviado a impresión.`,
          name: attendeeName,
          company: attendeeCompany,
          roleLabel: isVip ? 'INVITADO VIP' : roleLabel,
          isVip: isVip,
          hasMealPass: isVip,
          collection: foundCollectionName,
          badgeData: badgeItem
        });

        // Detonar impresión automática si está activa la casilla
        if (autoPrintEnabled) {
          setPrintBadgeItems([badgeItem]);
        }
      }

    } catch (error) {
      console.error('Error processing check-in:', error);
      playBeep('error');
      setLastScanResult({ type: 'error', message: 'Error de conexión. Intente nuevamente.' });
    }

    setManualCode('');
    setIsProcessing(false);
  };

  const onScanSuccess = (decodedText) => {
    processQRCode(decodedText);
  };

  const onScanFailure = (error) => {
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    processQRCode(manualCode.trim());
  };

  const totalRegistered = Object.values(stats).reduce((acc, curr) => acc + curr.total, 0);
  const totalCheckedIn = Object.values(stats).reduce((acc, curr) => acc + curr.checkedIn, 0);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Control de Asistencia</h1>
            <p className="text-body-lg text-secondary">Escanee códigos QR en puerta o búsquelos manualmente para validar su entrada.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => onBack('adminAttendanceReport')} className="px-5 py-2 bg-white text-primary border border-primary rounded-md hover:bg-primary/10 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">table_chart</span>
              Ver Reporte Detallado
            </button>
            <button onClick={() => onBack('adminHub')} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Menú
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-outline-variant p-6">
              <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                Escáner de Accesos
              </h2>
              
              <div className="rounded-md overflow-hidden border border-outline-variant mb-6">
                <div id="reader" className="w-full"></div>
              </div>

              <form onSubmit={handleManualSubmit} className="flex gap-4">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="O ingrese el código ID manualmente (Pistola USB)" 
                    className="w-full px-4 py-3 rounded-md border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-surface text-on-surface"
                    disabled={isProcessing}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || !manualCode.trim()}
                  className="px-6 py-3 bg-primary text-on-primary font-bold rounded-md hover:brightness-110 transition-colors disabled:opacity-50"
                >
                  Verificar
                </button>
              </form>
              {/* Selector de Impresión Térmica Automática */}
              <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-bold text-slate-800">
                  <input 
                    type="checkbox" 
                    checked={autoPrintEnabled} 
                    onChange={(e) => setAutoPrintEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#0d47a1] rounded border-gray-300 focus:ring-[#0d47a1]"
                  />
                  <span>🖨️ Auto-imprimir credencial en check-in (Brother QL-810Wc)</span>
                </label>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Rollo DK-2205 (62 mm)</span>
              </div>
            </div>

            {lastScanResult && (
              <div className={`p-6 rounded-lg border-l-4 shadow-sm ${
                lastScanResult.type === 'success' ? 'bg-[#16a34a]/10 border-[#16a34a]' : 
                lastScanResult.type === 'warning' ? 'bg-[#f39200]/10 border-[#f39200]' : 
                'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`material-symbols-outlined text-4xl shrink-0 ${
                    lastScanResult.type === 'success' ? 'text-[#16a34a]' : 
                    lastScanResult.type === 'warning' ? 'text-[#f39200]' : 
                    'text-red-500'
                  }`}>
                    {lastScanResult.type === 'success' ? 'check_circle' : 
                     lastScanResult.type === 'warning' ? 'warning' : 'error'}
                  </span>
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-1 ${
                      lastScanResult.type === 'success' ? 'text-[#16a34a]' : 
                      lastScanResult.type === 'warning' ? 'text-[#b45309]' : 
                      'text-red-700'
                    }`}>
                      {lastScanResult.type === 'success' ? '¡ACCESO CONCEDIDO!' : 
                       lastScanResult.type === 'warning' ? 'ACCESO DENEGADO (YA INGRESÓ)' : 'CÓDIGO INVÁLIDO'}
                    </h3>
                    <p className="text-on-surface-variant text-base mb-2">{lastScanResult.message}</p>
                    
                    {lastScanResult.name && (
                      <div className="mt-4 bg-white/70 border border-slate-200/80 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                lastScanResult.isVip ? 'bg-black text-amber-300 border border-amber-400' : 'bg-slate-900 text-white'
                              }`}>
                                {lastScanResult.roleLabel || (lastScanResult.isVip ? '★ INVITADO VIP ★' : 'ASISTENTE')}
                              </span>
                              <span className="text-xs text-secondary font-medium">{lastScanResult.collection}</span>
                            </div>
                            <p className="font-black text-on-surface text-xl leading-tight">{lastScanResult.name}</p>
                            {lastScanResult.company && (
                              <p className="text-sm font-bold text-slate-700 uppercase mt-0.5">{lastScanResult.company}</p>
                            )}
                            {lastScanResult.time && (
                              <p className="text-xs text-amber-900 mt-2 font-medium bg-amber-50 px-2.5 py-1 rounded border border-amber-200 inline-block">
                                🕒 Hora del primer check-in: {lastScanResult.time}
                              </p>
                            )}
                          </div>

                          {/* Botón de Impresión / Re-impresión Manual */}
                          {lastScanResult.badgeData && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPrintBadgeItems([lastScanResult.badgeData])}
                                className="px-4 py-2.5 bg-[#0d47a1] hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                                title="Imprimir credencial en impresora Brother QL-810Wc"
                              >
                                <span className="material-symbols-outlined text-[18px]">print</span>
                                <span>{lastScanResult.type === 'warning' ? 'Re-imprimir Gafete' : 'Imprimir Gafete'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* ALERTA VISUAL DESTACADA DE DERECHO A COMIDA / ALMUERZO */}
                        {lastScanResult.isVip ? (
                          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-between gap-3 shadow-sm border border-emerald-500">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-3xl shrink-0">restaurant</span>
                              <div>
                                <p className="font-black text-sm uppercase tracking-wide">🍽️ PASE DE COMIDA VÁLIDO • ALMUERZO INCLUIDO</p>
                                <p className="text-xs text-emerald-100 font-medium">Invitado VIP registrado. Tiene derecho al servicio de alimentos del evento.</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-black/30 border border-emerald-400 text-amber-300 rounded-md text-xs font-black tracking-widest uppercase shrink-0">
                              VIP
                            </span>
                          </div>
                        ) : (
                          <div className="bg-slate-100 text-slate-800 px-4 py-3 rounded-xl flex items-center justify-between gap-3 border border-slate-300">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-3xl text-amber-600 shrink-0">no_meals</span>
                              <div>
                                <p className="font-black text-sm text-slate-900 uppercase tracking-wide">⚠️ ASISTENTE GENERAL • SIN PASE DE COMIDA</p>
                                <p className="text-xs text-slate-600 font-medium">Preregistro web general. Acceso únicamente al piso de exhibición y conferencias.</p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-md text-xs font-bold tracking-wider uppercase shrink-0">
                              GENERAL
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal / Render de Impresión Térmica */}
            {printBadgeItems && (
              <PrintableBadgeList
                items={printBadgeItems}
                roleLabel={printBadgeItems[0]?.roleLabel || 'ASISTENTE'}
                onClose={() => setPrintBadgeItems(null)}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-outline-variant p-6">
              <h2 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                Progreso en Tiempo Real
              </h2>

              <div className="text-center p-6 bg-surface-variant/30 rounded-lg border border-outline-variant mb-6">
                <span className="block text-4xl font-bold text-primary mb-1">
                  {totalCheckedIn} / {totalRegistered}
                </span>
                <span className="text-sm font-bold text-secondary tracking-widest uppercase">Total Confirmados</span>
                <div className="w-full bg-outline-variant h-2 mt-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${totalRegistered > 0 ? (totalCheckedIn / totalRegistered) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Invitados VIP con derecho a comida (Directos de patrocinadores + Especiales) */}
                <StatRow 
                  label="⭐ Invitados VIP (Almuerzo Incluido)" 
                  stats={{
                    total: (stats.directInvites?.total || 0) + (stats.guests?.total || 0),
                    checkedIn: (stats.directInvites?.checkedIn || 0) + (stats.guests?.checkedIn || 0)
                  }}
                  color="bg-emerald-600"
                  highlight={true}
                />
                <StatRow label="🎟️ Preregistros (General - Sin Almuerzo)" stats={stats.preregistrations} />
                <StatRow label="🏢 Patrocinadores" stats={stats.sponsors} />
                <StatRow label="👔 Staff Técnico" stats={stats.staff} />
                <StatRow label="🎤 Conferencistas" stats={stats.speakers} />
              </div>

              {/* Métrica Destacada de Platos a Servir */}
              <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-950 tracking-wider">Platos de Almuerzo a Servir</p>
                    <p className="text-[11px] text-emerald-700 font-medium">Invitados VIP que llegaron y tienen gafete</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-emerald-800 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-2xs inline-block">
                    {(stats.directInvites?.checkedIn || 0) + (stats.guests?.checkedIn || 0)}
                  </span>
                  <p className="text-[10px] text-emerald-600 font-bold mt-0.5">
                    de {(stats.directInvites?.total || 0) + (stats.guests?.total || 0)} max
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, stats, color = 'bg-secondary', highlight = false }) {
  const percentage = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
  
  return (
    <div className={highlight ? "p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80" : ""}>
      <div className="flex justify-between text-sm mb-1">
        <span className={`font-bold ${highlight ? 'text-emerald-900' : 'text-on-surface'}`}>{label}</span>
        <span className={`${highlight ? 'text-emerald-800 font-black' : 'text-secondary font-medium'}`}>{stats.checkedIn} de {stats.total}</span>
      </div>
      <div className="w-full bg-surface-variant/50 h-2 rounded-full overflow-hidden">
        <div 
          className={`${color} h-full transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
