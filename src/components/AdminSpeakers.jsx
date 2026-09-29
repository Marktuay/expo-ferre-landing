import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';
import CreateSpeakerModal from './CreateSpeakerModal';
import InviteSpeakerModal from './InviteSpeakerModal';
import AdminQRViewModal from './AdminQRViewModal';
import JSZip from 'jszip';

export default function AdminSpeakers({ onBack }) {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [speakerToEdit, setSpeakerToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Media Modal (Foto y Logo)
  const [mediaModalSpeaker, setMediaModalSpeaker] = useState(null);
  const [downloadingType, setDownloadingType] = useState(null);

  // ZIP Generation States
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0, status: '' });

  // QR Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPersonForQR, setSelectedPersonForQR] = useState(null);

  const getBlobFromUrl = async (url) => {
    if (!url) return null;
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(';base64,');
        const contentType = parts[0].split(':')[1] || 'image/png';
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
        return { blob: new Blob([uInt8Array], { type: contentType }), ext };
      } catch (e) {
        console.warn('Error converting base64 to blob:', e);
        return null;
      }
    }
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const ext = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' : 'png';
        return { blob, ext };
      }
    } catch (err) {
      console.warn('Fetch error for media url:', url, err);
    }
    return null;
  };

  const buildSpeakerTextSummary = (speaker) => {
    const speakerName = `${speaker.nombre || ''} ${speaker.apellido || ''}`.trim();
    const sponsor = speaker.sponsorCompany || speaker.empresa || 'Independiente / ExpoFerre';
    const formats = Array.isArray(speaker.formatos) ? speaker.formatos.join(', ') : (speaker.formato || 'Conferencia');
    
    return `=====================================================
EXPO FERRE NICARAGUA 2026 - FICHA TÉCNICA DE CONFERENCIA
=====================================================

DATOS DEL CONFERENCISTA:
------------------------
• Nombre Completo: ${speakerName}
• Cargo / Especialidad: ${speaker.cargo || 'Conferencista'}
• Empresa / Organización: ${speaker.empresa || 'Particular'}
• Patrocinador / Auspicio: ${sponsor}

DATOS DE LA PONENCIA:
---------------------
• Título de la Ponencia: ${speaker.titulo || speaker.tema || 'Sin título'}
• Formato de Participación: ${formats}
• Resumen / Sinopsis:
${speaker.resumen || 'No especificado.'}

DATOS DE CONTACTO:
------------------
• Correo Electrónico: ${speaker.email || speaker.correo || 'No especificado'}
• Teléfono / Celular: ${speaker.telefono || 'No especificado'}
• LinkedIn: ${speaker.linkedin || 'No especificado'}
• Facebook: ${speaker.facebook || 'No especificado'}
• Instagram: ${speaker.instagram || 'No especificado'}

AUTORIZACIONES Y REGISTRO:
--------------------------
• Autoriza compartir material: ${speaker.autorizaCompartir || 'Sí'}
• Fecha de Registro: ${speaker.createdAt?.toLocaleString ? speaker.createdAt.toLocaleString('es-NI') : 'N/A'}
• ID de Registro: ${speaker.id}
`;
  };

  // Descarga Masiva Total (ZIP con carpetas, fotos, logos, fichas y excel)
  const handleDownloadAllZip = async () => {
    if (filteredSpeakers.length === 0) return;
    setIsGeneratingZip(true);
    setZipProgress({ current: 0, total: filteredSpeakers.length, status: 'Iniciando empaquetado...' });

    try {
      const zip = new JSZip();
      const rootFolder = zip.folder("Conferencias_ExpoFerre_2026");

      // 1. Procesar cada conferencista
      for (let i = 0; i < filteredSpeakers.length; i++) {
        const s = filteredSpeakers[i];
        const speakerName = `${s.nombre || ''} ${s.apellido || ''}`.trim() || `Speaker_${i+1}`;
        const safeName = speakerName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
        const folderName = `${String(i + 1).padStart(2, '0')}_${safeName}`;
        const speakerFolder = rootFolder.folder(folderName);

        setZipProgress({ current: i + 1, total: filteredSpeakers.length, status: `Procesando ${speakerName}...` });

        // Ficha técnica en texto plano
        speakerFolder.file(`Ficha_Tecnica_${safeName}.txt`, buildSpeakerTextSummary(s));

        // Descargar Foto si existe
        if (s.foto) {
          const fotoData = await getBlobFromUrl(s.foto);
          if (fotoData) {
            speakerFolder.file(`Foto_${safeName}.${fotoData.ext}`, fotoData.blob);
          }
        }

        // Descargar Logo si existe
        if (s.logo) {
          const safeComp = (s.sponsorCompany || s.empresa || 'Empresa').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
          const logoData = await getBlobFromUrl(s.logo);
          if (logoData) {
            speakerFolder.file(`Logo_${safeComp}.${logoData.ext}`, logoData.blob);
          }
        }
      }

      // 2. Incluir Excel General consolidado
      setZipProgress({ current: filteredSpeakers.length, total: filteredSpeakers.length, status: 'Generando Excel consolidado...' });
      const XLSX = await import('xlsx');
      const dataToExport = filteredSpeakers.map((s, idx) => ({
        Numero: idx + 1,
        Fecha_Registro: s.createdAt?.toLocaleDateString ? s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString() : 'N/A',
        Tipo_Auspicio: s.sponsorId ? 'Auspiciado por Patrocinador' : 'Independiente / Organización',
        Patrocinador_Entidad: s.sponsorCompany || (s.sponsorId ? s.empresa : 'Organización ExpoFerre 2026'),
        Nombre_Speaker: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
        Cargo: s.cargo || '',
        Empresa: s.empresa || 'Independiente',
        Email: s.email || s.correo || '',
        Telefono: s.telefono || '',
        LinkedIn: s.linkedin || '',
        Facebook: s.facebook || '',
        Instagram: s.instagram || '',
        Titulo_Ponencia: s.titulo || s.tema || '',
        Formato: Array.isArray(s.formatos) ? s.formatos.join(', ') : (s.formato || ''),
        Resumen_Sinopsis: s.resumen || '',
        Autoriza_Compartir: s.autorizaCompartir || '',
        Tiene_Foto: s.foto ? 'SÍ' : 'NO',
        Tiene_Logo: s.logo ? 'SÍ' : 'NO'
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Conferencias");
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      rootFolder.file('Reporte_General_Conferencias_ExpoFerre_2026.xlsx', excelBuffer);

      // README con metadata general
      rootFolder.file('README_CONFERENCIAS.txt', `EXPO FERRE NICARAGUA 2026
PAQUETE COMPLETO DE CONFERENCIAS Y MEDIA
Total de conferencias incluidas: ${filteredSpeakers.length}
Generado el: ${new Date().toLocaleString('es-NI')}

Contenido del paquete:
- Una carpeta por cada conferencista con su Fotografía Oficial, Logo de Marca y Ficha Técnica.
- Archivo Excel "Reporte_General_Conferencias_ExpoFerre_2026.xlsx" con toda la base de datos completa.
`);

      // 3. Generar el archivo ZIP final
      setZipProgress({ current: filteredSpeakers.length, total: filteredSpeakers.length, status: 'Comprimiendo archivo ZIP...' });
      const content = await zip.generateAsync({ type: 'blob' });
      
      const downloadUrl = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Conferencias_ExpoFerre_2026_Completo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

    } catch (err) {
      console.error('Error generando descarga total ZIP:', err);
      alert('Hubo un problema al generar el archivo ZIP: ' + err.message);
    } finally {
      setIsGeneratingZip(false);
    }
  };

  // Descarga de Expediente Individual en ZIP
  const handleDownloadSingleSpeakerZip = async (speaker) => {
    const speakerName = `${speaker.nombre || ''} ${speaker.apellido || ''}`.trim() || 'Speaker';
    const safeName = speakerName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
    setDownloadingType('zip_single');

    try {
      const zip = new JSZip();
      const folder = zip.folder(`Expediente_${safeName}`);

      folder.file(`Ficha_Tecnica_${safeName}.txt`, buildSpeakerTextSummary(speaker));

      if (speaker.foto) {
        const fotoData = await getBlobFromUrl(speaker.foto);
        if (fotoData) {
          folder.file(`Foto_${safeName}.${fotoData.ext}`, fotoData.blob);
        }
      }

      if (speaker.logo) {
        const safeComp = (speaker.sponsorCompany || speaker.empresa || 'Empresa').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
        const logoData = await getBlobFromUrl(speaker.logo);
        if (logoData) {
          folder.file(`Logo_${safeComp}.${logoData.ext}`, logoData.blob);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Expediente_Conferencia_${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Error descargando expediente individual:', err);
      alert('Error al descargar expediente: ' + err.message);
    } finally {
      setDownloadingType(null);
    }
  };

  const downloadImage = async (url, filename, type) => {
    if (!url) return;
    setDownloadingType(type);
    try {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloadingType(null);
        return;
      }
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloadingType(null), 1000);
    }
  };

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/speakers`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });
      // Sort in descending order by date
      results.sort((a, b) => b.createdAt - a.createdAt);
      
      setSpeakers(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching speakers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSpeakers = speakers.filter(s => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const name = `${s.nombre || ''} ${s.apellido || ''}`.toLowerCase();
    const comp = (s.sponsorCompany || s.empresa || '').toLowerCase();
    const title = (s.titulo || s.tema || '').toLowerCase();
    const email = (s.email || s.correo || '').toLowerCase();
    return name.includes(term) || comp.includes(term) || title.includes(term) || email.includes(term);
  });

  const handleDeleteSpeaker = async (speaker) => {
    const speakerName = `${speaker.nombre || ''} ${speaker.apellido || ''}`.trim() || 'este conferencista';
    if (!window.confirm(`¿Estás seguro de eliminar la conferencia de "${speakerName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/speakers`, speaker.id));
    } catch (err) {
      console.error('Error al eliminar conferencia:', err);
      alert('Hubo un error al eliminar: ' + err.message);
    }
  };

  if (printItems) {
    return (
      <PrintableBadgeList 
        items={printItems} 
        roleLabel="Conferencista"
        colorClass="border-purple-600 text-purple-600"
        onClose={() => setPrintItems(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Conferencias</h1>
            <p className="text-body-lg text-secondary">Registro y gestión oficial de conferencias, ponencias y speakers (Patrocinados e Independientes).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setSpeakerToEdit(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 shadow-xs text-sm"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              Nueva Conferencia
            </button>
            <button 
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-amber-600 text-white border border-amber-600 rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 shadow-xs text-sm"
            >
              <span className="material-symbols-outlined text-base">forward_to_inbox</span>
              Invitar Conferencista
            </button>
            <button 
              onClick={() => setPrintItems(filteredSpeakers)}
              disabled={filteredSpeakers.length === 0}
              className="px-4 py-2 bg-secondary text-white border border-secondary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Imprimir Gafetes
            </button>
            <button 
              onClick={handleDownloadAllZip}
              disabled={isGeneratingZip || filteredSpeakers.length === 0}
              className="px-4 py-2 bg-[#0d47a1] text-white border border-[#0d47a1] rounded-md hover:bg-[#1565c0] transition-colors font-label-lg flex items-center gap-2 shadow-xs text-sm disabled:opacity-50 cursor-pointer"
              title="Descargar paquete ZIP completo con todas las fotos, logos, títulos de ponencia y contactos"
            >
              <span className={`material-symbols-outlined text-base ${isGeneratingZip ? 'animate-spin' : ''}`}>
                {isGeneratingZip ? 'sync' : 'folder_zip'}
              </span>
              {isGeneratingZip 
                ? `Procesando (${zipProgress.current}/${zipProgress.total})...` 
                : 'Descarga Total (Fotos, Logos y Fichas ZIP)'}
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = filteredSpeakers.map(s => ({
                  Fecha: s.createdAt?.toLocaleDateString ? s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString() : 'N/A',
                  Tipo: s.sponsorId ? 'Auspiciado por Patrocinador' : 'Independiente / Organización',
                  Patrocinador_Entidad: s.sponsorCompany || (s.sponsorId ? s.empresa : 'Organización ExpoFerre 2026'),
                  Nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
                  Cargo: s.cargo || '',
                  Empresa: s.empresa || 'Independiente',
                  Email: s.email || s.correo || '',
                  Teléfono: s.telefono || '',
                  LinkedIn: s.linkedin || '',
                  Facebook: s.facebook || '',
                  Instagram: s.instagram || '',
                  Tema: s.titulo || s.tema || '',
                  Formato: Array.isArray(s.formatos) ? s.formatos.join(', ') : (s.formato || ''),
                  AutorizaCompartir: s.autorizaCompartir || '',
                  TieneFoto: s.foto ? 'SÍ' : 'NO',
                  TieneLogo: s.logo ? 'SÍ' : 'NO'
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Conferencias");
                XLSX.writeFile(workbook, "Conferencias_ExpoFerre_2026.xlsx");
              });
            }} className="px-4 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 text-sm cursor-pointer">
              <span className="material-symbols-outlined text-base">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2 text-sm cursor-pointer">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Volver al Menú
            </button>
          </div>
        </div>

        {/* Buscador en tiempo real */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-2xs border border-outline-variant flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por speaker, título de ponencia, empresa, patrocinador o correo..."
            className="w-full text-sm outline-none bg-transparent text-secondary"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-xs text-on-surface-variant hover:text-secondary font-bold">
              Limpiar
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-variant/30 border-b border-outline-variant text-xs uppercase tracking-wider text-secondary">
                  <th className="p-4 font-bold">Speaker</th>
                  <th className="p-4 font-bold">Auspicio / Entidad</th>
                  <th className="p-4 font-bold">Título de la Ponencia</th>
                  <th className="p-4 font-bold">Formato</th>
                  <th className="p-4 font-bold">Contacto</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Cargando conferencias...
                      </div>
                    </td>
                  </tr>
                ) : filteredSpeakers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-secondary">
                      {searchTerm ? 'No se encontraron conferencias con ese término de búsqueda.' : 'No hay conferencias registradas aún.'}
                    </td>
                  </tr>
                ) : (
                  filteredSpeakers.map((speaker) => {
                    const speakerName = `${speaker.nombre || ''} ${speaker.apellido || ''}`.trim();
                    const formats = Array.isArray(speaker.formatos) ? speaker.formatos.join(', ') : (speaker.formato || 'Conferencia');
                    
                    const isIndependent = !speaker.sponsorId || 
                      speaker.sponsorCompany?.toLowerCase().includes('independiente') || 
                      speaker.sponsorCompany?.toLowerCase().includes('organización') ||
                      speaker.sponsorCompany?.toLowerCase().includes('expoferre');

                    const displaySponsor = isIndependent 
                      ? (speaker.empresa && speaker.empresa.toLowerCase() !== 'independiente' ? speaker.empresa : '🏛️ ExpoFerre (Org / Independiente)')
                      : (speaker.sponsorCompany || speaker.empresa || 'Patrocinador');

                    const hasPhoto = !!speaker.foto;
                    const hasLogo = !!speaker.logo;

                    return (
                      <tr key={speaker.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {speaker.foto ? (
                              <button
                                type="button"
                                onClick={() => setMediaModalSpeaker(speaker)}
                                className="relative group cursor-pointer shrink-0"
                                title="Ver y descargar foto/logo"
                              >
                                <img src={speaker.foto} alt={speakerName} className="w-10 h-10 rounded-full object-cover border border-outline-variant group-hover:scale-105 transition-transform shadow-xs" />
                                <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                  <span className="material-symbols-outlined text-xs">download</span>
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                                {speaker.nombre?.charAt(0) || 'S'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-on-surface text-sm">{speakerName}</div>
                              <div className="text-xs text-on-surface-variant">{speaker.cargo || 'Conferencista'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {speaker.logo && (
                              <button
                                type="button"
                                onClick={() => setMediaModalSpeaker(speaker)}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-1 shrink-0 hover:border-primary transition-colors cursor-pointer shadow-2xs"
                                title="Ver y descargar logo oficial"
                              >
                                <img src={speaker.logo} alt="Logo" className="w-full h-full object-contain" />
                              </button>
                            )}
                            {isIndependent ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                                {displaySponsor}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
                                <span className="material-symbols-outlined text-xs">handshake</span>
                                {displaySponsor}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <div className="font-medium text-xs text-secondary line-clamp-2" title={speaker.titulo || speaker.tema}>
                            {speaker.titulo || speaker.tema || 'Sin título'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                            {formats}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-secondary space-y-0.5">
                          <div>{speaker.email || speaker.correo || '-'}</div>
                          <div className="text-on-surface-variant">{speaker.telefono || ''}</div>
                        </td>
                        <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">
                          {speaker.createdAt?.toLocaleDateString ? speaker.createdAt.toLocaleDateString() : ''}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Ver y Descargar Foto / Logo */}
                            <button 
                              onClick={() => setMediaModalSpeaker(speaker)}
                              className={`p-1.5 rounded-lg transition-colors inline-flex items-center justify-center relative cursor-pointer ${
                                hasPhoto || hasLogo 
                                  ? 'text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200' 
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={hasPhoto || hasLogo ? "Ver y Descargar Foto / Logo de la Conferencia" : "Ver detalles multimedia"}
                            >
                              <span className="material-symbols-outlined text-lg">image</span>
                              {(hasPhoto || hasLogo) && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
                              )}
                            </button>

                            {/* Ver Código QR */}
                            <button 
                              onClick={() => {
                                setSelectedPersonForQR({
                                  id: speaker.id,
                                  nombre: speakerName,
                                  empresa: displaySponsor,
                                  email: speaker.email || speaker.correo,
                                  telefono: speaker.telefono,
                                  status: 'approved'
                                });
                                setQrModalOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Ver Código QR de Acceso"
                            >
                              <span className="material-symbols-outlined text-lg">qr_code_2</span>
                            </button>

                            {/* Editar Conferencia */}
                            <button 
                              onClick={() => {
                                setSpeakerToEdit(speaker);
                                setShowCreateModal(true);
                              }}
                              className="p-1.5 text-secondary hover:text-primary hover:bg-surface-variant/60 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Editar Conferencia / Subir Foto"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>

                            {/* Imprimir Gafete */}
                            <button 
                              onClick={() => setPrintItems([speaker])}
                              className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Imprimir Gafete"
                            >
                              <span className="material-symbols-outlined text-lg">print</span>
                            </button>

                            {/* Eliminar Conferencia */}
                            <button 
                              onClick={() => handleDeleteSpeaker(speaker)}
                              className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Eliminar Conferencia"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para Crear o Editar Conferencia */}
      {showCreateModal && (
        <CreateSpeakerModal 
          isOpen={showCreateModal}
          speakerToEdit={speakerToEdit}
          onClose={() => {
            setShowCreateModal(false);
            setSpeakerToEdit(null);
          }}
        />
      )}

      {/* Modal para Invitar Conferencista (Link / WhatsApp / Email) */}
      {showInviteModal && (
        <InviteSpeakerModal
          isOpen={showInviteModal}
          sponsorData={{ empresa: 'Organización ExpoFerre 2026', email: 'contacto@expoferrenicaragua.com' }}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Modal para Ver y Descargar Foto & Logo */}
      {mediaModalSpeaker && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMediaModalSpeaker(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0d47a1] to-[#1565c0] p-5 text-white relative flex-shrink-0">
              <button 
                onClick={() => setMediaModalSpeaker(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Cerrar"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
              
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-300 text-3xl">collections</span>
                <div>
                  <h2 className="text-lg font-bold leading-tight">Archivos Multimedia de la Conferencia</h2>
                  <p className="text-white/80 text-xs mt-0.5">
                    {`${mediaModalSpeaker.nombre || ''} ${mediaModalSpeaker.apellido || ''}`.trim()} • {mediaModalSpeaker.sponsorCompany || mediaModalSpeaker.empresa || 'ExpoFerre 2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido / Tarjetas de Foto y Logo */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Información de la Ponencia */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p className="font-bold text-slate-900 text-sm">
                  🎤 {mediaModalSpeaker.titulo || mediaModalSpeaker.tema || 'Conferencia Oficial'}
                </p>
                <p className="text-slate-600">
                  <strong>Speaker:</strong> {`${mediaModalSpeaker.nombre || ''} ${mediaModalSpeaker.apellido || ''}`.trim()} ({mediaModalSpeaker.cargo || 'Conferencista'})
                </p>
              </div>

              {/* Grid: Tarjeta Foto y Tarjeta Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Fotografía del Conferencista */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center justify-between w-full border-b pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-primary">person</span>
                      Foto del Speaker
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mediaModalSpeaker.foto ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {mediaModalSpeaker.foto ? 'Disponible' : 'No cargada'}
                    </span>
                  </div>

                  <div className="w-full h-48 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100 relative group">
                    {mediaModalSpeaker.foto ? (
                      <img 
                        src={mediaModalSpeaker.foto} 
                        alt="Foto Speaker" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-1 text-xs">
                        <span className="material-symbols-outlined text-4xl text-slate-300">account_circle</span>
                        <span>Sin foto disponible</span>
                      </div>
                    )}
                  </div>

                  {mediaModalSpeaker.foto && (
                    <button
                      type="button"
                      disabled={downloadingType === 'foto'}
                      onClick={() => {
                        const safeName = `${mediaModalSpeaker.nombre || ''}_${mediaModalSpeaker.apellido || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
                        downloadImage(mediaModalSpeaker.foto, `Foto_Speaker_${safeName}.png`, 'foto');
                      }}
                      className="w-full py-2.5 px-4 bg-primary hover:bg-[#1565c0] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      {downloadingType === 'foto' ? 'Descargando...' : 'Descargar Foto'}
                    </button>
                  )}
                </div>

                {/* 2. Logo de la Empresa / Patrocinador */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs flex flex-col items-center text-center space-y-3">
                  <div className="flex items-center justify-between w-full border-b pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-amber-600">business</span>
                      Logo Empresa / Marca
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      mediaModalSpeaker.logo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {mediaModalSpeaker.logo ? 'Disponible' : 'No cargado'}
                    </span>
                  </div>

                  <div className="w-full h-48 bg-slate-50 rounded-lg flex items-center justify-center p-3 overflow-hidden border border-slate-100">
                    {mediaModalSpeaker.logo ? (
                      <img 
                        src={mediaModalSpeaker.logo} 
                        alt="Logo Empresa" 
                        className="max-w-full max-h-full object-contain" 
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-1 text-xs">
                        <span className="material-symbols-outlined text-4xl text-slate-300">image_not_supported</span>
                        <span>Sin logo cargado</span>
                      </div>
                    )}
                  </div>

                  {mediaModalSpeaker.logo && (
                    <button
                      type="button"
                      disabled={downloadingType === 'logo'}
                      onClick={() => {
                        const safeComp = (mediaModalSpeaker.sponsorCompany || mediaModalSpeaker.empresa || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
                        downloadImage(mediaModalSpeaker.logo, `Logo_${safeComp}.png`, 'logo');
                      }}
                      className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                      {downloadingType === 'logo' ? 'Descargando...' : 'Descargar Logo'}
                    </button>
                  )}
                </div>

              </div>

              {/* Acciones de Descarga Combinada / Expediente Completo */}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {mediaModalSpeaker.foto && mediaModalSpeaker.logo && (
                  <button
                    type="button"
                    onClick={() => {
                      const safeName = `${mediaModalSpeaker.nombre || ''}_${mediaModalSpeaker.apellido || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
                      const safeComp = (mediaModalSpeaker.sponsorCompany || mediaModalSpeaker.empresa || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
                      downloadImage(mediaModalSpeaker.foto, `Foto_Speaker_${safeName}.png`, 'foto');
                      setTimeout(() => {
                        downloadImage(mediaModalSpeaker.logo, `Logo_${safeComp}.png`, 'logo');
                      }, 400);
                    }}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-black text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                    Descargar Foto y Logo
                  </button>
                )}

                <button
                  type="button"
                  disabled={downloadingType === 'zip_single'}
                  onClick={() => handleDownloadSingleSpeakerZip(mediaModalSpeaker)}
                  className="px-5 py-2.5 bg-[#0d47a1] hover:bg-[#1565c0] text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  title="Descargar paquete ZIP con Foto, Logo y Ficha Técnica completa de esta ponencia"
                >
                  <span className={`material-symbols-outlined text-[18px] ${downloadingType === 'zip_single' ? 'animate-spin' : ''}`}>
                    {downloadingType === 'zip_single' ? 'sync' : 'folder_zip'}
                  </span>
                  {downloadingType === 'zip_single' ? 'Generando ZIP...' : 'Descargar Expediente Completo (ZIP)'}
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setMediaModalSpeaker(null)}
                className="px-5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal QR de Acceso */}
      {qrModalOpen && selectedPersonForQR && (
        <AdminQRViewModal
          isOpen={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            setSelectedPersonForQR(null);
          }}
          person={selectedPersonForQR}
          roleLabel="Conferencista Oficial"
          onPrintBadge={(s) => setPrintItems([s])}
        />
      )}

    </div>
  );
}
