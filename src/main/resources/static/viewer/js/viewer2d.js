/**
 * ✅ viewer2d.js
 * - 2D 슬라이스/썸네일/휠 이동 로직만 분리
 * - 원본 동작 그대로
 * 2d 기능 전담
 */

import { sessions, getActiveSessionId, API_BASE } from "./state.js";
import { slicesApi } from "./api.js";

/**
 * ✅ 슬라이스 생성 요청
 */
export function loadSlices(fileId, axis) {
  const s = sessions.get(fileId);
  if (!s) return;

  s.axis = axis;
  $("#viewerTitle").text(axis.toUpperCase() + " View 로딩중...");

  slicesApi(fileId, axis)
    .done(function (res) {
      if (!res.ok) {
        alert("슬라이스 생성 실패: " + res.message);
        return;
      }

      s.sliceCount = Number(res.sliceCount || 0);
      s.currentIndex = 0;

      if (s.sliceCount <= 0) {
        alert("sliceCount가 0이야. 파이썬에서 이미지 저장이 안 된 상태!");
        return;
      }

      const baseUrl = `${API_BASE}${res.baseUrl}`;

      setMainImage(baseUrl, s.currentIndex);
      renderThumbs(baseUrl, s.sliceCount, s.currentIndex);

      $("#viewerTitle").text(axis.toUpperCase() + " View");
    })
    .fail(function (xhr) {
      alert("slices API 에러!\n" + (xhr.responseText || xhr.statusText));
    });
}

/**
 * ✅ 메인 이미지 변경
 */
export function setMainImage(baseUrl, index) {
  const filename = `slice_${String(index).padStart(3, "0")}.png`;
  const url = `${baseUrl}${filename}`;
  $("#mainSlice").attr("src", url);

  $(".thumb").removeClass("active");
  $(`.thumb[data-idx='${index}']`).addClass("active");
}

/**
 * ✅ 썸네일 렌더(배치 렌더링)
 */
export function renderThumbs(baseUrl, count, activeIndex) {
  const $list = $("#thumbList");
  $list.empty();

  const BATCH = 40;
  let start = 0;

  function renderBatch() {
    const end = Math.min(start + BATCH, count);
    const frag = document.createDocumentFragment();

    for (let i = start; i < end; i++) {
      const filename = `slice_${String(i).padStart(3, "0")}.png`;
      const url = `${baseUrl}${filename}`;

      const div = document.createElement("div");
      div.className = "thumb";
      div.dataset.idx = String(i);

      const img = document.createElement("img");
      img.src = url;
      img.alt = `slice ${i}`;

      div.appendChild(img);

      div.addEventListener("click", function () {
        const sid = getActiveSessionId();
        if (!sid) return;

        const s = sessions.get(sid);
        if (!s) return;

        s.currentIndex = i;
        setMainImage(baseUrl, s.currentIndex);
      });

      frag.appendChild(div);
    }

    $list[0].appendChild(frag);
    $(`.thumb[data-idx='${activeIndex}']`).addClass("active");

    start = end;
    if (start < count) requestAnimationFrame(renderBatch);
  }

  renderBatch();
}

/**
 * ✅ 휠 이동
 */
export function moveSlice(fileId, delta) {
  const s = sessions.get(fileId);
  if (!s) return;

  const next = s.currentIndex + delta;
  if (next < 0 || next >= s.sliceCount) return;

  s.currentIndex = next;

  const baseUrl = `${API_BASE}/slices/${s.fileId}/${s.axis}/`;
  setMainImage(baseUrl, s.currentIndex);

  const el = document.querySelector(`.thumb[data-idx='${s.currentIndex}']`);
  if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}
