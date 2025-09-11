import { db, auth, onAuthStateChangedListener, collection, query, where, getDocs } from "./firebase.js";

document.getElementById('downloadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const start = new Date(document.getElementById('startDate').value);
  const end = new Date(document.getElementById('endDate').value);
  if (start >= end) {
    alert("開始日時は終了日時より前にしてください");
    return;
  }
  
  const diffMs = end - start;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 7) {
    alert("ダウンロードできる期間は最大7日間までです");
    return;
  }
  const user = auth.currentUser;
  if (!user) {
    alert("ログインが必要です");
    return;
  }

  const userId = user.uid;
  const barcodeDataRef = collection(db, `users/${userId}/barcodeData`);
  const q = query(
    barcodeDataRef,
    where("time", ">=", start),
    where("time", "<=", end)
  );

  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      alert("該当データがありません");
      return;
    }

    const rows = [["code", "serialNumber", "user", "cameraId", "timestamp"]];
    snapshot.forEach(doc => {
      const d = doc.data();
      rows.push([
        d.code,
        d.serialNumber,
        d.user,
        d.cameraId,
        d.time.toDate().toISOString()
      ]);
    });

    const csv = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `log_${start.toISOString()}_to_${end.toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("データ取得エラー", err);
    alert("ダウンロードに失敗しました");
  }
});
