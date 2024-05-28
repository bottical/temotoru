// aduser.js
import { auth, mapUserToCamera } from "./firebase.js";

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('mapUserToCameraForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('mapUserInput').value;
    const cameraId = document.getElementById('mapCameraIdInput').value;
    const userId = auth.currentUser.uid;

    try {
      await mapUserToCamera(userId, user, cameraId);
      alert(`ユーザー ${user} をカメラID ${cameraId} にマッピングしました`);
    } catch (error) {
      console.error("Error mapping user to camera:", error);
      alert(`エラー: ${error.message}`);
    }
  });
});
