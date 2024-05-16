// public/main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA65o0WMcpDIfwttoaXAmDU5Rqe72h9gPo",
  authDomain: "temotoru-neo.firebaseapp.com",
  projectId: "temotoru-neo",
  storageBucket: "temotoru-neo.appspot.com",
  messagingSenderId: "126027037708",
  appId: "1:126027037708:web:c82bc8037b53fcfa62c229"};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById('barcodeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const barcode = document.getElementById('barcodeInput').value;
  console.log("Barcode input:", barcode); // デバッグログ
  const user = barcode.slice(-5);
  const cameraId = generateCameraId(user);
  const url = generateCameraUrl(cameraId, new Date());

  try {
    const docRef = await addDoc(collection(db, "barcodeData"), {
      code: barcode,
      id: Math.floor(Math.random() * 1000000), // 任意の固有番号を生成
      time: serverTimestamp(),
      user: user,
      cameraId: cameraId,
      url: url
    });
    console.log("Document written with ID: ", docRef.id); // デバッグログ
    document.getElementById('barcodeInput').value = '';
  } catch (e) {
    console.error("Error adding document: ", e); // エラーログ
  }
});

function generateCameraId(user) {
  return `camera_${user}`;
}

function generateCameraUrl(cameraId, time) {
  return `https://camera.example.com/${cameraId}/${time.getTime()}`;
}
