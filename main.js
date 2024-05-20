// public/main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, doc, runTransaction, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

async function getNextSequence() {
  const counterDocRef = doc(db, "counters", "barcodeCounter");

  try {
    const nextId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      if (!counterDoc.exists()) {
        throw "Document does not exist!";
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

document.getElementById('barcodeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const barcode = document.getElementById('barcodeInput').value;
  const timeOffset = parseInt(document.getElementById('timeOffset').value, 10);
  console.log("Barcode input:", barcode); // デバッグログ
  const user = barcode.slice(-5);
  const currentTime = new Date();
  const offsetTime = new Date(currentTime.getTime() - timeOffset * 1000);
  const cameraId = generateCameraId(user);
  const url = generateCameraUrl(cameraId, offsetTime);

  try {
    const serialNumber = await getNextSequence();
    if (serialNumber === null) {
      console.error("Failed to get the next sequence ID.");
      return;
    }

    const docRef = await addDoc(collection(db, "barcodeData"), {
      code: barcode,
      serialNumber: serialNumber, // 連番フィールド
      time: serverTimestamp(),
      user: user,
      cameraId: cameraId
    });
    console.log("Document written with ID: ", docRef.id); // デバッグログ
    document.getElementById('barcodeInput').value = '';
    document.getElementById('timeOffset').value = '';
  } catch (e) {
    console.error("Error adding document: ", e); // エラーログ
  }
});

function generateCameraId(user) {
  return `camera_${user}`;
}

function generateCameraUrl(cameraId, time) {
  const baseUrl = "https://safie.link/app/streaming/iZYyecNHIzoUqxiCYUOw?timestamp=";
  const timestamp = time.getTime(); // タイムスタンプをミリ秒形式に変換
  return `${baseUrl}${timestamp}`;
}

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const barcode = document.getElementById('searchBarcode').value;
  const serialNumber = document.getElementById('searchSerialNumber').value;
  const user = document.getElementById('searchUser').value;
  const cameraId = document.getElementById('searchCameraId').value;
  const viewTimeOffset = parseInt(document.getElementById('viewTimeOffset').value, 10) || 0;

  const barcodeDataRef = collection(db, "barcodeData");
  let q = query(barcodeDataRef);

  if (barcode) {
    q = query(q, where("code", ">=", barcode), where("code", "<=", barcode + "\uf8ff"));
  }
  if (serialNumber) {
    q = query(q, where("serialNumber", "==", parseInt(serialNumber)));
  }
  if (user) {
    q = query(q, where("user", ">=", user), where("user", "<=", user + "\uf8ff"));
  }
  if (cameraId) {
    q = query(q, where("cameraId", ">=", cameraId), where("cameraId", "<=", cameraId + "\uf8ff"));
  }

  try {
    const querySnapshot = await getDocs(q);
    const results = document.getElementById('searchResults');
    results.innerHTML = '';

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const offsetTime = new Date(data.time.toMillis() - viewTimeOffset * 1000);
      const url = generateCameraUrl(data.cameraId, offsetTime);
      const listItem = document.createElement('li');
      listItem.innerHTML = `Barcode: ${data.code}, Serial Number: ${data.serialNumber}, User: ${data.user}, Camera ID: ${data.cameraId}, <a href="${url}" target="_blank">URL</a>`;
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
