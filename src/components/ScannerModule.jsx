import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';

export default function ScannerModule({ onBack }) {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    // Para evitar problemas con el StrictMode de React 18 en desarrollo
    let isMounted = true;
    let scanner = null;

    // Pequeño timeout para asegurar que el DOM está listo y evitar colisiones de hot-reload
    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      scanner = new Html5QrcodeScanner('reader', {
        qrbox: {
          width: 250,
          height: 250,
        },
        fps: 5,
        rememberLastUsedCamera: true,
      }, /* verbose= */ false);

      scanner.render(onScanSuccess, onScanError);
    }, 100);

    async function onScanSuccess(decodedText) {
      // Evitar escaneos múltiples seguidos
      if (loading) return;
      setLoading(true);
      setError('');
      setScanResult(null);
      setPrintData(null);

      // Pausar el escáner visualmente (opcional)
      scanner.pause(true);

      try {
        const collectionsToSearch = ['guests', 'staff', 'speakers', 'preregistrations'];
        let foundData = null;
        let foundCollection = '';

        // Buscar en todas las subcolecciones posibles
        for (const coll of collectionsToSearch) {
          const docRef = doc(db, `${getEventBasePath()}/${coll}`, decodedText);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            foundData = { id: docSnap.id, ...docSnap.data() };
            foundCollection = coll;
            break;
          }
        }

        if (foundData) {
          // Marcar como "checkedIn"
          const docRef = doc(db, `${getEventBasePath()}/${foundCollection}`, foundData.id);
          await updateDoc(docRef, {
            checkedIn: true,
            checkInTime: new Date().toISOString()
          });

          setScanResult({
            success: true,
            message: `¡Asistencia registrada para ${foundData.nombre || foundData.name}!`,
            data: foundData,
            type: foundCollection
          });

          // Preparar datos para imprimir
          const typeColors = {
            guests: 'bg-[#f39200]',
            staff: 'bg-red-600',
            speakers: 'bg-purple-600',
            preregistrations: 'bg-green-600'
          };
          const typeLabels = {
            guests: 'INVITADO',
            staff: 'STAFF',
            speakers: 'CONFERENCISTA',
            preregistrations: 'VISITANTE'
          };

          const itemToPrint = {
            id: foundData.id,
            nombre: foundData.nombre || foundData.name,
            empresa: foundData.empresa || foundData.company || 'Expo Ferre',
            roleLabel: typeLabels[foundCollection],
            colorClass: typeColors[foundCollection]
          };
          
          setPrintData([itemToPrint]);

          // Retomar escáner después de 3 segundos si queremos auto-continuar, o dejarlo en pausa hasta que el usuario decida.
          setTimeout(() => {
            scanner.resume();
            setScanResult(null);
          }, 4000);

        } else {
          setError('Código QR no encontrado en ninguna base de datos del evento actual.');
          setTimeout(() => scanner.resume(), 3000);
        }
      } catch (err) {
        console.error('Error al procesar el QR:', err);
        setError('Ocurrió un error al verificar el código.');
        setTimeout(() => scanner.resume(), 3000);
      } finally {
        setLoading(false);
      }
    }

    function onScanError(err) {
      // console.warn(err); // Ignoramos errores de lectura continuos
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48 font-sans text-on-background">
      <div className="max-w-3xl mx-auto">
        <nav className="text-sm mb-6 text-on-surface-variant flex items-center gap-2 font-medium">
          <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Portal de Administración
          </button>
          <span className="opacity-50">/</span>
          <span className="font-bold text-on-surface">Escáner de Acceso</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-primary tracking-tight">Escáner de Acceso</h1>
        </div>

        <div className="bg-surface rounded-lg shadow-sm border border-outline-variant p-6">
          <div className="mb-6 text-center text-on-surface-variant">
            <p>Apunta la cámara al código QR del gafete digital del asistente.</p>
          </div>

          <div id="reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden border-2 border-primary/20"></div>

          {loading && (
            <div className="mt-6 text-center text-primary font-medium animate-pulse">
              Verificando código...
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 rounded-md text-center font-medium border border-red-200">
              {error}
            </div>
          )}

          {scanResult && scanResult.success && (
            <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-md border border-green-200">
              <h3 className="text-xl font-bold text-center mb-2">{scanResult.message}</h3>
              <div className="text-center">
                <p className="font-medium">{scanResult.data.nombre || scanResult.data.name}</p>
                <p className="text-sm opacity-80">{scanResult.data.empresa || scanResult.data.company}</p>
                <p className="text-xs uppercase mt-2 px-2 py-1 bg-green-200 rounded-full inline-block">
                  {scanResult.type}
                </p>
              </div>
            </div>
          )}

          {/* Componente de Impresión Oculto, se muestra solo cuando hay datos y detona la impresión si PrintableBadgeList está adaptado */}
          {printData && (
            <div className="mt-6">
              <h4 className="text-center mb-4 font-bold">Gafete Listo para Imprimir</h4>
              <PrintableBadgeList 
                items={printData} 
                onClose={() => setPrintData(null)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
