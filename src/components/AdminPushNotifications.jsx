import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import styles from '../App.module.css';

export default function AdminPushNotifications({ onBack }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendPush = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage('Por favor, completa el título y el mensaje.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Guardamos la petición en Firestore.
      // Una Cloud Function detectará esto y enviará el push a todos los tokens.
      await addDoc(collection(db, 'push_requests'), {
        title: title.trim(),
        body: body.trim(),
        target: 'all', // puede ser 'all', o un array de UIDs
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      setMessage('✅ Solicitud de notificación enviada con éxito.');
      setTitle('');
      setBody('');
    } catch (error) {
      console.error("Error enviando push:", error);
      setMessage('❌ Hubo un error al intentar enviar la notificación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
        <button 
          onClick={onBack} 
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            color: '#283474',
            fontWeight: 'bold'
          }}
        >
          <span className="material-symbols-outlined" style={{ marginRight: '5px' }}>arrow_back</span>
          Volver
        </button>
        <h2 style={{ margin: 0 }}>📣 Enviar Notificación Masiva (Push)</h2>
      </div>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Envía un mensaje instantáneo a los celulares de todos los asistentes que hayan instalado la aplicación.
      </p>

      {message && <div style={{ padding: '10px', marginBottom: '15px', backgroundColor: '#eef', borderRadius: '5px' }}>{message}</div>}

      <form onSubmit={handleSendPush} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Título de la Notificación:</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Cambio de Salón"
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
            maxLength={50}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Mensaje:</label>
          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ej. La conferencia de IA se ha movido al Salón B."
            style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', minHeight: '100px' }}
            maxLength={150}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            backgroundColor: '#e91e63', 
            color: 'white', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {loading ? 'Enviando...' : '🚀 Enviar a Todos'}
        </button>
      </form>
    </div>
  );
}
