import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQu0JsNZtGMIen7eTb4XWW2zxuMGRbX8o",
  authDomain: "expo-ferre-backend.firebaseapp.com",
  projectId: "expo-ferre-backend",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const qSponsors = query(collection(db, 'users'), where('role', '==', 'sponsor'));
  const snap = await getDocs(qSponsors);
  snap.forEach(doc => {
    console.log("Doc id:", doc.id, "Data:", doc.data());
  });
  process.exit(0);
}
run();
