import React, { useEffect } from 'react';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="pt-36 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-lg shadow-sm border border-outline-variant">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-6 border-b-4 border-secondary pb-4">Términos de Servicio</h1>
        
        <div className="space-y-6 font-body-md text-on-surface-variant leading-relaxed">
          <p><strong>Última actualización:</strong> 8 de junio de 2026</p>
          
          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder a este sitio web y registrarse o adquirir espacios para <strong>Expo Ferre 2026</strong>, usted acepta estar sujeto a estos Términos de Servicio. 
              Estas condiciones están reguladas bajo las leyes de la República de Nicaragua, en especial la <strong>Ley General de Protección de los Derechos de las Personas Consumidoras y Usuarias (Ley No. 842)</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">2. Asistencia y Admisión al Evento</h2>
            <p>
              Expo Ferre se reserva el derecho de admisión. La entrada al evento requiere un registro previo válido. El gafete o acreditación es personal e intransferible. 
              El comité organizador puede revocar el acceso a cualquier asistente que incumpla las normas de conducta, altere el orden público o ponga en riesgo la seguridad del evento.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">3. Espacios Comerciales y Patrocinios</h2>
            <p>
              La adquisición de stands y paquetes de patrocinio está sujeta a disponibilidad y a la firma del contrato respectivo. 
              Toda reserva a través de esta plataforma digital es de carácter preliminar y deberá ser formalizada con el comité comercial de Expo Ferre en los plazos estipulados.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">4. Política de Cancelación y Reembolsos</h2>
            <p>
              En caso de que un expositor o patrocinador decida cancelar su participación, aplicarán las siguientes condiciones:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Cancelaciones con más de 90 días de anticipación: Reembolso del 50% del monto pagado.</li>
              <li>Cancelaciones con menos de 90 días de anticipación: No habrá reembolso.</li>
              <li>Expo Ferre no se hace responsable por cancelaciones derivadas de causas de fuerza mayor o casos fortuitos fuera de nuestro control.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">5. Propiedad Intelectual</h2>
            <p>
              Todos los contenidos de este sitio web, incluyendo logotipos, textos, gráficos, imágenes y código, son propiedad exclusiva de Expo Ferre y están protegidos 
              por las leyes de propiedad intelectual e industrial de Nicaragua. Queda prohibida su reproducción sin autorización previa y por escrito.
            </p>
          </section>

          <section>
            <h2 className="font-headline-md text-headline-md text-secondary mb-3">6. Legislación y Jurisdicción Aplicable</h2>
            <p>
              Para la interpretación, cumplimiento y ejecución de los presentes términos, las partes se someten a las leyes aplicables en la República de Nicaragua 
              y a la jurisdicción de los tribunales competentes de la ciudad de Managua, renunciando a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.
            </p>
          </section>

          <div className="mt-12 p-6 bg-surface-container-highest rounded-md border-l-4 border-primary">
            <h3 className="font-bold text-on-surface mb-2">Resolución de Dudas</h3>
            <p className="text-sm">Para cualquier asunto comercial o legal relacionado con estos términos, comuníquese con la organización a través del formulario de contacto oficial.</p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TermsOfService;
