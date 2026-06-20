import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { collection, doc, getDoc, updateDoc, serverTimestamp, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

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
    guests: { total: 0, checkedIn: 0 }
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

    return () => {
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

    return () => {
      unsubPrereg();
      unsubUsers();
      unsubStaff();
      unsubSpeakers();
      unsubGuests();
    };
  }, [basePath]);

  const collectionsToCheck = [
    { name: 'Preregistro (General)', path: `${basePath}/preregistrations` },
    { name: 'Patrocinador', path: `users` },
    { name: 'Staff', path: `${basePath}/staff` },
    { name: 'Conferencista', path: `${basePath}/speakers` },
    { name: 'Invitado Especial', path: `${basePath}/guests` }
  ];

  const processQRCode = async (code) => {
    if (!code || isProcessing) return;
    setIsProcessing(true);
    setLastScanResult(null);

    let foundRef = null;
    let foundData = null;
    let foundCollectionName = '';

    try {
      for (const col of collectionsToCheck) {
        const docRef = doc(db, col.path, code);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          foundRef = docRef;
          foundData = docSnap.data();
          foundCollectionName = col.name;
          break;
        }
      }

      if (!foundRef) {
        playBeep('error');
        setLastScanResult({ type: 'error', message: `Código QR inválido o no encontrado: ${code}` });
        setIsProcessing(false);
        return;
      }

      if (foundData.checkedIn) {
        playBeep('error');
        setLastScanResult({ 
          type: 'warning', 
          message: `El participante ya había ingresado previamente.`,
          name: foundData.name || foundData.nombre || 'Participante',
          collection: foundCollectionName,
          time: foundData.checkInTime?.toDate().toLocaleString('es-ES') || 'Desconocido'
        });
      } else {
        await updateDoc(foundRef, {
          checkedIn: true,
          checkInTime: serverTimestamp()
        });
        playBeep('success');
        setLastScanResult({
          type: 'success',
          message: `Check-in exitoso.`,
          name: foundData.name || foundData.nombre || 'Participante',
          collection: foundCollectionName
        });
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
            </div>

            {lastScanResult && (
              <div className={`p-6 rounded-lg border-l-4 shadow-sm ${
                lastScanResult.type === 'success' ? 'bg-[#16a34a]/10 border-[#16a34a]' : 
                lastScanResult.type === 'warning' ? 'bg-[#f39200]/10 border-[#f39200]' : 
                'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-start gap-4">
                  <span className={`material-symbols-outlined text-4xl ${
                    lastScanResult.type === 'success' ? 'text-[#16a34a]' : 
                    lastScanResult.type === 'warning' ? 'text-[#f39200]' : 
                    'text-red-500'
                  }`}>
                    {lastScanResult.type === 'success' ? 'check_circle' : 
                     lastScanResult.type === 'warning' ? 'warning' : 'error'}
                  </span>
                  <div>
                    <h3 className={`text-xl font-bold mb-1 ${
                      lastScanResult.type === 'success' ? 'text-[#16a34a]' : 
                      lastScanResult.type === 'warning' ? 'text-[#b45309]' : 
                      'text-red-700'
                    }`}>
                      {lastScanResult.type === 'success' ? '¡ACCESO CONCEDIDO!' : 
                       lastScanResult.type === 'warning' ? 'ACCESO DENEGADO (YA INGRESÓ)' : 'CÓDIGO INVÁLIDO'}
                    </h3>
                    <p className="text-on-surface-variant text-lg mb-2">{lastScanResult.message}</p>
                    
                    {lastScanResult.name && (
                      <div className="mt-4 bg-white/50 p-4 rounded-md">
                        <p className="font-bold text-on-surface text-xl">{lastScanResult.name}</p>
                        <p className="text-secondary">{lastScanResult.collection}</p>
                        {lastScanResult.time && (
                          <p className="text-sm text-on-surface-variant mt-2 font-medium">Hora del primer check-in: {lastScanResult.time}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                <StatRow label="Preregistros (General)" stats={stats.preregistrations} />
                <StatRow label="Patrocinadores" stats={stats.sponsors} />
                <StatRow label="Staff Técnico" stats={stats.staff} />
                <StatRow label="Conferencistas" stats={stats.speakers} />
                <StatRow label="Invitados Especiales" stats={stats.guests} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, stats }) {
  const percentage = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
  
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-bold text-on-surface">{label}</span>
        <span className="text-secondary font-medium">{stats.checkedIn} de {stats.total}</span>
      </div>
      <div className="w-full bg-surface-variant/50 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-secondary h-full transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
