import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function SponsorScanner({ onBack }) {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let scanner = null;

    const timer = setTimeout(() => {
      if (!isMounted) return;
      
      scanner = new Html5QrcodeScanner('sponsor-reader', {
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
      if (loading) return;
      setLoading(true);
      setError('');
      setScanResult(null);

      scanner.pause(true);

      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("No estás autenticado como patrocinador.");
        }

        const sponsorId = currentUser.uid;

        // Check if lead already exists
        const leadRef = doc(db, `${getEventBasePath()}/sponsors/${sponsorId}/leads`, decodedText);
        const leadSnap = await getDoc(leadRef);

        if (leadSnap.exists()) {
          setScanResult({
            success: true,
            warning: true,
            message: `Este prospecto ya estaba capturado.`,
            data: leadSnap.data()
          });
          return;
        }

        // Search for user data
        const collectionsToSearch = ['guests', 'staff', 'speakers', 'preregistrations', 'users'];
        let foundData = null;
        let foundCollection = '';

        for (const coll of collectionsToSearch) {
          const path = coll === 'users' ? coll : `${getEventBasePath()}/${coll}`;
          const docRef = doc(db, path, decodedText);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            foundData = { id: docSnap.id, ...docSnap.data() };
            foundCollection = coll;
            break;
          }
        }

        if (foundData) {
          // Save Lead
          const leadData = {
            id: foundData.id,
            name: foundData.nombre || foundData.name || foundData.firstName + ' ' + (foundData.lastName || ''),
            email: foundData.correo || foundData.email || '',
            phone: foundData.telefono || foundData.phone || '',
            company: foundData.empresa || foundData.company || '',
            type: foundCollection,
            capturedAt: serverTimestamp()
          };

          await setDoc(leadRef, leadData);

          setScanResult({
            success: true,
            warning: false,
            message: `¡Prospecto capturado con éxito!`,
            data: leadData
          });
        } else {
          setScanResult({
            success: false,
            warning: true,
            message: 'Código QR no reconocido en la base de datos.'
          });
        }
      } catch (err) {
        console.error("Error al capturar lead:", err);
        setError(err.message || 'Error de conexión. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }

    function onScanError(err) {
      // Ignore routine scan errors
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scanner) {
        try {
          scanner.clear();
        } catch (e) {
          console.error("Error clearing scanner on unmount:", e);
        }
      }
    };
  }, [loading]);

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    // El Html5QrcodeScanner maneja su propio estado de pausa en la UI,
    // pero si falla podemos forzar un re-render o decirle al usuario que recargue
    const html5qrbox = document.getElementById('sponsor-reader');
    if (html5qrbox) {
      // Workaround to resume scanner since Html5QrcodeScanner doesn't expose a clean resume API
      const resumeButton = document.getElementById('html5-qrcode-button-camera-resume');
      if (resumeButton) resumeButton.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-secondary hover:text-primary transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver
          </button>
          <h2 className="text-headline-md font-bold text-on-surface">Captura de Prospectos (Leads)</h2>
        </div>

        <div className="bg-surface rounded-lg shadow-md p-6 mb-8 border border-outline-variant text-center">
          <p className="text-body-lg text-secondary mb-4">
            Escanea el gafete de un visitante para guardar su información de contacto automáticamente en tu lista de prospectos.
          </p>

          {!scanResult && !error && (
            <div className="overflow-hidden rounded-lg bg-black/5">
              <div id="sponsor-reader" className="w-full max-w-md mx-auto border-none"></div>
              {loading && (
                <div className="py-4 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-error/10 border border-error/30 text-error rounded-md flex flex-col items-center">
              <span className="material-symbols-outlined text-4xl mb-2">error</span>
              <p className="font-bold">{error}</p>
              <button onClick={resetScanner} className="mt-4 px-6 py-2 bg-error text-white rounded-md hover:opacity-90">
                Intentar de nuevo
              </button>
            </div>
          )}

          {scanResult && (
            <div className={`mt-6 p-6 border rounded-lg flex flex-col items-center animate-in zoom-in duration-300 ${
              scanResult.success 
                ? (scanResult.warning ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200') 
                : 'bg-red-50 border-red-200'
            }`}>
              <span className={`material-symbols-outlined text-6xl mb-4 ${
                scanResult.success 
                  ? (scanResult.warning ? 'text-yellow-500' : 'text-green-500')
                  : 'text-red-500'
              }`}>
                {scanResult.success ? (scanResult.warning ? 'info' : 'check_circle') : 'cancel'}
              </span>
              
              <h3 className={`text-xl font-bold text-center mb-2 ${
                scanResult.success ? 'text-gray-800' : 'text-red-800'
              }`}>
                {scanResult.message}
              </h3>

              {scanResult.data && scanResult.success && (
                <div className="w-full text-left bg-white p-4 rounded-md shadow-sm mt-4 border border-gray-100">
                  <p className="font-bold text-lg mb-1">{scanResult.data.name || scanResult.data.nombre}</p>
                  {scanResult.data.company && <p className="text-gray-600 text-sm mb-1"><span className="material-symbols-outlined text-[14px] align-middle mr-1">business</span> {scanResult.data.company}</p>}
                  {scanResult.data.email && <p className="text-gray-600 text-sm mb-1"><span className="material-symbols-outlined text-[14px] align-middle mr-1">mail</span> {scanResult.data.email}</p>}
                </div>
              )}

              <button 
                onClick={resetScanner}
                className="mt-6 px-8 py-3 bg-[#283474] text-white font-bold rounded-md hover:bg-opacity-90 shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Escanear otro gafete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
