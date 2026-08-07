import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQu0JsNZtGMIen7eTb4XWW2zxuMGRbX8o",
  authDomain: "expo-ferre-backend.firebaseapp.com",
  projectId: "expo-ferre-backend",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  await addDoc(collection(db, 'mail'), {
    to: 'marktuay@gmail.com',
    message: {
      subject: 'Prueba de Diseño: ¡Bienvenido como Patrocinador Oficial! - ExpoFerre 2026',
      html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <!-- Header Image -->
              <img src="https://expoferrenicaragua.com/email-header.png" alt="ExpoFerre 2026" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
              
              <div style="padding: 30px;">
                <h2 style="color: #0d47a1; margin-top: 0;">¡Hola Marcelo (Test)!</h2>
                <p>Es un gusto saludarte. Confirmamos tu acceso como <strong>Patrocinador Oficial para Expo Ferre 2026</strong>.</p>
                
                <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #0d47a1;">
                  <p style="margin-top: 0; font-weight: bold; color: #0d47a1; font-size: 16px;">Tus Credenciales de Acceso:</p>
                  <p style="margin: 10px 0;"><strong>Correo Electrónico:</strong> marktuay@gmail.com</p>
                  <p style="margin: 10px 0;"><strong>Contraseña Provisional:</strong> Expo2026-Test</p>
                </div>

                <p>Te recomendamos cambiar tu contraseña por motivos de seguridad una vez que inicies sesión en la plataforma usando la opción de "¿Olvidaste tu contraseña?".</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://expoferrenicaragua.com/login" style="background-color: #f39200; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a la Plataforma</a>
                </div>
              </div>
              
              <!-- Footer Image -->
              <img src="https://expoferrenicaragua.com/email-footer.png" alt="Contacto ExpoFerre" style="display: block; width: 100%; max-width: 600px; height: auto;"/>
            </div>
      `
    }
  });
  console.log("Sponsor test email queued");
  process.exit(0);
}
run();
