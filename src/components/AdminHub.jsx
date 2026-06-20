import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminHub({ onBack, onNavigate, adminUser, setAdminUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Credenciales maestras
  const MASTER_USER = 'admin';
  const MASTER_PASSWORD = 'ExpoFerre2026!';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, ingresa usuario y contraseña.');
      return;
    }
    
    setError('');
    setIsLoggingIn(true);

    try {
      if (username.toLowerCase() === MASTER_USER && password === MASTER_PASSWORD) {
        setAdminUser({ username: MASTER_USER, role: 'admin' });
      } else {
        // Buscar en Firestore
        const q = query(
          collection(db, `${getEventBasePath()}/systemUsers`), 
          where('username', '==', username.toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError('Usuario o contraseña incorrectos.');
        } else {
          let found = false;
          querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.password === password) {
              setAdminUser({ id: doc.id, username: userData.username, role: userData.role });
              found = true;
            }
          });
          if (!found) {
            setError('Usuario o contraseña incorrectos.');
          }
        }
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setError('Hubo un error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!adminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="bg-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-outline-variant">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-2">Acceso Administrativo</h2>
            <p className="text-on-surface-variant">Ingresa tus credenciales maestras</p>
          </div>
          
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
            <button disabled={isLoggingIn} type="submit" className="w-full py-3 bg-primary text-on-primary font-bold rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              {isLoggingIn ? 'Verificando...' : 'Ingresar'}
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
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-headline-md font-bold text-on-surface">Portal de Administración</h1>
            <p className="text-body-lg text-secondary">Selecciona el panel al que deseas acceder.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={onBack} className="px-5 py-2 bg-surface text-on-surface border border-outline-variant rounded-md hover:bg-surface-variant transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">home</span>
              Volver al menú
            </button>
            <button onClick={() => setAdminUser(null)} className="px-5 py-2 bg-error text-on-error rounded-md hover:bg-error/90 transition-colors font-label-lg flex items-center gap-2">
              <span className="material-symbols-outlined">logout</span>
              Salir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adminUser.role === 'admin' && (
            <>
              <button 
                onClick={() => onNavigate('adminSponsorsHub')}
                className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">handshake</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Patrocinadores</h3>
                  <p className="text-secondary text-sm">Gestión de patrocinadores, reservaciones, conferencias y staff.</p>
                </div>
              </button>

              <button 
                onClick={() => onNavigate('adminPreRegistrations')}
                className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">how_to_reg</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Preregistros</h3>
                  <p className="text-secondary text-sm">Ver listado de personas que han completado el preregistro.</p>
                </div>
              </button>

              <button 
                onClick={() => onNavigate('adminContact')}
                className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">mail</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Mensajes / Contacto</h3>
                  <p className="text-secondary text-sm">Visualiza los mensajes recibidos desde la página de contacto.</p>
                </div>
              </button>
              
              <button 
                onClick={() => onNavigate('adminUsers')}
                className="bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group md:col-span-1"
              >
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">Gestión de Usuarios</h3>
                  <p className="text-secondary text-sm">Crea accesos para el staff técnico y administra privilegios.</p>
                </div>
              </button>
            </>
          )}

          {(adminUser.role === 'admin' || adminUser.role === 'tech_staff') && (
            <button 
              onClick={() => onNavigate('adminCheckIn')}
              className={`bg-white p-8 rounded-lg shadow-md border border-outline-variant hover:border-primary hover:shadow-lg transition-all flex flex-col items-center text-center gap-4 group ${adminUser.role === 'admin' ? 'md:col-span-2' : 'md:col-span-3'}`}
            >
              <div className="w-16 h-16 bg-[#f39200]/10 text-[#f39200] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">qr_code_scanner</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface mb-2">Escáner de Acceso (QR)</h3>
                <p className="text-secondary text-sm">Registra la asistencia en puerta y detona la impresión rápida de gafetes.</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
