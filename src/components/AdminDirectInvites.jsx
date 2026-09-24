import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';
import { 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  Plus, 
  Search, 
  ArrowLeft, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Building2, 
  User, 
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function AdminDirectInvites({ onBack, adminUser }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'used'

  // Modal para Crear Nueva Invitación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestCompany, setGuestCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal para Enviar Correo Directo
  const [emailModal, setEmailModal] = useState({ open: false, invite: null });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');

  // Copiado feedback
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/directInvites`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = [];
      snapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          usedAt: doc.data().usedAt?.toDate() || null
        });
      });
      // Orden descendente por fecha de creación
      results.sort((a, b) => b.createdAt - a.createdAt);
      setInvites(results);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching direct invites:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateUniqueToken = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `inv_${Date.now().toString(36)}_${rand}`;
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const tokenId = generateUniqueToken();
      const inviteRef = doc(db, `${getEventBasePath()}/directInvites`, tokenId);

      await setDoc(inviteRef, {
        token: tokenId,
        nombre: guestName.trim() || null,
        empresa: guestCompany.trim() || null,
        email: guestEmail.trim().toLowerCase() || null,
        telefono: guestPhone.trim() || null,
        status: 'pending', // 'pending' | 'used'
        createdBy: adminUser?.email || auth.currentUser?.email || 'admin',
        createdAt: serverTimestamp()
      });

      // Si se especificó correo, preguntar o enviar directamente
      setGuestName('');
      setGuestCompany('');
      setGuestEmail('');
      setGuestPhone('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error al crear invitación única:', err);
      alert('Error al generar la invitación: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvite = async (invite) => {
    const targetName = invite.nombre || invite.empresa || invite.id;
    if (!window.confirm(`¿Estás seguro de eliminar la invitación para "${targetName}"? El enlace quedará deshabilitado permanentemente.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/directInvites`, invite.id));
    } catch (err) {
      console.error('Error al eliminar invitación:', err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  const getInviteUrl = (token) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?invite=${encodeURIComponent(token)}`;
  };

  const getWhatsAppSpeech = (invite) => {
    const link = getInviteUrl(invite.id);
    const guestLabel = invite.nombre?.trim() || 'Estimado(a) Colega';
    
    return `¡Hola ${guestLabel}! Te saluda Karen Torres en nombre del comité organizador de EXPO FERRE Nicaragua 2026.

Es un gusto saludarte y extenderte una invitación especial y personalizada para ser parte del encuentro más importante de la industria ferretera y de la construcción en el país.

Hemos reservado para ti un pase exclusivo. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro en el siguiente enlace único:

🔗 ${link}

⚠️ Nota: Este enlace es personal, intransferible y de un solo uso. Una vez completado tu registro, el enlace se desactivará automáticamente.

¡Será un verdadero honor contar con tu presencia! 🚀`;
  };

  const handleCopyWhatsApp = (invite) => {
    const text = getWhatsAppSpeech(invite);
    navigator.clipboard.writeText(text);
    setCopiedToken(`wa_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleCopyLinkOnly = (invite) => {
    const link = getInviteUrl(invite.id);
    navigator.clipboard.writeText(link);
    setCopiedToken(`link_${invite.id}`);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleSendEmailDirect = async (e) => {
    e.preventDefault();
    const invite = emailModal.invite;
    if (!invite || !invite.targetEmail?.trim()) return;

    setIsSendingEmail(true);
    setEmailSuccess('');

    try {
      const link = getInviteUrl(invite.id);
      const guestLabel = invite.nombre?.trim() || 'Estimado(a) Invitado(a)';

      await addDoc(collection(db, 'mail'), {
        to: invite.targetEmail.trim(),
        message: {
          subject: 'Invitación Exclusiva: Acceso Oficial a EXPO FERRE Nicaragua 2026',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 32px 24px;">
                <h2 style="color: #0d47a1; margin-top: 0; font-size: 22px;">¡Hola ${guestLabel}!</h2>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  Te saluda <strong>Karen Torres</strong> en nombre del comité organizador de <strong>EXPO FERRE Nicaragua 2026</strong>.
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  Es un gusto saludarte y extenderte una invitación especial y personalizada para ser parte del encuentro más importante de la industria ferretera y de la construcción en el país.
                </p>
                <p style="font-size: 15px; line-height: 1.6; color: #4b5563;">
                  Hemos reservado para ti un <strong>pase exclusivo</strong>. Para activar tu acceso y recibir tu Gafete Oficial con Código QR, por favor completa tu registro ingresando al botón que encontrarás abajo:
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${link}" style="background-color: #f39200; color: #ffffff; padding: 15px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                    🎟️ Activar Mi Pase Exclusivo
                  </a>
                </div>

                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 4px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e;">
                    ⚠️ <strong>Nota:</strong> Este enlace es personal, intransferible y de <strong>un solo uso</strong>. Una vez completado tu registro, el enlace se desactivará automáticamente.
                  </p>
                </div>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; text-align: left;">
                  <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📅 <strong>Fecha:</strong> 24 y 25 de Octubre, 2026</p>
                  <p style="margin: 4px 0; font-size: 13px; color: #1e3a8a;">📍 <strong>Lugar:</strong> Centro de Convenciones Olof Palme, Managua.</p>
                </div>

                <p style="font-size: 15px; font-weight: bold; color: #0d47a1; margin-top: 28px;">
                  ¡Será un verdadero honor contar con tu presencia! 🚀
                </p>

                <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; word-break: break-all;">
                  Si el botón no abre, copia y pega este enlace en tu navegador:<br/>
                  <a href="${link}" style="color: #0d47a1;">${link}</a>
                </p>
              </div>
              
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
          `
        }
      });

      setEmailSuccess(`¡Invitación enviada con éxito a ${invite.targetEmail}!`);
      setTimeout(() => {
        setEmailModal({ open: false, invite: null });
        setEmailSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error al enviar correo:', err);
      alert('Hubo un error al enviar el correo: ' + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const dataToExport = filteredInvites.map((inv) => ({
        Fecha_Creacion: inv.createdAt?.toLocaleDateString ? inv.createdAt.toLocaleDateString() + ' ' + inv.createdAt.toLocaleTimeString() : 'N/A',
        Token_ID: inv.id,
        Invitado_Nombre: inv.nombre || 'N/A',
        Empresa: inv.empresa || 'N/A',
        Correo: inv.email || 'N/A',
        Telefono: inv.telefono || 'N/A',
        Estado: inv.status === 'used' ? 'REGISTRADO (USADO)' : 'PENDIENTE (DISPONIBLE)',
        Registrado_Nombre: inv.registeredName || '',
        Registrado_Empresa: inv.registeredCompany || '',
        Registrado_Email: inv.registeredEmail || '',
        Registrado_Telefono: inv.registeredPhone || '',
        Fecha_Uso: inv.usedAt ? inv.usedAt.toLocaleDateString() + ' ' + inv.usedAt.toLocaleTimeString() : '',
        Enlace_Unico: getInviteUrl(inv.id)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Invitaciones_Directas");
      XLSX.writeFile(workbook, "Invitaciones_Directas_ExpoFerre_2026.xlsx");
    });
  };

  const filteredInvites = invites.filter(inv => {
    const term = searchTerm.toLowerCase().trim();
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    if (!term) return matchesStatus;

    const name = (inv.nombre || '').toLowerCase();
    const comp = (inv.empresa || '').toLowerCase();
    const mail = (inv.email || '').toLowerCase();
    const regName = (inv.registeredName || '').toLowerCase();
    const regComp = (inv.registeredCompany || '').toLowerCase();
    const token = inv.id.toLowerCase();

    const matchesSearch = name.includes(term) || comp.includes(term) || mail.includes(term) || regName.includes(term) || regComp.includes(term) || token.includes(term);
    return matchesStatus && matchesSearch;
  });

  const totalCount = invites.length;
  const pendingCount = invites.filter(i => i.status === 'pending').length;
  const usedCount = invites.filter(i => i.status === 'used').length;

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck size={14} />
              Acceso Exclusivo de Un Solo Uso
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-on-surface">
              Invitaciones Directas
            </h1>
            <p className="text-secondary text-sm">
              Genera enlaces de registro personalizados que se autodestruyen una vez que el invitado completa sus datos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 text-sm shadow-sm cursor-pointer"
            >
              <Plus size={18} />
              Nueva Invitación
            </button>

            <button
              onClick={handleExportExcel}
              disabled={filteredInvites.length === 0}
              className="px-4 py-2.5 bg-[#217346] text-white rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2 text-sm shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              Exportar Excel
            </button>

            <button
              onClick={onBack}
              className="px-4 py-2.5 bg-white border border-outline-variant text-on-surface rounded-xl font-bold hover:bg-surface-variant transition-all flex items-center gap-2 text-sm cursor-pointer"
            >
              <ArrowLeft size={18} />
              Volver al Hub
            </button>
          </div>
        </div>

        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Send size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Total Enlaces</p>
              <p className="text-2xl font-black text-on-surface">{totalCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Pendientes (Disponibles)</p>
              <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider">Registrados (Usados)</p>
              <p className="text-2xl font-black text-green-600">{usedCount}</p>
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3.5 top-3 text-secondary" />
            <input
              type="text"
              placeholder="Buscar por invitado, empresa o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'all' ? 'bg-primary text-on-primary' : 'bg-surface text-secondary hover:bg-surface-variant'}`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'}`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('used')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === 'used' ? 'bg-green-600 text-white' : 'bg-surface text-secondary hover:bg-surface-variant'}`}
            >
              Registrados ({usedCount})
            </button>
          </div>
        </div>

        {/* Tabla de Invitaciones */}
        <div className="bg-white rounded-2xl border border-outline-variant shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-surface-variant/40 border-b border-outline-variant text-xs uppercase tracking-wider text-secondary">
                  <th className="p-4 font-bold">Invitado / Destinatario</th>
                  <th className="p-4 font-bold">Estado del Enlace</th>
                  <th className="p-4 font-bold">Resultado / Asistente Registrado</th>
                  <th className="p-4 font-bold">Fecha</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-secondary">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Cargando invitaciones...
                      </div>
                    </td>
                  </tr>
                ) : filteredInvites.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-secondary">
                      {searchTerm ? 'No se encontraron invitaciones con ese término de búsqueda.' : 'No hay invitaciones creadas aún. Presiona "Nueva Invitación" para generar la primera.'}
                    </td>
                  </tr>
                ) : (
                  filteredInvites.map((inv) => {
                    const isUsed = inv.status === 'used';
                    const link = getInviteUrl(inv.id);
                    const isWaCopied = copiedToken === `wa_${inv.id}`;
                    const isLinkCopied = copiedToken === `link_${inv.id}`;

                    return (
                      <tr key={inv.id} className="hover:bg-surface-variant/10 transition-colors">
                        {/* Invitado */}
                        <td className="p-4">
                          <div className="font-bold text-on-surface">
                            {inv.nombre || <span className="text-secondary italic">Sin nombre previo</span>}
                          </div>
                          <div className="text-xs text-secondary flex items-center gap-1.5 mt-0.5">
                            {inv.empresa && (
                              <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                                🏢 {inv.empresa}
                              </span>
                            )}
                            {inv.email && <span>{inv.email}</span>}
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="p-4">
                          {isUsed ? (
                            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                              <CheckCircle2 size={14} />
                              Registrado (Enlace Usado)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                              <Clock size={14} />
                              Pendiente (Disponible)
                            </span>
                          )}
                        </td>

                        {/* Resultado */}
                        <td className="p-4">
                          {isUsed ? (
                            <div>
                              <p className="font-bold text-xs text-on-surface">{inv.registeredName}</p>
                              <p className="text-[11px] text-secondary">{inv.registeredCompany} • {inv.registeredEmail}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {inv.registeredAttendeeId}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-secondary italic">Esperando que el invitado se registre</span>
                          )}
                        </td>

                        {/* Fecha */}
                        <td className="p-4 text-xs text-secondary whitespace-nowrap">
                          <div>Creado: {inv.createdAt?.toLocaleDateString ? inv.createdAt.toLocaleDateString() : ''}</div>
                          {isUsed && inv.usedAt && (
                            <div className="text-green-700 font-medium text-[11px]">Usado: {inv.usedAt.toLocaleDateString()}</div>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* WhatsApp Speech */}
                            <button
                              type="button"
                              onClick={() => handleCopyWhatsApp(inv)}
                              disabled={isUsed}
                              className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Copiar Invitación para WhatsApp"
                            >
                              {isWaCopied ? <Check size={14} className="text-emerald-700" /> : <Send size={14} />}
                              <span>{isWaCopied ? '¡Copiado!' : 'WhatsApp'}</span>
                            </button>

                            {/* Enviar Correo */}
                            <button
                              type="button"
                              onClick={() => setEmailModal({ open: true, invite: { ...inv, targetEmail: inv.email || '' } })}
                              disabled={isUsed}
                              className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Enviar por Correo Oficial"
                            >
                              <Mail size={14} />
                              <span>Correo</span>
                            </button>

                            {/* Copiar Enlace Directo */}
                            <button
                              type="button"
                              onClick={() => handleCopyLinkOnly(inv)}
                              disabled={isUsed}
                              className="p-2 bg-surface text-secondary hover:text-primary hover:bg-surface-variant border border-outline-variant rounded-lg transition-colors text-xs font-bold disabled:opacity-30"
                              title="Copiar solo el enlace"
                            >
                              {isLinkCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvite(inv)}
                              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                              title="Eliminar Enlace"
                            >
                              <Trash2 size={16} />
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

      {/* Modal: Crear Nueva Invitación */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-primary to-primary-container p-5 text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} />
                <h3 className="font-bold text-lg">Nueva Invitación de Uso Único</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvite} className="p-6 space-y-4">
              <p className="text-xs text-secondary leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-950">
                📌 Al generar la invitación se creará un <strong>enlace criptográfico de un solo uso</strong>. Puedes ingresar los datos del invitado ahora o dejar que él mismo los complete.
              </p>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Nombre del Invitado <span className="text-xs font-normal text-secondary">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Lic. Roberto Gómez"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                  Empresa / Institución <span className="text-xs font-normal text-secondary">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Distribuidora Central"
                  value={guestCompany}
                  onChange={(e) => setGuestCompany(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Correo Electrónico <span className="text-xs font-normal text-secondary">(Opcional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="invitado@empresa.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                    Celular / WhatsApp <span className="text-xs font-normal text-secondary">(Opcional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +505 8888-8888"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 px-4 bg-surface hover:bg-surface-variant text-on-surface font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 px-4 bg-primary text-on-primary font-bold rounded-xl text-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Generando Enlace...' : 'Generar Enlace Único'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enviar Correo Oficial */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-5 text-on-primary flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={20} />
                <h3 className="font-bold text-base">Enviar Invitación por Correo</h3>
              </div>
              <button onClick={() => setEmailModal({ open: false, invite: null })} className="p-1 hover:bg-white/20 rounded-full text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmailDirect} className="p-6 space-y-4">
              {emailSuccess ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <span>{emailSuccess}</span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-secondary leading-relaxed">
                    Se enviará el correo formal de invitación a nombre de <strong>Karen Torres</strong> con el botón directo y su enlace exclusivo.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1">
                      Correo Electrónico del Destinatario <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="invitado@empresa.com"
                      value={emailModal.invite?.targetEmail || ''}
                      onChange={(e) => setEmailModal(prev => ({
                        ...prev,
                        invite: { ...prev.invite, targetEmail: e.target.value }
                      }))}
                      className="w-full px-4 py-2.5 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEmailModal({ open: false, invite: null })}
                      className="flex-1 py-2.5 px-4 bg-surface hover:bg-surface-variant text-on-surface font-bold rounded-xl text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSendingEmail || !emailModal.invite?.targetEmail?.trim()}
                      className="flex-1 py-2.5 px-4 bg-primary text-on-primary font-bold rounded-xl text-xs hover:brightness-110 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send size={14} />
                      {isSendingEmail ? 'Enviando...' : 'Enviar Invitación'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
