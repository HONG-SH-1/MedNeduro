/**
 * ✅ app.js (ES Module 엔트리)
 * 실제 기능 구현은 다른 파일이하고 app.js는 연결만
 * 이벤트 바인딩을 전부 여기서 시작함..
 * ✅ "원본 app.js"의 로직을 변경하지 않고,
 *    함수/상태를 모듈로만 분리해서 import/export로 연결한 버전.
 *
 * - 백엔드 계약은 그대로 유지:
 *   POST /api/upload
 *   POST /api/slices
 *   POST /api/obj
 *   DELETE /api/file/{fileId}
 */

import { sessions, getActiveSessionId } from "./state.js";
import { checkHealth, uploadFileApi } from "./api.js";
import { setupDragDrop } from "./dragdrop.js";
import { showUploadView, show2DView, toggleTools, openTools, toggleThumbBar, createSession, setActiveSession } from "./ui.js";
import { loadSlices, moveSlice } from "./viewer2d.js";
import { make3D } from "./viewer3d.js";

$(document).ready(function () {
  checkHealth();

  // ✅ 드래그&드롭
  setupDragDrop(function (file) {
    uploadFile(file);
  });

  // ✅ 업로드 버튼 (우측)
  $("#btnUpload").on("click", function () {
    $("#fileInput").click();
  });

  // ✅ 탭 + 버튼: 새 파일 업로드로 새 세션 만들기
  $("#btnNewTab").on("click", function () {
    showUploadView();
    $("#fileInput").val("");
    $("#fileInput").click();
  });

  // ✅ 파일 선택
  $("#fileInput").on("change", function (e) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile(file);
  });

  // ✅ 축 버튼 클릭 (delegation)
  $(document).on("click", ".axis", function () {
    const sid = getActiveSessionId();
    if (!sid) {
      alert("먼저 파일을 업로드해줘!");
      return;
    }
    const axis = $(this).data("axis");
    loadSlices(sid, axis);
  });

  // ✅ 툴패널 접기/펼치기 핸들
  $("#btnToolToggle").on("click", function () {
    toggleTools();
  });

  // ✅ 큰 이미지 휠 이동
  $("#analysis2DView").on("wheel", ".image-stage", function (e) {
    const sid = getActiveSessionId();
    if (!sid) return;

    const s = sessions.get(sid);
    if (!s || !s.sliceCount || s.sliceCount <= 1) return;

    const delta = e.originalEvent.deltaY;
    if (delta > 0) moveSlice(sid, +1);
    else moveSlice(sid, -1);

    e.preventDefault();
  });

  // ✅ (수정 3) 썸네일 토글 버튼: thumbbar 안에 있는 버튼으로 처리
  $("#btnThumbToggle").on("click", function () {
    toggleThumbBar();
  });

  // ✅ 3D 변환
  $("#btn3D").on("click", function () {
    const sid = getActiveSessionId();
    if (!sid) {
      alert("먼저 파일 업로드부터!");
      return;
    }
    make3D(sid);
  });

  // ✅ 안내
  $("#btnAnalyze").on("click", function () {
    if (!getActiveSessionId()) {
      alert("먼저 NII 파일을 업로드해줘!");
      return;
    }
    alert("왼쪽 Axis 패널에서 축을 선택하면 2D 슬라이스가 로드돼!");
  });

  // ✅ 2D로 돌아가기
  $("#btnBackTo2D").on("click", function () {
    $("#view3D").addClass("hidden");
    $("#analysis2DView").removeClass("hidden");
  });

  // ✅ 초기 화면
  showUploadView();
});

/**
 * ✅ 파일 업로드 -> 새 fileId 세션 생성
 * (원본 로직 그대로)
 */
function uploadFile(file) {
  $("#fileName").text(file.name);

  uploadFileApi(file)
    .done(function (res) {
      if (!res.ok) {
        alert("업로드 실패: " + res.message);
        return;
      }

      const fileId = res.fileId;

      createSession(fileId, file.name);
      setActiveSession(fileId);

      // ✅ 업로드 직후엔 툴패널 펼침
      openTools();
      show2DView();

      // ✅ 썸네일 기본은 펼친 상태로 시작
      $("#layoutRoot").removeClass("upload-mode");
      $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
      $("#btnThumbToggle").text("▲");

      $("#viewerTitle").text("축 선택 (Axial / Coronal / Sagittal)");
      $("#mainSlice").attr("src", "");
      $("#thumbList").empty();
    })
    .fail(function (xhr) {
      alert("업로드 API 에러!\n" + (xhr.responseText || xhr.statusText));
    });
}
