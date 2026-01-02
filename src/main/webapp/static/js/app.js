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
 * ✅ [수정완료] 파일명 예쁘게 변환하기
 * @param {string} name         - 원본 파일명 (UUID 포함)
 * @param {string} patientName  - 환자 이름
 * @param {number} index        - 현재 파일의 인덱스
 * @param {number} totalCount   - 전체 파일 개수
 * @param {boolean} isDescending - true: 역순(3,2,1 - 최근리스트용), false: 정순(1,2,3 - 모달용)
 */
function getPrettyName(name, patientName, index, totalCount, isDescending = false) {
    /*
        name : 서버에 저장된 원래 파일 이름 UUID 로 설정된 난수
        patient : 환자 이름 (예 : 홍길동)
        index : 현재 파일이 리스트에서 몇 번째인지 (0부터 시작 : 0,1,2...)
        totalCount : 이 환자의 파일이 총 몇 개인지
        isDescending = false :
            이게 True면 : 번호를 거꾸로 매깁니다 (예 : 3,2,1) 주로 최근 분석 리스트 전용
            이게 false (기본값)면 : 번호를 순서대로 매깁니다 (예 : 1,2,3). 주로 전체 목록(모달) 용입니다.
     */

    // 1. 안전장치 (이름이 없으면 Unknown)
    const pName = patientName || "Unknown";
    /*
       에러 방지용입니다
       환자의 이름이 값이 있으면 patientName을 넣고, 값이 없으면 Unknown 이라는 텍스트를 입력합니다.
     */

    // 2. 확장자 찾기
    const lower = name.toLowerCase();
    const ext = lower.endsWith(".nii.gz") ? ".nii.gz" : ".nii";
    /*
        name.toLowerCase() : 파일 이름을 전부 소문자로 바꿉니다 대소문자 상관없이 확장자를 확인하기 위해서입니다.
        lower.endsWith(".nii.gz") : 파일 끝이 .nii.gz로 끝나는지 검사합니다.
        MRI 파일은 .nii 일 수도 있고 압축된 .nii.gz 일 수도 있어서, 원래 확장자를 정확히 살려 주기 위함입니다.
     */

    // 3. 번호 매기기 (역순: 최신 파일이 높은 번호)
    // 예: 총 3개일 때 -> 0번(최신) = 3, 1번 = 2, 2번 = 1
    let seqNum;
    if (isDescending) {
        // 최근 리스트용 (최신이 맨 위니까, 전체 개수부터 줄어들어야 함)
        // 예: 총 3개일 때 -> 인덱스 0(맨위) = 3번 파일
        seqNum = totalCount - index;
    } else {
        // 모달창용 (과거가 맨 위니까, 1부터 늘어나야 함)
        // 예: 총 3개일 때 -> 인덱스 0(맨위) = 1번 파일
        seqNum = index + 1;
    }
    const seqStr = String(seqNum).padStart(3, "0"); // 1 -> "001"
    /*
        .padStart(3,"0") : 글자 수가 3자리가 안 되면, 앞쪽(Start)을 0으로 채우라는 뜻입니다.
        1 -> 001
        15 -> 015
        123 -> 123 (이미 3자리라 그대로)
        이유 : 파일 이름들이 _1, _10처럼 들쑥날쑥하지 않고 _001, _010 처럼 줄을 딱 맞추게 하기 위해서입니다.
     */

    // 4. 합치기
    return `${pName}_${seqStr}${ext}`;

    /*
        구한 변수들을 _로 연결해서 최종 결과를 내보냅니다.
        요약 : 원본 파일명은 무시하고, 환자 이름과 순서 번호만 가지고 새롭고 깔끔한 이름을 지어주는 작명소
        리스트의 성격(최신순/과거순)에 맞춰 번호를 센스 있게 붙여주는 똑똑하는 기능입니다.
     */
}


/**
 * ✅ 멀티탭(세션) 저장 구조
 * - key(fileId) 기준으로 업로드 파일을 세션처럼 관리
 */
const sessions = new Map(); // fileId -> session
let activeSessionId = null;
let image = document.getElementById("mainSlice");
let stage = null;
let three = { scene:null, camera:null, renderer:null, controls:null, obj:null };

$(document).ready(function () {
    checkHealth();
    setupDragDrop();
    initDomRef();
    initCommentEvents();


    image.addEventListener("contextmenu", function (e) {
        e.preventDefault();

        const rect = image.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
            return;
        }

        const xRatio = x / rect.width;
        const yRatio = y / rect.height;

        console.log(`🖱️ 우클릭 위치: (${xRatio.toFixed(3)}, ${yRatio.toFixed(3)})`);

        // ✅ 빈 코멘트로 임시 마커 생성 (DB 저장 안 됨)
        addMarker(xRatio, yRatio, null, "");
    });



    $("#2dBtn").on("click", function () {
        $("#view3D").addClass("hidden");
        $("#analysis2DView").removeClass("hidden");
    })

    // 2025-12-23 버튼이벤트 3개 추가
    $("#3dBtn").on("click", function () {
        const sid = activeSessionId;
        if (!sid) {
            alert("파일이 업로드 되지 않았습니다");
            return;
        }
        make3D(sid);
    })

    // 2025-12-23 버튼이벤트 3개 추가
    $("#commentBtn").on("click", function () {

    })

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

function initCommentEvents() {
    stage.addEventListener("click", function (e) {
        const marker = e.target.closest(".marker");
        if (!marker) return;

        openCommentModal(marker);
    });
}

function addMarker(xRatio, yRatio, commentId=null, content="") {
    // ✅ 1. wrapper(image-stage) 기준으로 통일
    const wrapper = document.querySelector(".image-stage");
    const img = document.getElementById("mainSlice");

    if (!wrapper || !img) {
        console.error("❌ wrapper 또는 img를 찾을 수 없습니다.");
        return;
    }

    // ✅ 2. 이미지와 wrapper의 위치/크기 가져오기
    const wrapperRect = wrapper.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // ✅ 3. wrapper 내에서 이미지의 상대 위치 계산
    const imgOffsetX = imgRect.left - wrapperRect.left;
    const imgOffsetY = imgRect.top - wrapperRect.top;

    // ✅ 4. 정규화 좌표를 이미지 기준 픽셀로 변환
    const x = imgOffsetX + (xRatio * imgRect.width);
    const y = imgOffsetY + (yRatio * imgRect.height);

    // ✅ 5. 마커 생성
    const marker = document.createElement("img");
    marker.src = "/static/comment.png";
    marker.className = "marker";

    // ✅ 6. wrapper 기준 절대 위치로 배치
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;

    marker.dataset.xCoord = String(xRatio);
    marker.dataset.yCoord = String(yRatio);
    marker.dataset.commentId = commentId ? String(commentId) : "";
    marker.dataset.comment = content || "";

    wrapper.appendChild(marker);

    console.log(`✅ 마커 추가: (${xRatio.toFixed(3)}, ${yRatio.toFixed(3)}) → (${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
}

function initDomRef() {
    stage = document.querySelector(".image-stage");
}


function openCommentModal(marker) {
    const overlay = document.createElement("div");
    overlay.className = "comment-modal-overlay";

    overlay.innerHTML = `
    <div class="comment-modal">
      <h3>Comment</h3>
      <textarea placeholder="진단/코멘트 입력...">${marker.dataset.comment || ""}</textarea>

      <div class="actions">
        <button class="btn-delete">Delete</button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector("textarea");

    // ✅ 삭제
    overlay.querySelector(".btn-delete").onclick = async () => {
        const commentId = marker.dataset.commentId;
        if (commentId) {
            await $.ajax({
                url: `${API_BASE}/comments/2d/${commentId}`,
                method: "DELETE"
            });
        }

        overlay.remove();

        // ✅ 삭제 후 마커 새로고침
        await refreshMarkersForCurrentSlice();
        await refreshCommentListForCurrentMri();
    };

    // ✅ 배경 클릭 시 닫기 + 저장
    overlay.addEventListener("click", async (e) => {
        if (e.target !== overlay) return;

        const content = textarea.value;

        const sid = activeSessionId;
        const s = sessions.get(sid);

        if (!s) {
            alert("세션이 없습니다. 파일을 다시 선택해주세요.");
            overlay.remove();
            return;
        }

        if (!s.medMriId) {
            console.error("❌ medMriId가 비어있음. 현재 세션:", s);
            alert("medMriId가 없습니다.");
            overlay.remove();
            return;
        }

        if (!s.axis) {
            alert("축(Axis)을 먼저 선택해주세요.");
            overlay.remove();
            return;
        }

        const payload = {
            commentId: marker.dataset.commentId ? Number(marker.dataset.commentId) : null,
            medMriId: s.medMriId,
            staffId: s.staffId,
            patientId: s.patientId,
            axis: s.axis,
            sliceIndex: s.currentIndex,
            xCoord: Number(marker.dataset.xCoord),
            yCoord: Number(marker.dataset.yCoord),
            content: content
        };

        console.log("💾 저장 데이터:", payload);

        // ✅ 서버 저장
        const res = await $.ajax({
            url: `${API_BASE}/comments/2d`,
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload)
        });

        console.log("✅ 서버 응답:", res);

        overlay.remove();

        // ✅ [핵심] 저장 후 DB에서 다시 가져와서 화면 갱신
        await refreshMarkersForCurrentSlice();
        await refreshCommentListForCurrentMri();
    });
}

/**
 * ✅ MRI(medMriId) 기준 코멘트 리스트 조회해서 화면(info-card)에 뿌리기
 * - 서버 API: GET /api/comments/2d/mri?medMriId=...
 */
async function refreshCommentListForCurrentMri() {
    const sid = activeSessionId;
    const s = sessions.get(sid);

    // ✅ 세션이 없거나, DB 연동된 MRI가 아니면 안내문만 띄움
    if (!s || !s.medMriId) {
        renderCommentList([]); // 빈 리스트 렌더
        return;
    }

    try {
        const res = await $.ajax({
            url: `${API_BASE}/comments/2d/mri`,
            method: "GET",
            data: { medMriId: s.medMriId }
        });

        if (!res || !res.ok) {
            renderCommentList([]);
            return;
        }

        renderCommentList(res.items || []);
    } catch (err) {
        console.error("❌ 코멘트 목록 조회 실패:", err);
        renderCommentList([]);
    }
}

/**
 * ✅ commentList(ul)에 <li>를 “쭉” 만들어 넣는 함수
 * - XSS/깨짐 방지를 위해 innerHTML로 content를 직접 꽂지 않고
 *   textContent로 넣는 방식(현업에서 안전하게 많이 씀)
 */
function renderCommentList(items) {
    const $list = $("#commentList");
    $list.empty();

    if (!items || items.length === 0) {
        $list.html('<li class="comment-empty">코멘트가 없습니다.</li>');
        return;
    }

    const frag = document.createDocumentFragment();

    for (const it of items) {
        const li = document.createElement("li");
        li.className = "comment-row";

        li.addEventListener("click", () => {
            moveToComment(it);
        });

        // ✅ 1줄: 환자명_AXIS
        const title = document.createElement("div");
        title.className = "comment-title";
        const patientName = $("#targetPatientName")
                .text()
                .replace(/^\s*-\s*/, "")   // 앞쪽 "- " 제거
                .trim()                    // 양쪽 공백 제거
            || "환자";
        title.textContent = `${patientName}_${it.axis.toUpperCase()}`;

        // ✅ 2줄: 날짜
        const date = document.createElement("div");
        date.className = "comment-date";
        date.textContent = formatCreatedAt(it.createdAt);

        li.appendChild(title);
        li.appendChild(date);
        frag.appendChild(li);
    }

    $list[0].appendChild(frag);
}


async function moveToSliceIndex(targetIndex) {
    const sid = activeSessionId;
    const s = sessions.get(sid);
    if (!s) return;

    if (targetIndex < 0 || targetIndex >= s.sliceCount) {
        console.warn("❌ sliceIndex 범위 초과:", targetIndex);
        return;
    }

    // 현재 인덱스 갱신
    s.currentIndex = targetIndex;

    const baseUrl = `/api/slices/${s.fileId}/${s.axis}/`;

    // 이미지 교체 → onload에서 마커 다시 그림
    setMainImage(baseUrl, s.currentIndex);

    // 썸네일 active 처리 + 스크롤
    const el = document.querySelector(`.thumb[data-idx='${targetIndex}']`);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
}
/**
 * ✅ 해당 좌표(x,y)에 가장 가까운 마커를 찾아서 강조
 * - 기존 마커 DOM을 재사용
 */
function focusMarker(x, y) {
    if (x == null || y == null) return;

    const markers = document.querySelectorAll(".marker");
    if (!markers.length) return;

    let closest = null;
    let minDist = Infinity;

    markers.forEach(m => {
        const mx = Number(m.dataset.x);
        const my = Number(m.dataset.y);
        if (isNaN(mx) || isNaN(my)) return;

        const dist = Math.hypot(mx - x, my - y);
        if (dist < minDist) {
            minDist = dist;
            closest = m;
        }
    });

    if (!closest) return;

    // ✅ 기존 강조 제거
    markers.forEach(m => m.classList.remove("focused-marker"));

    // ✅ 새 강조
    closest.classList.add("focused-marker");

    // 화면 중앙으로 스크롤(선택)
    closest.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
    });
}


/**
 * ✅ 코멘트 클릭 시:
 * 1) axis 변경
 * 2) sliceIndex 이동
 * 3) 마커 위치로 포커싱
 *
 * ※ 기존 함수들을 "조합"해서 UX를 만든다
 */
/**
 * ✅ 코멘트 클릭 시:
 * - axis 변경
 * - sliceIndex "절대 이동"
 * - 마커 강조
 */
async function moveToComment(comment) {
    const sid = activeSessionId;
    const s = sessions.get(sid);
    if (!s) return;

    const targetAxis = comment.axis;
    const targetSlice = comment.sliceIndex;

    // 1️⃣ 축 변경 (필요할 때만)
    if (s.axis !== targetAxis) {
        await loadSlices(sid, targetAxis);
        // loadSlices가 끝나면 currentIndex = 0 상태
    }

    // 2️⃣ 🔥 여기서 절대 이동
    await moveToSliceIndex(targetSlice);

    // 3️⃣ 해당 슬라이스 마커 로드
    await refreshMarkersForCurrentSlice();

    // 4️⃣ 해당 좌표로 포커싱
    focusMarker(comment.xCoord, comment.yCoord);
}



/**
 * ✅ 오라클 Timestamp 문자열이 어떤 형태로 와도 최대한 예쁘게 보여주기
 * - Date 파싱이 실패하면 원본 문자열 그대로 반환(깨짐 방지)
 */
function formatCreatedAt(createdAt) {
    if (!createdAt) return "";

    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) {
        return String(createdAt); // 파싱 실패 시 원본
    }

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}




async function refreshMarkersForCurrentSlice() {
    console.log("🔄 마커 새로고침 시작...");

    clearAllMarkers();
    const sid = activeSessionId;
    const s = sessions.get(sid);
    if (!s || !s.medMriId || !s.axis) return;

    const res = await $.ajax({
        url: `${API_BASE}/comments/2d`,
        method: "GET",
        data: {
            medMriId: s.medMriId,
            axis: s.axis,
            sliceIndex: s.currentIndex
        }
    });

    if (!res || !res.ok) return;

    for (const item of (res.items || [])) {
        // ✅ 서버가 xCoord로 주든 x_coord로 주든 둘 다 받게 처리
        const xRatio = item.xCoord ?? item.x_coord;
        const yRatio = item.yCoord ?? item.y_coord;

        // ✅ 방어: 좌표가 없으면 addMarker에서 터지니까 여기서 걸러버림
        if (xRatio == null || yRatio == null) {
            console.warn("⚠️ 좌표 누락 item:", item);
            continue;
        }

        addMarker(Number(xRatio), Number(yRatio), item.commentId, item.content);
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
    // 1. 화면 전환: 업로드 박스는 보이고, 2D/3D 뷰어는 숨김
    $("#uploadView").removeClass("hidden");
    $("#analysis2DView").addClass("hidden");
    $("#view3D").addClass("hidden");

    // 2. [핵심] 무조건 툴패널 보이기 (조건문 삭제함)
    // 파일이 있든 없든 왼쪽 패널 공간을 차지하게 만듭니다.
    $("#toolPanel").removeClass("hidden");
    $("#btnToolToggle").removeClass("hidden");

    // 3. 레이아웃 클래스 정리
    // 'upload-mode'는 3단으로 줄어드는 클래스이므로 무조건 제거합니다.
    $("#layoutRoot").removeClass("upload-mode");

    // 툴패널이 열린 상태(.tools-open)를 강제로 적용합니다.
    $("#layoutRoot").removeClass("tools-collapsed").addClass("tools-open");
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
        currentIndex: 0,

        medMriId: null,
        patientId: null,
        staffId: null
    });
    renderTabs();
}

/**
 * ✅ 활성 세션 전환
 */
function setActiveSession(fileId) {
    activeSessionId = fileId;
    clearAllMarkers();
    renderTabs();

    const s = sessions.get(fileId);
    console.log("활성화 세션 medmriid", s.medMriId);
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
    if (s.historyList && s.sourcePath) {
        // 저장해둔 리스트와 내 경로를 이용해서 다시 그리기 (그럼 노란불이 옮겨감)
        updateHistoryList(s.historyList, s.sourcePath);
    } else {
        // 로컬 업로드 파일이라 리스트가 없으면 비워주기
        $("#historyList").html('<div style="text-align:center; padding:20px; color:#666;">기록 없음</div>');
        $("#targetPatientName").text("");
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
            closeSessionLocal(fileId);
        });

        $tabs.append($tab);
    }
}

/**
 * ✅ 탭 닫기 + 서버 파일 삭제 연동
 이제는 삭제 하지 않기 때문에 처리 안 함..
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
 */
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
    clearAllMarkers();

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

function clearAllMarkers(){
    document.querySelectorAll(".marker").forEach(m => m.remove());
}

/**
 * ✅ 메인 이미지 변경
 */
function setMainImage(baseUrl, index) {
    const filename = `slice_${String(index).padStart(3, "0")}.png`;
    const url = `${baseUrl}${filename}`;
    const img = document.getElementById("mainSlice");
    //$("#mainSlice").attr("src", url);
    img.onload = null;
    img.onload = () =>{
        refreshMarkersForCurrentSlice();
    }
    img.src = url;

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
        // 1. 오른쪽 헤더 제목 바꾸기 (누구의 리스트인지)
        if(rightHeader) {
            rightHeader.innerHTML = `
                <span style="color:#4CAF50;">${patient.name}</span> 님의 MRI 리스트
                <span style="font-size:0.8rem; color:#aaa; margin-left:10px;">총 ${patient.files.length}건</span>
            `;
        }

        fileListEl.innerHTML = ''; // 기존 파일 목록 초기화

        // 2. 환자가 가진 파일 개수만큼 반복
        patient.files.forEach((p, index) => {
            const li = document.createElement('li');
            li.className = 'file-item';

            // [★수정] 공통 함수(getPrettyName)를 호출해서 예쁜 이름 만들기
            // (원본파일명, 환자이름, 현재순서, 전체개수)
            const displayName = getPrettyName(p.fileName, patient.name, index, patient.files.length, false);

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
                // 1. 선택 효과 (파란색)
                const allItems = fileListEl.querySelectorAll('.file-item');
                allItems.forEach(item => {
                    item.style.backgroundColor = "#2C2C2E";
                    item.style.border = "1px solid transparent";
                });
                li.style.backgroundColor = "#0d6efd";
                li.style.border = "1px solid #8aa4ff";

                // 2. 서버 파일 로드 요청 (이름만 넘기면 됨)
                // p.fileName은 DB에 저장된 파일 경로(UUID 포함된 전체 이름)여야 함
                loadServerFile(p.fileName);
            });

            fileListEl.appendChild(li);
        });
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

    const btnSelect = document.getElementById('selectBtn');
    if (btnSelect) {
        btnSelect.addEventListener('click', function() {
            openModal(); // 모달 열기 함수 실행
        });
    }

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
 * ✅ [통합] 서버 파일 로드 요청 (중복 방지 + 탭 이동 + 기록 갱신)
 * @param {string} filePath - 서버에 있는 파일의 절대 경로 (DB의 IMAGE_FOLDER_PATH)
 */
function loadServerFile(filePath) {
    console.log("🚀 파일 로딩 요청:", filePath);

    // [1] 중복 방지 로직
    for (const [sid, session] of sessions.entries()) {
        if (session.sourcePath === filePath) {
            console.log(`🔄 이미 열려있는 탭입니다. (ID: ${sid})`);
            setActiveSession(sid);
            closeAllDrawersAndModals();
            return;
        }
    }

    // [2] 서버 요청
    $.ajax({
        url: `${API_BASE}/load-local`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ filePath: filePath }),
        success: function (res) {
            if (!res.ok) {
                alert("로드 실패: " + res.message);
                return;
            }

            const fileId = res.fileId;
            const fileName = res.originalName; // 이건 화면 표시용 이름


            // [3] 세션 생성
            createSession(fileId, fileName);

            const s = sessions.get(fileId);
            if (s) {
                s.sourcePath = filePath; // ★ 중요: 원본 경로 저장
                s.historyList = res.historyList; // 환자 리스트 저장
                s.medMriId  = res.medMriId;
                s.patientId = res.patientId;
                s.staffId   = res.staffId;
            }
            setActiveSession(fileId);
            refreshCommentListForCurrentMri();

            // [4] 뷰어 활성화

            openTools();
            show2DView();

            // [5] 리스트 업데이트 (★ 여기가 핵심 수정!)
            // fileName이 아니라 'filePath'를 넘겨야 리스트의 ID와 일치해서 노란불이 들어옵니다.
            updateHistoryList(res.historyList, filePath);

            // [6] UI 정리
            $("#layoutRoot").removeClass("upload-mode");
            $("#analysis2DView").removeClass("thumbs-collapsed").addClass("thumbs-open");
            $("#btnThumbToggle").text("▲");
            $("#viewerTitle").text("축(Axis)을 선택해주세요");

            closeAllDrawersAndModals();
        },
        error: function (xhr) {
            console.error(xhr);
            alert("서버 통신 에러: " + (xhr.responseText || xhr.statusText));
        }
    });
}

// [보조 함수] 모든 팝업창 닫기 (코드 중복 제거용)
function closeAllDrawersAndModals() {
    // 최근 분석 드로어 닫기
    $('#recentDrawer').removeClass('open');
    $('#recentDrawerOverlay').removeClass('show');

    // 모달 창 닫기
    const modal = document.getElementById('myModal');
    if (modal) modal.classList.remove('show');

    // 진단 입력창 초기화
    $("#diagnosisInput").val("");
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
        const displayName = getPrettyName(name, pName, index, historyList.length, true);


        // 조건부 스타일링 - 현재 보고 있는 파일인지 확인
        // 만약 리스트의 파일명(name)이 현재 파일명(currentFileName)과 같다면?
        // -> '노란색 굵은 글씨' 스타일 적용, 아니면 '회색' 전용
        const isActive = (name === currentFileName);
        const activeClass = isActive ? "active-item" : ""; // CSS 클래스로 제어 추천
        const activeStyle = isActive ? "color:#FFD700; font-weight:bold;" : "color:#ccc;";

        // HTML 조립 (심플하게) 템플릿 리터럴(백틱) 을 사용하여 동적 HTML 생성
        // onclick 이벤트 : 클릭 시 다시 loadServerFile을 호출하여 해당 파일로 화면 전환 (재귀적 구조)
        const html = `
            <div class="mini-hist-item" onclick="loadServerFile('${name}')" 
                 style="cursor:pointer; padding:8px 4px; border-bottom:1px solid #333; width:100%; text-align:left; box-sizing:border-box;">
                
                <div style="font-size:0.85rem; ${activeStyle}; margin-bottom:4px; width:100%;">
                    ${displayName}
                </div>
                
                <div style="font-size:0.75rem; color:#666; width:100%;">
                    ${date}
                </div>
            </div>
        `;
        // 5. DOM 삽입 : 조립된 HTML 조각을 컨테이너 끝에 추가합니다.
        $container.append(html);
    });
}