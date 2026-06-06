import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminPanel({ onBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [reservedStands, setReservedStands] = useState([]);
  const [error, setError] = useState('');

  // Credenciales maestras
  const MASTER_USER = 'admin';
  const MASTER_PASSWORD = 'ExpoFerre2026!';

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.toLowerCase() === MASTER_USER && password === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Usuario o contraseña incorrectos. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const q = query(collection(db, 'stands'), where('status', '==', 'reserved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const standsData = snapshot.docs.map(doc => doc.data());
      // Ordenar por número de stand
      standsData.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1]);
        const numB = parseInt(b.id.split('-')[1]);
        return numA - numB;
      });
      setReservedStands(standsData);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleRelease = async (standId) => {
    if (window.confirm(`¿Estás seguro de que deseas liberar el ${standId.replace('-', ' ').toUpperCase()}? Esto borrará los datos del cliente y el logo.`)) {
      try {
        const standRef = doc(db, 'stands', standId);
        await updateDoc(standRef, {
          status: 'available',
          logo: null,
          reservationDetails: null
        });
      } catch (err) {
        console.error("Error al liberar:", err);
        alert('Hubo un error al intentar liberar el stand.');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-outline-variant rounded-xl p-8 max-w-sm w-full shadow-lg">
          <div className="flex justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-primary">lock</span>
          </div>
          <h2 className="text-headline-sm font-bold text-on-surface text-center mb-2">Acceso Administrador</h2>
          <p className="text-body-md text-secondary text-center mb-6">Ingresa tus credenciales para ver las reservaciones.</p>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Usuario" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 bg-surface-variant/30 border border-outline-variant rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
            />
            {error && <p className="text-red-500 text-label-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-3 bg-primary text-on-primary font-bold rounded-md hover:bg-primary/90 transition-colors">
              Ingresar
            </button>
          </form>
          <button onClick={onBack} className="mt-4 w-full py-2 text-secondary hover:text-primary transition-colors font-label-md">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header del Panel */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Panel de Reservaciones</h1>
            <p className="text-body-lg text-secondary">Tienes {reservedStands.length} stands reservados actualmente.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">home</span>
              Volver a la Web
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="px-5 py-2 bg-error text-on-error rounded-md hover:bg-error/90 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">logout</span>
              Salir
            </button>
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container border-b border-outline-variant text-label-md text-secondary">
                  <th className="p-4 font-medium">Stand</th>
                  <th className="p-4 font-medium">Logo</th>
                  <th className="p-4 font-medium">Empresa</th>
                  <th className="p-4 font-medium">Contacto</th>
                  <th className="p-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-body-md text-on-surface divide-y divide-outline-variant">
                {reservedStands.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-secondary">
                      No hay stands reservados en este momento.
                    </td>
                  </tr>
                ) : (
                  reservedStands.map((stand) => (
                    <tr key={stand.id} className="hover:bg-surface-variant/30 transition-colors">
                      <td className="p-4 font-bold text-primary">
                        {stand.name}
                        <div className="text-label-sm text-secondary font-normal">{stand.size}</div>
                      </td>
                      <td className="p-4">
                        {stand.logo ? (
                          <img src={stand.logo} alt="Logo" className="w-12 h-12 rounded-full object-cover border border-outline-variant" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">image_not_supported</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-medium">
                        {stand.reservationDetails?.empresa || 'Sin empresa'}
                      </td>
                      <td className="p-4">
                        <div>{stand.reservationDetails?.nombre} {stand.reservationDetails?.apellido}</div>
                        <div className="text-label-sm text-secondary">{stand.reservationDetails?.correo}</div>
                        <div className="text-label-sm text-secondary">{stand.reservationDetails?.telefono}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleRelease(stand.id)}
                          className="px-4 py-2 bg-error/10 text-error hover:bg-error/20 rounded-md transition-colors font-label-md flex items-center gap-1 inline-flex"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Liberar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
