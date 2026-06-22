import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

// Stands mapeados directamente desde las coordenadas del archivo SVG original
const initialStandsList = [
  { id: 'stand-1', x: '67.71%', y: '56.10%', name: 'Stand 1', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-2', x: '67.72%', y: '49.68%', name: 'Stand 2', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-3', x: '67.77%', y: '42.84%', name: 'Stand 3', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-4', x: '67.71%', y: '36.39%', name: 'Stand 4', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-5', x: '67.71%', y: '29.79%', name: 'Stand 5', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-6', x: '61.50%', y: '28.23%', name: 'Stand 6', status: 'available', price: '$3,500 USD', size: '6x6 mts' },
  { id: 'stand-7', x: '62.85%', y: '34.14%', name: 'Stand 7', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-8', x: '62.89%', y: '38.96%', name: 'Stand 8', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-9', x: '62.76%', y: '44.29%', name: 'Stand 9', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-10', x: '62.89%', y: '49.06%', name: 'Stand 10', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-11', x: '61.62%', y: '54.34%', name: 'Stand 11', status: 'available', price: '$3,500 USD', size: '6x6 mts' },
  { id: 'stand-12', x: '59.34%', y: '49.22%', name: 'Stand 12', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-13', x: '59.34%', y: '44.11%', name: 'Stand 13', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-14', x: '59.31%', y: '39.15%', name: 'Stand 14', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-15', x: '59.27%', y: '34.17%', name: 'Stand 15', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-16', x: '51.20%', y: '28.16%', name: 'Stand 16', status: 'available', price: '$3,500 USD', size: '6x6 mts' },
  { id: 'stand-17', x: '52.81%', y: '33.84%', name: 'Stand 17', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-18', x: '52.84%', y: '39.05%', name: 'Stand 18', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-19', x: '52.81%', y: '44.21%', name: 'Stand 19', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-20', x: '52.76%', y: '49.19%', name: 'Stand 20', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-21', x: '51.13%', y: '54.11%', name: 'Stand 21', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-22', x: '48.94%', y: '49.12%', name: 'Stand 22', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-23', x: '49.02%', y: '43.96%', name: 'Stand 23', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-24', x: '49.08%', y: '39.09%', name: 'Stand 24', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-25', x: '49.08%', y: '34.12%', name: 'Stand 25', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-26', x: '39.70%', y: '30.08%', name: 'Stand 26', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-27', x: '39.72%', y: '36.66%', name: 'Stand 27', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-28', x: '39.70%', y: '43.25%', name: 'Stand 28', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-29', x: '39.72%', y: '49.71%', name: 'Stand 29', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-30', x: '39.79%', y: '56.14%', name: 'Stand 30', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-31', x: '43.72%', y: '66.52%', name: 'Stand 31', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-32', x: '38.76%', y: '66.54%', name: 'Stand 32', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-33', x: '31.30%', y: '75.59%', name: 'Stand 33', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-34', x: '36.79%', y: '75.57%', name: 'Stand 34', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-35', x: '64.09%', y: '75.56%', name: 'Stand 35', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-36', x: '68.78%', y: '75.56%', name: 'Stand 36', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-37', x: '61.14%', y: '66.53%', name: 'Stand 37', status: 'available', price: '$1,500 USD', size: '3x3 mts' },
  { id: 'stand-38', x: '56.88%', y: '66.52%', name: 'Stand 38', status: 'available', price: '$1,500 USD', size: '3x3 mts' }
];

export default function InteractiveMap({ onBack, isAdminMode = false }) {
  const [stands, setStands] = useState(initialStandsList);
  const [selectedStand, setSelectedStand] = useState(null);
  const [clickCoords, setClickCoords] = useState(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [isUploadLogoModalOpen, setIsUploadLogoModalOpen] = useState(false);
  const [reservedStandId, setReservedStandId] = useState(null);
  const [reservationData, setReservationData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(isAdminMode);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `${getEventBasePath()}/stands`), (snapshot) => {
      const standsData = snapshot.docs.map(doc => doc.data());
      
      if (standsData.length > 0) {
        // Fusionar coordenadas locales con los datos de Firebase para permitir ajustes de diseño sin tocar BD
        const mergedStands = standsData.map(dbStand => {
          const initial = initialStandsList.find(s => s.id === dbStand.id);
          return initial ? { ...dbStand, x: initial.x, y: initial.y } : dbStand;
        });
        setStands(mergedStands);
      } else {
        // Inicializar stands en Firestore si está vacío
        initialStandsList.forEach(async (stand) => {
          await setDoc(doc(db, `${getEventBasePath()}/stands`, stand.id), stand);
        });
      }
    });

    return () => unsub();
  }, []);

  const handleStandClick = (stand) => {
    if (stand.status === 'available' || isAdmin || (auth.currentUser && stand.sponsorId === auth.currentUser.uid)) {
      if (selectedStand?.id === stand.id) {
        setSelectedStand(null);
      } else {
        setSelectedStand(stand);
      }
    }
  };

  const handleReleaseStand = async () => {
    if (!selectedStand) return;
    try {
      await updateDoc(doc(db, `${getEventBasePath()}/stands`, selectedStand.id), {
        status: 'available',
        logo: null,
        reservationData: null,
        reservedBy: null
      });
      setSelectedStand(null);
      alert('Stand liberado exitosamente');
    } catch (error) {
      console.error('Error al liberar stand:', error);
      alert('Error al liberar el stand');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('password') === 'admin123') {
      setIsAdmin(true);
      setIsAdminModalOpen(false);
      alert('Modo Administrador activado');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setClickCoords({ x: x.toFixed(2), y: y.toFixed(2) });
    console.log(`X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`);
  };

  return (
    <div className="w-full bg-background rounded-5px border border-outline-variant overflow-hidden flex flex-col h-full">
      {/* Cabecera del Mapa */}
      <div className="bg-surface-container border-b border-outline-variant p-4 flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-dim transition-colors text-secondary border border-outline-variant"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Plano de Exposición
            </h2>
            <p className="text-body-sm text-secondary">
              Desliza para moverte por el plano. Haz clic o toca cualquier pin de color azul <span className="w-3 h-3 inline-block rounded-full bg-blue-500 border border-white/50 align-middle mx-1"></span> para iniciar tu reservación.
            </p>
            {clickCoords && (
              <p className="text-body-sm text-primary font-mono mt-1">
                Coordenadas click: X: {clickCoords.x}%, Y: {clickCoords.y}%
              </p>
            )}
          </div>
        </div>
        
        {/* Leyenda Visual */}
        <div className="hidden md:flex items-center gap-6 text-label-sm font-medium">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 border border-white/50"></span>
            <span className="text-secondary">Disponible</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white"></span>
            <span className="text-secondary">Seleccionado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-surface-variant border border-outline opacity-80"></span>
            <span className="text-secondary">Vendido</span>
          </div>
        </div>
      </div>

      {/* Contenedor del Mapa con Zoom */}
      <div className="flex-1 bg-[#F5F5F7] relative overflow-hidden cursor-move">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit={true}
          wheel={{ step: 0.1 }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              {/* Botones de control de Zoom sobre el mapa */}
              <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-2 bg-surface/90 backdrop-blur-md p-2 rounded-lg border border-outline-variant shadow-sm">
                <button onClick={() => zoomIn()} className="p-2 hover:bg-surface-variant rounded-md text-on-surface transition-colors"><span className="material-symbols-outlined">zoom_in</span></button>
                <button onClick={() => zoomOut()} className="p-2 hover:bg-surface-variant rounded-md text-on-surface transition-colors"><span className="material-symbols-outlined">zoom_out</span></button>
                <button onClick={() => resetTransform()} className="p-2 hover:bg-surface-variant rounded-md text-on-surface transition-colors"><span className="material-symbols-outlined">fit_screen</span></button>
              </div>

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <div className="relative w-[1200px] h-[800px] md:w-[1600px] md:h-[1000px] max-w-none">
                  <img 
                    src="/mapa-expo-ferre.svg" 
                    alt="Plano del Evento Expo Ferre" 
                    className="w-full h-full object-contain select-none cursor-crosshair"
                    draggable="false"
                    onClick={handleImageClick}
                  />
                  
                  {/* Capa Interactiva: Iteramos sobre los stands para crear "hotspots" clicables */}
                  {stands.map((stand) => {
                    const isSelected = selectedStand?.id === stand.id;
                    const isMine = auth.currentUser && stand.sponsorId === auth.currentUser.uid;
                    
                    return (
                      <button
                        key={stand.id}
                        onClick={() => handleStandClick(stand)}
                        className={`absolute flex items-center justify-center transition-all duration-300 rounded-full shadow-md cursor-pointer border-2 group hover:z-30 ${
                          isSelected 
                            ? 'bg-red-500 text-white border-white scale-125 z-20 shadow-lg' 
                            : stand.status === 'available'
                              ? 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-110 border-white/50 z-10'
                              : isMine
                                ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110 border-white/50 z-10'
                                : 'bg-surface-variant text-secondary border-outline hover:opacity-100 opacity-80 z-0'
                        }`}
                        style={{
                          left: stand.x,
                          top: stand.y,
                          width: stand.logo ? '36px' : '16px',
                          height: stand.logo ? '36px' : '16px',
                          transform: stand.logo ? 'translate(-50%, -50%)' : 'translate(calc(-50% + 22px), calc(-50% + 22px))',
                        }}
                      >
                        {stand.logo && (
                          <img src={stand.logo} alt={stand.name} className="w-full h-full object-cover rounded-full" />
                        )}
                        
                        {/* Tooltip */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-inverse-surface text-surface px-3 py-1.5 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                          <span className="font-bold block">{stand.name}</span>
                          <span className="block text-surface-variant text-[10px]">{stand.status === 'available' ? 'Disponible' : isMine ? 'Mi Stand' : 'Reservado'}</span>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-inverse-surface rotate-45"></div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Panel inferior condicional: Si seleccionó un stand */}
      {selectedStand && (
        <div className="bg-surface border-t border-outline-variant p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Has seleccionado el {selectedStand.name}
            </h3>
            <p className="text-body-md text-secondary">
              Dimensiones: {selectedStand.size} <span className="mx-2">•</span> Inversión: {selectedStand.price}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={() => setSelectedStand(null)}
              className="w-full md:w-auto px-6 py-3 bg-surface-variant text-secondary rounded-5px font-label-lg font-bold tracking-wide hover:bg-outline-variant transition-colors"
            >
              CANCELAR SELECCIÓN
            </button>
            {isAdmin && selectedStand.status !== 'available' ? (
              <button 
                onClick={handleReleaseStand}
                className="w-full md:w-auto px-8 py-3 bg-red-600 text-white rounded-5px font-label-lg font-bold tracking-wide hover:bg-red-700 transition-colors hard-shadow"
              >
                LIBERAR STAND
              </button>
            ) : selectedStand.status === 'available' ? (
              <button 
                onClick={() => setIsReservationModalOpen(true)}
                className="w-full md:w-auto px-8 py-3 bg-primary-container text-on-primary-container rounded-5px font-label-lg font-bold tracking-wide hover:bg-[#F2B04A] transition-colors hard-shadow"
              >
                RESERVAR ESTE STAND
              </button>
            ) : selectedStand.sponsorId && auth.currentUser?.uid && selectedStand.sponsorId === auth.currentUser.uid ? (
              <button 
                onClick={() => {
                  setReservedStandId(selectedStand.id);
                  setReservationData(null);
                  setIsUploadLogoModalOpen(true);
                }}
                className="w-full md:w-auto px-8 py-3 bg-primary-container text-on-primary-container rounded-5px font-label-lg font-bold tracking-wide hover:bg-[#F2B04A] transition-colors hard-shadow"
              >
                SUBIR/ACTUALIZAR LOGO
              </button>
            ) : (
              <button 
                disabled
                className="w-full md:w-auto px-8 py-3 bg-surface-variant text-secondary rounded-5px font-label-lg font-bold tracking-wide opacity-50 cursor-not-allowed"
              >
                STAND NO DISPONIBLE
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal de Reservación */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-[#F5F5F7]">
              <h3 className="font-headline-sm font-bold text-on-surface">Reservar {selectedStand?.name}</h3>
              <button 
                onClick={() => setIsReservationModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-secondary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form className="p-6 flex flex-col gap-4 bg-surface" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              setReservationData(data);
              setReservedStandId(selectedStand.id);
              setIsReservationModalOpen(false);
              setIsUploadLogoModalOpen(true);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface">Nombre</label>
                  <input name="nombre" required type="text" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="Ej. Juan" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface">Apellido</label>
                  <input name="apellido" required type="text" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="Ej. Pérez" />
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface">Correo Electrónico</label>
                <input name="correo" required type="email" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="juan@ejemplo.com" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface">Teléfono</label>
                <input name="telefono" required type="tel" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="+52 123 456 7890" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface">Empresa</label>
                <input name="empresa" required type="text" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="Ej. Ferretería El Toro" />
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button type="button" onClick={() => setIsReservationModalOpen(false)} className="px-5 py-2 rounded-md font-label-lg font-medium text-secondary hover:bg-surface-variant transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-primary-container text-on-primary-container rounded-md font-label-lg font-bold hover:bg-[#F2B04A] transition-colors hard-shadow">
                  Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para subir Logo */}
      {isUploadLogoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-[#F5F5F7]">
              <h3 className="font-headline-sm font-bold text-on-surface">Personaliza tu Stand</h3>
            </div>
            
            <form className="p-6 flex flex-col gap-4 bg-surface" onSubmit={async (e) => {
              e.preventDefault();
              setIsUploading(true);
              const file = e.target.logoFile.files[0];
              
              if (file && !file.type.match(/(image\/png|image\/svg\+xml)/)) {
                alert('Formato inválido. Por favor, sube una imagen en formato PNG o SVG con fondo transparente.');
                setIsUploading(false);
                return;
              }

              try {
                let logoDataUrl = null;
                if (file) {
                  if (file.type === 'image/svg+xml') {
                    // Guardar SVG directamente como texto para no perder calidad
                    logoDataUrl = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (e) => resolve(e.target.result);
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    });
                  } else {
                    // Comprimir PNG manteniendo la transparencia
                    logoDataUrl = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const MAX_WIDTH = 250;
                          const MAX_HEIGHT = 250;
                          let width = img.width;
                          let height = img.height;

                          if (width > height) {
                            if (width > MAX_WIDTH) {
                              height *= MAX_WIDTH / width;
                              width = MAX_WIDTH;
                            }
                          } else {
                            if (height > MAX_HEIGHT) {
                              width *= MAX_HEIGHT / height;
                              height = MAX_HEIGHT;
                            }
                          }
                          canvas.width = width;
                          canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          ctx.drawImage(img, 0, 0, width, height);
                          // Usar image/png en lugar de jpeg para no poner un fondo negro
                          resolve(canvas.toDataURL('image/png'));
                        };
                        img.onerror = reject;
                        img.src = event.target.result;
                      };
                      reader.onerror = reject;
                      reader.readAsDataURL(file);
                    });
                  }
                }

                const standRef = doc(db, `${getEventBasePath()}/stands`, reservedStandId);
                const user = auth.currentUser;
                
                const updatePayload = {};
                if (logoDataUrl) updatePayload.logo = logoDataUrl;
                
                if (reservationData) {
                  updatePayload.status = 'reserved';
                  updatePayload.reservationDetails = reservationData;
                  updatePayload.sponsorId = user ? user.uid : null;
                  updatePayload.sponsorEmail = user ? user.email : null;
                }

                if (Object.keys(updatePayload).length > 0) {
                  await updateDoc(standRef, updatePayload);
                }

                alert(reservationData ? '¡Stand reservado y logotipo guardado con éxito!' : '¡Logotipo actualizado con éxito!');
              } catch (error) {
                console.error("Error al guardar:", error);
                alert('Hubo un error al guardar. Asegúrate de haber subido una imagen válida.');
              } finally {
                setIsUploading(false);
                setIsUploadLogoModalOpen(false);
                setSelectedStand(null);
                setReservedStandId(null);
                setReservationData(null);
              }
            }}>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-2 text-sm text-blue-900">
                <p className="font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-sm">info</span> Guía de Logotipo</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Formato obligatorio: <strong>PNG o SVG</strong>.</li>
                  <li>El archivo <strong>debe tener fondo transparente</strong>.</li>
                  <li>Medida ideal: <strong>576 x 240 píxeles</strong> (Ancho x Alto).</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-label-md font-medium text-on-surface">Seleccionar Archivo</label>
                <input 
                  type="file" 
                  name="logoFile"
                  accept=".png, .svg, image/png, image/svg+xml"
                  required
                  className="block w-full text-sm text-secondary
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-container file:text-on-primary-container
                    hover:file:bg-[#F2B04A] hover:file:cursor-pointer transition-colors" 
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-outline-variant">
                <button 
                  type="button" 
                  disabled={isUploading}
                  onClick={() => setIsUploadLogoModalOpen(false)} 
                  className="px-5 py-2 rounded-md font-label-lg font-medium text-secondary hover:bg-surface-variant transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  disabled={isUploading} 
                  type="submit" 
                  className="px-5 py-2 bg-primary-container text-on-primary-container rounded-md font-label-lg font-bold hover:bg-[#F2B04A] transition-colors hard-shadow disabled:opacity-50"
                >
                  {isUploading ? 'Guardando...' : 'Guardar y Finalizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Botón Admin */}
      {!isAdmin && (
        <button 
          onClick={() => setIsAdminModalOpen(true)}
          className="absolute bottom-4 right-4 z-50 text-secondary/30 hover:text-secondary transition-colors"
          title="Acceso Administrador"
        >
          <span className="material-symbols-outlined text-sm">lock</span>
        </button>
      )}

      {/* Modal Admin */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-[#F5F5F7]">
              <h3 className="font-headline-sm font-bold text-on-surface">Administración</h3>
              <button 
                onClick={() => setIsAdminModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors text-secondary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="p-6 flex flex-col gap-4 bg-surface" onSubmit={handleAdminLogin}>
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface">Contraseña maestra</label>
                <input name="password" required type="password" className="px-4 py-2 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md" placeholder="••••••••" />
              </div>
              <button type="submit" className="mt-2 px-5 py-2 bg-primary-container text-on-primary-container rounded-md font-label-lg font-bold hover:bg-[#F2B04A] transition-colors hard-shadow w-full">
                Acceder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dev Helper - Mostrar Coordenadas al hacer clic */}
      {clickCoords && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1.5 rounded-md z-50 font-mono text-sm pointer-events-none shadow-lg">
          Copiar: X: '{clickCoords.x}%', Y: '{clickCoords.y}%'
        </div>
      )}
    </div>
  );
}

