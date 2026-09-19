import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import PrintableBadgeList from './PrintableBadgeList';
import CreateSpeakerModal from './CreateSpeakerModal';

export default function AdminSpeakers({ onBack }) {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printItems, setPrintItems] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
            <p className="text-body-lg text-secondary">Registro y gestión oficial de conferencias y ponencias.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2 bg-primary text-on-primary border border-primary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 shadow-xs"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Nueva Conferencia
            </button>
            <button 
              onClick={() => setPrintItems(filteredSpeakers)}
              disabled={filteredSpeakers.length === 0}
              className="px-4 py-2 bg-secondary text-white border border-secondary rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <span className="material-symbols-outlined text-base">print</span>
              Imprimir Gafetes
            </button>
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = filteredSpeakers.map(s => ({
                  Fecha: s.createdAt?.toLocaleDateString ? s.createdAt.toLocaleDateString() + ' ' + s.createdAt.toLocaleTimeString() : 'N/A',
                  Patrocinador: s.sponsorCompany || s.empresa || '',
                  Nombre: `${s.nombre || ''} ${s.apellido || ''}`.trim(),
                  Cargo: s.cargo || '',
                  Empresa: s.empresa || '',
                  Email: s.email || s.correo || '',
                  Teléfono: s.telefono || '',
                  LinkedIn: s.linkedin || '',
                  Facebook: s.facebook || '',
                  Instagram: s.instagram || '',
                  Tema: s.titulo || s.tema || '',
                  Formato: Array.isArray(s.formatos) ? s.formatos.join(', ') : (s.formato || ''),
                  AutorizaCompartir: s.autorizaCompartir || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Conferencias");
                XLSX.writeFile(workbook, "Conferencias.xlsx");
              });
            }} className="px-4 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 transition-colors font-label-lg flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-base">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2 text-sm">
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
            placeholder="Buscar por speaker, título de ponencia, patrocinador o correo..."
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
                  <th className="p-4 font-bold">Patrocinador / Empresa</th>
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
                    const sponsor = speaker.sponsorCompany || speaker.empresa || 'Patrocinador';

                    return (
                      <tr key={speaker.id} className="border-b border-outline-variant hover:bg-surface-variant/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {speaker.foto ? (
                              <img src={speaker.foto} alt={speakerName} className="w-9 h-9 rounded-full object-cover border border-outline-variant shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
                          <span className="font-semibold text-xs text-secondary bg-surface-variant/60 px-2 py-1 rounded">
                            {sponsor}
                          </span>
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
                          <button 
                            onClick={() => setPrintItems([speaker])}
                            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors inline-flex items-center justify-center"
                            title="Imprimir Gafete"
                          >
                            <span className="material-symbols-outlined text-lg">print</span>
                          </button>
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

      {/* Modal para Crear Conferencia como Administrador */}
      <CreateSpeakerModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
