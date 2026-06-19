import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function SponsorActivity({ onBack }) {
  const [guests, setGuests] = useState([]);
  const [staff, setStaff] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    window.scrollTo(0, 0);
    const user = auth.currentUser;
    if (!user) return;

    // We can use sponsorId or sponsorEmail
    const sponsorId = user.uid;

    // Guests
    const qGuests = query(collection(db, 'guests'), where('sponsorId', '==', sponsorId));
    const unsubGuests = onSnapshot(qGuests, (snapshot) => {
      setGuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Staff
    const qStaff = query(collection(db, 'staff'), where('sponsorId', '==', sponsorId));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Speakers
    const qSpeakers = query(collection(db, 'speakers'), where('sponsorId', '==', sponsorId));
    const unsubSpeakers = onSnapshot(qSpeakers, (snapshot) => {
      setSpeakers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Stands
    const qStands = query(collection(db, 'stands'), where('sponsorId', '==', sponsorId));
    const unsubStands = onSnapshot(qStands, (snapshot) => {
      setStands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Set loading false after a small delay
    const timer = setTimeout(() => setLoading(false), 800);

    return () => {
      unsubGuests();
      unsubStaff();
      unsubSpeakers();
      unsubStands();
      clearTimeout(timer);
    };
  }, []);

  if (loading) {
    return (
      <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-secondary font-bold">Cargando tu actividad...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-40 md:pt-48 pb-20 md:pb-32 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-primary hover:text-primary-container font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span> Volver
        </button>
        
        <div className="mb-10">
          <div className="bg-primary text-on-primary inline-block px-4 py-1 font-label-sm text-label-sm uppercase tracking-widest clip-industrial mb-4">RESUMEN CONSOLIDADO</div>
          <h1 className="font-headline-lg text-headline-lg text-secondary flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl">dashboard</span> Mi Actividad
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mt-4">
            Aquí puedes ver un resumen de todos los registros que has realizado como patrocinador oficial de Expo Ferre 2026.
          </p>
        </div>

        <div className="space-y-12">
          {/* STANDS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">map</span>
              <h2 className="font-headline-sm font-bold text-secondary">Mis Stands ({stands.length})</h2>
            </div>
            <div className="p-6">
              {stands.length === 0 ? (
                <p className="text-on-surface-variant italic">No tienes stands reservados.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stands.map(stand => (
                    <div key={stand.id} className="border border-outline-variant rounded-md p-4 flex flex-col gap-2 relative">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg">{stand.name}</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold uppercase">{stand.status}</span>
                      </div>
                      <p className="text-sm text-secondary"><strong>Tamaño:</strong> {stand.size}</p>
                      <p className="text-sm text-secondary"><strong>Precio:</strong> {stand.price}</p>
                      {stand.reservationDetails && (
                        <p className="text-sm text-secondary truncate" title={stand.reservationDetails.empresa}>
                          <strong>Empresa:</strong> {stand.reservationDetails.empresa}
                        </p>
                      )}
                      {stand.logo && (
                        <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border-2 border-primary absolute bottom-4 right-4 bg-white">
                          <img src={stand.logo} alt="Logo stand" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* INVITADOS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">groups</span>
              <h2 className="font-headline-sm font-bold text-secondary">Mis Invitados ({guests.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {guests.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tienes invitados registrados.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Empresa</th>
                      <th className="p-3 font-bold">Cargo</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map(guest => (
                      <tr key={guest.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{guest.nombre} {guest.apellido}</td>
                        <td className="p-3">{guest.empresa}</td>
                        <td className="p-3">{guest.cargo}</td>
                        <td className="p-3">{guest.email}</td>
                        <td className="p-3">{guest.celular || guest.telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* STAFF */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">badge</span>
              <h2 className="font-headline-sm font-bold text-secondary">Mi Staff ({staff.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {staff.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tienes staff registrado.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Nombre</th>
                      <th className="p-3 font-bold">Cargo</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map(s => (
                      <tr key={s.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{s.nombre} {s.apellido}</td>
                        <td className="p-3">{s.cargo || s.tipoCargo}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* CONFERENCIAS */}
          <section className="bg-surface rounded-lg shadow-sm border border-outline-variant overflow-hidden">
            <div className="bg-surface-variant px-6 py-4 border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">mic</span>
              <h2 className="font-headline-sm font-bold text-secondary">Mis Conferencias ({speakers.length})</h2>
            </div>
            <div className="overflow-x-auto p-4">
              {speakers.length === 0 ? (
                <p className="text-on-surface-variant italic px-2">No tienes conferencias registradas.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant text-secondary">
                      <th className="p-3 font-bold">Speaker</th>
                      <th className="p-3 font-bold">Título</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Formatos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {speakers.map(s => (
                      <tr key={s.id} className="border-b border-outline-variant hover:bg-surface-variant/30">
                        <td className="p-3">{s.nombre} {s.apellido}</td>
                        <td className="p-3 font-bold">{s.titulo}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.formatos?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
