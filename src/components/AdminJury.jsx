import { useState, useEffect } from 'react';
import { Award, Plus, FileSpreadsheet, ArrowLeft, Search, Building2, UserCheck, Sparkles, Copy, Check, MessageSquare, Phone, Mail, CheckCircle2, Clock, ExternalLink, X, Send, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';
import InviteJudgeModal from './InviteJudgeModal';

export default function AdminJury({ onBack }) {
  const [evaluations, setEvaluations] = useState([]);
  const [invitedJudges, setInvitedJudges] = useState([]);
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking', 'evaluations', 'invited'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [copiedSpeechId, setCopiedSpeechId] = useState(null);

  // Estados para Filtros y WhatsApp en Jurados Invitados
  const [invitedSearch, setInvitedSearch] = useState('');
  const [invitedFilter, setInvitedFilter] = useState('all'); // 'all' | 'evaluated' | 'whatsapp' | 'delivered' | 'pending'
  const [whatsAppModal, setWhatsAppModal] = useState({ open: false, judge: null, phoneInput: '', saving: false });

  useEffect(() => {
    // Listener para Evaluaciones de Jurados
    const qEvals = query(collection(db, `${getEventBasePath()}/juryEvaluations`), orderBy('createdAt', 'desc'));
    const unsubEvals = onSnapshot(qEvals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvaluations(data);
    }, (err) => {
      console.error('Error fetching jury evaluations:', err);
    });

    // Listener para Jurados Invitados
    const qInvited = query(collection(db, `${getEventBasePath()}/invitedJudges`), orderBy('createdAt', 'desc'));
    const unsubInvited = onSnapshot(qInvited, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitedJudges(data);
    }, (err) => {
      console.error('Error fetching invited judges:', err);
    });

    return () => {
      unsubEvals();
      unsubInvited();
    };
  }, []);

  // Calcular Rankings Consolidados por Categoría (Por valoración ponderada y cantidad de nominaciones)
  const calculateRanking = (catId) => {
    const storesMap = {}; // { 'Nombre': { name, city, nominationsCount, totalScore, judges: [] } }

    evaluations.forEach(ev => {
      const catSlots = ev.evaluations?.[catId] || [];
      catSlots.forEach((slot, slotIdx) => {
        const name = (slot.nombreFerreteria || '').trim();
        if (!name) return;

        const normKey = name.toLowerCase();
        const rankPos = slot.slot || (slotIdx + 1);
        // Puntos según ranking del 1 al 5: 1º lugar = 5 pts, 2º = 4 pts, 3º = 3 pts, 4º = 2 pts, 5º = 1 pto
        const points = Math.max(1, 6 - rankPos);

        if (!storesMap[normKey]) {
          storesMap[normKey] = {
            name: name,
            city: slot.ciudad || 'N/D',
            nominationsCount: 0,
            totalScore: 0,
            judges: []
          };
        }

        storesMap[normKey].nominationsCount += 1;
        storesMap[normKey].totalScore += points;
        storesMap[normKey].judges.push(`${ev.judgeName} (${rankPos}º lugar · ${points} pts)`);
      });
    });

    const list = Object.values(storesMap);
    // Ordenar de mayor a menor puntuación ponderada y luego por cantidad de nominaciones
    list.sort((a, b) => b.totalScore - a.totalScore || b.nominationsCount - a.nominationsCount);
    return list;
  };

  const rankingFamiliar = calculateRanking('familiar');
  const rankingOro = calculateRanking('oro');
  const rankingPromesa = calculateRanking('promesa');

  const handleCopyLink = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Normalizar cadenas para comparar sin acentos, espacios extra o mayúsculas
  const cleanNorm = (str) => {
    return (str || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  };

  // Helper inteligente para verificar si un jurado ya envió su evaluación
  const isJudgeEvaluated = (judge) => {
    const jNameNorm = cleanNorm(judge.name);
    const jEmailNorm = cleanNorm(judge.email);

    return evaluations.some(ev => {
      const evNameNorm = cleanNorm(ev.judgeName || ev.juradoNombre);
      const evEmailNorm = cleanNorm(ev.judgeEmail || ev.juradoEmail);

      // 1. Coincidencia por correo si ambos existen
      if (jEmailNorm && evEmailNorm && jEmailNorm === evEmailNorm) return true;

      // 2. Coincidencia directa de nombre
      if (jNameNorm && evNameNorm) {
        if (evNameNorm === jNameNorm || evNameNorm.includes(jNameNorm) || jNameNorm.includes(evNameNorm)) {
          return true;
        }

        // 3. Token matching inteligente:
        // Divide en palabras clave (ej: "Karla Tellez" -> ["karla", "tellez"])
        // Comprueba si están contenidas en "Karla Elsania Téllez Ruiz" -> ["karla", "elsania", "tellez", "ruiz"]
        const jTokens = jNameNorm.split(/\s+/).filter(t => t.length >= 3);
        const evTokens = evNameNorm.split(/\s+/).filter(t => t.length >= 3);

        if (jTokens.length > 0 && jTokens.every(jt => evTokens.includes(jt))) {
          return true;
        }
        if (evTokens.length > 0 && evTokens.every(et => jTokens.includes(et))) {
          return true;
        }
      }

      return false;
    });
  };

  // Eliminar una evaluación (ej. pruebas de Karen Torres)
  const handleDeleteEvaluation = async (ev) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la evaluación de "${ev.judgeName}"?\n\nEsta acción eliminará sus votos del ranking de ferreterías de forma permanente.`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/juryEvaluations`, ev.id));
    } catch (err) {
      console.error('Error al eliminar evaluación:', err);
      alert('Error al eliminar la evaluación: ' + err.message);
    }
  };

  // Eliminar un jurado invitado / enlace de prueba
  const handleDeleteInvitedJudge = async (judge) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar la invitación de "${judge.name}"?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, `${getEventBasePath()}/invitedJudges`, judge.id));
    } catch (err) {
      console.error('Error al eliminar invitación:', err);
      alert('Error al eliminar la invitación: ' + err.message);
    }
  };

  // Helper para generar el discurso oficial de WhatsApp para Jurado
  const buildJurySpeech = (judge) => {
    const name = judge.name?.trim() || 'Estimado(a)';
    return `¡Hola ${name}! Te saludamos cordialmente del Comité Organizador de EXPO FERRE 2026. 🏆

Para nosotros es un honor contar con tu trayectoria y criterio experto como parte del Jurado Calificador de los Premios a la Excelencia Ferretera (Ferretería Familiar, Ferretería Oro y Ferretería Promesa).

Puedes ingresar a tu portal oficial y confidencial de evaluación y votación aquí:
🔗 ${judge.inviteLink}

📋 Metodología: Podrás nominar hasta 5 ferreterías por categoría asignándoles un ranking del 1 al 5 según tu valoración.

¡Agradecemos tu valiosa contribución al sector ferretero nicaragüense! 🚀`;
  };

  // Helper para formatear número telefónico para wa.me
  const formatPhoneForWa = (phone) => {
    const clean = (phone || '').replace(/[^\d]/g, '');
    if (!clean) return '';
    if (clean.length === 8) return '505' + clean;
    if (clean.startsWith('00505')) return clean.replace('00505', '505');
    if (clean.startsWith('505')) return clean;
    return clean;
  };

  // Abrir WhatsApp directo (o modal si no hay teléfono)
  const handleOpenWhatsApp = async (judge) => {
    const waPhone = formatPhoneForWa(judge.phone);
    if (!waPhone || waPhone.length < 8) {
      setWhatsAppModal({
        open: true,
        judge,
        phoneInput: judge.phone && judge.phone !== 'N/D' ? judge.phone : '',
        saving: false
      });
      return;
    }

    const speech = buildJurySpeech(judge);
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(speech)}`;

    try {
      await updateDoc(doc(db, `${getEventBasePath()}/invitedJudges`, judge.id), {
        whatsappSent: true,
        whatsappSentAt: serverTimestamp(),
        delivered: true,
        deliveryStatus: 'whatsapp'
      });
    } catch (e) {
      console.warn('No se pudo actualizar estado en Firestore:', e);
    }

    window.open(waUrl, '_blank');
  };

  // Guardar teléfono desde el modal y abrir WhatsApp
  const handleSavePhoneAndSendWa = async (e) => {
    e.preventDefault();
    if (!whatsAppModal.judge) return;
    const clean = formatPhoneForWa(whatsAppModal.phoneInput);
    if (!clean || clean.length < 8) {
      alert('Por favor ingresa un número de teléfono válido (ej. 8888 8888 o +505 8888 8888).');
      return;
    }

    setWhatsAppModal(prev => ({ ...prev, saving: true }));
    try {
      const speech = buildJurySpeech(whatsAppModal.judge);
      const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(speech)}`;

      await updateDoc(doc(db, `${getEventBasePath()}/invitedJudges`, whatsAppModal.judge.id), {
        phone: whatsAppModal.phoneInput.trim(),
        whatsappSent: true,
        whatsappSentAt: serverTimestamp(),
        delivered: true,
        deliveryStatus: 'whatsapp'
      });

      setWhatsAppModal({ open: false, judge: null, phoneInput: '', saving: false });
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('Error al guardar teléfono:', err);
      alert('Error al guardar teléfono: ' + err.message);
      setWhatsAppModal(prev => ({ ...prev, saving: false }));
    }
  };

  // Alternar estado manual de "Entregado / Confirmado"
  const handleToggleDelivered = async (judge) => {
    const isDelivered = judge.delivered || judge.whatsappSent;
    const newStatus = !isDelivered;
    try {
      await updateDoc(doc(db, `${getEventBasePath()}/invitedJudges`, judge.id), {
        delivered: newStatus,
        deliveredAt: newStatus ? serverTimestamp() : null,
        deliveryStatus: newStatus ? (judge.whatsappSent ? 'whatsapp' : 'delivered') : (judge.sentVia || 'email')
      });
    } catch (e) {
      console.error('Error toggling delivered:', e);
      alert('Error al actualizar estado: ' + e.message);
    }
  };

  // Copiar Speech Completo de WhatsApp
  const handleCopySpeech = (judge) => {
    const text = buildJurySpeech(judge);
    navigator.clipboard.writeText(text);
    setCopiedSpeechId(judge.id);
    setTimeout(() => setCopiedSpeechId(null), 2500);
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen de Nominaciones Recibidas
      const evalsData = [];
      evaluations.forEach(ev => {
        ['familiar', 'oro', 'promesa'].forEach(cat => {
          const slots = ev.evaluations?.[cat] || [];
          slots.forEach((slot, slotIdx) => {
            if (slot.nombreFerreteria?.trim()) {
              const rankPos = slot.slot || (slotIdx + 1);
              const points = Math.max(1, 6 - rankPos);
              evalsData.push({
                'Jurado': ev.judgeName,
                'Empresa / Institución': ev.judgeCompany || 'N/D',
                'Categoría': cat === 'familiar' ? '01. Ferretería Familiar' : cat === 'oro' ? '02. Ferretería Oro' : '03. Ferretería Promesa',
                'Ferretería Nominada': slot.nombreFerreteria,
                'Ciudad / Departamento': slot.ciudad || 'N/D',
                'Posición Ranking (1-5)': `${rankPos}º Lugar`,
                'Puntaje Asignado': points,
                'Fecha Registro': ev.submittedAtStr || 'N/D'
              });
            }
          });
        });
      });
      const wsEvals = XLSX.utils.json_to_sheet(evalsData);
      XLSX.utils.book_append_sheet(wb, wsEvals, "Nominaciones Detalladas");

      // Hoja 2: Ranking Ferretería Familiar
      const wsFam = XLSX.utils.json_to_sheet(rankingFamiliar.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total Ponderado': item.totalScore,
        'Total Nominaciones': item.nominationsCount,
        'Desglose Jurados': item.judges.join(' | ')
      })));
      XLSX.utils.book_append_sheet(wb, wsFam, "Ranking Familiar");

      // Hoja 3: Ranking Ferretería Oro
      const wsOro = XLSX.utils.json_to_sheet(rankingOro.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total Ponderado': item.totalScore,
        'Total Nominaciones': item.nominationsCount,
        'Desglose Jurados': item.judges.join(' | ')
      })));
      XLSX.utils.book_append_sheet(wb, wsOro, "Ranking Oro");

      // Hoja 4: Ranking Ferretería Promesa
      const wsProm = XLSX.utils.json_to_sheet(rankingPromesa.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total Ponderado': item.totalScore,
        'Total Nominaciones': item.nominationsCount,
        'Desglose Jurados': item.judges.join(' | ')
      })));
      XLSX.utils.book_append_sheet(wb, wsProm, "Ranking Promesa");

      XLSX.writeFile(wb, `Nominaciones_Jurado_Premios_ExpoFerre_2026.xlsx`);
    } catch (e) {
      console.error("Error exporting jury excel:", e);
      alert("Hubo un error al generar el archivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48 font-sans">
      <div className="max-w-7xl mx-auto pb-16">
      
      {/* Botón Volver y Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-primary hover:text-primary-container font-bold text-sm mb-2 transition-colors"
            >
              <ArrowLeft size={16} /> Volver al Hub Principal
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#f39200]/10 text-[#f39200] flex items-center justify-center font-bold">
              <Award size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-on-surface">
                Premios a la Excelencia Ferretera
              </h1>
              <p className="text-secondary text-xs md:text-sm">
                Control de jurados calificadores, nominaciones y rankings en vivo.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acción Superior */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-[#f39200] hover:bg-[#d98200] text-black font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-md hover:scale-105 transition-all"
          >
            <Plus size={18} /> Invitar Jurado
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all"
          >
            <FileSpreadsheet size={18} /> {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase">Evaluaciones Recibidas</span>
            <span className="text-2xl font-black text-gray-900 block">{evaluations.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#f39200]/10 text-[#f39200] flex items-center justify-center shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase">Ferreterías Evaluadas</span>
            <span className="text-2xl font-black text-gray-900 block">
              {rankingFamiliar.length + rankingOro.length + rankingPromesa.length}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase">Categorías Oficiales</span>
            <span className="text-2xl font-black text-gray-900 block">3 Premios</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('ranking')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'ranking'
              ? 'border-[#f39200] text-[#f39200]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={18} /> Ranking de Ferreterías
        </button>

        <button
          onClick={() => setActiveTab('evaluations')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'evaluations'
              ? 'border-[#f39200] text-[#f39200]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserCheck size={18} /> Evaluaciones de Jurados ({evaluations.length})
        </button>

        <button
          onClick={() => setActiveTab('invited')}
          className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'invited'
              ? 'border-[#f39200] text-[#f39200]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare size={18} /> Enlaces / Jurados Invitados ({invitedJudges.length})
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* 1. RANKING CONSOLIDADO */}
      {activeTab === 'ranking' && (
        <div className="space-y-8">
          {[
            { id: 'familiar', num: '01', title: 'FERRETERÍA FAMILIAR', list: rankingFamiliar, color: 'from-amber-500/10 to-amber-500/5', badge: 'bg-amber-100 text-amber-900' },
            { id: 'oro', num: '02', title: 'FERRETERÍA ORO (25+ Años)', list: rankingOro, color: 'from-yellow-500/10 to-yellow-500/5', badge: 'bg-yellow-100 text-yellow-900' },
            { id: 'promesa', num: '03', title: 'FERRETERÍA PROMESA (<5 Años)', list: rankingPromesa, color: 'from-blue-500/10 to-blue-500/5', badge: 'bg-blue-100 text-blue-900' }
          ].map(category => (
            <div key={category.id} className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
              <div className={`p-5 bg-gradient-to-r ${category.color} border-b border-gray-100 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${category.badge}`}>
                    Categoría {category.num}
                  </span>
                  <h3 className="font-black text-gray-900 text-lg md:text-xl">{category.title}</h3>
                </div>
                <span className="text-xs text-gray-500 font-bold">
                  {category.list.length} {category.list.length === 1 ? 'nominada' : 'nominadas'}
                </span>
              </div>

              {category.list.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Aún no hay evaluaciones registradas en esta categoría.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-4 w-16 text-center">Pos.</th>
                        <th className="py-3 px-4">Ferretería</th>
                        <th className="py-3 px-4">Ciudad</th>
                        <th className="py-3 px-4 text-center">Puntaje Ponderado</th>
                        <th className="py-3 px-4 text-center">Nominaciones</th>
                        <th className="py-3 px-4 text-right">Jurados y Valoración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {category.list.map((store, idx) => (
                        <tr key={`${category.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-black">
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {store.name}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {store.city}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-black">
                              ⭐ {store.totalScore} pts
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                              {store.nominationsCount} {store.nominationsCount === 1 ? 'voto' : 'votos'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-gray-600 max-w-xs truncate" title={store.judges.join(' | ')}>
                            {store.judges.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. EVALUACIONES DETALLADAS */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          {evaluations.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-outline-variant text-gray-400">
              No hay evaluaciones enviadas todavía. Genera un enlace de jurado para comenzar.
            </div>
          ) : (
            evaluations.map(ev => (
              <div key={ev.id} className="bg-white rounded-2xl border border-outline-variant p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <span className="bg-[#f39200]/10 text-[#f39200] px-2.5 py-0.5 rounded text-[11px] font-black uppercase inline-block mb-1">
                      Jurado Calificador
                    </span>
                    <h3 className="font-black text-gray-900 text-xl">{ev.judgeName}</h3>
                    <p className="text-xs text-gray-500">
                      {ev.judgeCompany ? `${ev.judgeCompany} · ` : ''}{ev.submittedAtStr || 'Fecha reciente'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.judgePhone && (
                      <span className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border">
                        Tel: {ev.judgePhone}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(ev)}
                      className="px-2.5 py-1.5 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      title="Eliminar esta evaluación (ej. pruebas)"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                {/* Resumen de Nominaciones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { catId: 'familiar', title: '01. Ferretería Familiar' },
                    { catId: 'oro', title: '02. Ferretería Oro' },
                    { catId: 'promesa', title: '03. Ferretería Promesa' }
                  ].map(c => {
                    const nominated = (ev.evaluations?.[c.catId] || []).filter(s => s.nombreFerreteria?.trim());
                    return (
                      <div key={c.catId} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <span className="font-bold text-xs text-gray-800 block mb-2">{c.title}</span>
                        {nominated.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Sin nominaciones</span>
                        ) : (
                          <ul className="space-y-2 text-xs">
                            {nominated.map((s, idx) => (
                              <li key={idx} className="bg-white p-2 rounded-lg border border-gray-200/80 flex items-center justify-between gap-2">
                                <span className="font-bold text-gray-900 truncate">• {s.nombreFerreteria}</span>
                                {s.ciudad?.trim() && (
                                  <span className="text-[10px] text-gray-500 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {s.ciudad}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. JURADOS INVITADOS */}
      {activeTab === 'invited' && (() => {
        const totalEvaluated = invitedJudges.filter(isJudgeEvaluated).length;
        const totalWa = invitedJudges.filter(j => j.whatsappSent || j.deliveryStatus === 'whatsapp').length;
        const totalDelivered = invitedJudges.filter(j => j.delivered || j.whatsappSent || isJudgeEvaluated(j)).length;
        const totalPending = invitedJudges.filter(j => !j.delivered && !j.whatsappSent && !isJudgeEvaluated(j)).length;

        // Filtrado por buscador y chips
        const filteredJudges = invitedJudges.filter(j => {
          const s = `${j.name || ''} ${j.email || ''} ${j.phone || ''}`.toLowerCase();
          const matchesSearch = !invitedSearch.trim() || s.includes(invitedSearch.trim().toLowerCase());
          if (!matchesSearch) return false;

          const evaluated = isJudgeEvaluated(j);
          const isWa = j.whatsappSent || j.deliveryStatus === 'whatsapp';
          const isDeliv = j.delivered || isWa || evaluated;

          if (invitedFilter === 'evaluated') return evaluated;
          if (invitedFilter === 'whatsapp') return isWa;
          if (invitedFilter === 'delivered') return isDeliv && !evaluated;
          if (invitedFilter === 'pending') return !isDeliv;
          return true;
        });

        return (
          <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden space-y-0">
            {/* Header del Bloque */}
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-white">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <MessageSquare size={20} className="text-[#f39200]" />
                  Historial de Enlaces y Jurados Invitados
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Monitorea el estado de entrega del enlace (Correo o WhatsApp) y la recepción de votos de cada jurado.
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="bg-[#f39200] hover:bg-[#d98200] text-black font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-105"
              >
                <Plus size={16} /> Nueva Invitación
              </button>
            </div>

            {/* Píldoras de Métricas de Entrega */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/70 border-b border-gray-100">
              <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Invitados</span>
                <span className="text-xl font-black text-gray-900">{invitedJudges.length}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs bg-amber-50/30">
                <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
                  <Award size={12} className="text-[#f39200]" /> Votos Recibidos
                </span>
                <span className="text-xl font-black text-amber-900">{totalEvaluated}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/30">
                <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                  <Phone size={12} className="text-[#25D366]" /> Vía WhatsApp
                </span>
                <span className="text-xl font-black text-emerald-900">{totalWa}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1">
                  <Clock size={12} className="text-gray-400" /> Pendientes
                </span>
                <span className="text-xl font-black text-gray-700">{totalPending}</span>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtros Rápidos */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por jurado, empresa, correo o teléfono..."
                  value={invitedSearch}
                  onChange={(e) => setInvitedSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:bg-white focus:border-[#f39200] outline-none transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: `Todos (${invitedJudges.length})` },
                  { id: 'evaluated', label: `🏆 Evaluaron (${totalEvaluated})` },
                  { id: 'whatsapp', label: `📱 WhatsApp (${totalWa})` },
                  { id: 'delivered', label: `✅ Entregados (${totalDelivered})` },
                  { id: 'pending', label: `⏳ Pendientes (${totalPending})` }
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setInvitedFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      invitedFilter === chip.id
                        ? 'bg-[#f39200] text-black shadow-xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla de Jurados */}
            {filteredJudges.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm space-y-2">
                <MessageSquare size={36} className="mx-auto text-gray-300" />
                <p className="font-bold">No se encontraron jurados con el filtro aplicado.</p>
                <p className="text-xs text-gray-400">Intenta cambiar la búsqueda o el criterio de filtro.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50 text-gray-600 font-black text-[11px] uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-4">Jurado Calificador</th>
                      <th className="py-3.5 px-4">Contacto</th>
                      <th className="py-3.5 px-4">Estado de Entrega</th>
                      <th className="py-3.5 px-4">Enlace de Evaluación</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredJudges.map((j) => {
                      const evaluated = isJudgeEvaluated(j);
                      const isWa = j.whatsappSent || j.deliveryStatus === 'whatsapp';
                      const isDeliv = j.delivered || isWa || evaluated;
                      const hasPhone = j.phone && j.phone.trim() !== '' && j.phone !== 'N/D';

                      // Color de fila dinámico según estado
                      let rowBg = 'hover:bg-gray-50/80';
                      if (evaluated) {
                        rowBg = 'bg-amber-50/40 hover:bg-amber-50/70 border-l-4 border-l-[#f39200]';
                      } else if (isWa) {
                        rowBg = 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-[#25D366]';
                      } else if (isDeliv) {
                        rowBg = 'bg-teal-50/30 hover:bg-teal-50/60 border-l-4 border-l-teal-500';
                      }

                      return (
                        <tr key={j.id} className={`transition-colors ${rowBg}`}>
                          {/* Jurado */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 block text-sm">
                                {j.name}
                              </span>
                              {evaluated && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  🏆 Votó
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Contacto: Correo y Teléfono */}
                          <td className="py-3.5 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-gray-700">
                              <Mail size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate max-w-[200px]" title={j.email}>{j.email || 'N/D'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone size={12} className={hasPhone ? 'text-emerald-600 shrink-0' : 'text-gray-300 shrink-0'} />
                              {hasPhone ? (
                                <span className="font-mono text-gray-800 font-medium">{j.phone}</span>
                              ) : (
                                <button
                                  onClick={() => setWhatsAppModal({ open: true, judge: j, phoneInput: '', saving: false })}
                                  className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                                >
                                  + Agregar Teléfono
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Etiqueta de Estado de Entrega */}
                          <td className="py-3.5 px-4">
                            {evaluated ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                                <Award size={13} className="text-[#f39200]" />
                                🏆 Votos Registrados
                              </span>
                            ) : isWa ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-[#075E54] border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                                <Phone size={13} className="text-[#25D366]" />
                                📱 WhatsApp Enviado
                              </span>
                            ) : isDeliv ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300 inline-flex items-center gap-1.5 shadow-2xs">
                                <CheckCircle2 size={13} className="text-teal-600" />
                                ✅ Enlace Entregado
                              </span>
                            ) : j.sentVia === 'email' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1.5">
                                <Mail size={13} className="text-blue-500" />
                                ✉️ Correo Despachado
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 inline-flex items-center gap-1.5">
                                <Clock size={13} className="text-gray-400" />
                                ⏳ Pendiente
                              </span>
                            )}
                          </td>

                          {/* Enlace de Evaluación */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 max-w-xs">
                              <span className="text-xs font-mono text-gray-500 truncate select-all bg-gray-50 px-2 py-1 rounded border border-gray-200 block flex-1">
                                {j.inviteLink}
                              </span>
                              <a
                                href={j.inviteLink}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir portal de jurado en nueva pestaña"
                                className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </td>

                          {/* Botonera de Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(j)}
                                title={hasPhone ? `Enviar enlace por WhatsApp a ${j.phone}` : 'Agregar teléfono y enviar por WhatsApp'}
                                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:scale-105"
                              >
                                <Phone size={13} />
                                <span>WhatsApp</span>
                              </button>

                              {/* Botón Marcar / Desmarcar Entregado */}
                              <button
                                type="button"
                                onClick={() => handleToggleDelivered(j)}
                                title={isDeliv ? "Marcar como pendiente" : "Marcar enlace como entregado / confirmado"}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer border ${
                                  isDeliv
                                    ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                                    : 'bg-white hover:bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                <CheckCircle2 size={13} className={isDeliv ? 'text-teal-600' : 'text-gray-400'} />
                                <span className="hidden xl:inline">{isDeliv ? 'Entregado' : 'Marcar'}</span>
                              </button>

                              {/* Botón Copiar Enlace */}
                              <button
                                type="button"
                                onClick={() => handleCopyLink(j.inviteLink, j.id)}
                                title="Copiar enlace directo"
                                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                {copiedId === j.id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                                <span>{copiedId === j.id ? '¡Copiado!' : 'Copiar'}</span>
                              </button>

                              {/* Botón Eliminar Jurado Invitado */}
                              <button
                                type="button"
                                onClick={() => handleDeleteInvitedJudge(j)}
                                title="Eliminar invitación"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal de Invitación a Jurado */}
      <InviteJudgeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Modal para Enviar por WhatsApp / Guardar Teléfono */}
      {whatsAppModal.open && whatsAppModal.judge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-150">
            {/* Cabecera */}
            <div className="bg-[#075E54] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-white font-bold shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Enviar Enlace por WhatsApp</h3>
                  <p className="text-[11px] text-emerald-100">
                    Jurado: <span className="font-bold text-white">{whatsAppModal.judge.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModal({ open: false, judge: null, phoneInput: '', saving: false })}
                className="p-1 hover:bg-white/20 rounded-full text-white cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSavePhoneAndSendWa} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Número de Teléfono / WhatsApp:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: +505 8888 8888 o 88888888"
                  value={whatsAppModal.phoneInput}
                  onChange={(e) => setWhatsAppModal(prev => ({ ...prev, phoneInput: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:border-[#25D366] outline-none"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Si no incluyes el código de país +505, se agregará automáticamente al abrir el chat.
                </p>
              </div>

              {/* Vista previa del mensaje */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Mensaje Oficial con Enlace:
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopySpeech(whatsAppModal.judge)}
                    className="text-[11px] text-[#075E54] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSpeechId === whatsAppModal.judge.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    <span>{copiedSpeechId === whatsAppModal.judge.id ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={6}
                  value={buildJurySpeech(whatsAppModal.judge)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans text-gray-800 outline-none resize-none leading-relaxed select-all"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setWhatsAppModal({ open: false, judge: null, phoneInput: '', saving: false })}
                  className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={whatsAppModal.saving}
                  className="px-5 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{whatsAppModal.saving ? 'Abriendo...' : 'Enviar por WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
