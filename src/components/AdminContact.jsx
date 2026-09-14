import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminContact({ onBack }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  
  const isInitialMount = useRef(true);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/contacts`), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        results.push({
          id: docSnap.id,
          ...data,
          read: data.read === true || data.status === 'read',
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      // Detectar mensajes nuevos entrantes para alerta tipo toast
      if (!isInitialMount.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newDocData = change.doc.data();
            const senderName = newDocData.nombre || newDocData.name || 'Nuevo Visitante';
            const subject = newDocData.asunto || newDocData.subject || 'Consulta de Contacto';
            
            setToastMessage(`🔔 Nuevo mensaje recibido de ${senderName}: "${subject}"`);
            setTimeout(() => setToastMessage(null), 7000);
          }
        });
      } else {
        isInitialMount.current = false;
      }

      setMessages(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching contacts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función para abrir el modal y marcar automáticamente como leído
  const handleOpenMessage = async (msg) => {
    setSelectedMessage(msg);
    if (!msg.read) {
      try {
        await updateDoc(doc(db, `${getEventBasePath()}/contacts`, msg.id), {
          read: true,
          status: 'read'
        });
      } catch (err) {
        console.error("Error al marcar mensaje como leído:", err);
      }
    }
  };

  // Alternar estatus Leído / No Leído manualmente
  const handleToggleReadStatus = async (msg, e) => {
    if (e) e.stopPropagation();
    const newStatus = !msg.read;
    try {
      await updateDoc(doc(db, `${getEventBasePath()}/contacts`, msg.id), {
        read: newStatus,
        status: newStatus ? 'read' : 'unread'
      });
      if (selectedMessage && selectedMessage.id === msg.id) {
        setSelectedMessage({ ...selectedMessage, read: newStatus });
      }
    } catch (err) {
      console.error("Error cambiando estado de lectura:", err);
    }
  };

  // Marcar todos los mensajes como leídos
  const handleMarkAllAsRead = async () => {
    const unreadMsgs = messages.filter(m => !m.read);
    if (unreadMsgs.length === 0) return;
    
    setIsMarkingAll(true);
    try {
      const batch = writeBatch(db);
      unreadMsgs.forEach(msg => {
        const msgRef = doc(db, `${getEventBasePath()}/contacts`, msg.id);
        batch.update(msgRef, { read: true, status: 'read' });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error marcando todos como leídos:", err);
      alert("Hubo un error al actualizar los mensajes.");
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Eliminar mensaje
  const handleDeleteMessage = async (msgId, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("¿Estás seguro de que deseas eliminar este mensaje de contacto?")) {
      try {
        await deleteDoc(doc(db, `${getEventBasePath()}/contacts`, msgId));
        if (selectedMessage && selectedMessage.id === msgId) {
          setSelectedMessage(null);
        }
      } catch (err) {
        console.error("Error eliminando mensaje:", err);
        alert("No se pudo eliminar el mensaje.");
      }
    }
  };

  // Formatear teléfono para WhatsApp
  const formatWhatsAppUrl = (phone) => {
    if (!phone) return null;
    const cleanNumber = phone.replace(/[^0-9]/g, '');
    if (!cleanNumber) return null;
    return `https://wa.me/${cleanNumber}`;
  };

  // Filtrado y Búsqueda
  const unreadCount = messages.filter(m => !m.read).length;
  const readCount = messages.filter(m => m.read).length;

  const filteredMessages = messages.filter(msg => {
    // Filtro por pestañas
    if (filterTab === 'unread' && msg.read) return false;
    if (filterTab === 'read' && !msg.read) return false;

    // Filtro por buscador
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const name = (msg.nombre || msg.name || '').toLowerCase();
      const email = (msg.email || msg.correo || '').toLowerCase();
      const company = (msg.empresa || '').toLowerCase();
      const subject = (msg.asunto || msg.subject || '').toLowerCase();
      const message = (msg.mensaje || msg.message || '').toLowerCase();
      return name.includes(term) || email.includes(term) || company.includes(term) || subject.includes(term) || message.includes(term);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Notificación Toast flotante de Nuevo Mensaje */}
        {toastMessage && (
          <div className="fixed top-24 right-4 z-50 bg-blue-900 text-white px-5 py-4 rounded-xl shadow-2xl border border-blue-400 flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
            <span className="material-symbols-outlined text-amber-400 text-2xl animate-pulse">mark_email_unread</span>
            <div className="flex-1 text-sm font-medium">{toastMessage}</div>
            <button onClick={() => setToastMessage(null)} className="text-blue-200 hover:text-white">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">inbox</span>
              Mensajes de Contacto
            </h1>
            <p className="text-secondary mt-1">Consultas y mensajes recibidos desde el formulario de contacto.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => {
              import('xlsx').then(XLSX => {
                const dataToExport = messages.map(msg => ({
                  Estado: msg.read ? 'Leído' : 'Sin Leer',
                  Fecha: msg.createdAt.toLocaleDateString() + ' ' + msg.createdAt.toLocaleTimeString(),
                  Nombre: msg.name || msg.nombre || '',
                  Empresa: msg.empresa || '',
                  Email: msg.email || msg.correo || '',
                  Teléfono: msg.telefono || '',
                  Asunto: msg.subject || msg.asunto || '',
                  Mensaje: msg.message || msg.mensaje || ''
                }));
                const worksheet = XLSX.utils.json_to_sheet(dataToExport);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Contactos");
                XLSX.writeFile(workbook, "Mensajes_Contacto.xlsx");
              });
            }} className="px-4 py-2 bg-[#217346] text-white border border-[#217346] rounded-md hover:brightness-110 flex items-center gap-2 font-bold transition-all shadow-sm">
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-white text-secondary border border-outline-variant rounded-md hover:bg-surface-variant flex items-center gap-2 font-bold transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
              Volver al Menú
            </button>
          </div>
        </div>

        {/* Contenedor de la Bandeja de Entrada */}
        <div className="bg-white rounded-2xl shadow-md border border-outline-variant overflow-hidden">
          
          {/* Header de la Bandeja con Pestañas y Buscador */}
          <div className="p-6 border-b border-outline-variant bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-2 bg-gray-200/70 p-1 rounded-xl">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  filterTab === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {messages.length}
                </span>
              </button>

              <button
                onClick={() => setFilterTab('unread')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  filterTab === 'unread' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sin Leer
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setFilterTab('read')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  filterTab === 'read' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Leídos
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {readCount}
                </span>
              </button>
            </div>

            {/* Barra de Búsqueda y Botón Marcar Todos Leídos */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-xl">search</span>
                <input
                  type="text"
                  placeholder="Buscar mensaje..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  title="Marcar todos los mensajes como leídos"
                >
                  <span className="material-symbols-outlined text-sm">mark_email_read</span>
                  {isMarkingAll ? 'Procesando...' : 'Marcar leídos'}
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Mensajes */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-secondary font-medium">Cargando bandeja de entrada...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-3 text-gray-300">mail</span>
                <h3 className="text-lg font-bold text-gray-700 mb-1">No hay mensajes en esta vista</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'La bandeja de entrada está al día.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/70 text-gray-600 text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 w-12 text-center">Estado</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Nombre / Empresa</th>
                    <th className="p-4">Correo</th>
                    <th className="p-4">Asunto</th>
                    <th className="p-4">Mensaje</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMessages.map((msg) => {
                    const senderName = msg.name || msg.nombre || '-';
                    const senderEmail = msg.email || msg.correo || '-';
                    const subject = msg.subject || msg.asunto || '-';
                    const bodyText = msg.message || msg.mensaje || '-';
                    const company = msg.empresa || '';

                    return (
                      <tr 
                        key={msg.id} 
                        onClick={() => handleOpenMessage(msg)}
                        className={`cursor-pointer transition-all hover:bg-blue-50/70 ${
                          !msg.read ? 'bg-blue-50/40 font-semibold border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Estado Leído/No Leído */}
                        <td className="p-4 text-center">
                          {!msg.read ? (
                            <span 
                              onClick={(e) => handleToggleReadStatus(msg, e)}
                              className="inline-flex items-center justify-center w-7 h-7 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                              title="Sin Leer (Haz clic para marcar como leído)"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                            </span>
                          ) : (
                            <span 
                              onClick={(e) => handleToggleReadStatus(msg, e)}
                              className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Leído (Haz clic para marcar como no leído)"
                            >
                              <span className="material-symbols-outlined text-lg">drafts</span>
                            </span>
                          )}
                        </td>

                        {/* Fecha */}
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                          {msg.createdAt.toLocaleDateString()}
                          <span className="block text-[11px] text-gray-400">
                            {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Nombre / Empresa */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${!msg.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                              {senderName}
                            </span>
                            {!msg.read && (
                              <span className="bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Nuevo
                              </span>
                            )}
                          </div>
                          {company && (
                            <span className="block text-xs text-gray-500 font-normal">
                              🏢 {company}
                            </span>
                          )}
                        </td>

                        {/* Correo */}
                        <td className="p-4 text-xs text-gray-600 font-mono">
                          {senderEmail}
                        </td>

                        {/* Asunto */}
                        <td className="p-4 text-sm text-gray-800 font-medium">
                          {subject}
                        </td>

                        {/* Previsualización del Mensaje */}
                        <td className="p-4 text-xs text-gray-600 max-w-xs">
                          <p className="line-clamp-2 leading-relaxed">
                            {bodyText}
                          </p>
                          <span className="text-primary font-bold text-[11px] inline-flex items-center gap-0.5 mt-1 hover:underline">
                            Ver completo <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenMessage(msg);
                              }}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              title="Ver Mensaje Completo"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                              Abrir
                            </button>

                            <button
                              onClick={(e) => handleDeleteMessage(msg.id, e)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Mensaje"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Lectura de Mensaje Completo */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">mark_email_read</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedMessage.read ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedMessage.read ? 'Leído' : 'Sin Leer'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedMessage.createdAt.toLocaleDateString()} {selectedMessage.createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">
                    {selectedMessage.subject || selectedMessage.asunto || 'Consulta de Contacto'}
                  </h2>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            {/* Ficha de Detalles del Remitente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Remitente</span>
                <span className="font-bold text-gray-900 text-base">
                  {selectedMessage.name || selectedMessage.nombre || '-'}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Empresa</span>
                <span className="font-semibold text-gray-800">
                  🏢 {selectedMessage.empresa || 'No especificada'}
                </span>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Correo Electrónico</span>
                <a 
                  href={`mailto:${selectedMessage.email || selectedMessage.correo}?subject=Re: ${encodeURIComponent(selectedMessage.subject || selectedMessage.asunto || '')}`}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">mail</span>
                  {selectedMessage.email || selectedMessage.correo || '-'}
                </a>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-0.5">Teléfono de Contacto</span>
                {selectedMessage.telefono ? (
                  <span className="font-medium text-gray-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-gray-500">call</span>
                    {selectedMessage.telefono}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No especificado</span>
                )}
              </div>
            </div>

            {/* Cuerpo del Mensaje Completo */}
            <div className="flex-1 overflow-y-auto mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">Mensaje Completo:</span>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-inner text-gray-800 leading-relaxed text-base whitespace-pre-wrap font-sans">
                {selectedMessage.message || selectedMessage.mensaje || 'Sin contenido de mensaje.'}
              </div>
            </div>

            {/* Footer con Acciones Rápidas */}
            <div className="flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {/* Responder por Correo */}
                <a
                  href={`mailto:${selectedMessage.email || selectedMessage.correo}?subject=Re: ${encodeURIComponent(selectedMessage.subject || selectedMessage.asunto || 'Consulta ExpoFerre')}`}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">reply</span>
                  Responder por Correo
                </a>

                {/* Contactar por WhatsApp */}
                {selectedMessage.telefono && formatWhatsAppUrl(selectedMessage.telefono) && (
                  <a
                    href={formatWhatsAppUrl(selectedMessage.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">chat</span>
                    WhatsApp
                  </a>
                )}
              </div>

              <div className="flex gap-2">
                {/* Alternar Leído / No Leído */}
                <button
                  onClick={(e) => handleToggleReadStatus(selectedMessage, e)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">
                    {selectedMessage.read ? 'mark_as_unread' : 'mark_email_read'}
                  </span>
                  {selectedMessage.read ? 'Marcar No Leído' : 'Marcar Leído'}
                </button>

                {/* Eliminar */}
                <button
                  onClick={(e) => handleDeleteMessage(selectedMessage.id, e)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Eliminar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
