import React, { useState, useEffect } from 'react';
import { Award, Plus, FileSpreadsheet, ArrowLeft, Search, Eye, Building2, UserCheck, Star, Sparkles, ChevronDown, ChevronUp, Copy, Check, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';
import InviteJudgeModal from './InviteJudgeModal';

export default function AdminJury({ onBack }) {
  const [evaluations, setEvaluations] = useState([]);
  const [invitedJudges, setInvitedJudges] = useState([]);
  const [activeTab, setActiveTab] = useState('ranking'); // 'ranking', 'evaluations', 'invited'
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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

  // Calcular Rankings Consolidados por Categoría
  const calculateRanking = (catId) => {
    const storesMap = {}; // { 'Nombre': { nombre, ciudad, totalScore, nominationsCount, avgScore } }

    evaluations.forEach(ev => {
      const catSlots = ev.evaluations?.[catId] || [];
      catSlots.forEach(slot => {
        const name = (slot.nombreFerreteria || '').trim();
        if (!name) return;

        const score = Object.values(slot.scores || {}).reduce((a, b) => a + (Number(b) || 0), 0);
        const normKey = name.toLowerCase();

        if (!storesMap[normKey]) {
          storesMap[normKey] = {
            name: name,
            city: slot.ciudad || 'N/D',
            totalScore: 0,
            nominationsCount: 0,
            judges: []
          };
        }

        storesMap[normKey].totalScore += score;
        storesMap[normKey].nominationsCount += 1;
        storesMap[normKey].judges.push({
          judgeName: ev.judgeName,
          score: score
        });
      });
    });

    const list = Object.values(storesMap).map(item => ({
      ...item,
      avgScore: item.nominationsCount > 0 ? (item.totalScore / item.nominationsCount).toFixed(1) : 0
    }));

    // Ordenar de mayor a menor puntaje
    list.sort((a, b) => b.totalScore - a.totalScore);
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

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Hoja 1: Resumen de Evaluaciones Recibidas
      const evalsData = [];
      evaluations.forEach(ev => {
        ['familiar', 'oro', 'promesa'].forEach(cat => {
          const slots = ev.evaluations?.[cat] || [];
          slots.forEach(slot => {
            if (slot.nombreFerreteria?.trim()) {
              const score = Object.values(slot.scores || {}).reduce((a, b) => a + (Number(b) || 0), 0);
              evalsData.push({
                'Jurado': ev.judgeName,
                'Empresa / Institución': ev.judgeCompany || 'N/D',
                'Teléfono': ev.judgePhone || 'N/D',
                'Categoría': cat === 'familiar' ? '01. Ferretería Familiar' : cat === 'oro' ? '02. Ferretería Oro' : '03. Ferretería Promesa',
                'Ferretería Nominada': slot.nombreFerreteria,
                'Ciudad / Departamento': slot.ciudad || 'N/D',
                'Puntaje Asignado': score,
                'Fecha Registro': ev.submittedAtStr || 'N/D'
              });
            }
          });
        });
      });
      const wsEvals = XLSX.utils.json_to_sheet(evalsData);
      XLSX.utils.book_append_sheet(wb, wsEvals, "Evaluaciones Detalladas");

      // Hoja 2: Ranking Ferretería Familiar
      const wsFam = XLSX.utils.json_to_sheet(rankingFamiliar.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total': item.totalScore,
        'Nominaciones (Votos)': item.nominationsCount,
        'Promedio por Jurado': item.avgScore
      })));
      XLSX.utils.book_append_sheet(wb, wsFam, "Ranking Familiar");

      // Hoja 3: Ranking Ferretería Oro
      const wsOro = XLSX.utils.json_to_sheet(rankingOro.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total': item.totalScore,
        'Nominaciones (Votos)': item.nominationsCount,
        'Promedio por Jurado': item.avgScore
      })));
      XLSX.utils.book_append_sheet(wb, wsOro, "Ranking Oro");

      // Hoja 4: Ranking Ferretería Promesa
      const wsProm = XLSX.utils.json_to_sheet(rankingPromesa.map((item, idx) => ({
        'Posición': idx + 1,
        'Ferretería': item.name,
        'Ciudad': item.city,
        'Puntaje Total': item.totalScore,
        'Nominaciones (Votos)': item.nominationsCount,
        'Promedio por Jurado': item.avgScore
      })));
      XLSX.utils.book_append_sheet(wb, wsProm, "Ranking Promesa");

      XLSX.writeFile(wb, `Evaluaciones_Jurado_Premios_ExpoFerre_2026.xlsx`);
    } catch (e) {
      console.error("Error exporting jury excel:", e);
      alert("Hubo un error al generar el archivo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="pt-24 md:pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto min-h-screen">
      
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
                        <th className="py-3 px-4 text-center">Votos (Jurados)</th>
                        <th className="py-3 px-4 text-center">Promedio</th>
                        <th className="py-3 px-4 text-right">Puntaje Total</th>
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
                            <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-bold">
                              {store.nominationsCount} {store.nominationsCount === 1 ? 'jurado' : 'jurados'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-700">
                            {store.avgScore} pts
                          </td>
                          <td className="py-3 px-4 text-right font-black text-base text-[#f39200]">
                            {store.totalScore} pts
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
                  {ev.judgePhone && (
                    <span className="text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-lg border">
                      Tel: {ev.judgePhone}
                    </span>
                  )}
                </div>

                {/* Resumen de Nominaciones */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { catId: 'familiar', title: 'Ferretería Familiar' },
                    { catId: 'oro', title: 'Ferretería Oro' },
                    { catId: 'promesa', title: 'Ferretería Promesa' }
                  ].map(c => {
                    const nominated = (ev.evaluations?.[c.catId] || []).filter(s => s.nombreFerreteria?.trim());
                    return (
                      <div key={c.catId} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <span className="font-bold text-xs text-gray-700 block mb-2">{c.title}</span>
                        {nominated.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Sin nominaciones</span>
                        ) : (
                          <ul className="space-y-1.5 text-xs">
                            {nominated.map((s, idx) => {
                              const score = Object.values(s.scores || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                              return (
                                <li key={idx} className="flex items-center justify-between font-medium text-gray-800">
                                  <span className="truncate max-w-[140px]">• {s.nombreFerreteria}</span>
                                  <span className="font-bold text-[#f39200]">{score} pts</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>

                {ev.generalObservations && (
                  <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                    <strong>Observaciones:</strong> "{ev.generalObservations}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. JURADOS INVITADOS */}
      {activeTab === 'invited' && (
        <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Historial de Invitaciones Generadas</h3>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-[#f39200] hover:bg-[#d98200] text-black font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
            >
              <Plus size={14} /> Nueva Invitación
            </button>
          </div>

          {invitedJudges.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No hay jurados invitados aún. Haz clic en "Nueva Invitación" para generar un enlace.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Nombre del Jurado</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4">Enlace de Evaluación</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitedJudges.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{j.name}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{j.email || 'N/D'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{j.phone || 'N/D'}</td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-400 truncate max-w-xs">
                        {j.inviteLink}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleCopyLink(j.inviteLink, j.id)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1"
                        >
                          {copiedId === j.id ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                          {copiedId === j.id ? 'Copiado' : 'Copiar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Invitación a Jurado */}
      <InviteJudgeModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

    </div>
  );
}
