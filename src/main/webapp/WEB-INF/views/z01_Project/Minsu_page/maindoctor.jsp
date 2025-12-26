<%@ page language="java" contentType="text/html; charset=UTF-8"
         pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<c:set var="path" value="${pageContext.request.contextPath}"/>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>MedNeuro - NII 2D/3D Viewer</title>
    <link rel="stylesheet"href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined">
    <link rel="stylesheet" href="${path}/static/css/style.css"/>

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

    <script type="importmap">
        {
          "imports": {
            "three": "https://unpkg.com/three@0.160.0/build/three.module.js"
          }
        }
    </script>



    <script type="module">
        import * as THREE from "three";
        import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
        import { OBJLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/OBJLoader.js";

        window.THREE = THREE;
        window.OrbitControls = OrbitControls;
        window.OBJLoader = OBJLoader;
    </script>
</head>

<body>
<div class="app">

    <header class="topbar">
        <div class="brand" onclick="location.href='${path}/maindoctorpage'" style="cursor:pointer;">MedNeuro</div>
        <button id="btnRecent" class="btn">최근 분석 보기</button>
    </header>

    <div id="layoutRoot" class="layout tools-open upload-mode">

        <div class="layout-top">
            <div class="tabsbar">
                <div id="tabs" class="tabs"></div>
                <button id="btnNewTab" class="tab-plus" type="button" aria-label="새 탭 추가">＋</button>
            </div>
        </div>

        <aside class="iconbar">
            <button id="2dBtn"><span class="material-symbols-outlined">replace_image</span>2D</button>
            <button id="3dBtn"><span class="material-symbols-outlined">deployed_code</span>3D</button>
            <button id="commentBtn"><span class="material-symbols-outlined">edit_square</span></button>
            <button id="logOutBtn" ><span class="material-symbols-outlined">Logout</span></button>
        </aside>


        <aside id="toolPanel" class="tool-panel hidden">
            <div class="tool-panel-head">Axis</div>
            <div class="tool-buttons">
                <button class="btn axis" data-axis="axial"><img src="${path}/static/axial.PNG" alt="Axial"></button>
                <button class="btn axis" data-axis="coronal"><img src="${path}/static/coronal.PNG" alt="Coronal"></button>
                <button class="btn axis" data-axis="sagittal"><img src="${path}/static/sagital.PNG" alt="Sagittal"></button>
            </div>
        </aside>

        <main class="main">
            <section id="uploadView" class="panel">
                <div id="dropzone" class="dropzone">
                    <div class="dropzone-box">
                        <div class="dropzone-title">파일 업로드 창</div>
                        <div class="dropzone-sub">여기에 .nii 파일을 드래그하세요</div>
                        <div class="dropzone-sub2">또는 오른쪽 아래 업로드 버튼</div>
                    </div>
                </div>

                <input id="fileInput" type="file" accept=".nii,.nii.gz" hidden />

                <div class="status">
                    <div>서버 상태: <span id="serverHealth" class="badge">확인중...</span></div>
                    <div>업로드 파일: <span id="fileName" class="muted">없음</span></div>
                </div>
            </section>

            <section id="analysis2DView" class="panel hidden thumbs-open">
                <div class="viewer-header">
                    <div class="viewer-title" id="viewerTitle">2D 이미지</div>
                    <div class="viewer-actions"></div>
                </div>

                <div class="viewer-body">
                    <div class="image-stage">
                        <img id="mainSlice" alt="SELECT AXIS"/>
                        <div id="sliceHint" class="hint">휠로 이동 </div>
                    </div>
                </div>

                <div id="thumbBar" class="thumbbar">
                    <div class="thumbbar-head">
                        <div class="thumbbar-title">Thumbnails</div>
                        <button id="btnThumbToggle" class="thumb-toggle" type="button" aria-label="썸네일 접기/펼치기">▲</button>
                    </div>

                    <div id="thumbList" class="thumb-list"></div>
                </div>
            </section>

            <section id="view3D" class="panel hidden">
                <div class="viewer-header">
                    <div class="viewer-title">3D View</div>
                    <div class="viewer-actions">
                        <button id="btnBackTo2D" class="btn">2D 변환</button>
                    </div>
                </div>

                <div class="three-wrap">
                    <div id="threeCanvas" class="three-canvas"></div>
                </div>
            </section>
        </main>

        <aside class="rightbar">
            <div class="info-card" style="display:flex; flex-direction:column;">
                <div style="font-weight:bold; border-bottom:1px solid #444; padding-bottom:8px; margin-bottom:8px;">
                환자 MRI 기록
                    <span id="targetPatientName" style="color:#4D79FF; margin-left:8px; font-size:0.9em;"></span>
                <ul id="historyList" style="flex:1; overflow-y:auto;">
                </ul>
            </div>

            <div id="historyList" style="flex:1; overflow-y:auto;">
                <p style="color:#777; font-size:0.8rem; text-align:center;">
                    파일을 로드해주세요.
                </p>
            </div>
        </div>

            <div class="info-card" style="display:flex; flex-direction:column;">
                <div style="font-weight:bold; border-bottom:1px solid #444; padding-bottom:8px; margin-bottom:8px;">
                    진단 코멘트
                </div>
            </div>


            <div class="right-actions">
                <button id="btnUpload" class="btn big">파일 업로드</button>
                <button id="btn3D" class="btn big">3D 변환</button>
                <button id="btnAnalyze" class="btn big">분석하기</button>
            </div>
        </aside>

        <button id="btnToolToggle" class="tool-handle hidden" type="button">◀</button>
    </div>
</div>


<!-- 이하 모달-->
<div id="myModal" class="modal-overlay">
    <div class="modal-window wide-modal"> <div class="modal-header">
        <span class="modal-title">환자 및 MRI 선택</span>
        <button class="close-btn">&times;</button>
    </div>

        <div class="modal-body split-view">

            <div class="left-panel">
                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="환자명/생년월일 검색" autocomplete="off">
                </div>
                <ul id="patientList" class="patient-list">
                </ul>
            </div>

            <div class="right-panel">
                <div class="right-header" id="rightHeader">
                    <p>환자를 선택해주세요.</p>
                </div>
                <ul id="fileList" class="file-list">
                </ul>
            </div>

        </div>
    </div>
</div>






<!-- 이하 최근 분석 기록 -->
<div id="recentDrawerOverlay" class="drawer-overlay"></div>

<div id="recentDrawer" class="side-drawer">
    <div class="drawer-header">
        <h3>최근 분석 기록</h3>
        <button id="btnCloseDrawer" class="close-drawer-btn">&times;</button>
    </div>

    <div class="drawer-body">
        <ul class="recent-list" id="recentList">

            <c:forEach var="log" items="${recentLogs}">
                <li class="recent-item" data-filepath="${log.fileName}">
                    <div class="ri-header">
                        <span class="ri-name">${log.patientName} (${log.gender})</span>
                    </div>
                    <div class="ri-info">
                        ｜ MRI ID: ${log.medMriId} ｜
                    </div>
                    <div class="ri-date">
                            ${log.uploadDt}
                        <c:if test="${not empty log.lastCheckTime}">
                            <span style="color:green; font-size:0.8em;">(최근: ${log.lastCheckTime})</span>
                        </c:if>
                    </div>
                </li>
            </c:forEach>

            <c:if test="${empty recentLogs}">
                <li style="padding:20px; text-align:center;">최근 분석 기록이 없습니다.</li>
            </c:if>

        </ul>
    </div>
</div>


<script>
    const SERVER_PATIENT_LIST = [
        <c:forEach var="mri" items="${patientList}" varStatus="status">
        {
            name: "${mri.patientName}",   // 환자 이름
            gender: "${mri.gender}",      // 성별 (필요시)
            birth: "${mri.birthDate}",    // 생년월일 (필요시)
            fileName: "${mri.fileName}"       // 파일명
        }<c:if test="${!status.last}">,</c:if>
        </c:forEach>
    ];
</script>

<script src=${path}/static/js/app.js></script>

</body>
</html>


