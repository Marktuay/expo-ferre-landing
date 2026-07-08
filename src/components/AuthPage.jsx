import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';

export default function AuthPage({ onBack }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Extra register fields
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [empleados, setEmpleados] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isForgotPassword) {
      if (!email) {
        setError('Ingresa tu correo para recuperar la contraseña.');
        setLoading(false);
        return;
      }
      try {
        await sendPasswordResetEmail(auth, email);
        alert('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
        setIsForgotPassword(false);
        setIsLogin(true);
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al intentar enviar el correo de recuperación.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (isLogin) {
        // Login flow
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Register flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional user info to Firestore
        await setDoc(doc(db, "users", user.uid), {
          nombre,
          apellido,
          correo: email,
          telefono,
          empresa,
          empleados,
          createdAt: serverTimestamp(),
          role: 'sponsor',
          status: 'pending'
        });

        // Notificar al administrador
        await addDoc(collection(db, 'mail'), {
          to: ['karen.torres@rinsa.red', 'AdmonEventKT@gmail.com'],
          message: {
            subject: `Nuevo Patrocinador Registrado: ${empresa} - ExpoFerre`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Header Image -->
                <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
                
                <div style="padding: 30px;">
                  <h2 style="color: #0d47a1; margin-top: 0;">Nuevo Registro de Patrocinador</h2>
                  <p>Un nuevo patrocinador se ha registrado en el portal y está esperando aprobación.</p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                    <ul style="list-style: none; padding: 0; margin: 0;">
                      <li style="margin-bottom: 10px;"><strong>Empresa:</strong> ${empresa}</li>
                      <li style="margin-bottom: 10px;"><strong>Contacto:</strong> ${nombre} ${apellido}</li>
                      <li style="margin-bottom: 10px;"><strong>Email:</strong> ${email}</li>
                      <li style="margin-bottom: 10px;"><strong>Teléfono:</strong> ${telefono}</li>
                      <li><strong>Empleados:</strong> ${empleados}</li>
                    </ul>
                  </div>
                  
                  <p>Por favor, ingresa al panel de administración para revisar y aprobar este registro.</p>
                </div>
                
                <!-- Footer Image -->
                <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              </div>
            `
          }
        });
      }
      // On success, App.jsx's onAuthStateChanged will detect the user and re-render.
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('El correo ya está registrado.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(`Error de Firebase: ${err.message} (${err.code})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 pt-32 pb-16">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <button onClick={onBack} className="text-gray-500 hover:text-[#283474] flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            Volver al inicio
          </button>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-[#283474]">
          {isForgotPassword ? 'Recuperar Contraseña' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isForgotPassword ? 'Ingresa tu correo para recibir un enlace de recuperación' : 'Accede al portal exclusivo para patrocinadores'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre</label>
                    <div className="mt-1">
                      <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Apellido</label>
                    <div className="mt-1">
                      <input type="text" required value={apellido} onChange={e => setApellido(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa</label>
                    <div className="mt-1">
                      <input type="text" required value={empresa} onChange={e => setEmpresa(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cantidad de Empleados</label>
                    <div className="mt-1">
                      <select required value={empleados} onChange={e => setEmpleados(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm bg-white">
                        <option value="">Selecciona una opción</option>
                        <option value="1-10">1 - 10 empleados</option>
                        <option value="11-50">11 - 50 empleados</option>
                        <option value="51-200">51 - 200 empleados</option>
                        <option value="201+">Más de 200 empleados</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teléfono (con código de país)</label>
                  <div className="mt-1">
                    <input type="tel" required value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+505 0000 0000" className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm" />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <div className="mt-1 relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#f39200] focus:border-[#f39200] sm:text-sm pr-10" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isForgotPassword && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <button type="button" onClick={() => setIsForgotPassword(true)} className="font-medium text-[#f39200] hover:text-[#d88200]">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#f39200] hover:bg-[#d88200] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f39200] transition-colors disabled:opacity-70"
              >
                {loading ? 'Procesando...' : (isForgotPassword ? 'Enviar enlace' : (isLogin ? 'Ingresar' : 'Registrarse'))}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isForgotPassword ? '¿Opciones alternativas?' : (isLogin ? '¿No tienes cuenta?' : '¿Ya tienes una cuenta?')}
                </span>
              </div>
            </div>

            <div className="mt-6">
              {isForgotPassword ? (
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsLogin(true);
                    setError(null);
                  }}
                  className="w-full flex justify-center py-2 px-4 border-2 border-[#283474] rounded-md shadow-sm text-sm font-bold text-[#283474] bg-white hover:bg-[#283474] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#283474] transition-colors"
                >
                  Volver a Iniciar Sesión
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                  }}
                  className="w-full flex justify-center py-2 px-4 border-2 border-[#283474] rounded-md shadow-sm text-sm font-bold text-[#283474] bg-white hover:bg-[#283474] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#283474] transition-colors"
                >
                  {isLogin ? 'Crear una cuenta nueva' : 'Iniciar Sesión'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
