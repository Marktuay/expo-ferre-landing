import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

const withTimeout = (promise, ms = 10000, errorMsg = 'La operación tardó demasiado. Verifica tu conexión e inténtalo de nuevo.') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
};

export default function AdminUsers({ onBack }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('tech_staff');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, `${getEventBasePath()}/systemUsers`));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const usersData = [];
        querySnapshot.forEach((d) => {
          usersData.push({ id: d.id, ...d.data() });
        });
        setUsers(usersData);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching users: ', err);
        setError('No se pudieron cargar los usuarios.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const cleanEmail = (newUsername || '').trim().toLowerCase();
    const cleanPass = (newPassword || '').trim();

    setError('');
    setSuccessMsg('');

    if (!cleanEmail || !cleanPass) {
      setError('Por favor, ingresa el correo electrónico y la contraseña.');
      return;
    }

    if (cleanPass.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres (requisito de Firebase).');
      return;
    }

    // Validar que no exista ya en systemUsers
    const exists = users.find((u) => (u.username || '').trim().toLowerCase() === cleanEmail);
    if (exists) {
      setError('Este correo de usuario ya está registrado en la lista.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Crear el usuario en Firebase Authentication mediante REST API directa
      // (Evita bloqueos de IndexedDB por instancias secundarias de getAuth en el navegador)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const resp = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: cleanPass,
              returnSecureToken: false
            }),
            signal: controller.signal
          }
        );
        clearTimeout(timeoutId);

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          const errCode = errData?.error?.message || '';
          if (errCode === 'EMAIL_EXISTS') {
            // Si ya existe en Firebase Auth, continuamos y lo registramos en systemUsers
            console.info('El usuario ya existe en Firebase Auth; registrando permisos en Firestore.');
          } else if (errCode.includes('WEAK_PASSWORD')) {
            throw new Error('La contraseña es muy débil (mínimo 6 caracteres).');
          } else if (errCode.includes('INVALID_EMAIL')) {
            throw new Error('El formato del correo electrónico no es válido.');
          } else {
            throw new Error('Error en Firebase Auth: ' + (errCode || resp.statusText));
          }
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') {
          throw new Error('Tiempo de espera agotado al conectar con Firebase Authentication.');
        }
        throw fetchErr;
      }

      // 2. Guardar el registro en Firestore (systemUsers) con límite de tiempo seguro
      await withTimeout(
        addDoc(collection(db, `${getEventBasePath()}/systemUsers`), {
          username: cleanEmail,
          email: cleanEmail,
          password: cleanPass,
          role: newRole,
          createdAt: serverTimestamp()
        }),
        10000,
        'Tiempo de espera agotado al guardar el usuario en la base de datos.'
      );

      setNewUsername('');
      setNewPassword('');
      setNewRole('tech_staff');
      setSuccessMsg(`¡Usuario ${cleanEmail} creado exitosamente!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error adding user: ', err);
      setError(err.message || 'Error al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      setError('');
      try {
        await withTimeout(
          deleteDoc(doc(db, `${getEventBasePath()}/systemUsers`, userId)),
          10000,
          'Tiempo de espera agotado al eliminar el usuario.'
        );
      } catch (err) {
        console.error('Error deleting user: ', err);
        setError('Error al eliminar el usuario: ' + err.message);
      }
    }
  };

  const roleLabels = {
    admin: 'Administrador (Total)',
    tech_staff: 'Staff ExpoFerre (CRM & Escáner)'
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48 font-sans text-on-background">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm mb-6 text-on-surface-variant flex items-center gap-2 font-medium">
          <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Portal de Administración
          </button>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface">Gestión de Usuarios</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-headline-md font-bold text-on-surface flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-4xl">manage_accounts</span>
            Gestión de Usuarios
          </h1>
          <p className="text-body-lg text-secondary">Crea y administra cuentas para el personal del evento.</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-md mb-6 flex items-center gap-2 text-sm font-medium">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-md mb-6 flex items-center gap-2 text-sm font-bold">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Formulario de Creación */}
          <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-md border border-outline-variant h-fit">
            <h2 className="text-xl font-bold text-on-surface mb-4">Nuevo Usuario</h2>

            <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs p-3 rounded-md mb-4">
              <strong>Creación Automática:</strong> Ingresa el correo y una contraseña de al menos 6 caracteres. El sistema creará su acceso automáticamente en Firebase y le asignará el rol seleccionado.
            </div>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ej. puerta1@expoferre.com"
                  className="w-full px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Contraseña (mín. 6 caracteres)</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Privilegios (Rol)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white"
                >
                  <option value="tech_staff">Staff ExpoFerre (CRM & Escáner)</option>
                  <option value="admin">Administrador (Acceso Total)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-primary text-white font-bold rounded-md hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>

          {/* Lista de Usuarios */}
          <div className="lg:col-span-3 bg-surface p-6 rounded-lg shadow-md border border-outline-variant">
            <h2 className="text-xl font-bold text-on-surface mb-4">Usuarios del Sistema</h2>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="py-3 px-4 font-bold text-sm uppercase">CORREO ELECTRÓNICO</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase">Contraseña</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase">Rol</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant bg-surface-variant/20">
                      <td className="py-3 px-4 font-bold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" title="En línea"></span>
                        <span>marktuay@gmail.com (Master)</span>
                      </td>
                      <td className="py-3 px-4 text-secondary">*******</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-[#D2B48C] text-[#8B4513] rounded text-xs font-bold uppercase tracking-wider">
                          Super Admin
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-secondary italic text-xs">Inmodificable</td>
                    </tr>
                    {users.map((user) => {
                      const isOnline =
                        user.lastActive &&
                        typeof user.lastActive.toMillis === 'function' &&
                        Date.now() - user.lastActive.toMillis() < 5 * 60 * 1000;
                      return (
                        <tr
                          key={user.id}
                          className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-on-surface flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                isOnline
                                  ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                  : 'bg-gray-300'
                              }`}
                              title={isOnline ? 'En línea' : 'Desconectado'}
                            ></span>
                            <span>{user.username}</span>
                          </td>
                          <td className="py-3 px-4 text-on-surface-variant font-mono text-sm">{user.password}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                user.role === 'admin'
                                  ? 'bg-blue-500/20 text-blue-700'
                                  : 'bg-green-500/20 text-green-700'
                              }`}
                            >
                              {roleLabels[user.role] || user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center ml-auto cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-secondary">
                          No hay usuarios secundarios creados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
