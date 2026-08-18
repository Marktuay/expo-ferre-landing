import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getEventBasePath } from './eventConfig';

export const DEFAULT_OFFICIAL_STANDS = [
  {
    id: 'stand-1',
    status: 'reserved',
    logo: '/diamante/romax.jpeg',
    sponsorId: 'official-romax',
    sponsorEmail: 'contacto@romax.com.ni',
    reservationDetails: {
      empresa: 'Romax',
      nombre: 'Atención',
      apellido: 'Romax',
      correo: 'contacto@romax.com.ni',
      telefono: '+505 2200 0001',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-2',
    status: 'reserved',
    logo: '/diamante/maximiza.jpeg',
    sponsorId: 'official-maximiza',
    sponsorEmail: 'contacto@maximiza.com.ni',
    reservationDetails: {
      empresa: 'Maximiza',
      nombre: 'Atención',
      apellido: 'Maximiza',
      correo: 'contacto@maximiza.com.ni',
      telefono: '+505 2200 0002',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-3',
    status: 'reserved',
    logo: '/diamante/indeninicsa.png',
    sponsorId: 'official-indenicza',
    sponsorEmail: 'contacto@indenicza.com.ni',
    reservationDetails: {
      empresa: 'Indenicza',
      nombre: 'Atención',
      apellido: 'Indenicza',
      correo: 'contacto@indenicza.com.ni',
      telefono: '+505 2200 0003',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-4',
    status: 'reserved',
    logo: '/diamante/LOGO-ARCELOR.png',
    sponsorId: 'official-arcelor',
    sponsorEmail: 'contacto@arcelor.com.ni',
    reservationDetails: {
      empresa: 'Arcelor',
      nombre: 'Atención',
      apellido: 'Arcelor',
      correo: 'contacto@arcelor.com.ni',
      telefono: '+505 2200 0004',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-5',
    status: 'reserved',
    logo: '/diamante/pensilvania.jpg',
    sponsorId: 'official-pensilvania',
    sponsorEmail: 'contacto@pensilvania.com.ni',
    reservationDetails: {
      empresa: 'Pensilvania',
      nombre: 'Atención',
      apellido: 'Pensilvania',
      correo: 'contacto@pensilvania.com.ni',
      telefono: '+505 2200 0005',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-6',
    status: 'reserved',
    logo: '/diamante/comasa.png',
    sponsorId: 'official-comasa',
    sponsorEmail: 'ventas@comasa.com.ni',
    reservationDetails: {
      empresa: 'Comasa',
      nombre: 'Ventas',
      apellido: 'Comasa',
      correo: 'ventas@comasa.com.ni',
      telefono: '+505 2255 1111',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-7',
    status: 'reserved',
    logo: '/plata/casco.png',
    sponsorId: 'official-casco',
    sponsorEmail: 'ventas@casco.com.ni',
    reservationDetails: {
      empresa: 'Casco',
      nombre: 'Representante',
      apellido: 'Casco',
      correo: 'ventas@casco.com.ni',
      telefono: '+505 2252 3344',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-8',
    status: 'reserved',
    logo: '/plata/ferdandezsera.png',
    sponsorId: 'official-fernández-sera',
    sponsorEmail: 'info@fernandezsera.com.ni',
    reservationDetails: {
      empresa: 'Fernández Sera',
      nombre: 'Administración',
      apellido: 'Fernández Sera',
      correo: 'info@fernandezsera.com.ni',
      telefono: '+505 2268 5566',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-9',
    status: 'reserved',
    logo: '/plata/midesa.png',
    sponsorId: 'official-midesa',
    sponsorEmail: 'ventas@midesa.com.ni',
    reservationDetails: {
      empresa: 'Midesa',
      nombre: 'Ventas',
      apellido: 'Midesa',
      correo: 'ventas@midesa.com.ni',
      telefono: '+505 2240 7788',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-11',
    status: 'reserved',
    logo: '/diamante/sinsa.png',
    sponsorId: 'official-sinsa',
    sponsorEmail: 'contacto@sinsa.com.ni',
    reservationDetails: {
      empresa: 'Sinsa',
      nombre: 'Atención',
      apellido: 'Sinsa',
      correo: 'contacto@sinsa.com.ni',
      telefono: '+505 2270 0000',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-16',
    status: 'reserved',
    logo: '/diamante/extelpng.png',
    sponsorId: 'official-extel',
    sponsorEmail: 'info@extel.com.ni',
    reservationDetails: {
      empresa: 'Extel',
      nombre: 'Servicio',
      apellido: 'Extel',
      correo: 'info@extel.com.ni',
      telefono: '+505 2266 2222',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-21',
    status: 'reserved',
    logo: '/diamante/sur.png',
    sponsorId: 'official-sur',
    sponsorEmail: 'ventas@gruposur.com.ni',
    reservationDetails: {
      empresa: 'Grupo SUR',
      nombre: 'Mario',
      apellido: 'Jarquín',
      correo: 'ventas@gruposur.com.ni',
      telefono: '+505 8777 7777',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-26',
    status: 'reserved',
    logo: '/oro/plycem%20.png',
    sponsorId: 'official-plycem',
    sponsorEmail: 'ventas@plycem.com.ni',
    reservationDetails: {
      empresa: 'Plycem',
      nombre: 'Ventas',
      apellido: 'Plycem',
      correo: 'ventas@plycem.com.ni',
      telefono: '+505 2265 8888',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-27',
    status: 'reserved',
    logo: '/oro/sicsa.png',
    sponsorId: 'official-sicsa',
    sponsorEmail: 'info@sicsa.com.ni',
    reservationDetails: {
      empresa: 'Sicsa',
      nombre: 'Soluciones',
      apellido: 'Sicsa',
      correo: 'info@sicsa.com.ni',
      telefono: '+505 2278 9999',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-28',
    status: 'reserved',
    logo: '/oro/jp-studio-white.png',
    sponsorId: 'official-jp-technology',
    sponsorEmail: 'contacto@jptech.com.ni',
    reservationDetails: {
      empresa: 'JP Technology',
      nombre: 'Soporte',
      apellido: 'JP Tech',
      correo: 'contacto@jptech.com.ni',
      telefono: '+505 2244 1122',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-31',
    status: 'reserved',
    logo: '/diamante/logo-bac.jpeg',
    sponsorId: 'official-bac-credomatic',
    sponsorEmail: 'contacto@baccredomatic.com',
    reservationDetails: {
      empresa: 'BAC Credomatic',
      nombre: 'BAC',
      apellido: 'Empresas',
      correo: 'contacto@baccredomatic.com',
      telefono: '+505 2274 4444',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-34',
    status: 'reserved',
    logo: '/diamante/balladares.png',
    sponsorId: 'official-importaciones-balladares',
    sponsorEmail: 'info@balladares.com.ni',
    reservationDetails: {
      empresa: 'Importaciones Balladares',
      nombre: 'Gerardo',
      apellido: 'Balladares',
      correo: 'info@balladares.com.ni',
      telefono: '+505 2249 3333',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-35',
    status: 'reserved',
    logo: '/diamante/megalines1.png',
    sponsorId: 'official-megalines',
    sponsorEmail: 'contacto@megalineas.com.ni',
    reservationDetails: {
      empresa: 'Megalíneas',
      nombre: 'Megalíneas',
      apellido: 'Nicaragua',
      correo: 'contacto@megalineas.com.ni',
      telefono: '+505 2250 5555',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-38',
    status: 'reserved',
    logo: '/diamante/noelito%20.png',
    sponsorId: 'official-noelito',
    sponsorEmail: 'info@noelito.com.ni',
    reservationDetails: {
      empresa: 'Ferretería Noelito',
      nombre: 'Linda',
      apellido: 'Gutiérrez',
      correo: 'info@noelito.com.ni',
      telefono: '+505 8888 8888',
      categoria: 'Diamante'
    }
  }
];

export const seedOfficialStands = async (db) => {
  for (const stand of DEFAULT_OFFICIAL_STANDS) {
    // 1. Guardar en la colección activa de stands
    const refActive = doc(db, `${getEventBasePath()}/stands`, stand.id);
    await setDoc(refActive, stand, { merge: true });

    // 2. Guardar en la colección de respaldo de Firestore
    const refBackup = doc(db, `${getEventBasePath()}/stands_backup`, stand.id);
    await setDoc(refBackup, stand, { merge: true });
  }
};

// Crear copia de respaldo snapshot actual de Firestore
export const createFirestoreBackup = async (db) => {
  const standsSnap = await getDocs(collection(db, `${getEventBasePath()}/stands`));
  
  if (!standsSnap.empty) {
    for (const d of standsSnap.docs) {
      const backupRef = doc(db, `${getEventBasePath()}/stands_backup`, d.id);
      await setDoc(backupRef, d.data(), { merge: true });
    }
  } else {
    // Si la activa está vacía, respaldar plantilla oficial
    await seedOfficialStands(db);
  }
};

// Restaurar stands activas desde la colección de respaldo en Firestore
export const restoreFromFirestoreBackup = async (db) => {
  const backupSnap = await getDocs(collection(db, `${getEventBasePath()}/stands_backup`));
  
  if (!backupSnap.empty) {
    for (const d of backupSnap.docs) {
      const activeRef = doc(db, `${getEventBasePath()}/stands`, d.id);
      await setDoc(activeRef, d.data(), { merge: true });
    }
  } else {
    // Si la de respaldo está vacía, re-inicializar
    await seedOfficialStands(db);
  }
};
