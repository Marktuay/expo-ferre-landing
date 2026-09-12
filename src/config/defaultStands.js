import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getEventBasePath } from './eventConfig';

export const initialStandsList = [
  { id: 'stand-1', x: '67.71%', y: '56.10%', name: 'Stand 1', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-2', x: '67.72%', y: '49.68%', name: 'Stand 2', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-3', x: '67.77%', y: '42.84%', name: 'Stand 3', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-4', x: '67.71%', y: '36.39%', name: 'Stand 4', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-5', x: '67.71%', y: '29.79%', name: 'Stand 5', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-6', x: '61.50%', y: '28.23%', name: 'Stand 6', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-7', x: '62.85%', y: '34.14%', name: 'Stand 7', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-8', x: '62.89%', y: '38.96%', name: 'Stand 8', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-9', x: '62.76%', y: '44.29%', name: 'Stand 9', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-10', x: '62.89%', y: '49.06%', name: 'Stand 10', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-11', x: '61.62%', y: '54.34%', name: 'Stand 11', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-12', x: '59.34%', y: '49.22%', name: 'Stand 12', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-13', x: '59.34%', y: '44.11%', name: 'Stand 13', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-14', x: '59.31%', y: '39.15%', name: 'Stand 14', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-15', x: '59.27%', y: '34.17%', name: 'Stand 15', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-16', x: '51.20%', y: '28.16%', name: 'Stand 16', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-17', x: '52.81%', y: '33.84%', name: 'Stand 17', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-18', x: '52.84%', y: '39.05%', name: 'Stand 18', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-19', x: '52.81%', y: '44.21%', name: 'Stand 19', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-20', x: '52.76%', y: '49.19%', name: 'Stand 20', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-21', x: '51.13%', y: '54.11%', name: 'Stand 21', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-22', x: '48.94%', y: '49.12%', name: 'Stand 22', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-23', x: '49.02%', y: '43.96%', name: 'Stand 23', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-24', x: '49.08%', y: '39.09%', name: 'Stand 24', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-25', x: '49.08%', y: '34.12%', name: 'Stand 25', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-26', x: '39.70%', y: '30.08%', name: 'Stand 26', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-27', x: '39.72%', y: '36.66%', name: 'Stand 27', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-28', x: '39.70%', y: '43.25%', name: 'Stand 28', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-29', x: '39.72%', y: '49.71%', name: 'Stand 29', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-30', x: '39.79%', y: '56.14%', name: 'Stand 30', status: 'available', price: 'U$2,700', size: 'Oro (4x3 mts)' },
  { id: 'stand-31', x: '43.72%', y: '66.52%', name: 'Stand 31', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-32', x: '38.76%', y: '66.54%', name: 'Stand 32', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-33', x: '31.30%', y: '75.59%', name: 'Stand 33', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-34', x: '36.79%', y: '75.57%', name: 'Stand 34', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-35', x: '64.09%', y: '75.56%', name: 'Stand 35', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' },
  { id: 'stand-36', x: '68.78%', y: '75.56%', name: 'Stand 36', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-37', x: '61.14%', y: '66.53%', name: 'Stand 37', status: 'available', price: 'U$1600', size: 'Plata (3x3 mts)' },
  { id: 'stand-38', x: '56.88%', y: '66.52%', name: 'Stand 38', status: 'available', price: 'U$3,800', size: 'Diamante (6x3 mts)' }
];

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
    const meta = initialStandsList.find(s => s.id === standId);
    const refActive = doc(db, `${getEventBasePath()}/stands`, standId);
    const refBackup = doc(db, `${getEventBasePath()}/stands_backup`, standId);

    const baseInfo = {
      id: standId,
      name: meta?.name || `Stand ${i}`,
      size: meta?.size || '',
      price: meta?.price || '',
      updatedAt: new Date()
    };

    const dataToSave = official 
      ? { ...baseInfo, ...official } 
      : { ...baseInfo, status: 'available' };

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
