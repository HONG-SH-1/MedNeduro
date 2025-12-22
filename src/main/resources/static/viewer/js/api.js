/**
 * ✅ api.js
 * - 서버 통신만 담당 (원본 app.js의 $.ajax들 그대로 이동)
 *
 *
 */

import { API_BASE } from "./state.js";

export function checkHealth() {
  $.ajax({
    url: `${API_BASE}/health`,
    method: "GET",
    success: function () {
      $("#serverHealth").text("OK").removeClass("bad").addClass("good");
    },
    error: function () {
      $("#serverHealth").text("OFF").removeClass("good").addClass("bad");
    }
  });
}

/**
 * ✅ 업로드 API 호출
 * - 성공/실패 처리 로직은 원본과 동일하게 app.js에서 이어서 처리
 */
export function uploadFileApi(file) {
  const formData = new FormData();
  formData.append("file", file);

  return $.ajax({
    url: `${API_BASE}/upload`,
    method: "POST",
    data: formData,
    processData: false,
    contentType: false
  });
}

/**
 * ✅ slices API 호출
 */
export function slicesApi(fileId, axis) {
  return $.ajax({
    url: `${API_BASE}/slices`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ fileId, axis })
  });
}

/**
 * ✅ obj API 호출
 */
export function objApi(fileId) {
  return $.ajax({
    url: `${API_BASE}/obj`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ fileId })
  });
}

/**
 * ✅ 서버 파일 삭제 API 호출
 */
export function deleteFileApi(fileId) {
  return $.ajax({
    url: `${API_BASE}/file/${fileId}`,
    method: "DELETE"
  });
}
