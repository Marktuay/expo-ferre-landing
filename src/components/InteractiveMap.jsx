import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { seedOfficialStands, initialStandsList } from '../config/defaultStands';

export { initialStandsList };

export default function InteractiveMap({ onBack, isAdminMode = false, sponsorData, showHeader = false }) {
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
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, `${getEventBasePath()}/stands`), (snapshot) => {
      const standsData = snapshot.docs.map(doc => doc.data());
      
      if (standsData.length > 0) {
        // Fusionar coordenadas locales con los datos de Firebase para permitir ajustes de diseño sin tocar BD
        const mergedStands = standsData.map(dbStand => {
          const initial = initialStandsList.find(s => s.id === dbStand.id);
          return initial ? { ...dbStand, x: initial.x, y: initial.y, price: initial.price, size: initial.size } : dbStand;
        });
        setStands(mergedStands);
      } else {
        // Inicializar stands en Firestore si está vacío y auto-cargar oficiales
        initialStandsList.forEach(async (stand) => {
          await setDoc(doc(db, `${getEventBasePath()}/stands`, stand.id), stand);
        });
        seedOfficialStands(db).catch(err => console.error("Error auto-seeding in InteractiveMap:", err));
      }
    }, (error) => {
      console.warn("InteractiveMap onSnapshot permission or network warning:", error);
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
      showToast('Stand liberado exitosamente');
    } catch (error) {
      console.error('Error al liberar stand:', error);
      showToast('Error al liberar el stand');
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('password') === 'admin123') {
      setIsAdmin(true);
      setIsAdminModalOpen(false);
      showToast('Modo Administrador activado');
    } else {
      showToast('Contraseña incorrecta');
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
    <div className="w-full bg-background rounded-5px border border-outline-variant overflow-hidden flex flex-col h-full min-h-[550px] md:min-h-[700px]">
      {/* Cabecera del Mapa */}
      {showHeader && (
        <div className="bg-surface-container border-b border-outline-variant p-4 flex items-center justify-between z-10 relative shadow-sm">
          <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-dim transition-colors text-secondary border border-outline-variant"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Plano de Exposición y Stands
              </h2>
              <p className="text-body-sm text-secondary">
                Desliza para moverte por el plano. Haz clic o toca cualquier pin de color para consultar los detalles y la disponibilidad.
              </p>
              {clickCoords && isAdmin && (
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
      )}

      {/* Contenedor del Mapa con Zoom */}
      <div className="flex-1 min-h-[500px] md:min-h-[650px] bg-[#F5F5F7] relative overflow-hidden cursor-move">
        <TransformWrapper
          initialScale={0.85}
          minScale={0.3}
          maxScale={4}
          centerOnInit={true}
          limitToBounds={false}
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

              <TransformComponent wrapperStyle={{ width: "100%", height: "100%", minHeight: "500px" }} contentStyle={{ width: "100%", height: "100%" }}>
                <div className="relative w-[1200px] h-[800px] md:w-[1600px] md:h-[1000px] max-w-none">
                  <img 
                    src="/map-expo-ferre-140826.svg" 
                    alt="Plano del Evento Expo Ferre" 
                    className="w-full h-full object-contain select-none cursor-crosshair"
                    draggable="false"
                    onClick={handleImageClick}
                  />
                  
                  {/* Capa Interactiva: Iteramos sobre los stands para crear "hotspots" y globos de mapa con logos */}
                  {stands.map((stand) => {
                    if (!stand || !stand.x || !stand.y) return null;
                    const isSelected = selectedStand?.id === stand.id;
                    const isMine = auth.currentUser && stand.sponsorId === auth.currentUser.uid;
                    const hasLogo = Boolean(stand.logo);
                    const companyName = stand.reservationDetails?.empresa || stand.company || stand.name || 'Stand';
                    const standName = stand.name || `Stand ${stand.id || ''}`;

                    return (
                      <div
                        key={stand.id}
                        className="absolute group z-10 hover:z-40 pointer-events-auto"
                        style={{
                          left: stand.x,
                          top: stand.y,
                          transform: 'translate(-50%, -100%)',
                        }}
                      >
                        {hasLogo ? (
                          /* Globo de mapa con logo visible (Map Balloon Callout) */
                          <button
                            onClick={() => handleStandClick(stand)}
                            className={`relative bg-white rounded-lg p-1 px-1.5 border-2 shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-125 cursor-pointer ${
                              isSelected 
                                ? 'border-red-500 ring-2 ring-red-400 z-30 scale-125 shadow-2xl' 
                                : 'border-[#283474] hover:border-[#f39200] z-20'
                            }`}
                          >
                            <img 
                              src={stand.logo} 
                              alt={companyName} 
                              className="h-6 md:h-7 max-w-[55px] md:max-w-[70px] group-hover:scale-125 transition-transform duration-300 object-contain" 
                            />
                            {/* Cola indicadora del globo estilo marcador de mapa */}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-b-2 border-r-2 border-[#283474] rotate-45"></div>
                          </button>
                        ) : stand.status !== 'available' ? (
                          /* Globo de mapa con nombre si está reservado pero aún sin logo */
                          <button
                            onClick={() => handleStandClick(stand)}
                            className={`relative bg-white rounded-md px-1.5 py-0.5 border-2 shadow-md flex items-center justify-center transition-all duration-300 hover:scale-125 cursor-pointer ${
                              isSelected 
                                ? 'border-red-500 text-red-600' 
                                : 'border-[#283474] text-[#283474]'
                            }`}
                          >
                            <span className="text-[10px] md:text-xs font-bold whitespace-nowrap max-w-[65px] truncate">
                              {companyName}
                            </span>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b-2 border-r-2 border-[#283474] rotate-45"></div>
                          </button>
                        ) : (
                          /* Pin de stand disponible (Punto Azul interactivo) */
                          <button
                            onClick={() => handleStandClick(stand)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer border-2 hover:scale-125 translate-y-3 ${
                              isSelected 
                                ? 'bg-red-500 text-white border-white scale-125 z-20 shadow-lg' 
                                : 'bg-blue-500 text-white hover:bg-blue-600 border-white/80 z-10'
                            }`}
                            title={`${standName} - Disponible`}
                          >
                            <span className="text-[9px] font-bold">
                              {String(standName).replace('Stand ', '').replace('stand-', '')}
                            </span>
                          </button>
                        )}

                        {/* Tooltip Ampliado al hacer Hover - SOLO LOGO */}
                        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl border-2 border-[#283474]/20 flex items-center justify-center z-50 min-w-[160px] max-w-[300px]">
                          {hasLogo ? (
                            <img 
                              src={stand.logo} 
                              alt={companyName} 
                              className="max-h-[140px] max-w-[250px] md:max-h-[170px] md:max-w-[280px] object-contain transition-transform duration-300 group-hover:scale-105" 
                            />
                          ) : (
                            <span className="font-bold text-sm text-[#283474] px-2 py-1">{companyName}</span>
                          )}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-b-2 border-r-2 border-[#283474]/20 rotate-45"></div>
                        </div>
                      </div>
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
                onClick={() => {
                  if (sponsorData) {
                    // Auto-fill and skip the form
                    setReservationData({
                      nombre: sponsorData.nombre,
                      apellido: sponsorData.apellido,
                      correo: sponsorData.correo,
                      telefono: sponsorData.telefono,
                      empresa: sponsorData.empresa
                    });
                    setReservedStandId(selectedStand.id);
                    setIsUploadLogoModalOpen(true);
                  } else {
                    // Normal flow for public / admin manual entry
                    setIsReservationModalOpen(true);
                  }
                }}
                className="w-full md:w-auto px-8 py-3 bg-primary-container text-on-primary-container rounded-5px font-label-lg font-bold tracking-wide hover:bg-[#F2B04A] transition-colors hard-shadow"
              >
                {sponsorData ? 'CONFIRMAR Y SUBIR LOGO' : 'RESERVAR ESTE STAND'}
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
            
            <form className="p-6 flex flex-col gap-4 bg-surface max-h-[80vh] overflow-y-auto" onSubmit={async (e) => {
              e.preventDefault();
              setIsUploading(true);
              const mainFile = e.target.logoFile.files[0];
              const addFiles = [
                e.target.addLogo1?.files[0],
                e.target.addLogo2?.files[0],
                e.target.addLogo3?.files[0],
              ].filter(Boolean);

              const checkFileType = (file) => file && !file.type.match(/(image\/(jpeg|jpg|png|svg\+xml))/i);
              
              if (checkFileType(mainFile) || addFiles.some(checkFileType)) {
                alert('Formato inválido. Por favor, sube imágenes en formato JPG, PNG o SVG.');
                setIsUploading(false);
                return;
              }

              const processImageFile = async (file) => {
                if (!file) return null;
                if (file.type === 'image/svg+xml') {
                  return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                } else {
                  return await new Promise((resolve, reject) => {
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
                        resolve(canvas.toDataURL('image/png'));
                      };
                      img.onerror = reject;
                      img.src = event.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                  });
                }
              };

              try {
                const mainLogoDataUrl = await processImageFile(mainFile);
                const additionalLogosDataUrl = await Promise.all(addFiles.map(processImageFile));

                const standRef = doc(db, `${getEventBasePath()}/stands`, reservedStandId);
                const user = auth.currentUser;
                
                const updatePayload = {};
                if (mainLogoDataUrl) updatePayload.logo = mainLogoDataUrl;
                if (additionalLogosDataUrl.length > 0) updatePayload.additionalLogos = additionalLogosDataUrl;
                
                if (reservationData) {
                  updatePayload.status = 'reserved';
                  updatePayload.reservationDetails = reservationData;
                  updatePayload.sponsorId = user ? user.uid : null;
                  updatePayload.sponsorEmail = user ? user.email : null;
                }

                if (Object.keys(updatePayload).length > 0) {
                  await updateDoc(standRef, updatePayload);
                }

                showToast(reservationData ? '¡Stand reservado y logotipos guardados con éxito!' : '¡Logotipos actualizados con éxito!');
              } catch (error) {
                console.error("Error al guardar:", error);
                showToast('Hubo un error al guardar. Asegúrate de haber subido imágenes válidas.');
              } finally {
                setIsUploading(false);
                setIsUploadLogoModalOpen(false);
                setSelectedStand(null);
                setReservedStandId(null);
                setReservationData(null);
              }
            }}>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-2 text-sm text-blue-900">
                <p className="font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-sm">info</span> Guía de Logotipos</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Formatos permitidos: <strong>JPG, PNG o SVG</strong>.</li>
                  <li>Las imágenes se optimizarán automáticamente para no sobrecargar el sistema.</li>
                  <li>El logo principal aparecerá al pasar el cursor o hacer clic sobre el stand en el mapa interactivo.</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2 border-b border-outline-variant pb-4 mb-2">
                <label className="text-label-md font-bold text-on-surface">Logo Principal (Mapa Interactivo) <span className="text-red-500">*</span></label>
                <input 
                  type="file" 
                  name="logoFile"
                  accept=".jpg, .jpeg, .png, .svg, image/jpeg, image/png, image/svg+xml"
                  required={!reservationData} // Required if it's new reservation, optional if just updating (though currently always required). Better keep it required to ensure map logo.
                  className="block w-full text-sm text-secondary
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-container file:text-on-primary-container
                    hover:file:bg-[#F2B04A] hover:file:cursor-pointer transition-colors" 
                />
              </div>

              <div className="flex flex-col gap-2 mb-2">
                <label className="text-label-md font-medium text-on-surface">Marcas Adicionales (Opcional - Solo Carrusel)</label>
                <input 
                  type="file" 
                  name="addLogo1"
                  accept=".jpg, .jpeg, .png, .svg, image/jpeg, image/png, image/svg+xml"
                  className="block w-full text-sm text-secondary
                    file:mr-4 file:py-1 file:px-3
                    file:rounded-md file:border-0
                    file:text-xs file:font-medium
                    file:bg-surface-variant file:text-on-surface-variant
                    hover:file:bg-outline-variant hover:file:cursor-pointer transition-colors" 
                />
                <input 
                  type="file" 
                  name="addLogo2"
                  accept=".jpg, .jpeg, .png, .svg, image/jpeg, image/png, image/svg+xml"
                  className="block w-full text-sm text-secondary
                    file:mr-4 file:py-1 file:px-3
                    file:rounded-md file:border-0
                    file:text-xs file:font-medium
                    file:bg-surface-variant file:text-on-surface-variant
                    hover:file:bg-outline-variant hover:file:cursor-pointer transition-colors" 
                />
                <input 
                  type="file" 
                  name="addLogo3"
                  accept=".jpg, .jpeg, .png, .svg, image/jpeg, image/png, image/svg+xml"
                  className="block w-full text-sm text-secondary
                    file:mr-4 file:py-1 file:px-3
                    file:rounded-md file:border-0
                    file:text-xs file:font-medium
                    file:bg-surface-variant file:text-on-surface-variant
                    hover:file:bg-outline-variant hover:file:cursor-pointer transition-colors" 
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-inverse-surface text-surface px-6 py-3 rounded-full shadow-2xl border border-outline-variant flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

