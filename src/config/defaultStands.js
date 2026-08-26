import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getEventBasePath } from './eventConfig';

export const DEFAULT_OFFICIAL_STANDS = [
  {
    id: 'stand-1',
    status: 'reserved',
    logo: '/diamante/sinsa.png',
    sponsorId: 'official-sinsa',
    sponsorEmail: 'contacto@sinsa.com.ni',
    reservationDetails: {
      empresa: 'Sinsa',
      nombre: 'William',
      apellido: 'Herrera',
      correo: 'contacto@sinsa.com.ni',
      telefono: '505 84651227',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-2',
    status: 'reserved',
    logo: '/diamante/sinsa.png',
    sponsorId: 'official-sinsa',
    sponsorEmail: 'contacto@sinsa.com.ni',
    reservationDetails: {
      empresa: 'Sinsa',
      nombre: 'William',
      apellido: 'Herrera',
      correo: 'contacto@sinsa.com.ni',
      telefono: '505 84651227',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-3',
    status: 'reserved',
    logo: '/diamante/sinsa.png',
    sponsorId: 'official-sinsa',
    sponsorEmail: 'contacto@sinsa.com.ni',
    reservationDetails: {
      empresa: 'Sinsa',
      nombre: 'William',
      apellido: 'Herrera',
      correo: 'contacto@sinsa.com.ni',
      telefono: '505 84651227',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-4',
    status: 'reserved',
    logo: '/diamante/sinsa.png',
    sponsorId: 'official-sinsa',
    sponsorEmail: 'contacto@sinsa.com.ni',
    reservationDetails: {
      empresa: 'Sinsa',
      nombre: 'William',
      apellido: 'Herrera',
      correo: 'contacto@sinsa.com.ni',
      telefono: '505 84651227',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-5',
    status: 'reserved',
    logo: '/oro/armoconsa.png',
    sponsorId: 'official-armoconsa',
    sponsorEmail: 'gerencia@nunezduarteamc.com',
    reservationDetails: {
      empresa: 'ARMOCONSA',
      nombre: 'Maxwell',
      apellido: 'Nuñez',
      correo: 'gerencia@nunezduarteamc.com',
      telefono: '+505 84398439',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-6',
    status: 'reserved',
    logo: '/diamante/balladares.png',
    sponsorId: 'official-importaciones-balladares',
    sponsorEmail: 'mercadeoib@importacionesballadares.com',
    reservationDetails: {
      empresa: 'Importaciones Balladares',
      nombre: 'José',
      apellido: 'Hernández',
      correo: 'mercadeoib@importacionesballadares.com',
      telefono: '+505 76695734',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-11',
    status: 'reserved',
    logo: '/diamante/extelpng.png',
    sponsorId: 'official-extel',
    sponsorEmail: 'aracely.torres@extel.com.ni',
    reservationDetails: {
      empresa: 'Extel',
      nombre: 'Aracely',
      apellido: 'Torres',
      correo: 'aracely.torres@extel.com.ni',
      telefono: '+505 7550 0538',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-12',
    status: 'reserved',
    logo: '/plata/logo-sherwin-williams.jpg',
    sponsorId: 'official-sherwin-williams',
    sponsorEmail: 'kahernandez@swdeca.com',
    reservationDetails: {
      empresa: 'Sherwin-Williams',
      nombre: 'Karla',
      apellido: 'Hernández',
      correo: 'kahernandez@swdeca.com',
      telefono: '+505 58437575',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-13',
    status: 'reserved',
    logo: '/plata/ferdandezsera.png',
    sponsorId: 'official-fernández-sera',
    sponsorEmail: 'cmercadeo@fernandezsera.com',
    reservationDetails: {
      empresa: 'Fernández Sera',
      nombre: 'César',
      apellido: 'Rivera',
      correo: 'cmercadeo@fernandezsera.com',
      telefono: '+505 88352323',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-15',
    status: 'reserved',
    logo: '/oro/sicsa.png',
    sponsorId: 'official-sicsa',
    sponsorEmail: 'sblanco@sicsa.com.ni',
    reservationDetails: {
      empresa: 'Sicsa Nicaragua',
      nombre: 'Soluciones',
      apellido: 'Sicsa',
      correo: 'sblanco@sicsa.com.ni',
      telefono: '+505 85297007',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-16',
    status: 'reserved',
    logo: '/diamante/balladares.png',
    sponsorId: 'official-importaciones-balladares',
    sponsorEmail: 'mercadeoib@importacionesballadares.com',
    reservationDetails: {
      empresa: 'Importaciones Balladares',
      nombre: 'José',
      apellido: 'Hernández',
      correo: 'mercadeoib@importacionesballadares.com',
      telefono: '+505 76695734',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-19',
    status: 'reserved',
    logo: '/diamante/megalines1.png',
    sponsorId: 'official-megalineas',
    sponsorEmail: 'victoriaurbina@megalineas.com',
    reservationDetails: {
      empresa: 'Megalineas',
      nombre: 'Victoria',
      apellido: 'Urbina',
      correo: 'victoriaurbina@megalineas.com',
      telefono: '+505 22233610',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-20',
    status: 'reserved',
    logo: '/diamante/megalines1.png',
    sponsorId: 'official-megalineas',
    sponsorEmail: 'victoriaurbina@megalineas.com',
    reservationDetails: {
      empresa: 'Megalineas',
      nombre: 'Victoria',
      apellido: 'Urbina',
      correo: 'victoriaurbina@megalineas.com',
      telefono: '+505 22233610',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-21',
    status: 'reserved',
    logo: '/diamante/sur.png',
    sponsorId: 'official-sur',
    sponsorEmail: 'aaguilarp@gruposur.com',
    reservationDetails: {
      empresa: 'Grupo SUR',
      nombre: 'Mario',
      apellido: 'Jarquín',
      correo: 'aaguilarp@gruposur.com',
      telefono: '+505 87002924',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-22',
    status: 'reserved',
    logo: '/diamante/cemex.png',
    sponsorId: 'official-cemex',
    sponsorEmail: 'ventas@cemex.com.ni',
    reservationDetails: {
      empresa: 'CEMEX',
      nombre: 'Atención',
      apellido: 'CEMEX',
      correo: 'ventas@cemex.com.ni',
      telefono: '+505 22000000',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-23',
    status: 'reserved',
    logo: '/diamante/cemex.png',
    sponsorId: 'official-cemex',
    sponsorEmail: 'ventas@cemex.com.ni',
    reservationDetails: {
      empresa: 'CEMEX',
      nombre: 'Atención',
      apellido: 'CEMEX',
      correo: 'ventas@cemex.com.ni',
      telefono: '+505 22000000',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-26',
    status: 'reserved',
    logo: '/diamante/lafise.jpg',
    sponsorId: 'official-banco-lafise',
    sponsorEmail: 'contacto@lafise.com',
    reservationDetails: {
      empresa: 'LAFISE',
      nombre: 'Atención',
      apellido: 'LAFISE',
      correo: 'contacto@lafise.com',
      telefono: '+505 22558888',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-27',
    status: 'reserved',
    logo: '/diamante/indeninicsa.png',
    sponsorId: 'official-indenicsa',
    sponsorEmail: 'contacto@indenicsa.com',
    reservationDetails: {
      empresa: 'Indenicsa',
      nombre: 'Atención',
      apellido: 'Indenicsa',
      correo: 'contacto@indenicsa.com',
      telefono: '+505 22000003',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-28',
    status: 'reserved',
    logo: '/diamante/indeninicsa.png',
    sponsorId: 'official-indenicsa',
    sponsorEmail: 'contacto@indenicsa.com',
    reservationDetails: {
      empresa: 'Indenicsa',
      nombre: 'Atención',
      apellido: 'Indenicsa',
      correo: 'contacto@indenicsa.com',
      telefono: '+505 22000003',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-30',
    status: 'reserved',
    logo: '/oro/plycem%20.png',
    sponsorId: 'official-plycem',
    sponsorEmail: 'gvalleb@externo-elementia.com',
    reservationDetails: {
      empresa: 'Plycem',
      nombre: 'Grethel',
      apellido: 'Valle',
      correo: 'gvalleb@externo-elementia.com',
      telefono: '+505 5853 6285',
      categoria: 'Oro'
    }
  },
  {
    id: 'stand-31',
    status: 'reserved',
    logo: '/diamante/logo-bac.jpeg',
    sponsorId: 'official-bac-credomatic',
    sponsorEmail: 'gerardo.zelaya@baccredomatic.ni',
    reservationDetails: {
      empresa: 'BAC Credomatic',
      nombre: 'Gerardo',
      apellido: 'Zelaya',
      correo: 'gerardo.zelaya@baccredomatic.ni',
      telefono: '+505 82445734',
      categoria: 'Diamante'
    }
  },
  {
    id: 'stand-32',
    status: 'reserved',
    logo: '/plata/casco.png',
    sponsorId: 'official-casco',
    sponsorEmail: 'cmunoz@cascosafety.com',
    reservationDetails: {
      empresa: 'Casco',
      nombre: 'Carlos',
      apellido: 'Muñoz',
      correo: 'cmunoz@cascosafety.com',
      telefono: '+505 82400677',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-37',
    status: 'reserved',
    logo: '/plata/midesa.png',
    sponsorId: 'official-midesa',
    sponsorEmail: 'rcaldera@findenicaragua.com',
    reservationDetails: {
      empresa: 'MIDESA',
      nombre: 'Raquel',
      apellido: 'Caldera',
      correo: 'rcaldera@findenicaragua.com',
      telefono: '+505 89889305',
      categoria: 'Plata'
    }
  },
  {
    id: 'stand-38',
    status: 'reserved',
    logo: '/diamante/noelito%20.png',
    sponsorId: 'official-noelito',
    sponsorEmail: 'mercadeo@ferreterianoelito.com',
    reservationDetails: {
      empresa: 'Ferretería Noelito',
      nombre: 'Linda',
      apellido: 'Gutiérrez',
      correo: 'mercadeo@ferreterianoelito.com',
      telefono: '+505 87365564',
      categoria: 'Diamante'
    }
  }
];

export const seedOfficialStands = async (db) => {
  for (let i = 1; i <= 38; i++) {
    const standId = `stand-${i}`;
    const official = DEFAULT_OFFICIAL_STANDS.find(s => s.id === standId);
    const refActive = doc(db, `${getEventBasePath()}/stands`, standId);
    const refBackup = doc(db, `${getEventBasePath()}/stands_backup`, standId);

    const dataToSave = official || { id: standId, name: `Stand ${i}`, status: 'available', updatedAt: new Date() };

    await setDoc(refActive, dataToSave);
    await setDoc(refBackup, dataToSave);
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
