// public/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, runTransaction, query, where, getDocs, orderBy, setDoc, getDoc, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA65o0WMcpDIfwttoaXAmDU5Rqe72h9gPo",
  authDomain: "temotoru-neo.firebaseapp.com",
  projectId: "temotoru-neo",
  storageBucket: "temotoru-neo.appspot.com",
  messagingSenderId: "126027037708",
  appId: "1:126027037708:web:c82bc8037b53fcfa62c229"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
  db,
  auth,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  runTransaction,
  query,
  where,
  getDocs,
  orderBy,
  setDoc,
  getDoc,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  limit // 追加
};

export async function getNextSequence(userId) {
  const counterDocRef = doc(db, `users/${userId}/counters/barcodeCounter`);
  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      if (!counterDoc.exists()) {
        transaction.set(counterDocRef, { currentValue: 1 });
        return 1;
      }
      const currentValue = counterDoc.data().currentValue;
      const nextValue = currentValue + 1;
      transaction.update(counterDocRef, { currentValue: nextValue });
      return nextValue;
    });
    console.log("Next sequence ID: ", nextId);
    return nextId;
  } catch (e) {
    console.error("Transaction failed: ", e);
    return null;
  }
}

export async function getCameraId(userId, user) {
  const cameraMappingRef = collection(db, `users/${userId}/cameraMapping`);
  const q = query(cameraMappingRef, where("user", "==", user));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const cameraMapping = querySnapshot.docs[0].data();
    return cameraMapping.cameraId;
  } else {
    throw new Error(`No camera mapping found for user ${user}`);
  }
}

export async function initializeUserData(userId) {
  const userDocRef = doc(db, `users/${userId}`);
  await setDoc(userDocRef, { initialized: true });

  const barcodeDataRef = collection(db, `users/${userId}/barcodeData`);
  await addDoc(barcodeDataRef, { initialized: true });

  const cameraMappingRef = collection(db, `users/${userId}/cameraMapping`);
  const cameraMappingDocRef = await addDoc(cameraMappingRef, { initialized: true });

  // cameraMapping ドキュメントの中に mappingId サブコレクションの作成
  const mappingIdRef = collection(doc(db, `users/${userId}/cameraMapping/${cameraMappingDocRef.id}`), 'mappingId');
  await addDoc(mappingIdRef, {
    cameraId: "",
    user: ""
  });
}

export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDocRef = doc(db, `users/${user.uid}`);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await initializeUserData(user.uid);
    }
    console.log("User signed in successfully");
    return user;
  } catch (error) {
    console.error("Error signing in: ", error.code, error.message);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out: ", error);
    throw error;
  }
}

export function onAuthStateChangedListener(callback) {
  onAuthStateChanged(auth, callback);
}
