import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import fs from 'fs';

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

function norm(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

const sponsorMapping = {
  "comasa": { id: "jCNoPV6yB2VBewJWbo7BJOHku8N2", name: "SINSA" },
  "sinsa": { id: "jCNoPV6yB2VBewJWbo7BJOHku8N2", name: "SINSA" },
  "durman": { id: "official-durman", name: "DURMAN" },
  "eaton": { id: "official-eaton", name: "EATON" },
  "fernandez sera": { id: "czsarSPobrbTFpb9006j6DbsWT42", name: "Fernandez Sera" },
  "futec": { id: "stand-sponsor-stand-7", name: "FUTEC" },
  "grupo sur -kermil": { id: "mpw3ORKiggOsZ6ctTply6cPCr5v1", name: "Grupo Sur" },
  "grupo sur": { id: "mpw3ORKiggOsZ6ctTply6cPCr5v1", name: "Grupo Sur" },
  "indenicsa": { id: "official-indenicsa", name: "Indenicsa" },
  "indenicsa arcelormittal": { id: "official-indenicsa", name: "Indenicsa" },
  "arcelormittal": { id: "official-indenicsa", name: "Indenicsa" },
  "madinisa": { id: "xQbAZcZHVMg1hVgOGKEBtUQUIoy2", name: "Madinisa" },
  "megalineas nicaragua s.a.": { id: "x7zVfU72WkUryxc0EMxLPQ7Zs573", name: "Megalineas" },
  "megalineas": { id: "x7zVfU72WkUryxc0EMxLPQ7Zs573", name: "Megalineas" },
  "midesa": { id: "poO4hUOD5QXzjHhLJrOQCpYz9VA2", name: "Midesa" },
  "mobius engineering s.a": { id: "official-mobius", name: "Mobius Engineering" },
  "mobius": { id: "official-mobius", name: "Mobius Engineering" },
  "parque industrial": { id: "Ph9GG4toIPeZFPNQ2T5L1dSBRCA3", name: "Parque Logístico Los Brasiles" },
  "plycem": { id: "vIzYdFYXFzN8Y35IUwMUflK3gVt2", name: "Plycem" },
  "sherwin-williams": { id: "official-sherwin-williams", name: "Sherwin-Williams" },
  "sicsa": { id: "z2namHiwkwV4dCw2HiN0ziPO2842", name: "Sicsa Nicaragua" },
  "staff casco safety": { id: "i0WDC1oQ6dR2CmUcsDWbmzkyLje2", name: "Casco Safety" },
  "casco safety": { id: "i0WDC1oQ6dR2CmUcsDWbmzkyLje2", name: "Casco Safety" },
  "tigo": { id: "official-tigo", name: "TIGO" },
  "monolit": { id: "official-precom-monolit", name: "Monolit" },
  "pbs": { id: "official-pbs", name: "PBS" },
  "incasa": { id: "official-incasa", name: "INCASA (STEELMAX)" },
  "steelmax": { id: "official-incasa", name: "INCASA (STEELMAX)" },
  "importaciones balladares": { id: "aPNcTgAddyVJaUqPkXTBybM66AO2", name: "Importaciones Balladares" },
  "grupo q": { id: "EfGSvHGPVsORVzymnDR190Ox0W73", name: "Grupo Q (Chevrolet)" },
  "la casa del perno": { id: "official-lacasadelperno", name: "La Casa del Perno" },
  "el mundo del concreto": { id: "official-lacasadelperno", name: "La Casa del Perno" },
  "cemex": { id: "odvN3T6c64V4BpZzTFtoXJFftWm2", name: "Cemex" },
  "kouture s.a": { id: "official-kouture", name: "Kouture S.A" },
  "bac": { id: "hTzlROFOQuSm4uxTGM4NOjUUbXy1", name: "BAC" },
  "artik cargo": { id: "nZQ9g9au92VLBwWelJMxAG9pKIX2", name: "Artik Cargo" },
  "ferco": { id: "official-ferco", name: "FERCO" }
};

// Sponsors to ensure exist in `users`
const officialSponsorsToEnsure = [
  { id: "official-durman", empresa: "DURMAN" },
  { id: "official-eaton", empresa: "EATON" },
  { id: "official-mobius", empresa: "Mobius Engineering" },
  { id: "official-sherwin-williams", empresa: "Sherwin-Williams" },
  { id: "official-tigo", empresa: "TIGO" },
  { id: "official-precom-monolit", empresa: "Monolit" },
  { id: "official-pbs", empresa: "PBS" },
  { id: "official-incasa", empresa: "INCASA (STEELMAX)" },
  { id: "official-lacasadelperno", empresa: "La Casa del Perno" },
  { id: "official-kouture", empresa: "Kouture S.A" },
  { id: "official-ferco", empresa: "FERCO" }
];

async function executeImport() {
  console.log("1. Ensuring official sponsors exist in users collection...");
  for (const sp of officialSponsorsToEnsure) {
    await setDoc(doc(db, "users", sp.id), {
      role: "sponsor",
      empresa: sp.empresa,
      nombre: sp.empresa,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log(`   ✓ Sponsor ensured: [${sp.id}] ${sp.empresa}`);
  }

  console.log("\n2. Fetching existing staff to avoid duplicates...");
  const rawList = JSON.parse(fs.readFileSync("scripts/parsed_staff_raw.json", "utf-8"));
  const staffSnap = await getDocs(collection(db, "events/2026/staff"));
  const existingSet = new Set();
  staffSnap.forEach(d => {
    const data = d.data();
    const nameKey = norm(`${data.nombre || ""} ${data.apellido || ""}`);
    const emailKey = norm(data.email);
    if (nameKey) existingSet.add(nameKey);
    if (emailKey) existingSet.add(emailKey);
  });
  console.log(`   Current staff in Firestore: ${staffSnap.size}`);

  const toInsert = [];
  const internalSeen = new Set();
  let duplicatesCount = 0;

  for (const item of rawList) {
    const cleanNombre = (item.nombre || "").trim();
    const cleanApellido = (item.apellido || "").trim();
    const fullName = `${cleanNombre} ${cleanApellido}`.trim();
    const cleanEmail = (item.email || "").trim().toLowerCase();
    const nameKey = norm(fullName);
    const emailKey = norm(cleanEmail);

    let isDup = false;
    if (emailKey && internalSeen.has(emailKey)) isDup = true;
    if (nameKey && internalSeen.has(nameKey)) isDup = true;
    if (emailKey && existingSet.has(emailKey)) isDup = true;
    if (nameKey && existingSet.has(nameKey)) isDup = true;

    if (isDup) {
      duplicatesCount++;
      continue;
    }

    if (emailKey) internalSeen.add(emailKey);
    if (nameKey) internalSeen.add(nameKey);

    const spKey = norm(item.sponsor);
    const matchedSponsor = sponsorMapping[spKey] || { id: null, name: item.sponsor };

    toInsert.push({
      nombre: cleanNombre,
      apellido: cleanApellido,
      email: cleanEmail,
      telefono: (item.telefono || "").trim(),
      empresa: (item.empresa || item.sponsor || "").trim(),
      cargo: (item.cargo || "Staff de Stand").trim(),
      sector: "Comercial",
      sponsorId: matchedSponsor.id,
      sponsorName: matchedSponsor.name
    });
  }

  console.log(`\n3. Ready to insert ${toInsert.length} new staff records (Duplicates skipped: ${duplicatesCount})`);

  // Insert in batches of 200 operations (each staff is inserted into staff AND staff_backup)
  // 100 staff = 200 writes, well within Firestore limit of 500
  const CHUNK_SIZE = 100;
  let batchIndex = 1;

  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const slice = toInsert.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const person of slice) {
      const staffRef = doc(collection(db, "events/2026/staff"));
      const backupRef = doc(db, "events/2026/staff_backup", staffRef.id);

      const payload = {
        ...person,
        createdAt: serverTimestamp()
      };

      batch.set(staffRef, payload);
      batch.set(backupRef, payload);
    }

    console.log(`   Writing batch ${batchIndex} (${slice.length} records / ${slice.length * 2} ops)...`);
    await batch.commit();
    batchIndex++;
  }

  // Final count verification
  const finalSnap = await getDocs(collection(db, "events/2026/staff"));
  console.log(`\n🎉 IMPORT COMPLETED SUCCESSFULLY!`);
  console.log(`   Previous staff count: ${staffSnap.size}`);
  console.log(`   New staff added: ${toInsert.length}`);
  console.log(`   Total staff in Firestore: ${finalSnap.size}`);
}

executeImport().then(() => process.exit(0)).catch(err => {
  console.error("Error during import:", err);
  process.exit(1);
});
