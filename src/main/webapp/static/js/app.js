/**
 * ✅ app.js (UI 개선: 딱 붙는 탭 + 독립 툴패널 슬라이드)
 *
 * - 백엔드 계약은 그대로 유지:
 *   POST /api/upload
 *   POST /api/slices
 *   POST /api/obj
 *   DELETE /api/file/{fileId}
 */

const API_BASE = `/api`;


/**
 * ✅ 멀티탭(세션) 저장 구조
 * - key(fileId) 기준으로 업로드 파일을 세션처럼 관리
 */
const sessions = new Map(); // fileId -> session
let activeSessionId = null;

let three = { scene:null, camera:null, renderer:null, controls:null, obj:null };

$(document).ready(function () {
  checkHealth();
  setupDragDrop();

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

  // ✅ 축 버튼 클릭
  $(document).on("click", ".axis", function () {
    const sid = activeSessionId;
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
    const sid = activeSessionId;
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
    const sid = activeSessionId;
    if (!sid) {
      alert("먼저 파일 업로드부터!");
      return;
    }
    make3D(sid);
  });

  // ✅ 안내
  $("#btnAnalyze").on("click", function () {
    if (!activeSessionId) {
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

  // 최근 분석 리스트
    const $drawer = $('#recentDrawer');
    const $overlay = $('#recentDrawerOverlay');

    // 1. '최근 분석 보기' 버튼 클릭 시 열기
    $('#btnRecent').on('click', function() {
        $overlay.addClass('show'); // 배경 어둡게
        setTimeout(() => {
            $drawer.addClass('open'); // 드로어 슬라이드
        }, 10); // 약간의 지연으로 애니메이션 트리거
    });

    // 2. 닫기 버튼 또는 배경 클릭 시 닫기
    $('#btnCloseDrawer, #recentDrawerOverlay').on('click', function() {
        $drawer.removeClass('open');
        setTimeout(() => {
            $overlay.removeClass('show');
        }, 300); // 애니메이션 시간(0.3s) 만큼 대기 후 배경 숨김
    });

  // ✅ 초기 화면
  showUploadView();
});

/**
 * ✅ 썸네일 바 토글
 * - thumbs-open: 썸네일 펼침 -> 이미지 영역 상대적으로 작아짐
 * - thumbs-collapsed: 썸네일 접힘 -> 이미지 영역 자동 확장(커짐)
 */
function toggleThumbBar() {
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
 * ✅ 서버 상태 체크
 */
function checkHealth() {
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
 * ✅ 드래그앤드롭 설정
 */
function setupDragDrop() {
  const $dz = $("#dropzone");

  $dz.on("dragover", function (e) {
    e.preventDefault();
    $dz.addClass("dragover");
  });

  $dz.on("dragleave", function () {
    $dz.removeClass("dragover");
  });

  $dz.on("drop", function (e) {
    e.preventDefault();
    $dz.removeClass("dragover");

    const file = e.originalEvent.dataTransfer.files?.[0];
    if (!file) return;

    uploadFile(file);
  });
}

/**
 * ✅ 업로드 화면 표시
 * - 세션이 없으면 툴패널/핸들 숨김
 */
function showUploadView() {
  $("#uploadView").removeClass("hidden");
  $("#analysis2DView").addClass("hidden");
  $("#view3D").addClass("hidden");

  if (activeSessionId) {
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
function show2DView() {
  $("#uploadView").addClass("hidden");
  $("#analysis2DView").removeClass("hidden");
  $("#view3D").addClass("hidden");

  $("#toolPanel").removeClass("hidden");
  $("#btnToolToggle").removeClass("hidden");
}

/**
 * ✅ 파일 업로드 -> 새 fileId 세션 생성
 */
function uploadFile(file) {
  $("#fileName").text(file.name);

  const formData = new FormData();
  formData.append("file", file);

  $.ajax({
    url: `${API_BASE}/upload`,
    method: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function (res) {
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
      $("#layoutRoot").removeClass("upload-mode")
      $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
      $("#btnThumbToggle").text("▲");

      $("#viewerTitle").text("축 선택 (Axial / Coronal / Sagittal)");
      $("#mainSlice").attr("src", "");
      $("#thumbList").empty();
    },
    error: function (xhr) {
      alert("업로드 API 에러!\n" + (xhr.responseText || xhr.statusText));
    }
  });
}

/**
 * ✅ 세션 생성
 */
function createSession(fileId, fileName) {
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
function setActiveSession(fileId) {
  activeSessionId = fileId;
  renderTabs();

  const s = sessions.get(fileId);
  if (!s) return;

  show2DView();

  // ✅ 썸네일 기본은 펼친 상태
  $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
  $("#btnThumbToggle").text("▲");

  // ✅ 이미 축/이미지가 로드된 세션이면 복원
  if (s.axis && s.sliceCount > 0) {
    const baseUrl = `/api/slices/${s.fileId}/${s.axis}/`;
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
 * ✅ 탭 렌더링
 */
function renderTabs() {
  const $tabs = $("#tabs");
  $tabs.empty();

  for (const [fileId, s] of sessions.entries()) {
    const $tab = $(`
      <div class="tab">
        <div class="tab-name"></div>
        <button class="tab-close" type="button" aria-label="탭 닫기">✕</button>
      </div>
    `);

    $tab.find(".tab-name").text(s.fileName || s.fileId);

    if (fileId === activeSessionId) $tab.addClass("active");

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
 * ✅ 탭 닫기 + 서버 파일 삭제 연동
 */
function closeSessionWithServerDelete(fileId) {
  closeSessionLocal(fileId);

  $.ajax({
    url: `${API_BASE}/file/${fileId}`,
    method: "DELETE",
    success: function (res) {
      if (!res.ok) {
        console.warn("서버 파일 삭제 실패:", res);
        alert("⚠️ 서버 파일 삭제 실패(그래도 탭은 닫힘)\n" + (res.message || ""));
      }
    },
    error: function (xhr) {
      console.warn("서버 파일 삭제 API 에러:", xhr.responseText || xhr.statusText);
      alert("⚠️ 서버 파일 삭제 API 에러(그래도 탭은 닫힘)\n" + (xhr.responseText || xhr.statusText));
    }
  });
}

/**
 * ✅ 로컬 세션 제거
 */
function closeSessionLocal(fileId) {
  sessions.delete(fileId);

  if (activeSessionId === fileId) {
    const next = sessions.keys().next().value;
    activeSessionId = next || null;

    if (activeSessionId) setActiveSession(activeSessionId);
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
 * ✅ 슬라이스 생성 요청
 */
function loadSlices(fileId, axis) {
  const s = sessions.get(fileId);
  if (!s) return;

  s.axis = axis;
  $("#viewerTitle").text(axis.toUpperCase() + " View 로딩중...");

  $.ajax({
    url: `${API_BASE}/slices`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ fileId, axis }),
    success: function (res) {
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

      const baseUrl = res.baseUrl;

      setMainImage(baseUrl, s.currentIndex);
      renderThumbs(baseUrl, s.sliceCount, s.currentIndex);

      $("#viewerTitle").text(axis.toUpperCase() + " View");
    },
    error: function (xhr) {
      alert("slices API 에러!\n" + (xhr.responseText || xhr.statusText));
    }
  });
}

/**
 * ✅ 메인 이미지 변경
 */
function setMainImage(baseUrl, index) {
  const filename = `slice_${String(index).padStart(3, "0")}.png`;
  const url = `${baseUrl}${filename}`;
  $("#mainSlice").attr("src", url);

  $(".thumb").removeClass("active");
  $(`.thumb[data-idx='${index}']`).addClass("active");
}

/**
 * ✅ 썸네일 렌더(배치 렌더링)
 */
function renderThumbs(baseUrl, count, activeIndex) {
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
        const sid = activeSessionId;
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
function moveSlice(fileId, delta) {
  const s = sessions.get(fileId);
  if (!s) return;

  const next = s.currentIndex + delta;
  if (next < 0 || next >= s.sliceCount) return;

  s.currentIndex = next;

  const baseUrl = `/api/slices/${s.fileId}/${s.axis}/`;
  setMainImage(baseUrl, s.currentIndex);

  const el = document.querySelector(`.thumb[data-idx='${s.currentIndex}']`);
  if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

/**
 * ✅ 툴패널 토글
 */
function toggleTools() {
  const $layout = $("#layoutRoot");
  const collapsed = $layout.hasClass("tools-collapsed");

  if (collapsed) openTools();
  else collapseTools();
}

function openTools() {
  $("#layoutRoot").removeClass("tools-collapsed").addClass("tools-open");
  $("#btnToolToggle").text("◀");
}

function collapseTools() {
  $("#layoutRoot").addClass("tools-collapsed").removeClass("tools-open");
  $("#btnToolToggle").text("▶");
}

/**
 * ✅ 3D 변환 요청
 */
function make3D(fileId) {
  $("#analysis2DView").addClass("hidden");
  $("#view3D").removeClass("hidden");

  $.ajax({
    url: `${API_BASE}/obj`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ fileId }),
    success: function (res) {
      if (!res.ok) {
        alert("3D 변환 실패: " + res.message);
        return;
      }

      const objUrl = res.objUrl;

      initThreeIfNeeded();
      loadObj(objUrl);
    },
    error: function (xhr) {
      alert("obj API 에러!\n" + (xhr.responseText || xhr.statusText));
    }
  });
}

function initThreeIfNeeded() {
  if (!window.THREE || !window.OrbitControls || !window.OBJLoader) {
    alert("3D 라이브러리(Three.js)가 아직 로딩되지 않았어. 새로고침 후 다시 눌러줘!");
    return;
  }
  if (three.renderer) return;

  const container = document.getElementById("threeCanvas");

  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0x0f1116);

  const w = container.clientWidth;
  const h = container.clientHeight;

  three.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
  three.camera.position.set(0, 0, 200);

  three.renderer = new THREE.WebGLRenderer({ antialias: true });
  three.renderer.setSize(w, h);
  container.appendChild(three.renderer.domElement);

  const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
  light1.position.set(1, 1, 1);
  three.scene.add(light1);

  const light2 = new THREE.AmbientLight(0xffffff, 0.6);
  three.scene.add(light2);

  three.controls = new OrbitControls(three.camera, three.renderer.domElement);

  window.addEventListener("resize", function () {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    three.camera.aspect = nw / nh;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(nw, nh);
  });

  animateThree();
}

function loadObj(url) {
  if (three.obj) {
    three.scene.remove(three.obj);
    three.obj = null;
  }

  const loader = new OBJLoader();

  loader.load(
    url,
    function (obj) {
      obj.traverse(function (child) {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.8,
            metalness: 0.1
          });
        }
      });

      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);

      three.obj = obj;
      three.scene.add(obj);
    },
    function () {},
    function (err) {
      alert("OBJ 로드 실패: " + err);
    }
  );
}

function animateThree() {
  requestAnimationFrame(animateThree);
  if (three.controls) three.controls.update();
  if (three.renderer && three.scene && three.camera) {
    three.renderer.render(three.scene, three.camera);
  }
}




// HTML 문서가 다 로딩 될 때까지 기다리라는 명령어
// 웹 페이지의 경우 위에서 아래로 흐르는데, 모달이나 버튼이 화면에 그려기지도 전에 자바스크립트가 먼저
// 버튼을 찾아줘!라고 명령해버리면 오류가 남.. 따라서 화면 그리기 끝나고 나서 DOMContentLoaded 안의 코드를 실행하라!!
document.addEventListener('DOMContentLoaded', function() {

    // 1. 요소 선택 (변수 저장)
    const modal = document.getElementById('myModal');
    const listContainer = document.getElementById('modalFileList'); // 리스트가 들어갈 UL
    const searchInput = document.getElementById('searchInput');
    const btnClose = document.querySelector('.close-btn');
    const mainFileNameDisplay = document.getElementById('fileName'); // 메인화면 파일명 표시부

    // JSP에서 넘겨준 데이터 가져오기 (없으면 빈 배열로 방어)
    const patientData = (typeof SERVER_PATIENT_LIST !== 'undefined') ? SERVER_PATIENT_LIST : [];

    // 2. 리스트 그리기 함수 (핵심!)
    // 데이터(배열)를 받아서 화면에 <li> 태그를 만들어주는 역할
    function renderList(data) {
        listContainer.innerHTML = ''; // 기존 목록 싹 비우기 (초기화)
        if (data.length === 0) {
            listContainer.innerHTML = '<li style="padding:20px; text-align:center; color:#888;">검색 결과가 없습니다.</li>';
            return;
        }

        // 데이터 하나하나 돌면서 HTML 만들기
        data.forEach(function(p) {
            const li = document.createElement('li');
            li.className = 'file-item'; // CSS 스타일 적용

            // (1) 확인 여부 마크 (삼항연산자)
            const checkHtml = p.lastCheck
                ? `<span style="font-size:0.8rem; color:#4CAF50;">✔ ${p.lastCheck}</span>`
                : `<span style="font-size:0.8rem; color:#FF453A;">미확인</span>`;

            // (2) 리스트 내부 내용 (이름, 정보, 확인시간)
            li.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="p-name" style="font-weight:bold; font-size:1.1rem; color:#fff;">${p.name}</span>
                    <span style="font-size:0.85rem; color:#aaa;">${p.birth} | ${p.gender} | ${p.fileName}</span>
                </div>
                ${checkHtml}
            `;

            // (3) 클릭 이벤트 달기 (여기서 해야 함!)
            li.addEventListener('click', function() {
                // 메인 화면 업데이트
                if(mainFileNameDisplay) {
                    mainFileNameDisplay.textContent = p.fileName;
                    mainFileNameDisplay.style.color = "#4CAF50";
                    mainFileNameDisplay.style.fontWeight = "bold";
                }

                // 파일 로드 알림 (추후 loadNiftiFromUrl(p.fileName) 등으로 교체)
                alert(p.name + " 님의 영상(" + p.fileName + ")을 불러옵니다.");
                console.log("선택된 파일:", p.fileName);

                closeModal(); // 모달 닫기
            });

            // 만든 li를 ul 안에 집어넣기
            listContainer.appendChild(li);
        });
    }

    // -----------------------------------------------------------
    // 3. 모달 제어 (열기/닫기)
    // -----------------------------------------------------------
    function openModal() {
        if(modal) modal.classList.add('show'); // CSS의 .show { display: flex } 활용
    }

    function closeModal() {
        if(modal) modal.classList.remove('show'); // .show를 제거해서 다시 숨김
        if(searchInput) searchInput.value = '';   // 검색창 초기화
        renderList(patientData);                  // 검색 필터 해제하고 전체 목록 복구
    }

    // 닫기 버튼(X) 클릭
    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    // 모달 바깥 배경 클릭 시 닫기
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }


    // 4. 검색 기능 
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const keyword = searchInput.value.toUpperCase();

            const filtered = patientData.filter(function(p) {
                // 검사할 항목들 
                const pName = p.name ? p.name.toUpperCase() : ''; // 이름 없으면 공백
                const pFile = p.fileName ? p.fileName.toUpperCase() : ''; // 이름 없으면 공백
                const pBirth = p.birth ? p.birth : ''; // 생년월일 없으면 공백

                return pName.includes(keyword) ||
                    pFile.includes(keyword) ||
                    pBirth.includes(keyword);
            });

            // 걸러낸 데이터로 다시 그리기
            renderList(filtered);
        });
    }

    // -----------------------------------------------------------
    // [최종 실행] 페이지 로딩이 끝나면 바로 실행되는 곳
    // -----------------------------------------------------------
    renderList(patientData); // 1. 리스트 만들기
    openModal();             // 2. 모달 띄우기 (자동)
});