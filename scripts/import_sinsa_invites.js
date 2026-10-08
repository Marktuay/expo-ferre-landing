import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAQu0JsNZtGMIen7eTb4XWW2zxuMGRbX8o",
  authDomain: "expo-ferre-backend.firebaseapp.com",
  projectId: "expo-ferre-backend",
  storageBucket: "expo-ferre-backend.firebasestorage.app",
  messagingSenderId: "472537343080",
  appId: "1:472537343080:web:451f4087a26564fc9d87dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const rawSinsaList = [
  { nombre: "Marlon", empresa: "Comasa", email: "marlonhodgson50@gmail.com", telefono: "+50587301490" },
  { nombre: "Norvin", empresa: "Comasa", email: "ncastro@ncgsoluciones.com", telefono: "+50584731308" },
  { nombre: "Abner", empresa: "Comasa", email: "joandrotorrez@gmail.com", telefono: "+50586409196" },
  { nombre: "Hipolito", empresa: "Comasa", email: "eferreteria2014@gmail.com", telefono: "+50557113079" },
  { nombre: "Gearly", empresa: "Comasa", email: "gearlyjhernandez123@gmail.com", telefono: "+50587488977" },
  { nombre: "Harry", empresa: "Comasa", email: "hbermudez760@gmail.com", telefono: "+50587809031" },
  { nombre: "Jesser", empresa: "Comasa", email: "jgranadorivera84@gmail.com", telefono: "+50588360847" },
  { nombre: "Guadalupe", empresa: "Comasa", email: "kpanimart@gmail.com", telefono: "+50589310456" },
  { nombre: "Jabnel", empresa: "Comasa", email: "construcfav@yahoo.com", telefono: "+50558384775" },
  { nombre: "Wilmer", empresa: "Comasa", email: "almayuriamador@gmail.com", telefono: "+50587083314" },
  { nombre: "Ferreteria Bendaña y Compañía Ltda", empresa: "Comasa", email: "karen.beer@ferreteriabendana.com", telefono: "+50587400443" },
  { nombre: "Omar", empresa: "Comasa", email: "fomarflores01@gmail.com", telefono: "+50589787457" },
  { nombre: "Jose", empresa: "Comasa", email: "ferreteriacentral@gmail.com", telefono: "+50577729323" },
  { nombre: "Cristian", empresa: "Comasa", email: "ventasferreteriacristian1@gmail.com", telefono: "+50581571998" },
  { nombre: "Hilda", empresa: "Comasa", email: "hildabolanos86@gmail.com", telefono: "+50587089325" },
  { nombre: "Kun-I", empresa: "Comasa", email: "alexchencheno@gmail.com", telefono: "+50575530743" },
  { nombre: "Martha", empresa: "Comasa", email: null, telefono: "+50582855777" },
  { nombre: "Fatima", empresa: "Comasa", email: "fatima.morales100682@gmail.com", telefono: "+50586610880" },
  { nombre: "Damarys", empresa: "Comasa", email: "castillobacadamarysdelsocorro@gmail.com", telefono: "+50581577296" },
  { nombre: "Juan", empresa: "Comasa", email: "juan.v140700@gmail.com", telefono: "+50588946710" },
  { nombre: "Roberto", empresa: "Comasa", email: "robertoc@ferreteriarobertoleyva.com", telefono: "+50587422052" },
  { nombre: "Engel", empresa: "Comasa", email: "engelrojas27@icloud.com", telefono: "+50578258170" },
  { nombre: "Jonathan", empresa: "Comasa", email: "suheycastilblanco02@gmail.com", telefono: "+50586997634" },
  { nombre: "Alba Luz", empresa: "Comasa", email: "albarocha350@gmail.com", telefono: "+50588204165" },
  { nombre: "Erlin Jose", empresa: "Comasa", email: "ferreteria.sta.lucia@gmail.com", telefono: "+50584918974" },
  { nombre: "Gerson Uriel", empresa: "Comasa", email: "jers21rodrig@gmail.com", telefono: "+50584020363" },
  { nombre: "Sandra Francisca", empresa: "Comasa", email: "ferrsandra2015@gmail.com", telefono: "+50586752530" },
  { nombre: "Nohelia Deyanira", empresa: "Comasa", email: null, telefono: "+50589142847" },
  { nombre: "Inversiones Blandon Leon Sociedad Anonima", empresa: "Comasa", email: "compras@inblensa.com", telefono: "+50586844069" },
  { nombre: "Cesar Augusto", empresa: "Comasa", email: "adonisruiz043@gmail.com", telefono: "+50577628662" },
  { nombre: "Lilliam Del Carmen", empresa: "Comasa", email: "lilliamsobalvarro@gmail.com", telefono: "+50558273768" },
  { nombre: "Norman Javier", empresa: "Comasa", email: "izquierdogomez@yahoo.es", telefono: "+50585900915" },
  { nombre: "Mario Eduardo", empresa: "Comasa", email: "katerinesalvadorap@gmail.com", telefono: "+50577406580" },
  { nombre: "Elvin", empresa: "Comasa", email: "lcasco@msn.com", telefono: "+50587335164" },
  { nombre: "Santos Ronald", empresa: "Comasa", email: "granadosronald@yahoo.com", telefono: "+50557847416" }
];

function generateUniqueToken() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 8; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `inv_${Date.now().toString(36)}_${rand}`;
}

async function run() {
  console.log(`Starting Sinsa import process for ${rawSinsaList.length} contacts...`);

  // 1. Fetch existing invites
  const colRef = collection(db, 'events/2026/directInvites');
  const snapBefore = await getDocs(colRef);
  console.log(`Total current invites in database: ${snapBefore.size}`);

  const existingSinsa = [];
  snapBefore.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sponsorId === 'sinsa' || (data.sponsorName && data.sponsorName.toLowerCase().includes('sinsa'))) {
      existingSinsa.push({ id: docSnap.id, ...data });
    }
  });

  console.log(`Existing Sinsa invites in database: ${existingSinsa.length}`);

  // 2. Filter out any duplicates already present under Sinsa
  const toInsert = [];
  const skipped = [];

  for (const item of rawSinsaList) {
    const isDup = existingSinsa.some(ex => {
      const emailMatch = item.email && ex.email && item.email.toLowerCase() === ex.email.toLowerCase();
      const phoneMatch = item.telefono && ex.telefono && item.telefono.replace(/\D/g, '') === ex.telefono.replace(/\D/g, '');
      const nameMatch = item.nombre && ex.nombre && item.nombre.toLowerCase().trim() === ex.nombre.toLowerCase().trim();
      return (emailMatch || phoneMatch) && nameMatch;
    });

    if (isDup) {
      skipped.push(item);
    } else {
      toInsert.push(item);
    }
  }

  console.log(`Contacts to insert: ${toInsert.length}`);
  console.log(`Contacts skipped (already present in Sinsa): ${skipped.length}`);

  if (toInsert.length === 0) {
    console.log('No new contacts to insert.');
    process.exit(0);
  }

  // 3. Batch insert
  const batch = writeBatch(db);
  const insertedTokens = [];

  for (const item of toInsert) {
    const tokenId = generateUniqueToken();
    const docRef = doc(db, 'events/2026/directInvites', tokenId);

    const docData = {
      token: tokenId,
      nombre: item.nombre.trim(),
      empresa: item.empresa.trim(), // 'Comasa' as requested
      email: item.email ? item.email.trim().toLowerCase() : null,
      telefono: item.telefono ? item.telefono.trim() : null,
      sponsorId: 'sinsa',
      sponsorName: 'Sinsa',
      sponsorStands: 'Stands 1, 2, 3, 4',
      headerBannerUrl: '/email-header.png',
      footerBannerUrl: '/email-footer.png',
      status: 'pending',
      createdBy: 'admin_bulk_import_sinsa',
      createdAt: serverTimestamp(),
      isBulkImport: true
    };

    batch.set(docRef, docData);
    insertedTokens.push({ tokenId, nombre: item.nombre, telefono: item.telefono, email: item.email });
  }

  await batch.commit();
  console.log(`Successfully committed batch of ${insertedTokens.length} Sinsa invitations!`);

  // 4. Verify count after insertion
  const snapAfter = await getDocs(colRef);
  console.log(`Updated total invites in database: ${snapAfter.size}`);

  const sinsaAfter = [];
  snapAfter.forEach(docSnap => {
    const data = docSnap.data();
    if (data.sponsorId === 'sinsa' || (data.sponsorName && data.sponsorName.toLowerCase().includes('sinsa'))) {
      sinsaAfter.push(docSnap.id);
    }
  });
  console.log(`Updated Sinsa invites in database: ${sinsaAfter.length}`);

  process.exit(0);
}

run().catch(err => {
  console.error('Error during import:', err);
  process.exit(1);
});
