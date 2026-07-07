import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";

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

async function runTest() {
  console.log("Testing stands onSnapshot...");
  try {
    const q = query(collection(db, `events/2026/stands`), where('status', 'in', ['reserved', 'sold']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("Stands snapshot received, docs count:", snapshot.docs.length);
      unsubscribe();
    });
  } catch (e) {
    console.error("Stands snapshot failed:", e);
  }

  console.log("Testing preregistrations getDoc...");
  const userEmail = "test" + Date.now() + "@example.com";
  const docRef = doc(db, "events/2026/preregistrations", userEmail);
  try {
    const snapshot = await getDoc(docRef);
    console.log("getDoc succeeded, exists:", snapshot.exists());
  } catch (e) {
    console.error("getDoc failed:", e.message);
  }

  console.log("Testing preregistrations setDoc...");
  try {
    await setDoc(docRef, { name: "Test User", email: userEmail });
    console.log("setDoc succeeded");
  } catch (e) {
    console.error("setDoc failed:", e.message);
  }

  console.log("Testing mail addDoc...");
  try {
    await addDoc(collection(db, "mail"), { to: userEmail, message: "Hello" });
    console.log("addDoc mail succeeded");
  } catch (e) {
    console.error("addDoc mail failed:", e.message);
  }
  
  process.exit(0);
}

runTest();
