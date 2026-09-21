import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ChevronRight, ChevronLeft, Send, Building2, Check, User, MapPin } from 'lucide-react';
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
    description: 'Reconoce a ferreterías donde la familia es parte fundamental de la identidad, historia y continuidad del negocio.'
  },
  {
    id: 'oro',
    number: '02',
    title: 'Ferretería Oro',
    badgeText: '02. ORO (25+ AÑOS)',
    tagline: '25+ años construyendo historia y trayectoria en el mercado.',
    description: 'Reconoce a ferreterías con más de 25 años de trayectoria sólida, solvencia y reconocimiento en el sector.'
  },
  {
    id: 'promesa',
    number: '03',
    title: 'Ferretería Promesa',
    badgeText: '03. PROMESA (<5 AÑOS)',
    tagline: 'Jóvenes emprendimientos con crecimiento extraordinario.',
    description: 'Reconoce a ferreterías jóvenes con menos de 5 años de presencia en Nicaragua con alto potencial y dinamismo.'
  }
];

export default function JudgeEvaluationForm({ onClose }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialJudgeName = urlParams.get('judge') || urlParams.get('nombre') || '';

  const [judgeName, setJudgeName] = useState(initialJudgeName);
  const [judgeCompany, setJudgeCompany] = useState('');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  const createEmptyCategoryData = () => {
    return Array.from({ length: 5 }, (_, i) => ({
      slot: i + 1,
      nombreFerreteria: '',
      ciudad: ''
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
  }, [activeCategoryIndex]);

  const handleInfoChange = (slotIndex, field, value) => {
    setEvaluations(prev => {
      const updatedList = [...prev[currentCategory.id]];
      updatedList[slotIndex] = { ...updatedList[slotIndex], [field]: value };
      return { ...prev, [currentCategory.id]: updatedList };
    });
  };

  const completedCountInCategory = currentSlots.filter(s => s.nombreFerreteria.trim() !== '').length;

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
      if (!window.confirm('Tienes ferreterías pendientes de nominar. ¿Deseas enviar tus nominaciones con lo ingresado hasta ahora?')) {
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
      console.error('Error saving nominations:', error);
      alert('Hubo un error al guardar las nominaciones. Por favor intenta de nuevo.');
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
            Nominaciones Recibidas
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
            ¡Muchas gracias, {judgeName}!
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Tus nominaciones para los <strong>Premios a la Excelencia Ferretera ExpoFerre 2026</strong> han sido registradas de forma confidencial y segura.
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
              <span className="text-slate-500">Folio de Registro:</span>
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
        
        {/* ENCABEZADO CON DATOS FIJOS DEL JURADO */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-[#f39200] flex items-center justify-center font-bold shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 leading-tight">
                Premios a la Excelencia Ferretera
              </h1>
              <p className="text-xs text-slate-500">Nominaciones Oficiales del Jurado · ExpoFerre 2026</p>
            </div>
          </div>

          {/* Campos Fijos del Jurado */}
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

        {/* SELECTOR DE 3 PASOS / CATEGORÍAS */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategoryIndex === idx;
            const filledCount = evaluations[cat.id].filter(s => s.nombreFerreteria.trim() !== '').length;
            const isCompleted = filledCount >= 5;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={`py-2.5 px-3 rounded-xl text-center border transition-all ${
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

        {/* TARJETA PRINCIPAL DE NOMINACIÓN */}
        <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm mb-4">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
            <div>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">
                {currentCategory.badgeText}
              </span>
              <h2 className="text-xl font-black text-slate-900">{currentCategory.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{currentCategory.description}</p>
            </div>
            
            <div className="text-right shrink-0">
              <span className="text-[11px] text-slate-400 block font-medium">Nominadas</span>
              <span className="text-sm font-black text-[#f39200]">
                {completedCountInCategory} de 5
              </span>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-slate-600 font-semibold">
              Por favor, ingresa hasta <strong>5 ferreterías</strong> que consideres merecedoras de este premio:
            </p>
          </div>

          {/* 5 SLOTS DIRECTOS (NOMBRE + CIUDAD) */}
          <div className="space-y-3">
            {currentSlots.map((slot, slotIdx) => {
              const hasName = slot.nombreFerreteria.trim() !== '';

              return (
                <div 
                  key={`slot-${currentCategory.id}-${slotIdx}`}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    hasName 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : 'border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:border-[#f39200] focus-within:ring-1 focus-within:ring-[#f39200]/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                      hasName ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {hasName ? <Check size={13} /> : slot.slot}
                    </span>
                    <span className="font-bold text-xs text-slate-800">
                      Ferretería #{slot.slot}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7">
                      <input 
                        type="text" 
                        value={slot.nombreFerreteria}
                        onChange={(e) => handleInfoChange(slotIdx, 'nombreFerreteria', e.target.value)}
                        placeholder={`Nombre comercial de la ferretería #${slot.slot}`}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#f39200]"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <input 
                        type="text" 
                        value={slot.ciudad}
                        onChange={(e) => handleInfoChange(slotIdx, 'ciudad', e.target.value)}
                        placeholder="Ciudad / Departamento"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#f39200]"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* BOTONES DE NAVEGACIÓN INFERIOR */}
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
              {isSubmitting ? 'Guardando...' : 'Finalizar y Enviar Nominaciones'}
            </button>
          )}
        </div>

      </div>
    </main>
  );
}
