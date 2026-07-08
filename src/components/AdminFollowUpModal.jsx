import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminFollowUpModal({ isOpen, onClose, person, collectionName, adminUser }) {
  const [result, setResult] = useState('Contestó');
  const [notes, setNotes] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(person.needsFollowUp || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !person) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const personRef = doc(db, `${getEventBasePath()}/${collectionName}`, person.id);
      
      const newFollowUp = {
        date: new Date().toISOString(),
        result,
        notes,
        staff: adminUser?.username || 'Desconocido'
      };

      await updateDoc(personRef, {
        followUps: arrayUnion(newFollowUp),
        needsFollowUp: needsFollowUp
      });
      
      setResult('Contestó');
      setNotes('');
      onClose();
    } catch (err) {
      console.error("Error guardando seguimiento:", err);
      alert("Hubo un error al guardar el seguimiento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleNeedsFollowUp = async (newValue) => {
    setNeedsFollowUp(newValue);
    try {
      const personRef = doc(db, `${getEventBasePath()}/${collectionName}`, person.id);
      await updateDoc(personRef, { needsFollowUp: newValue });
    } catch (err) {
      console.error("Error toggling needsFollowUp:", err);
    }
  };

  const followUps = person.followUps || [];
  // Sort followUps descending by date
  const sortedFollowUps = [...followUps].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-start bg-white rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">headset_mic</span>
              Seguimiento CRM
            </h2>
            <p className="text-secondary text-sm mt-1">Llamada a: <strong className="text-primary">{person.nombre || person.name}</strong></p>
            <p className="text-secondary text-sm">Teléfono: {person.telefono || person.phone || 'No registrado'}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-on-surface transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Historial */}
        <div className="p-6 overflow-y-auto flex-1 bg-surface-container-lowest">
          <h3 className="text-label-lg font-bold text-on-surface mb-4">Historial de Llamadas ({followUps.length})</h3>
          {sortedFollowUps.length === 0 ? (
            <p className="text-secondary text-sm italic bg-white p-4 rounded-lg border border-outline-variant text-center">No hay registros de seguimiento para esta persona aún.</p>
          ) : (
            <div className="space-y-4">
              {sortedFollowUps.map((fu, idx) => (
                <div key={idx} className="bg-white border border-outline-variant rounded-lg p-4 text-sm relative">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-primary">{fu.result}</span>
                    <span className="text-secondary text-xs">{new Date(fu.date).toLocaleString()}</span>
                  </div>
                  <p className="text-on-surface whitespace-pre-wrap">{fu.notes}</p>
                  <div className="text-xs text-secondary mt-3 text-right">Registrado por: <strong>{fu.staff}</strong></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nuevo Registro */}
        <div className="p-6 border-t border-outline-variant bg-white rounded-b-xl">
          <h3 className="text-label-lg font-bold text-on-surface mb-4">Nuevo Registro</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-2">Resultado de la llamada *</label>
              <select 
                value={result} 
                onChange={(e) => setResult(e.target.value)}
                className="w-full p-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                required
              >
                <option value="Contestó">Contestó</option>
                <option value="No contestó">No contestó</option>
                <option value="Buzón de voz">Buzón de voz</option>
                <option value="Promesa de asistencia">Promesa de asistencia</option>
                <option value="Canceló asistencia">Canceló asistencia</option>
                <option value="Número equivocado">Número equivocado</option>
                <option value="Volver a llamar">Volver a llamar</option>
              </select>
            </div>
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-2">Notas / Comentarios</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="Escribe los detalles importantes de la llamada..."
                className="w-full p-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              ></textarea>
            </div>

            <label className="flex items-center gap-3 cursor-pointer mt-2 bg-surface-variant/30 p-3 rounded-lg border border-outline-variant w-fit hover:bg-surface-variant/50 transition-colors">
              <input 
                type="checkbox" 
                checked={needsFollowUp} 
                onChange={(e) => handleToggleNeedsFollowUp(e.target.checked)} 
                className="w-5 h-5 text-primary rounded focus:ring-primary focus:ring-2 border-outline-variant cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">Marcar como "Requiere Seguimiento"</span>
                <span className="text-xs text-secondary">La persona aparecerá al usar el filtro principal</span>
              </div>
            </label>

            <div className="flex justify-end gap-3 mt-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors text-sm font-bold"
              >
                Cerrar
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-on-primary rounded-md hover:brightness-110 transition-colors text-sm font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Guardando...' : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
