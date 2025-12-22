/**
 * ✅ ui.js
 * - 화면 전환/탭 렌더/툴패널 토글/썸네일바 토글 등 "UI 조작"만 분리
 * - 원본 함수/동작 그대로 이동
 * 기능 로직이 아니라 ui 상태를 바꿈
 */

import { sessions, getActiveSessionId, setActiveSessionId } from "./state.js";
import { deleteFileApi } from "./api.js";
import { setMainImage, renderThumbs } from "./viewer2d.js";
import { API_BASE } from "./state.js";

/**
 * ✅ 업로드 화면 표시
 * - 세션이 없으면 툴패널/핸들 숨김
 */
export function showUploadView() {
  $("#uploadView").removeClass("hidden");
  $("#analysis2DView").addClass("hidden");
  $("#view3D").addClass("hidden");

  if (getActiveSessionId()) {
    $("#toolPanel").removeClass("hidden");
    $("#btnToolToggle").removeClass("hidden");
  } else {
    $("#toolPanel").addClass("hidden");
    $("#btnToolToggle").addClass("hidden");
  }
}

/**
 * ✅ 2D 화면 표시
 */
export function show2DView() {
  $("#uploadView").addClass("hidden");
  $("#analysis2DView").removeClass("hidden");
  $("#view3D").addClass("hidden");

  $("#toolPanel").removeClass("hidden");
  $("#btnToolToggle").removeClass("hidden");
}

/**
 * ✅ 썸네일 바 토글
 * - thumbs-open: 썸네일 펼침 -> 이미지 영역 상대적으로 작아짐
 * - thumbs-collapsed: 썸네일 접힘 -> 이미지 영역 자동 확장(커짐)
 */
export function toggleThumbBar() {
  const $view = $("#analysis2DView");
  const isCollapsed = $view.hasClass("thumbs-collapsed");

  if (isCollapsed) {
    // 펼치기
    $view.removeClass("thumbs-collapsed").addClass("thumbs-open");
    $("#btnThumbToggle").text("▲"); // ▲ = 접기(위로)
  } else {
    // 접기
    $view.addClass("thumbs-collapsed").removeClass("thumbs-open");
    $("#btnThumbToggle").text("▼"); // ▼ = 펼치기(아래로)
  }
}

/**
 * ✅ 탭 렌더링
 */
export function renderTabs() {
  const $tabs = $("#tabs");
  $tabs.empty();

  const activeId = getActiveSessionId();

  for (const [fileId, s] of sessions.entries()) {
    const $tab = $(`
      <div class="tab">
        <div class="tab-name"></div>
        <button class="tab-close" type="button" aria-label="탭 닫기">✕</button>
      </div>
    `);

    $tab.find(".tab-name").text(s.fileName || s.fileId);

    if (fileId === activeId) $tab.addClass("active");

    // ✅ 탭 클릭 -> 해당 세션 활성화
    $tab.on("click", function (e) {
      if ($(e.target).hasClass("tab-close")) return;
      setActiveSession(fileId);
    });

    // ✅ X 클릭 -> 서버 파일 삭제까지
    $tab.find(".tab-close").on("click", function (e) {
      e.stopPropagation();
      closeSessionWithServerDelete(fileId);
    });

    $tabs.append($tab);
  }
}

/**
 * ✅ 세션 생성
 */
export function createSession(fileId, fileName) {
  sessions.set(fileId, {
    fileId,
    fileName,
    axis: null,
    sliceCount: 0,
    currentIndex: 0
  });
  renderTabs();
}

/**
 * ✅ 활성 세션 전환
 */
export function setActiveSession(fileId) {
  setActiveSessionId(fileId);
  renderTabs();

  const s = sessions.get(fileId);
  if (!s) return;

  show2DView();

  // ✅ 썸네일 기본은 펼친 상태
  $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
  $("#btnThumbToggle").text("▲");

  // ✅ 이미 축/이미지가 로드된 세션이면 복원
  if (s.axis && s.sliceCount > 0) {
    const baseUrl = `${API_BASE}/slices/${s.fileId}/${s.axis}/`;
    $("#viewerTitle").text(s.axis.toUpperCase() + " View");

    setMainImage(baseUrl, s.currentIndex);
    renderThumbs(baseUrl, s.sliceCount, s.currentIndex);
  } else {
    $("#viewerTitle").text("2D VIEW (Axial / Coronal / Sagittal)");
    $("#mainSlice").attr("src", "");
    $("#thumbList").empty();
  }
}

/**
 * ✅ 탭 닫기 + 서버 파일 삭제 연동
 */
export function closeSessionWithServerDelete(fileId) {
  closeSessionLocal(fileId);

  deleteFileApi(fileId)
    .done(function (res) {
      if (!res.ok) {
        console.warn("서버 파일 삭제 실패:", res);
        alert("⚠️ 서버 파일 삭제 실패(그래도 탭은 닫힘)\n" + (res.message || ""));
      }
    })
    .fail(function (xhr) {
      console.warn("서버 파일 삭제 API 에러:", xhr.responseText || xhr.statusText);
      alert("⚠️ 서버 파일 삭제 API 에러(그래도 탭은 닫힘)\n" + (xhr.responseText || xhr.statusText));
    });
}

/**
 * ✅ 로컬 세션 제거
 */
export function closeSessionLocal(fileId) {
  sessions.delete(fileId);

  if (getActiveSessionId() === fileId) {
    const next = sessions.keys().next().value;
    setActiveSessionId(next || null);

    if (getActiveSessionId()) setActiveSession(getActiveSessionId());
    else {
      $("#toolPanel").addClass("hidden");
      $("#btnToolToggle").addClass("hidden");
      $("#thumbList").empty();
      $("#mainSlice").attr("src", "");
      showUploadView();
    }
  }

  renderTabs();
}

/**
 * ✅ 툴패널 토글
 */
export function toggleTools() {
  const $layout = $("#layoutRoot");
  const collapsed = $layout.hasClass("tools-collapsed");

  if (collapsed) openTools();
  else collapseTools();
}

export function openTools() {
  $("#layoutRoot").removeClass("tools-collapsed").addClass("tools-open");
  $("#btnToolToggle").text("◀");
}

export function collapseTools() {
  $("#layoutRoot").addClass("tools-collapsed").removeClass("tools-open");
  $("#btnToolToggle").text("▶");
}
