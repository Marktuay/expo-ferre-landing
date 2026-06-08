import React, { useEffect } from 'react';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="pt-36 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg shadow-sm border border-outline-variant">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-6 border-b-4 border-secondary pb-4">Políticas de Privacidad</h1>
        
        <div className="space-y-6 font-body-md text-on-surface-variant leading-relaxed">
          <p><strong>Última actualización:</strong> 8 de junio de 2026</p>
          
          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">1. Identidad del Responsable</h2>
            <p>
              Expo Ferre (en adelante "El Evento"), con sede en Managua, Nicaragua, es el responsable del tratamiento de los datos personales 
              recabados a través de nuestro sitio web y durante el proceso de registro, en estricto cumplimiento de la <strong>Ley de Protección de Datos Personales (Ley No. 878)</strong> de la República de Nicaragua.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">2. Datos Recabados y Finalidad</h2>
            <p>
              Recopilamos información personal (como nombre, correo electrónico, empresa y número de teléfono) exclusivamente con las siguientes finalidades:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Gestionar la acreditación y el acceso a Expo Ferre 2026.</li>
              <li>Procesar solicitudes de stands, patrocinios y oportunidades comerciales.</li>
              <li>Enviar comunicaciones relevantes sobre el evento, cambios de horario o actualizaciones importantes.</li>
              <li>Fines estadísticos e históricos internos.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">3. Protección y Seguridad</h2>
            <p>
              Hemos adoptado las medidas de seguridad técnicas, organizativas y administrativas necesarias para garantizar la integridad, 
              confidencialidad y disponibilidad de sus datos personales, evitando su alteración, pérdida, tratamiento o acceso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">4. Transferencia de Datos a Terceros</h2>
            <p>
              Expo Ferre no venderá, alquilará ni compartirá sus datos personales con terceros no afiliados sin su consentimiento expreso, 
              salvo cuando sea requerido por autoridades competentes en Nicaragua mediante una orden judicial. Algunos datos básicos podrán ser compartidos 
              con patrocinadores oficiales únicamente si usted otorga su consentimiento previo durante el registro.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">5. Derechos ARCO</h2>
            <p>
              Usted tiene el derecho de Acceso, Rectificación, Cancelación y Oposición respecto a sus datos personales. 
              Para ejercer cualquiera de estos derechos, por favor envíe una solicitud formal a nuestro equipo de soporte indicando claramente su requerimiento.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">6. Cambios a la Política de Privacidad</h2>
            <p>
              Expo Ferre se reserva el derecho de modificar esta política en cualquier momento. Toda modificación será notificada a través 
              de este sitio web con la fecha de la última actualización.
            </p>
          </section>

          <div className="mt-12 p-6 bg-surface-container-highest rounded-md border-l-4 border-primary">
            <h3 className="font-bold text-on-surface mb-2">Contacto de Privacidad</h3>
            <p className="text-sm">Si tiene alguna duda sobre nuestras políticas o el tratamiento de sus datos, contáctenos a través de los canales oficiales del evento.</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
