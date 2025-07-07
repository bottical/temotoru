// サニタイズ関数
function sanitizeBarcode(input) {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, '')         // 制御文字除去
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // 単独上位サロゲート除去
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // 単独下位サロゲート除去
    .trim();
}

// 書式チェック関数（6〜50文字のみ）
function isBarcodeFormatAcceptable(input) {
    return input.length >= 6 && input.length <= 50;
}

// フォーカス監視：1秒ごとに barcodeInput をチェック
setInterval(() => {
    const input = document.getElementById('barcodeInput');
    if (input && document.activeElement !== input) {
        input.focus();
    }
}, 100);


// public/main.js
import { db, auth, signIn, signOutUser, onAuthStateChangedListener, getNextSequence, getCameraId, initializeUserData, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "./firebase.js";
import { showElement, hideElement, updateUIOnAuthState, formatTimestamp } from "./ui.js";

function generateCameraUrl(cameraId, time) {
  const baseUrl = "https://safie.link/app/streaming/";
  const timestamp = time.getTime(); // タイムスタンプをミリ秒形式に変換
  return `${baseUrl}${cameraId}?timestamp=${timestamp}`;
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

// モーダルを表示し、一定時間後に自動で閉じる関数
function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    modal.style.display = 'block';

    // 2秒後に自動でモーダルを閉じる
    setTimeout(() => {
        hideErrorModal();
    }, 1000);
}

// モーダルを閉じる関数（フォーカスも戻す）
function hideErrorModal() {
    const modal = document.getElementById('errorModal');
    modal.style.display = 'none';

    // フォーカスを `barcodeInput` に戻す
    const barcodeInput = document.getElementById('barcodeInput');
    if (barcodeInput) {
        barcodeInput.focus();
    }
}

// Enterキーを押したらモーダルを閉じる
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        hideErrorModal();
    }
});



// Firestore 書き込みを非同期化する関数
async function addBarcodeData(userId, pureBarcode, serialNumber, barcodeUser, cameraId, userEmail) {
    return addDoc(collection(db, `users/${userId}/barcodeData`), {
        code: pureBarcode,
        serialNumber: serialNumber,
        time: serverTimestamp(),
        user: barcodeUser,
        cameraId: cameraId,
        userEmail: userEmail,
        userCompany: "Your Company Name"
    });
}



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
                    const rawBarcode = document.getElementById('barcodeInput').value;
                    document.getElementById('barcodeInput').value = '';
                    const barcode = sanitizeBarcode(rawBarcode);
                    if (!isBarcodeFormatAcceptable(barcode)) {
                        console.warn("無効なバーコード:", JSON.stringify(barcode));
                        showErrorModal("バーコードが不完全です（無視されました）");
                        return;
                    }
                    // セッション確認をここに挿入
                      if (!auth.currentUser) {
                      showErrorModal("セッションが切れています。再ログインしてください。");
                      return;
                    }

                  
                    document.getElementById('barcodeInput').value = ''; // UI を即座にクリア
                    const userId = currentUser.uid;
                    const barcodeUser = barcode.slice(-5);
                    const pureBarcode = barcode.slice(0, -5);

                    try {
                        // Firestore クエリを並列実行し、処理を高速化
                        const [cameraId, serialNumber] = await Promise.all([
                            getCameraId(userId, barcodeUser),
                            getNextSequence(userId)
                        ]);

                        if (!serialNumber) {
                            throw new Error(`エラー: No camera mapping found for user ${barcodeUser}`);
                        }

                        // Firestore 書き込みを非同期実行
                        addBarcodeData(userId, pureBarcode, serialNumber, barcodeUser, cameraId, auth.currentUser.email)
                            .then((docRef) => console.log("データ追加成功: ", docRef.id))
                            .catch((e) => console.error("データ追加エラー: ", e));

                    } catch (e) {
                        console.error("エラー発生: ", e);
                        showErrorModal(`エラー: ${e.message}`);
                    }
                });
            }
        }
    } 
    if (path.endsWith('search.html')) {
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
          const limitCount = 20; // 表示件数の制限

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
            const cameraMappings = await getCameraMappings(user.uid); // ← 追加
            const results = document.getElementById('searchResults');
            results.innerHTML = ''; // 既存の結果をクリア

            // コンテナ要素を追加
            const container = document.createElement('div');
            container.className = 'result-table-container';

            // テーブルのヘッダーを追加
            const table = document.createElement('table');
            table.className = 'result-table';
            const header = table.createTHead();
            const headerRow = header.insertRow(0);
            const headers = ['バーコード', '読取りID', 'ユーザー', 'カメラID', '撮影日時', 'Safie閲覧用URL'];
            headers.forEach((headerText, index) => {
              const cell = headerRow.insertCell(index);
              cell.textContent = headerText;
            });

            // テーブルのボディにデータを追加
            const tbody = document.createElement('tbody');
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const offsetTime = new Date(data.time.toMillis() - viewTimeOffset * 1000);
              const url = generateCameraUrl(data.cameraId, offsetTime);
              const formattedTimestamp = formatTimestamp(offsetTime);
              const displayName = cameraMappings[data.user] || data.user; // ← 追加
              const row = tbody.insertRow();
              row.insertCell(0).textContent = data.code;
              row.insertCell(1).textContent = data.serialNumber;
              row.insertCell(2).textContent = displayName;
              row.insertCell(3).textContent = data.cameraId;
              row.insertCell(4).textContent = formattedTimestamp;
              const linkCell = row.insertCell(5);
              const link = document.createElement('a');
              link.href = url;
              link.target = '_blank';
              link.textContent = 'URL';
              linkCell.appendChild(link);
            });

            table.appendChild(tbody);
            container.appendChild(table);
            results.appendChild(container);

            if (querySnapshot.empty) {
              const noResults = document.createElement('p');
              noResults.textContent = 'No results found';
              results.appendChild(noResults);
            }
          } catch (e) {
            console.error("Error searching documents: ", e);
          }
        });
      }
    }
});



async function getCameraMappings(userId) {
  const cameraRef = collection(db, `users/${userId}/cameraMapping`);
  const snapshot = await getDocs(cameraRef);
  const map = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.user && data.userDisplayName) {
      map[data.user] = data.userDisplayName;
    }
  });
  return map;
}

//  アクセストークンの手動更新（55分ごと）
setInterval(() => {
  const user = auth.currentUser;
  if (user) {
    user.getIdToken(true)
      .then(() => {
        console.log("アクセストークンを更新しました");
      })
      .catch((err) => {
        console.error("アクセストークンの更新失敗:", err);
        alert("セッションの延長に失敗しました。再ログインしてください。");
        location.href = "/login.html"; // 遷移先が違う場合は適宜調整
      });
  }
}, 55 * 60 * 1000); // 55分ごと
