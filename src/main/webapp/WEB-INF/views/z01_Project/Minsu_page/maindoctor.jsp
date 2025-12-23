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
        <div class="brand" onclick="location.href='${path}/viewer/index.html'" style="cursor:pointer;">MedNeuro</div>
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
            <div class="iconbar-title">TOOLS</div>
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
                        <button id="btnBackTo2D" class="btn">2D Conversion</button>
                    </div>
                </div>

                <div class="three-wrap">
                    <div id="threeCanvas" class="three-canvas"></div>
                </div>
            </section>
        </main>

        <aside class="rightbar">
            <div class="info-card">Patient Info</div>
            <div class="info-card">Surgical Info</div>
            <div class="info-card">Diagnostic Info</div>

            <div class="right-actions">
                <button id="btnUpload" class="btn big">Upload</button>
                <button id="btn3D" class="btn big">3D Conversion</button>
                <button id="btnAnalyze" class="btn big">Analyze</button>
            </div>
        </aside>

        <button id="btnToolToggle" class="tool-handle hidden" type="button">◀</button>
    </div>
</div>

<div id="myModal" class="modal-overlay">
    <div class="modal-window">
        <div class="modal-header">
            <span class="modal-title">환자 MRI 리스트 선택</span>
            <button class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
            <div class="modal-top-section">
                <p class="modal-desc">분석할 파일을 선택해주세요.</p>

                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="파일명 검색 (예: T1, Brain...)" autocomplete="off">
                </div>
            </div>

            <ul id="modalFileList" class="modal-file-list">
            </ul>
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
        <ul class="recent-list">
            <%-- 여기에 Controller 단에서 데이터 가져와서 출력하여  --%>
            <li class="recent-item">
                <div class="ri-header">
                    <span class="ri-name">김철수 (M/45)</span>
                    <span class="ri-badge">의사명</span>
                </div>
                <div class="ri-info">Brain T1 Sequence</div>
                <div class="ri-date">2023.12.19 14:30</div>
            </li>
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
            fileName: "${mri.name}"       // 파일명
        }<c:if test="${!status.last}">,</c:if>
        </c:forEach>
    ];
</script>

<script src=${path}/static/js/app.js></script>

</body>
</html>


