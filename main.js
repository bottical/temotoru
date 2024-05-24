// public/main.js
import { db, auth, signIn, signOutUser, onAuthStateChangedListener, getNextSequence, getCameraId, initializeUserData, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "./firebase.js";
import { showElement, hideElement, updateUIOnAuthState, formatTimestamp } from "./ui.js";

function generateCameraUrl(cameraId, time) {
  const baseUrl = "https://safie.link/app/streaming/";
  const timestamp = time.getTime(); // タイムスタンプをミリ秒形式に変換
  return `${baseUrl}${cameraId}?timestamp=${timestamp}`;
}

// モーダルを表示する関数
function showErrorModal(message) {
  const modal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  errorMessage.textContent = message;
  modal.style.display = 'block';
}

// モーダルを閉じる関数
function hideErrorModal() {
  const modal = document.getElementById('errorModal');
  modal.style.display = 'none';
}

// モーダルを閉じるボタンの処理
document.querySelector('.close-button').addEventListener('click', hideErrorModal);

// モーダルの外側をクリックしたときに閉じる処理
window.addEventListener('click', (event) => {
  const modal = document.getElementById('errorModal');
  if (event.target == modal) {
    hideErrorModal();
  }
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signIn(email, password);
  } catch (error) {
    console.error("Login failed:", error);
  }
});

document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await signOutUser();
  } catch (error) {
    console.error("Logout failed:", error);
  }
});

onAuthStateChangedListener((user) => {
  const path = window.location.pathname;
  console.log('Auth state changed, current path:', path);
  updateUIOnAuthState(user, path);

  // ページがロードされた際にモーダルをリセット
  hideErrorModal();

  if (user) {
    if (path.endsWith('index.html') || path === '/temotoru/') {
      const barcodeForm = document.getElementById('barcodeForm');
      if (barcodeForm) {
        showElement(barcodeForm);
        document.getElementById('barcodeInput').focus(); // フォーカスを設定
        barcodeForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const barcode = document.getElementById('barcodeInput').value;
          const userId = user.uid;
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
              userEmail: user.email,
              userCompany: "Your Company Name" // 企業名、任意で設定
            });
            console.log("Document written with ID: ", docRef.id); // デバッグログ
            document.getElementById('barcodeInput').value = '';
          } catch (e) {
            console.error("Error adding document: ", e); // エラーログ
            showErrorModal(`エラー: ユーザー ${barcodeUser} のカメラマッピングが見つかりません`);
          }
        });
      }
    } else if (path.endsWith('search.html')) {
      const searchForm = document.getElementById('searchForm');
      if (searchForm) {
        showElement(searchForm);
        searchForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const barcode = document.getElementById('searchBarcode').value;
          const serialNumber = document.getElementById('searchSerialNumber').value;
          const searchUser = document.getElementById('searchUser').value;
          const cameraId = document.getElementById('searchCameraId').value;
          const viewTimeOffset = parseInt(document.getElementById('viewTimeOffset').value, 10) || 0;
          const userId = user.uid;
          const limitCount = 10; // 表示件数の制限

          const barcodeDataRef = collection(db, `users/${userId}/barcodeData`);
          let q = query(barcodeDataRef);

          if (barcode) {
            q = query(q, where("code", ">=", barcode), where("code", "<=", barcode + "\uf8ff"), orderBy("code"), orderBy("serialNumber", "desc"));
          } else if (serialNumber) {
            q = query(q, where("serialNumber", "==", parseInt(serialNumber)), orderBy("serialNumber", "desc"));
          } else if (searchUser) {
            q = query(q, where("user", ">=", searchUser), where("user", "<=", searchUser + "\uf8ff"), orderBy("user"), orderBy("serialNumber", "desc"));
          } else if (cameraId) {
            q = query(q, where("cameraId", ">=", cameraId), where("cameraId", "<=", cameraId + "\uf8ff"), orderBy("cameraId"), orderBy("serialNumber", "desc"));
          } else {
            q = query(q, orderBy("serialNumber", "desc")); // デフォルトでserialNumberの降順
          }

          // クエリにリミットを適用
          q = query(q, limit(limitCount));

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
      }
    }
  }
});
