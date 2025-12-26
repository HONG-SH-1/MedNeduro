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
 * ✅ [공통 함수] 파일명 예쁘게 변환하기 (Master Key)
 * * @param {string} rawName      - 원본 파일명 (UUID 포함)
 * @param {string} patientName  - 환자 이름
 * @param {number} index        - 현재 파일의 인덱스 (0부터 시작)
 * @param {number} totalCount   - 전체 파일 개수
 * @returns {string}            - 변환된 이름 (예: 홍길동_003.nii)
 */
function getPrettyName(name, patientName, index, totalCount) {
    // 1. 안전장치 (이름이 없으면 Unknown)
    const pName = patientName || "Unknown";

    // 2. 확장자 찾기
    const lower = name.toLowerCase();
    const ext = lower.endsWith(".nii.gz") ? ".nii.gz" : ".nii";

    // 3. 번호 매기기 (역순: 최신 파일이 높은 번호)
    // 예: 총 3개일 때 -> 0번(최신) = 3, 1번 = 2, 2번 = 1
    const seqNum = totalCount - index;
    const seqStr = String(seqNum).padStart(3, "0"); // 1 -> "001"

    // 4. 합치기
    return `${pName}_${seqStr}${ext}`;
}


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

    $("#logOutBtn").on("click", function () {
        if(!confirm("로그아웃 하시겠습니까?")){ // 아니요를 누르면 트루
            return;
        }
        $.ajax({
            // 컨트롤러에 설정한 logout Mapping 주소
            url:`${API_BASE}/logout`,
            method:"POST",
            success: function(){
                alert("로그아웃 되었습니다.");
                // 로그아웃시 로그인 페이지로 이동
                // 로그인 페이지로 이동하여 초기화 시키기!
                location.href="/loginpage";
        },
            error: function(xhr, status, error) {
                console.error("로그아웃 실패 객체:" +xhr);
                console.error("상태 코드:" +xhr.status);
                console.error("에러 내용:" +error);
                alert("로그아웃 처리 중 오류가 발생했습니다.")
            }
        })
    })

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

  if (collapsed) openTools()
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



// 이하 모달!!!
// HTML 문서가 다 로딩 될 때까지 기다리라는 명령어
// 웹 페이지의 경우 위에서 아래로 흐르는데, 모달이나 버튼이 화면에 그려기지도 전에 자바스크립트가 먼저
// 버튼을 찾아줘!라고 명령해버리면 오류가 남.. 따라서 화면 그리기 끝나고 나서 DOMContentLoaded 안의 코드를 실행하라!!
document.addEventListener('DOMContentLoaded', function() {

    // 1. 요소 선택 (리모컨 등록)
    // 각 태그의 ID를 이용해서 자바스크립트 변수로 가져옴 => 이 변수들을 통해 화면의 글자를 바꾸거나, 스타일 변경이 가능함
    const modal = document.getElementById('myModal');
    const patientListEl = document.getElementById('patientList'); // 왼쪽 패널 (환자 목록)
    const fileListEl = document.getElementById('fileList');       // 오른쪽 패널 (파일 목록)
    const rightHeader = document.getElementById('rightHeader');   // 오른쪽 헤더 (환자 이름 표시)
    const searchInput = document.getElementById('searchInput');   // 검색창
    const btnClose = document.querySelector('.close-btn');
    const mainFileNameDisplay = document.getElementById('fileName');

    // 서버 데이터 가져오기 (방어 코드) - 에러 막기
    // jsp에서 넘겨준 데이터 SERVER_PATIENT_LIST가 있으면 사용, 없으면 빈 배열을 사용! 
    const rawData = (typeof SERVER_PATIENT_LIST !== 'undefined') ? SERVER_PATIENT_LIST : [];

    // 2. 데이터 가공 함수 (환자별로 그룹핑)
    // 데이터 그룹화 [ 제일 핵심 !! ]
    // 결과 예시: { "홍길동_19900101": [파일1, 파일2], "김철수_19880505": [파일3] }
    function groupPatients(data) {
        const grouped = {}; // 빈 객체(바구니) 준비
        data.forEach(p => {
            // 고유 키 생성: 동명이인을 구분하기 위해 '이름+생년월일'을 합쳐서 열쇠로 씀
            // 예: "홍길동:19900101"
            const key = p.name + '|' + (p.birth || 'Unknown');
            
            // 이 열쇠(키)를 가진 방이 없으면 새로 만들기
            if (!grouped[key]) {
                grouped[key] = {
                    name: p.name,
                    birth: p.birth,
                    gender: p.gender,
                    files: [] // 이 환자의 파일들을 담을 배열
                };
            }
            // 방이 있으면 파일만 집어넣기
            grouped[key].files.push(p);
        });
        // 객체(Object) 형태를 배열(Array) 형태로 변환해서 내보냅니다.
        return Object.values(grouped);
        /*
        입력: [{홍길동, 뇌사진1}, {홍길동, 뇌사진2}, {김철수, 폐사진1}]
        출력: [{이름:홍길동, 파일:[뇌사진1, 뇌사진2]}, {이름:김철수, 파일:[폐사진1]}]
        이처럼 뒤죽박죽 섞인 파일들을 환자별 폴더에 정리해 넣는 작업입니다
        */
    }

    // 그룹화 실행!
    // groupedData에는 환자별로 정리된 데이터가 들어갑니다.
    const groupedData = groupPatients(rawData);


    // 3. [왼쪽] 환자 리스트 그리기 함수
    function renderPatientList(data) {
        patientListEl.innerHTML = ''; // 기존 목록 싹 지우기 (초기화)

        if (data.length === 0) {
            // 검색 결과가 없을 때 안내 문구 표시 및 함수 종료
            patientListEl.innerHTML = '<li style="padding:20px; text-align:center; color:#888;">검색 결과 없음</li>';
            return;
        }

        data.forEach(patient => {
            // <li> 태그 생성
            const li = document.createElement('li');
            // css 스타일 적용
            li.className = 'patient-item';
            // 화면에 보여질 HTML 내용 (이름, 생년월일, 파일개수)
            li.innerHTML = `
                <div class="p-name-area">
                    ${patient.name}
                </div>

                <div class="p-info-area">
                    <span class="p-meta">${patient.birth} (${patient.gender})</span>
                    <span class="p-count">MRI ${patient.files.length}건</span>
                </div>
            `;

            // 클릭 시 [오른쪽]에 파일 리스트 띄우기
            li.addEventListener('click', function() {
                // 1) 모든 리스트에서 하이라이트(active) 클래스 제거
                document.querySelectorAll('.patient-item').forEach(item => item.classList.remove('active'));
                // 2) 현재 클릭한 것만 하이라이트(active) 켜기
                li.classList.add('active');
                /*
                   3) 오른쪽 패널에 갱신 함수 호출, 이 환자의 파일들을 그려달라고 명령!
                      왼쪽 목록을 클릭했을 때, 해당 환자의 데이터 꾸러미(patient)를 통째로 넘겨서 오른쪽 화면을 그리게 합니다.
                      이것이 두 패널을 연결하는 다리 역할을 해줍니다.
                 */
                renderFileList(patient);
            });

            patientListEl.appendChild(li); // 완성된 <li>를 목록(ul)에 붙이기
        });
    }


    // 4. [오른쪽] MRI 파일 리스트 그리기 함수
    function renderFileList(patient) {
        // 1. 오른쪽 헤더 제목 바꾸기 (누구의 리스트인지 표시)
        rightHeader.innerHTML = `
            <span style="color:#4CAF50;">${patient.name}</span> 님의 MRI 리스트
            <span style="font-size:0.8rem; color:#aaa; margin-left:10px;">총 ${patient.files.length}건</span>
        `;

        fileListEl.innerHTML = ''; // 기존 파일 목록 초기화

        // 2. 환자가 가진 파일 개수만큼 반복
        patient.files.forEach((p, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';

            // [★수정] 공통 함수(getPrettyName)를 호출해서 예쁜 이름 만들기
            // (원본파일명, 환자이름, 현재순서, 전체개수)
            const displayName = getPrettyName(p.fileName, patient.name, index, patient.files.length);

            // 3. 의사가 확인했는지(lastCheck) 여부에 따라 마크 표시
            // 삼항 연산자: (조건) ? 참일때 : 거짓일때
            const checkHtml = p.lastCheck
                ? `<span style="font-size:0.8rem; color:#4CAF50; border:1px solid #4CAF50; padding:2px 6px; border-radius:4px;">✔ 확인됨 (${p.lastCheck})</span>`
                : `<span style="font-size:0.8rem; color:#FF453A;">미확인</span>`;

            li.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                    <span style="color:#fff; font-size:1rem; margin-bottom:2px;" title="${p.fileName}">
                        ${displayName}
                    </span>
                    <span style="color:#777; font-size:0.8rem;">업로드: ${p.uploadDt || '날짜없음'}</span>
                </div>
                ${checkHtml}
            `;

            // ★ 클릭 이벤트: 파일을 누르면 로딩 시작!
            li.addEventListener('click', function() {
                loadFileAndUpload(p, displayName); // 아래에 정의된 함수 호출
            });

            fileListEl.appendChild(li);
        });
    }


    // 5. 실제 파일 로딩 로직 (기존 코드 분리하여 정리)
    function loadFileAndUpload(p, prettyName) {

        const targetName = prettyName || p.fileName;

        // 1. 메인 화면의 제목을 파일명으로 변경 (UI 업데이트)
        // 예: /mri-file/brain_scan_01.nii.gz
        if (mainFileNameDisplay) {
            mainFileNameDisplay.textContent = p.fileName;
            mainFileNameDisplay.style.color = "#4CAF50";
            mainFileNameDisplay.style.fontWeight = "bold";
        }

        // 2. fetch: 자바스크립트가 서버에 몰래 가서 파일을 가져옴 (WebConfig에 설정된 경로)
        // 요청 주소 만들기 [예: /mri-file/image_123.nii.gz]
        const resourceUrl = `/mri-file/${p.fileName}`;

        // 3. fetch (서버 통신)
        fetch(resourceUrl)
            .then(response => {
                if (!response.ok) throw new Error(`파일 찾기 실패 (URL: ${resourceUrl})`); // 파일 없으면 에러
                return response.blob(); // 파일을 'Blob(덩어리)' 형태로 받음
            })
            .then(blob => {
                // 4. 가짜 파일 생성
                // 뷰어는 사용자가 드래그&드롭한 'File 객체'를 원하므로,
                // 서버에서 받은 데이터를 이용해서 가짜 File 객체를 만들어 줌..
                const file = new File([blob], targetName, {type: "application/octet-stream"});
                // 기존 뷰어 업로드 함수 실행
                uploadFile(file);
                // 성공 시 모달 닫기
                closeModal();
            })
            // 실패시 경고창..
            .catch(err => {
                console.error("로딩 실패:", err);
                alert("파일 로딩 실패: " + err.message);
            }); /*아녕하세요~*/
    }


    // 6. 검색 기능 (환자 이름으로 검색)
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            // 대소문자 무시 (다 대문자로 바꿔서 비교)
            const keyword = searchInput.value.toUpperCase();

            // 전체 환자 데이터(groupedData) 중에서 검색어가 포함된 사람만 남김 (filter)
            const filtered = groupedData.filter(patient => {
                // 이름이나 생년월일에 검색어가 포함되어 있는지 확인
                const pName = patient.name ? patient.name.toUpperCase() : '';
                const pBirth = patient.birth ? patient.birth : '';
                return pName.includes(keyword) || pBirth.includes(keyword);
            });

            // 걸러낸 데이터로 왼쪽 목록 다시 그리기
            renderPatientList(filtered);

            // 검색 시 오른쪽 패널 초기화
            fileListEl.innerHTML = '';
            rightHeader.innerHTML = '<p style="color:#aaa;">검색 결과에서 환자를 선택해주세요.</p>';
        });
    }


    // 7. 모달 제어 (기존과 동일)
    function openModal() { if(modal) modal.classList.add('show'); }
    function closeModal() { if(modal) modal.classList.remove('show'); }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });


    // [실행]
    renderPatientList(groupedData); // 왼쪽 리스트(목록) 그리기
    openModal(); // 페이지 로딩 시 자동 열기
});

// 최근 분석 리스트 API 연동

// .recent-item을 클릭했을 때 실행
$(document).on('click', '.recent-item', function() {

    // 1. 숨겨진 경로 꺼내기 (JSP에서 넣은 data-filepath)
    const filePath = $(this).data('filepath');

    // 2. 경로가 있으면 서버에 로드 요청
    if (filePath) {
        // 드로어 닫기
        $('#recentDrawer').removeClass('open');
        $('#recentDrawerOverlay').removeClass('show');

        // ★ 자바(load-local) 호출!
        loadServerFile(filePath);
    } else {
        alert("파일 경로가 없습니다.");
    }
});
// 이하 모달 종료!


/**
 * ✅ 서버에 있는 파일 경로로 로드하기 (핵심 엔진)
 * filePath: "/home/test/brain.nii" 같은 서버 절대 경로
 */
function loadServerFile(filePath) {
    console.log("서버 파일 로딩 요청 시작:", filePath);

    // 1. 자바(백엔드)에게 요청 (AJAX)
    // AJAX란 자바(백)와 자바스크립트(프론트)가 비동기적으로 통신하는 기술
    // 즉, F5를 하지 않고 페이지의 일부부만 서버에서 데이터를 가져와서 업데이틑 하는 기술
    // 비동기성은 서버에 요청을 보냄 -> 요청이 올 때까지 기다리는게 아닌 다른 작업을 계속 할 수 있음 !!
    // Ajax 자체는 브라우저(스크립트)의 기술이지만, 자바 서버와 데이터를 주고 받을 때 가장 빛이 남 !_!
    $.ajax({
        url: `${API_BASE}/load-local`, // Controller의 /load-local 주소 = 컨트롤러에 만든 전용 통로로 신호주기
        method: "POST",
        contentType: "application/json", // 데이터가 JSON 형식임을 미리 알려줌. 서버의 @RequestBody와 짝꿍
        data: JSON.stringify({ filePath: filePath }), // { "filePath": "..." }
        // 사용자가 선택한 파일이 서버 컴퓨터의 어떤 위치(C:/data/mri_01.dcm 등)에 있는지 경로 정보를 포장해서 보내기

        // 2. 성공 시
        success: function (res) {
            if (!res.ok) { // ok가 아니라면,,
                alert("파일 로드 실패: " + res.message);
                return;
            }

            // 서버가 발급해준 ID와 파일명
            // 서버가 파일을 성공적으로 읽을 경우 해당 파일을 식별할 수 있는 고유 번호(ID)와 원래 이름을 응답으로 보내기

            const fileId = res.fileId;
            const fileName = res.originalName;

            console.log(`로딩 성공! ID: ${fileId}`);

            // 3. 뷰어 실행 (기존 로직 재사용)
            // 뷰어 엔진에 해당 ID를 가진 파일을 이제부터 보여줄 것이다! 라고 세션을 생성 및 저장
            createSession(fileId, fileName);
            setActiveSession(fileId); // 여러 파일 중 해당 파일만 메인으로 보겠다고 설정 -> 뷰어 활성화 및 상태 제어

            // 업로드 화면을 닫고 실제 MRI 영상을 볼 수 있는 2D 분석 도구를 화면에 표시.
            openTools();
            show2DView();

            // UI 정리
            $("#layoutRoot").removeClass("upload-mode");
            $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
            // 클레스를 제어해서 화면의 레이아웃을 업로드 모드 -> 분석 모드로 전환
            $("#btnThumbToggle").text("▲");
            $("#viewerTitle").text("축(Axis)을 선택해주세요");

            alert("파일이 로드되었습니다. 왼쪽에서 축(Axial 등)을 클릭하세요!");
        },

        // 3. 에러 시
        error: function (xhr) {
            console.error(xhr);
            alert("서버 연결 에러: " + (xhr.responseText || xhr.statusText));
        }
    });
}


// 최근 분석리스트 오른쪽 사이드바 내용 출력.. 12월 24일 추가..

/**
 * ✅ 서버 파일 로드 요청
 */
function loadServerFile(filePath) {
    /*
        [함수명] loadServerFile
        [기 능] 서버에 저장된 특정 MRI 파일 (.nii)을 로드하고, 뷰어 및 환자 기록 리스트를 갱신
        [파라미터] filePath : 로드할 파일의 서버 측 경로 문자열
     */
    console.log("서버 파일 로딩 시작:", filePath);
        // 1. 디버깅용 로그 : 어떤 파일이 요청 되었는지 브라우저 콘솔에 기록합니다.
    $.ajax({
        // 2. jQuery AJAX 비동기 통신 시작.
        url: `${API_BASE}/load-local`,
        // 요청을 보낼 서버의 URL ( Controller의 @PostMapping("/load-local"))"
        method: "POST",
        // HTTP 메서드 방식 (데이터를 보내서 처리를 요청하므로 POST 사용)
        contentType: "application/json",
        // 서버로 보낼 데이터의 타입 지정 (JSON 형식임을 명시)
        // 이 설정이 있어야 자바 Controller의 @RequestBody가 데이터를 제대로 읽습니다.
        data: JSON.stringify({ filePath: filePath }),
        // 실제 보낼 데이터 (자바 스크립트 객체를 JSON 문자열로 변환하여 전송)
        success: function (res) {
            // 통신 성공 시 실행될 콜백 함수 (res : 서버에서 응답한 Map 데이터)
            if (!res.ok) {
                alert("로드 실패: " + res.message); // 서버가 보낸 에러 메세지 출력..
                return; // 함수 강제 종료
            }

            // 1. 뷰어 실행
            // 데이터 추출 서버 응답에서 필요한 데이터 꺼내기
            const fileId = res.fileId; // 서버가 생성한 세션용 임시 ID
            const fileName = res.originalName; // 원본 파일명

            createSession(fileId, fileName);
            // 뷰어 초기화 - 로컬 세션 생성 (브라우저 메모리에 파일 정보 저장)
            setActiveSession(fileId);
            // 뷰어 초기화 - 현재 보고 있는 파일을 활성 상태로 설정
            openTools();
            // UI 변경 - 왼쪽 도구 패널 (Axis 선택 등)을 엽니다.
            show2DView();
            // UI 변경 - 업로드 화면을 숨기고 2D 뷰어 화면을 표시합니다.

            // 2. [★핵심] MRI 기록 리스트 업데이트
            // 서버에서 받은 리스트(res.historyList)를 넘겨줍니다. (해당 환자의 과거 기록)를 화면에 그리는 함수 호출
            updateHistoryList(res.historyList, fileName);

            // 3. UI 정리
            $("#layoutRoot").removeClass("upload-mode");
            // UI 정리 - 전체 레이아웃에서 업로드 모드 스타일 제거
            $("#recentDrawer").removeClass("open");
            // UI 정리 - 최근 분석 기록 사이드바 닫기
            $("#recentDrawerOverlay").removeClass("show");
            // UI 정리 - 사이드바 뒤의 어두운 배경(오버레이) 숨기기

            // 4. 진단 코멘트창 초기화
            $("#diagnosisInput").val("");
            // 입력창 초기화 - 이전에 작성했던 진단 코멘트가 있다면 비워줌 (새 파일이므로)

            console.log(`로딩 성공! ID: ${fileId}`);
            // 완료 로그 출력

        },
        // 4. 통신 실패 시 실행될 콜백 함수 (네트워크 오류, 서버 다운 등)
        error: function (xhr) {

            console.error(xhr);
            // 에러 내용을 콘솔에 자세히 출력
            alert("서버 통신 에러: " + (xhr.responseText || xhr.statusText));
            // 사용자에게 알림창 띄위기 (statusText가 없으면 responseText 사용)
        }
    });
}

/**
 * ✅ 환자 MRI 기록 리스트 그리기 (info-card 안쪽 채우기)
 */
/*
    [함수명] updateHistoryList
    [기 능] 오른쪽 사이드바의 '환자 MRI 기록' 영역에 리스트를 동적으로 생성합니다.
    [파라미터]
        - historyList : 서버에서 받은 환자의 MRI 파일 목록 (List<Map>)
        - currentFileName : 현재 뷰어에 띄워진 파일명 (하이라이트 처리용)
 */

function updateHistoryList(historyList, currentFileName) {

    const $container = $("#historyList"); // HTML에서 만든 그 공간
    // 1. DOM 요소 선택 : 리스트를 집어넣을 HTML 컨테이너 (div)를 가져옴
    const $nameSpan =$("#targetPatientName");

    $container.empty(); // 기존 내용(안내문구 등) 지우기
    // 2. 초기화 : 기존에 표시되어 있던 리스트나 안내 문구를 싹 지웁니다.

    $nameSpan.text("");

    // 기록이 없을 때
    // 3. 예외 처리 : 만약 리스트가 없거나 비어있다면? (무결성 검사)
    if (!historyList || historyList.length === 0) {
        // "기록 없음" 메시지를 HTML로 삼입하고 함수 종료
        $container.html('<div style="font-size:0.8rem; color:#888; text-align:center; margin-top:20px;">기록 없음</div>');
        return;
    }
    const firstItem = historyList[0];
    // [★추가] SQL에서 새로 가져온 환자 이름과 성별 꺼내기
    // 값이 없을 수도 있으니(null) 'Unknown' 같은 기본값 처리
    const pName = firstItem.patientName || firstItem.PATIENTNAME || "Unknown";
    const pGender = firstItem.gender || firstItem.GENDER || "";
    $("#targetPatientName").text(` - ${pName} (${pGender})`);

    // 리스트 하나씩 HTML 만들기
    // 4. 리스트 순회 : 받아온 목록(Array)을 하나씩 돌면서 HTML을 만듭니다.
    historyList.forEach((item, index) => {
        /*
            화살표 함수
            기존 => historyList.forEach(function(item) {})
            화살표 함수 => historyList.forEach(item => {})
            (item) => {...}  item 이라는 변수에 리스트에 들어있던 한 객체 전체를 담고 => {...} 내부 코드를 실행합니다.
            요약 : historyList에 있는 데이터를 하나씩 꺼낼 때 마다 item이라는 변수명으로
                    부르고 item을 가지고 => 중괄호 {} 안의 작업 수행해 라는 뜻..
         */

        // DB 컬럼명 대소문자 방어 (fileName 혹은 FILENAME)
        // 데이터 정규화 - DB/MyBatis 설정에 따라 키값이 대/소문자로 다를 수 있으므로 방어 코드 작성
        // item.fileName이 있으면 쓰고, 없으면 item.FILENAME을 쓴다
        const name = item.fileName || item.FILENAME || item.IMAGE_FOLDER_PATH;
        const date = item.uploadDt || item.UPLOADDT || item.UPLOAD_DT;
        const displayName = getPrettyName(name, pName, index, historyList.length);


        // 조건부 스타일링 - 현재 보고 있는 파일인지 확인
        // 만약 리스트의 파일명(name)이 현재 파일명(currentFileName)과 같다면?
        // -> '노란색 굵은 글씨' 스타일 적용, 아니면 '회색' 전용
        const isActive = (name === currentFileName);
        const activeClass = isActive ? "active-item" : ""; // CSS 클래스로 제어 추천
        const activeStyle = isActive ? "color:#FFD700; font-weight:bold;" : "color:#ccc;";

        // HTML 조립 (심플하게) 템플릿 리터럴(백틱) 을 사용하여 동적 HTML 생성
        // onclick 이벤트 : 클릭 시 다시 loadServerFile을 호출하여 해당 파일로 화면 전환 (재귀적 구조)
        const html = `
            <div class="mini-hist-item" onclick="loadServerFile('${name}')" style="cursor:pointer; padding:6px 0; border-bottom:1px solid #333;">
                
                <div style="font-size:0.85rem; ${activeStyle}" title="${name}">
                    ${displayName}
                </div>
                
                <div style="font-size:0.75rem; color:#666;">${date}</div>
            </div>
        `;

        // 5. DOM 삽입 : 조립된 HTML 조각을 컨테이너 끝에 추가합니다.
        $container.append(html);
    });
}