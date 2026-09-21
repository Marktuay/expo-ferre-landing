import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ChevronRight, ChevronLeft, Send, Sparkles, Building2, Star, Check, Edit3, ChevronDown, ChevronUp, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const CATEGORIES = [
  {
    id: 'familiar',
    number: '01',
    title: 'Ferretería Familiar',
    badgeText: '01. FAMILIAR',
    tagline: 'Una historia que se construye de generación en generación.',
    criteria: [
      { id: 'c1', name: 'Trayectoria familiar', desc: 'Continuidad de la familia al frente del negocio.' },
      { id: 'c2', name: 'Continuidad generacional', desc: 'Valores trascendidos y participación familiar.' },
      { id: 'c3', name: 'Reputación en el mercado', desc: 'Confianza construida con los clientes.' },
      { id: 'c4', name: 'Reconocimiento sectorial', desc: 'Prestigio dentro del gremio ferretero.' },
      { id: 'c5', name: 'Capacidad de adaptación', desc: 'Evolución con el mercado sin perder su esencia.' }
    ]
  },
  {
    id: 'oro',
    number: '02',
    title: 'Ferretería Oro',
    badgeText: '02. ORO (25+ AÑOS)',
    tagline: '25+ años construyendo historia y trayectoria.',
    criteria: [
      { id: 'c1', name: 'Antigüedad comprobada', desc: 'Más de 25 años de operación continua.' },
      { id: 'c2', name: 'Trayectoria e historia', desc: 'Permanencia sólida a lo largo de los años.' },
      { id: 'c3', name: 'Reputación de marca', desc: 'Confianza y solvencia ganada en el tiempo.' },
      { id: 'c4', name: 'Liderazgo en el sector', desc: 'Posición de respeto en la industria.' },
      { id: 'c5', name: 'Evolución comercial', desc: 'Modernización y crecimiento sostenido.' },
      { id: 'c6', name: 'Expansión y cobertura', desc: 'Alcance geográfico, sucursales u oferta.' }
    ]
  },
  {
    id: 'promesa',
    number: '03',
    title: 'Ferretería Promesa',
    badgeText: '03. PROMESA (<5 AÑOS)',
    tagline: 'Jóvenes emprendimientos con crecimiento extraordinario.',
    criteria: [
      { id: 'c1', name: 'Antigüedad', desc: 'Menos de 5 años en el mercado nicaragüense.' },
      { id: 'c2', name: 'Crecimiento visible', desc: 'Rápida expansión y dinamismo comercial.' },
      { id: 'c3', name: 'Buena reputación', desc: 'Aceptación positiva y confianza de clientes.' },
      { id: 'c4', name: 'Posicionamiento', desc: 'Presencia destacada en su zona o mercado.' },
      { id: 'c5', name: 'Diferenciación', desc: 'Propuesta innovadora o valor agregado.' },
      { id: 'c6', name: 'Potencial de liderazgo', desc: 'Proyección para convertirse en referente.' }
    ]
  }
];

const RATING_LABELS = {
  1: { text: '1 · Bajo', color: 'bg-slate-100 text-slate-700 border-slate-300', active: 'bg-red-600 text-white border-red-600' },
  2: { text: '2 · En desarrollo', color: 'bg-slate-100 text-slate-700 border-slate-300', active: 'bg-orange-500 text-white border-orange-500' },
  3: { text: '3 · Buen nivel', color: 'bg-slate-100 text-slate-700 border-slate-300', active: 'bg-amber-500 text-white border-amber-500' },
  4: { text: '4 · Alto nivel', color: 'bg-slate-100 text-slate-700 border-slate-300', active: 'bg-blue-600 text-white border-blue-600' },
  5: { text: '5 · Sobresaliente', color: 'bg-slate-100 text-slate-700 border-slate-300', active: 'bg-emerald-600 text-white border-emerald-600' }
};

export default function JudgeEvaluationForm({ onClose }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialJudgeName = urlParams.get('judge') || urlParams.get('nombre') || '';

  const [judgeName, setJudgeName] = useState(initialJudgeName);
  const [judgeCompany, setJudgeCompany] = useState('');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [expandedSlotIndex, setExpandedSlotIndex] = useState(0); // Slot actualmente abierto para evaluar
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  const createEmptyCategoryData = () => {
    return Array.from({ length: 5 }, (_, i) => ({
      slot: i + 1,
      nombreFerreteria: '',
      ciudad: '',
      scores: {}
    }));
  };

  const [evaluations, setEvaluations] = useState({
    familiar: createEmptyCategoryData(),
    oro: createEmptyCategoryData(),
    promesa: createEmptyCategoryData()
  });

  const currentCategory = CATEGORIES[activeCategoryIndex];
  const currentSlots = evaluations[currentCategory.id];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setExpandedSlotIndex(0);
  }, [activeCategoryIndex]);

  const handleScoreChange = (slotIndex, criterionId, value) => {
    setEvaluations(prev => {
      const updatedList = [...prev[currentCategory.id]];
      const currentSlot = { ...updatedList[slotIndex] };
      currentSlot.scores = { ...currentSlot.scores, [criterionId]: Number(value) };
      updatedList[slotIndex] = currentSlot;
      return { ...prev, [currentCategory.id]: updatedList };
    });
  };

  const handleInfoChange = (slotIndex, field, value) => {
    setEvaluations(prev => {
      const updatedList = [...prev[currentCategory.id]];
      const currentSlot = { ...updatedList[slotIndex], [field]: value };
      updatedList[slotIndex] = currentSlot;
      return { ...prev, [currentCategory.id]: updatedList };
    });
  };

  const calculateSlotTotal = (slot) => {
    return Object.values(slot.scores || {}).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  };

  const isSlotComplete = (slot) => {
    if (!slot.nombreFerreteria?.trim()) return false;
    const scoredCount = Object.keys(slot.scores || {}).length;
    return scoredCount === currentCategory.criteria.length;
  };

  const completedCountInCategory = currentSlots.filter(s => isSlotComplete(s)).length;

  const handleSubmit = async () => {
    if (!judgeName.trim()) {
      alert('Por favor, ingresa tu nombre completo en la parte superior.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let totalNominated = 0;
    CATEGORIES.forEach(cat => {
      const filled = evaluations[cat.id].filter(s => s.nombreFerreteria.trim() !== '');
      totalNominated += filled.length;
    });

    if (totalNominated < 3) {
      if (!window.confirm('Aún tienes ferreterías pendientes de calificar. ¿Deseas enviar tu evaluación con lo registrado hasta ahora?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        judgeName: judgeName.trim(),
        judgeCompany: judgeCompany.trim(),
        evaluations: evaluations,
        createdAt: serverTimestamp(),
        submittedAtStr: new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' })
      };

      const docRef = await addDoc(collection(db, `${getEventBasePath()}/juryEvaluations`), payload);
      setSubmittedId(docRef.id);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error saving evaluation:', error);
      alert('Hubo un error al guardar la evaluación. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#f8fafc] text-slate-800 pt-36 md:pt-44 pb-20 px-4">
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 md:p-10 text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 size={36} />
          </div>
          <span className="bg-amber-100 text-amber-800 font-bold px-3.5 py-1 rounded-full text-xs uppercase tracking-wide inline-block mb-3">
            Evaluación Enviada
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            ¡Muchas gracias, {judgeName}!
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Tus nominaciones y calificaciones han sido registradas con éxito de forma 100% confidencial en el sistema de <strong>ExpoFerre 2026</strong>.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-left mb-6 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Jurado:</span>
              <span className="font-bold text-slate-900">{judgeName}</span>
            </div>
            {judgeCompany && (
              <div className="flex justify-between">
                <span className="text-slate-500">Empresa / Institución:</span>
                <span className="font-bold text-slate-900">{judgeCompany}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Folio:</span>
              <span className="font-mono font-bold text-amber-600">{submittedId}</span>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="w-full bg-[#f39200] hover:bg-[#d98200] text-black font-black py-3 rounded-xl transition-all shadow-md active:scale-95 text-sm"
            >
              Finalizar y Salir
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f1f5f9] text-slate-900 pt-36 md:pt-44 pb-20 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto">
        
        {/* ENCABEZADO COMPACTO CON DATOS FIJOS DEL JURADO */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#f39200] flex items-center justify-center font-bold shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">
                Premios a la Excelencia Ferretera
              </h1>
              <p className="text-xs text-slate-500">Comité Calificador Oficial · ExpoFerre 2026</p>
            </div>
          </div>

          {/* Campos Fijos y Visibles del Jurado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Nombre del Jurado <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={judgeName} 
                onChange={(e) => setJudgeName(e.target.value)}
                placeholder="Ej. Ing. Carlos Mendoza"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Empresa o Institución (Opcional)
              </label>
              <input 
                type="text" 
                value={judgeCompany} 
                onChange={(e) => setJudgeCompany(e.target.value)}
                placeholder="Ej. Cámara de Comercio / Empresa"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#f39200]"
              />
            </div>
          </div>
        </div>

        {/* BARRA DE PASOS / CATEGORÍAS (3 PASOS) */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategoryIndex === idx;
            const filledCount = evaluations[cat.id].filter(s => isSlotComplete(s)).length;
            const isCompleted = filledCount >= 5;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={`py-2.5 px-3 rounded-xl text-center border transition-all relative ${
                  isActive 
                    ? 'bg-white border-[#f39200] shadow-sm ring-2 ring-[#f39200]/20' 
                    : 'bg-white/80 border-slate-200 text-slate-500 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-black uppercase ${isActive ? 'text-[#f39200]' : 'text-slate-400'}`}>
                    Paso {idx + 1}
                  </span>
                  {isCompleted && (
                    <Check size={12} className="text-emerald-600 font-bold" />
                  )}
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {cat.title.replace('Ferretería ', '')}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {filledCount}/5 listas
                </div>
              </button>
            );
          })}
        </div>

        {/* TARJETA DE LA CATEGORÍA ACTIVA */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm mb-4">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">
                {currentCategory.badgeText}
              </span>
              <h2 className="text-xl font-black text-slate-900">{currentCategory.title}</h2>
              <p className="text-xs text-slate-500 italic mt-0.5">"{currentCategory.tagline}"</p>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block font-medium">Progreso</span>
              <span className="text-sm font-black text-[#f39200]">
                {completedCountInCategory} de 5
              </span>
            </div>
          </div>

          {/* GUÍA RÁPIDA DE ESCALA (1 LÍNEA) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-5 text-[11px] text-slate-600 flex items-center justify-between gap-1 overflow-x-auto">
            <span className="font-bold text-slate-700 shrink-0">Escala:</span>
            <span className="text-slate-500">1: Bajo</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">2: En desarrollo</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">3: Buen nivel</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">4: Alto</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-700 font-bold text-emerald-700">5: Sobresaliente</span>
          </div>

          {/* LISTA COMPACTA DE LAS 5 FERRETERÍAS (ACORDEÓN) */}
          <div className="space-y-3">
            {currentSlots.map((slot, slotIdx) => {
              const isExpanded = expandedSlotIndex === slotIdx;
              const slotComplete = isSlotComplete(slot);
              const totalScore = calculateSlotTotal(slot);
              const maxScore = currentCategory.criteria.length * 5;

              return (
                <div 
                  key={`slot-${currentCategory.id}-${slotIdx}`}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isExpanded 
                      ? 'border-[#f39200] shadow-md bg-white ring-1 ring-[#f39200]/10' 
                      : slotComplete 
                        ? 'border-emerald-200 bg-emerald-50/30' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  {/* Encabezado del acordeón / Clic para abrir */}
                  <div 
                    onClick={() => setExpandedSlotIndex(isExpanded ? null : slotIdx)}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                        slotComplete 
                          ? 'bg-emerald-600 text-white' 
                          : isExpanded 
                            ? 'bg-[#f39200] text-black font-black' 
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {slotComplete ? <Check size={14} /> : slot.slot}
                      </span>
                      
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {slot.nombreFerreteria.trim() || `Ferretería ${slot.slot}`}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {slot.ciudad.trim() ? `${slot.ciudad} · ` : ''}
                          {slotComplete ? `${totalScore} / ${maxScore} pts evaluados` : 'Toca para evaluar'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {slotComplete && (
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          {totalScore} pts
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Cuerpo expandido para evaluar */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4 bg-white">
                      
                      {/* Inputs de Nombre y Ciudad */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Nombre de la Ferretería <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={slot.nombreFerreteria}
                            onChange={(e) => handleInfoChange(slotIdx, 'nombreFerreteria', e.target.value)}
                            placeholder="Ej. Ferretería Central"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#f39200]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Ciudad / Departamento
                          </label>
                          <input 
                            type="text" 
                            value={slot.ciudad}
                            onChange={(e) => handleInfoChange(slotIdx, 'ciudad', e.target.value)}
                            placeholder="Ej. Managua, Matagalpa..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#f39200]"
                          />
                        </div>
                      </div>

                      {/* Lista Compacta de Criterios con Botones 1 al 5 */}
                      <div className="space-y-2.5 pt-1">
                        <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Califica cada criterio (Toca del 1 al 5):
                        </span>

                        {currentCategory.criteria.map((crit, critIdx) => {
                          const currentVal = slot.scores[crit.id] || 0;
                          return (
                            <div 
                              key={crit.id}
                              className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-900 block">
                                  {critIdx + 1}. {crit.name}
                                </span>
                                <span className="text-[11px] text-slate-500 leading-none">
                                  {crit.desc}
                                </span>
                              </div>

                              {/* Botones de calificación 1 al 5 */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                {[1, 2, 3, 4, 5].map((val) => {
                                  const isSelected = currentVal === val;
                                  return (
                                    <button
                                      type="button"
                                      key={val}
                                      onClick={() => handleScoreChange(slotIdx, crit.id, val)}
                                      className={`w-9 h-9 rounded-lg font-black text-xs transition-all flex items-center justify-center border shadow-xs ${
                                        isSelected 
                                          ? 'bg-[#f39200] text-black border-[#f39200] font-black scale-105 shadow-sm' 
                                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Botón para pasar a la siguiente ferretería dentro de la categoría */}
                      <div className="pt-2 flex justify-end">
                        {slotIdx < 4 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedSlotIndex(slotIdx + 1)}
                            className="text-xs bg-slate-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                          >
                            Listo, Siguiente Ferretería <ChevronRight size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedSlotIndex(null)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
                          >
                            <Check size={14} /> Guardar Ferretería 5
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

        {/* NAVEGACIÓN INFERIOR (Paso Anterior / Siguiente / Enviar) */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {activeCategoryIndex > 0 ? (
            <button
              type="button"
              onClick={() => setActiveCategoryIndex(prev => prev - 1)}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <ChevronLeft size={16} /> Categoría Anterior
            </button>
          ) : <div />}

          {activeCategoryIndex < CATEGORIES.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveCategoryIndex(prev => prev + 1)}
              className="bg-[#f39200] hover:bg-[#d98200] text-black font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md active:scale-95 ml-auto"
            >
              Siguiente Categoría <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ml-auto"
            >
              <Send size={16} />
              {isSubmitting ? 'Guardando...' : 'Finalizar y Enviar Evaluación'}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
