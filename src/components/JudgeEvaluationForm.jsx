import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, ChevronRight, ChevronLeft, Send, Sparkles, Building2, Star, ShieldCheck, Info } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getEventBasePath } from '../config/eventConfig';

const CATEGORIES = [
  {
    id: 'familiar',
    number: '01',
    title: 'FERRETERÍA FAMILIAR',
    tagline: 'Una historia que se construye de generación en generación.',
    description: 'Reconoce a ferreterías donde la familia es parte fundamental de la historia, identidad y continuidad del negocio, y que han logrado construir una relación cercana con sus clientes y su comunidad.',
    whatWeSeek: 'Una ferretería donde la historia de una familia se convirtió también en parte de la historia de su comunidad.',
    criteria: [
      { id: 'c1', name: 'Trayectoria familiar', desc: 'Permanencia y continuidad de la familia al frente del negocio.' },
      { id: 'c2', name: 'Continuidad generacional', desc: 'Historia, valores trascendidos, participación de hijos, padres, hermanos u otras generaciones.' },
      { id: 'c3', name: 'Reputación', desc: 'Reconocimiento y confianza que la ferretería ha construido en su mercado.' },
      { id: 'c4', name: 'Reconocimiento en el sector', desc: 'Consideración que tiene dentro de la industria ferretera.' },
      { id: 'c5', name: 'Adaptación', desc: 'Capacidad de evolucionar con las necesidades del mercado sin perder su esencia.' }
    ]
  },
  {
    id: 'oro',
    number: '02',
    title: 'FERRETERÍA ORO',
    tagline: '25+ años construyendo historia.',
    description: 'Reconoce a ferreterías con 25 años o más de trayectoria en el mercado, cuya permanencia, reputación y aporte las han convertido en empresas reconocidas dentro de la industria.',
    whatWeSeek: 'Una ferretería que ha logrado permanecer, evolucionar y construir una reputación que trasciende generaciones.',
    criteria: [
      { id: 'c1', name: 'Antigüedad', desc: 'Más de 25 años de trayectoria en el mercado.' },
      { id: 'c2', name: 'Trayectoria', desc: 'Historia y permanencia a lo largo de los años.' },
      { id: 'c3', name: 'Reputación', desc: 'Confianza y reconocimiento construido durante su trayectoria.' },
      { id: 'c4', name: 'Reconocimiento sectorial', desc: 'Nivel de reconocimiento dentro de la industria ferretera.' },
      { id: 'c5', name: 'Evolución', desc: 'Capacidad de adaptarse y crecer junto con el mercado.' },
      { id: 'c6', name: 'Expansión', desc: 'Crecimiento de su presencia, oferta, cobertura o alcance.' }
    ]
  },
  {
    id: 'promesa',
    number: '03',
    title: 'FERRETERÍA PROMESA',
    tagline: 'El futuro de la industria comienza con quienes se atreven a construirlo.',
    description: 'Reconoce a ferreterías jóvenes, con menos de 5 años de presencia en el mercado nicaragüense, que ya están demostrando crecimiento, expansión, reconocimiento y un potencial extraordinario.',
    whatWeSeek: 'Una ferretería joven que crece, se expande, gana reconocimiento y representa una verdadera promesa para Nicaragua y para el futuro de la industria ferretera.',
    criteria: [
      { id: 'c1', name: 'Antigüedad', desc: 'Menos de 5 años en el mercado nicaragüense.' },
      { id: 'c2', name: 'Crecimiento', desc: 'Evolución y crecimiento visible año tras año.' },
      { id: 'c3', name: 'Reputación', desc: 'Percepción positiva y reconocimiento que ha logrado en poco tiempo.' },
      { id: 'c4', name: 'Posicionamiento', desc: 'Presencia y reconocimiento alcanzado dentro del mercado.' },
      { id: 'c5', name: 'Diferenciación', desc: 'Elementos que la distinguen de otras ferreterías.' },
      { id: 'c6', name: 'Potencial de liderazgo', desc: 'Capacidad de convertirse en un referente de la industria.' }
    ]
  }
];

const RATING_SCALE = [
  { value: 1, label: 'Bajo / Poca evidencia', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100', active: 'bg-red-600 text-white border-red-600 shadow-md' },
  { value: 2, label: 'En desarrollo', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100', active: 'bg-orange-500 text-white border-orange-500 shadow-md' },
  { value: 3, label: 'Buen nivel', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', active: 'bg-amber-500 text-white border-amber-500 shadow-md' },
  { value: 4, label: 'Alto nivel', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', active: 'bg-blue-600 text-white border-blue-600 shadow-md' },
  { value: 5, label: 'Sobresaliente', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', active: 'bg-emerald-600 text-white border-emerald-600 shadow-md' }
];

export default function JudgeEvaluationForm({ onClose }) {
  const urlParams = new URLSearchParams(window.location.search);
  const initialJudgeName = urlParams.get('judge') || urlParams.get('nombre') || '';

  const [judgeName, setJudgeName] = useState(initialJudgeName);
  const [judgeCompany, setJudgeCompany] = useState('');
  const [judgePhone, setJudgePhone] = useState('');
  const [generalObservations, setGeneralObservations] = useState('');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  // Estructura de evaluaciones por categoría
  // 5 ferreterías por categoría
  const createEmptyCategoryData = () => {
    return Array.from({ length: 5 }, (_, i) => ({
      slot: i + 1,
      nombreFerreteria: '',
      ciudad: '',
      scores: {} // { c1: 5, c2: 4, ... }
    }));
  };

  const [evaluations, setEvaluations] = useState({
    familiar: createEmptyCategoryData(),
    oro: createEmptyCategoryData(),
    promesa: createEmptyCategoryData()
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategoryIndex]);

  const handleScoreChange = (catId, slotIndex, criterionId, value) => {
    setEvaluations(prev => {
      const updatedList = [...prev[catId]];
      const currentSlot = { ...updatedList[slotIndex] };
      currentSlot.scores = { ...currentSlot.scores, [criterionId]: Number(value) };
      updatedList[slotIndex] = currentSlot;
      return { ...prev, [catId]: updatedList };
    });
  };

  const handleInfoChange = (catId, slotIndex, field, value) => {
    setEvaluations(prev => {
      const updatedList = [...prev[catId]];
      const currentSlot = { ...updatedList[slotIndex], [field]: value };
      updatedList[slotIndex] = currentSlot;
      return { ...prev, [catId]: updatedList };
    });
  };

  const calculateSlotTotal = (slot) => {
    return Object.values(slot.scores || {}).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  };

  const calculateCategoryMax = (cat) => {
    return cat.criteria.length * 5;
  };

  const currentCategory = CATEGORIES[activeCategoryIndex];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!judgeName.trim()) {
      alert('Por favor, ingresa tu nombre completo como Jurado Calificador.');
      return;
    }

    // Verificar que haya al menos 1 ferretería nominada en cada categoría
    let totalNominated = 0;
    CATEGORIES.forEach(cat => {
      const nominatedInCat = evaluations[cat.id].filter(slot => slot.nombreFerreteria.trim() !== '');
      totalNominated += nominatedInCat.length;
    });

    if (totalNominated < 3) {
      if (!window.confirm('Aún tienes ferreterías sin nominar. ¿Deseas enviar tu evaluación con los datos ingresados hasta ahora?')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        judgeName: judgeName.trim(),
        judgeCompany: judgeCompany.trim(),
        judgePhone: judgePhone.trim(),
        generalObservations: generalObservations.trim(),
        evaluations: evaluations,
        createdAt: serverTimestamp(),
        submittedAtStr: new Date().toLocaleString('es-NI', { timeZone: 'America/Managua' })
      };

      const docRef = await addDoc(collection(db, `${getEventBasePath()}/juryEvaluations`), payload);
      setSubmittedId(docRef.id);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error saving jury evaluation:', error);
      alert('Ocurrió un error al guardar la evaluación. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-slate-900 text-white pt-28 pb-20 px-4 md:px-8">
        <div className="max-w-2xl mx-auto bg-slate-800/90 border border-slate-700 rounded-2xl p-8 md:p-12 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-500/30">
            <CheckCircle2 size={48} />
          </div>
          <span className="bg-[#f39200]/20 text-[#f39200] border border-[#f39200]/30 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-3">
            Evaluación Registrada con Éxito
          </span>
          <h1 className="text-3xl font-black text-white mb-3">
            ¡Muchas gracias, {judgeName}!
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-6">
            Tus nominaciones y puntuaciones para los <strong>Premios a la Excelencia Ferretera ExpoFerre 2026</strong> han sido recibidas y almacenadas de forma confidencial y segura en el sistema.
          </p>

          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-700/60 text-left mb-8 space-y-3">
            <div className="flex items-center justify-between text-sm border-b border-slate-800 pb-2">
              <span className="text-slate-400">Jurado Calificador:</span>
              <span className="font-bold text-white">{judgeName}</span>
            </div>
            <div className="flex items-center justify-between text-sm border-b border-slate-800 pb-2">
              <span className="text-slate-400">Institución / Empresa:</span>
              <span className="font-bold text-white">{judgeCompany || 'Comité Oficial'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Folio de Registro:</span>
              <span className="font-mono font-bold text-[#f39200] text-xs">{submittedId}</span>
            </div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="bg-[#f39200] hover:bg-[#d98200] text-black font-black px-8 py-3 rounded-xl transition-all shadow-lg hover:scale-105"
            >
              Volver al Inicio
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pt-40 md:pt-48 pb-24 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabecera Principal */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#f39200]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 bg-[#f39200] text-black text-xs font-black uppercase tracking-wider px-3 py-1 rounded-md">
              <Award size={16} /> Comité Calificador Oficial
            </div>
            <span className="text-xs text-slate-400 font-medium">ExpoFerre Nicaragua 2026</span>
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-3">
            Premios a la Excelencia Ferretera
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6 max-w-3xl">
            Bienvenido al formulario confidencial de evaluación. Como miembro del jurado, tu conocimiento y percepción son fundamentales para reconocer a las ferreterías más destacadas del país.
          </p>

          {/* Datos del Jurado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre del Jurado *</label>
              <input 
                type="text" 
                value={judgeName} 
                onChange={(e) => setJudgeName(e.target.value)}
                placeholder="Ej. Ing. Roberto Morales"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-semibold focus:outline-none focus:border-[#f39200]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa / Institución (Opcional)</label>
              <input 
                type="text" 
                value={judgeCompany} 
                onChange={(e) => setJudgeCompany(e.target.value)}
                placeholder="Ej. Cámara de Comercio / Consultor"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#f39200]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Teléfono / WhatsApp (Opcional)</label>
              <input 
                type="tel" 
                value={judgePhone} 
                onChange={(e) => setJudgePhone(e.target.value)}
                placeholder="+505 8888-8888"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#f39200]"
              />
            </div>
          </div>
        </div>

        {/* Guía y Escala de Evaluación */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 md:p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Metodología y Criterio de Puntuación</h3>
              <p className="text-slate-400 text-xs md:text-sm mt-1 leading-relaxed">
                Cada jurado deberá nominar hasta <strong>5 ferreterías por categoría</strong> y asignar a cada criterio una puntuación del <strong>1 al 5</strong>. La evaluación se basa en tu conocimiento, experiencia y percepción del mercado, sin requerir estados financieros.
              </p>
            </div>
          </div>

          {/* Escala Visual de Referencia */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-xs">
            {RATING_SCALE.map(scale => (
              <div key={scale.value} className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 text-center">
                <span className="inline-block w-6 h-6 rounded-full bg-[#f39200]/20 text-[#f39200] font-black text-xs leading-6 mb-1">
                  {scale.value}
                </span>
                <span className="block font-semibold text-slate-200">{scale.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selector de Pestañas de Categoría */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
          {CATEGORIES.map((cat, idx) => {
            const isActive = activeCategoryIndex === idx;
            const nominatedCount = evaluations[cat.id].filter(s => s.nombreFerreteria.trim() !== '').length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryIndex(idx)}
                className={`p-3 md:p-4 rounded-xl text-left border transition-all relative ${
                  isActive 
                    ? 'bg-slate-800 border-[#f39200] shadow-lg ring-1 ring-[#f39200]' 
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isActive ? 'text-[#f39200]' : 'text-slate-500'}`}>
                    Categoría {cat.number}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${nominatedCount > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                    {nominatedCount}/5
                  </span>
                </div>
                <h4 className="font-bold text-xs md:text-sm text-white truncate">{cat.title}</h4>
              </button>
            );
          })}
        </div>

        {/* Contenido de la Categoría Activa */}
        <div className="space-y-8">
          {/* Banner de la Categoría */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 md:p-8">
            <span className="bg-[#f39200] text-black text-xs font-black uppercase px-2.5 py-0.5 rounded clip-industrial inline-block mb-2">
              Categoría {currentCategory.number}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{currentCategory.title}</h2>
            <p className="text-slate-300 italic text-sm md:text-base mb-3">"{currentCategory.tagline}"</p>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-4">{currentCategory.description}</p>
            
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex items-start gap-2.5">
              <Sparkles size={18} className="text-[#f39200] shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm">
                <strong className="text-[#f39200]">¿Qué buscamos reconocer?:</strong>{' '}
                <span className="text-slate-300">{currentCategory.whatWeSeek}</span>
              </div>
            </div>
          </div>

          {/* Formulario de las 5 Ferreterías Nominadas */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 size={20} className="text-[#f39200]" />
              Ferreterías Nominadas ({evaluations[currentCategory.id].filter(s => s.nombreFerreteria.trim() !== '').length} de 5 registradas)
            </h3>

            {evaluations[currentCategory.id].map((slot, slotIdx) => {
              const totalSlotScore = calculateSlotTotal(slot);
              const maxSlotScore = calculateCategoryMax(currentCategory);
              const isFilled = slot.nombreFerreteria.trim() !== '';

              return (
                <div 
                  key={`slot-${currentCategory.id}-${slotIdx}`}
                  className={`bg-slate-900/90 border rounded-2xl p-5 md:p-7 transition-all ${
                    isFilled ? 'border-slate-700 shadow-md' : 'border-slate-800/80'
                  }`}
                >
                  {/* Encabezado del Slot */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#f39200]/20 text-[#f39200] font-black text-xs flex items-center justify-center border border-[#f39200]/30">
                        #{slot.slot}
                      </span>
                      <h4 className="font-bold text-white text-base md:text-lg">
                        Ferretería Nominada {slot.slot}
                      </h4>
                    </div>

                    {/* Puntaje acumulado */}
                    <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400">Puntaje:</span>
                      <span className="font-black text-sm text-[#f39200]">
                        {totalSlotScore} <span className="text-xs text-slate-500 font-normal">/ {maxSlotScore} pts</span>
                      </span>
                    </div>
                  </div>

                  {/* Datos Básicos de la Ferretería */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                        Nombre Comercial de la Ferretería {slot.slot === 1 ? '*' : ''}
                      </label>
                      <input 
                        type="text" 
                        value={slot.nombreFerreteria}
                        onChange={(e) => handleInfoChange(currentCategory.id, slotIdx, 'nombreFerreteria', e.target.value)}
                        placeholder="Ej. Ferretería Central / Sinsa / Noelito..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white font-medium focus:outline-none focus:border-[#f39200]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                        Ciudad / Departamento
                      </label>
                      <input 
                        type="text" 
                        value={slot.ciudad}
                        onChange={(e) => handleInfoChange(currentCategory.id, slotIdx, 'ciudad', e.target.value)}
                        placeholder="Ej. Managua, Matagalpa, León, Estelí..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#f39200]"
                      />
                    </div>
                  </div>

                  {/* Evaluación de Criterios (Solo si puso nombre o está evaluando) */}
                  <div className="space-y-4 pt-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Criterios de Evaluación (1 = Bajo, 5 = Sobresaliente)
                    </span>

                    <div className="grid grid-cols-1 gap-3.5">
                      {currentCategory.criteria.map((crit, critIdx) => {
                        const currentScore = slot.scores[crit.id] || 0;
                        return (
                          <div 
                            key={crit.id}
                            className="bg-slate-950/90 rounded-xl p-3.5 md:p-4 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3"
                          >
                            <div className="max-w-md">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#f39200]">{critIdx + 1}.</span>
                                <span className="font-bold text-sm text-white">{crit.name}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 leading-snug">{crit.desc}</p>
                            </div>

                            {/* Selector de 1 a 5 */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end md:self-auto">
                              {[1, 2, 3, 4, 5].map(val => {
                                const isSelected = currentScore === val;
                                return (
                                  <button
                                    type="button"
                                    key={val}
                                    onClick={() => handleScoreChange(currentCategory.id, slotIdx, crit.id, val)}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center border ${
                                      isSelected
                                        ? 'bg-[#f39200] text-black border-[#f39200] shadow-lg scale-105'
                                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
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
                  </div>

                </div>
              );
            })}
          </div>

          {/* Navegación entre categorías */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            {activeCategoryIndex > 0 ? (
              <button
                type="button"
                onClick={() => setActiveCategoryIndex(prev => prev - 1)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl border border-slate-800 transition-colors"
              >
                <ChevronLeft size={18} /> Categoría Anterior
              </button>
            ) : <div></div>}

            {activeCategoryIndex < CATEGORIES.length - 1 ? (
              <button
                type="button"
                onClick={() => setActiveCategoryIndex(prev => prev + 1)}
                className="flex items-center gap-2 bg-[#f39200] hover:bg-[#d98200] text-black font-black px-6 py-3 rounded-xl transition-all shadow-md hover:scale-105"
              >
                Siguiente Categoría <ChevronRight size={18} />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-black px-8 py-3.5 rounded-xl transition-all shadow-lg hover:scale-105"
                >
                  <Send size={18} />
                  {isSubmitting ? 'Enviando Evaluación...' : 'Enviar Evaluación Completa'}
                </button>
              </div>
            )}
          </div>

          {/* Observaciones Generales al final */}
          {activeCategoryIndex === CATEGORIES.length - 1 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 mt-8">
              <label className="block text-sm font-bold text-white mb-2">
                Observaciones o Comentarios Adicionales del Jurado (Opcional)
              </label>
              <textarea
                rows={4}
                value={generalObservations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                placeholder="Escriba cualquier criterio adicional, justificación o recomendación para el comité organizador..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-[#f39200] resize-none"
              />
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
