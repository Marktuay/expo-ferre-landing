import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getEventBasePath } from '../config/eventConfig';

export default function AdminUsers({ onBack }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('tech_staff');
  
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, `${getEventBasePath()}/systemUsers`));
      const querySnapshot = await getDocs(q);
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users: ", err);
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      setError('Por favor, ingresa usuario y contraseña.');
      return;
    }
    
    // Validar que no exista
    const exists = users.find(u => u.username === newUsername.toLowerCase());
    if (exists) {
      setError('El nombre de usuario ya existe.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, `${getEventBasePath()}/systemUsers`), {
        username: newUsername.toLowerCase(),
        password: newPassword,
        role: newRole,
        createdAt: serverTimestamp()
      });
      
      setNewUsername('');
      setNewPassword('');
      setNewRole('tech_staff');
      fetchUsers();
    } catch (err) {
      console.error("Error adding user: ", err);
      setError('Error al crear el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, `${getEventBasePath()}/systemUsers`, userId));
        fetchUsers();
      } catch (err) {
        console.error("Error deleting user: ", err);
        setError('Error al eliminar el usuario.');
      }
    }
  };

  const roleLabels = {
    'admin': 'Administrador (Total)',
    'tech_staff': 'Staff Técnico (Escáner)'
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-4 md:p-8 pt-40 md:pt-48 font-sans text-on-background">
      <div className="max-w-4xl mx-auto">
        <nav className="text-sm mb-6 text-on-surface-variant flex items-center gap-2 font-medium">
          <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-1">
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
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-md mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Formulario de Creación */}
          <div className="md:col-span-1 bg-surface p-6 rounded-lg shadow-md border border-outline-variant h-fit">
            <h2 className="text-xl font-bold text-on-surface mb-4">Nuevo Usuario</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Nombre de Usuario</label>
                <input 
                  type="text" 
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="ej. puerta1"
                  className="w-full px-4 py-2 border border-outline-variant rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-on-surface mb-1">Contraseña</label>
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
                  <option value="tech_staff">Staff Técnico (Solo Escáner)</option>
                  <option value="admin">Administrador (Acceso Total)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-2 bg-primary text-white font-bold rounded-md hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Creando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>

          {/* Lista de Usuarios */}
          <div className="md:col-span-2 bg-surface p-6 rounded-lg shadow-md border border-outline-variant">
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
                      <th className="py-3 px-4 font-bold text-sm uppercase">Usuario</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase">Contraseña</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase">Rol</th>
                      <th className="py-3 px-4 font-bold text-sm uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors bg-primary/5">
                      <td className="py-3 px-4 font-bold text-on-surface">admin (Master)</td>
                      <td className="py-3 px-4 text-on-surface-variant font-mono text-sm">*******</td>
                      <td className="py-3 px-4">
                        <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold uppercase">
                          Super Admin
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs text-secondary italic">Inmodificable</span>
                      </td>
                    </tr>
                    {users.map(user => (
                      <tr key={user.id} className="border-b border-outline-variant/50 hover:bg-surface-variant/20 transition-colors">
                        <td className="py-3 px-4 font-medium text-on-surface">{user.username}</td>
                        <td className="py-3 px-4 text-on-surface-variant font-mono text-sm">{user.password}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            user.role === 'admin' 
                              ? 'bg-blue-500/20 text-blue-700' 
                              : 'bg-green-500/20 text-green-700'
                          }`}>
                            {roleLabels[user.role] || user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center ml-auto"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
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
