/**
 * ✅ app.js (UI 개선: 딱 붙는 탭 + 독립 툴패널 슬라이드)
 *
 * - 백엔드 계약은 그대로 유지:
 *   POST /api/upload
 *   POST /api/slices
 *   POST /api/obj
 *   DELETE /api/file/{fileId}
 */

const API_BASE = `http://localhost:8080/api`;


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

            const baseUrl = `${API_BASE}${res.baseUrl}`;

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

    const baseUrl = `${API_BASE}/slices/${s.fileId}/${s.axis}/`
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
