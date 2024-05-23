// public/main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, runTransaction, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

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

async function getNextSequence(userId) {
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

async function getCameraId(userId, user) {
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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log("User signed in successfully");

    // Show the barcode and search forms after successful login
    document.getElementById('barcodeForm').style.display = 'block';
    document.getElementById('searchForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
  } catch (error) {
    console.error("Error signing in: ", error.code, error.message);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('barcodeForm').style.display = 'block';
    document.getElementById('searchForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
  } else {
    document.getElementById('barcodeForm').style.display = 'none';
    document.getElementById('searchForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  }
});

document.getElementById('barcodeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const barcode = document.getElementById('barcodeInput').value;
  console.log("Barcode input:", barcode); // デバッグログ
  const user = auth.currentUser;
  const userId = user.uid;
  const userEmail = user.email;
  const userCompany = "Your Company Name"; // 企業名、任意で設定
  const barcodeUser = barcode.slice(-5);
  const pureBarcode = barcode.slice(0, -5); // ユーザー情報を除いた部分
  const currentTime = new Date();

  try {
    const cameraId = await getCameraId(userId, barcodeUser);
    const url = generateCameraUrl(cameraId, currentTime);
    const serialNumber = await getNextSequence(userId);

    if (serialNumber === null) {
      console.error("Failed to get the next sequence ID.");
      return;
    }

    const docRef = await addDoc(collection(db, `users/${userId}/barcodeData`), {
      code: pureBarcode,
      serialNumber: serialNumber, // 連番フィールド
      time: serverTimestamp(),
      user: barcodeUser,
      cameraId: cameraId,
      userEmail: userEmail,
      userCompany: userCompany
    });
    console.log("Document written with ID: ", docRef.id); // デバッグログ
    document.getElementById('barcodeInput').value = '';
  } catch (e) {
    console.error("Error adding document: ", e); // エラーログ
  }
});

function generateCameraUrl(cameraId, time) {
  const baseUrl = "https://safie.link/app/streaming/";
  const timestamp = time.getTime(); // タイムスタンプをミリ秒形式に変換
  return `${baseUrl}${cameraId}?timestamp=${timestamp}`;
}

function formatTimestamp(time) {
  const year = time.getFullYear();
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const day = String(time.getDate()).padStart(2, '0');
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  return `${year}年${month}月${day}日${hours}:${minutes}:${seconds}`;
}

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventPrevent();
  const barcode = document.getElementById('searchBarcode').value;
  const serialNumber = document.getElementById('searchSerialNumber').value;
  const user = document.getElementById('searchUser').value;
  const cameraId = document.getElementById('searchCameraId').value;
  const viewTimeOffset = parseInt(document.getElementById('viewTimeOffset').value, 10) || 0;
  const userId = auth.currentUser.uid;

  const barcodeDataRef = collection(db, `users/${userId}/barcodeData`);
  let q = query(barcodeDataRef);

  if (barcode) {
    q = query(q, where("code", ">=", barcode), where("code", "<=", barcode + "\uf8ff"), orderBy("code"), orderBy("serialNumber", "desc"));
  }
  if (serialNumber) {
    q = query(q, where("serialNumber", "==", parseInt(serialNumber)), orderBy("serialNumber", "desc"));
  }
  if (user) {
    q = query(q, where("user", ">=", user), where("user", "<=", user + "\uf8ff"), orderBy("user"), orderBy("serialNumber", "desc"));
  }
  if (cameraId) {
    q = query(q, where("cameraId", ">=", cameraId), where("cameraId", "<=", cameraId + "\uf8ff"), orderBy("cameraId"), orderBy("serialNumber", "desc"));
  }

  try {
    const querySnapshot = await getDocs(q);
    const results = document.getElementById('searchResults');
    results.innerHTML = '';

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const offsetTime = new Date(data.time.toMillis() - viewTimeOffset * 1000);
      const url = generateCameraUrl(data.cameraId, offsetTime);
      const formattedTimestamp = formatTimestamp(offsetTime);
      const listItem = document.createElement('li');
      listItem.innerHTML = `Barcode: ${data.code}, Serial Number: ${data.serialNumber}, User: ${data.user}, Camera ID: ${data.cameraId}, ${formattedTimestamp} <a href="${url}" target="_blank">URL</a>`;
      results.appendChild(listItem);
    });

    if (querySnapshot.empty) {
      const listItem = document.createElement('li');
      listItem.textContent = 'No results found';
      results.appendChild(listItem);
    }
  } catch (e) {
    console.error("Error searching documents: ", e);
  }
});
