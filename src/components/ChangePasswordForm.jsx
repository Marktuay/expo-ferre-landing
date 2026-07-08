import React, { useState } from 'react';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const ChangePasswordForm = ({ onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No hay usuario autenticado.');

      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('La contraseña actual es incorrecta.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background relative overflow-x-hidden pt-40 md:pt-48 pb-20">
      <div className="relative z-10 container mx-auto px-margin-mobile md:px-margin-desktop max-w-2xl">
        <button onClick={onBack} className="text-primary hover:text-secondary flex items-center gap-2 mb-8 font-bold transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          Volver al Panel
        </button>

        <div className="bg-surface border border-outline-variant p-8 rounded-5px shadow-sm">
          <h2 className="text-3xl font-bold text-secondary mb-6 border-b border-outline-variant pb-4">Cambiar Contraseña</h2>
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
              <p className="text-sm text-green-700">¡Contraseña actualizada exitosamente!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Contraseña Actual</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-variant/50 border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all text-on-surface"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Nueva Contraseña</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-variant/50 border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all text-on-surface"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-on-surface mb-2">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-variant/50 border border-outline-variant rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all text-on-surface"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-bold py-3 px-8 rounded-5px hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 mt-4"
            >
              {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordForm;
