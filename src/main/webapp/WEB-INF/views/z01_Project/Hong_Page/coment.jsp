<%@ page language="java" contentType="text/html; charset=UTF-8"
         pageEncoding="UTF-8"
         import="java.util.*"
%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<c:set var="path" value="${pageContext.request.contextPath}"/>
<fmt:requestEncoding value="UTF-8"/>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Insert title here</title>
    <link rel="stylesheet" href="/com/bootstrap.min.css">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* 헤더 */
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
        }

        /* 레이아웃 (좌우 배치) */
        .main-content {
            display: flex;
            gap: 20px;
        }

        .image-section { flex: 1.5; }
        .result-section { flex: 1; }

        /* 카드 스타일 공통 */
        .card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin-bottom: 20px;
        }

        /* MRI 이미지 영역 */
        .image-card {
            background: black;
            color: white;
            height: 500px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
        }

        .mri-placeholder {
            width: 80%;
            height: 80%;
            border: 2px dashed #555;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #aaa;
        }

        /* 결과 텍스트 스타일 */
        .result-item {
            margin-bottom: 15px;
        }

        .label {
            font-weight: bold;
            color: #666;
            display: block;
            margin-bottom: 5px;
        }

        .value.highlight {
            font-size: 1.5em;
            font-weight: bold;
            color: #e74c3c; /* 강조색 (빨강) */
        }

        /* 진행 바 (확신도) */
        .progress-bar-bg {
            background-color: #eee;
            border-radius: 20px;
            overflow: hidden;
            height: 25px;
        }

        .progress-bar-fill {
            background-color: #3498db;
            height: 100%;
            text-align: center;
            color: white;
            line-height: 25px;
            font-size: 0.9em;
            transition: width 1s ease-in-out;
        }

        /* 상태 배지 */
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            background-color: #f1c40f;
            color: white;
            font-weight: bold;
        }

        /* 코멘트 영역 */
        textarea {
            width: 100%;
            height: 150px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            resize: vertical;
            box-sizing: border-box; /* 패딩 포함 크기 계산 */
        }

        .btn-save {
            width: 100%;
            padding: 15px;
            background-color: #27ae60;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 1.1em;
            cursor: pointer;
            margin-top: 10px;
            transition: background 0.3s;
        }

        .btn-save:hover {
            background-color: #219150;
        }
    </style>
    <script src="/com/jquery-3.7.1.js"></script>
    <script src="/com/bootstrap.min.js"></script>
    <script type="text/javascript">
        $(document).ready(function () {
            document.addEventListener("DOMContentLoaded", () => {
                // 1. 가상의 AI 분석 결과 데이터 (나중에 백엔드 API에서 받아올 부분)
                const mockAiResult = {
                    hasTumor: true,          // 종양 발견 여부
                    tumorType: "Glioma",     // 종양 종류
                    confidence: 0.942,       // 확신도 (94.2%)
                    imageUrl: "mri_sample.jpg" // 이미지 경로 (임시)
                };

                // 2. 화면 업데이트 함수 호출
                updateUI(mockAiResult);
            });

            function updateUI(data) {
                const diagnosisType = document.getElementById("diagnosisType");
                const confidenceBar = document.getElementById("confidenceBar");
                const statusBadge = document.getElementById("statusBadge");

                // 진단명 표시
                if (data.hasTumor) {
                    diagnosisType.innerText = `Detected: ${data.tumorType}`;
                    diagnosisType.style.color = "#e74c3c"; // 위험(Red)
                    statusBadge.innerText = "비정상 (Abnormal)";
                    statusBadge.style.backgroundColor = "#e74c3c";
                } else {
                    diagnosisType.innerText = "Normal (정상)";
                    diagnosisType.style.color = "#27ae60"; // 안전(Green)
                    statusBadge.innerText = "정상 (Normal)";
                    statusBadge.style.backgroundColor = "#27ae60";
                }

                // 확신도(Probability) 바 업데이트
                const percentage = (data.confidence * 100).toFixed(1) + "%";
                confidenceBar.style.width = percentage;
                confidenceBar.innerText = percentage;
            }

            function saveData() {
                const comment = document.getElementById("doctorComment").value;

                if(comment.trim() === "") {
                    alert("코멘트를 입력해주세요.");
                    return;
                }

                // 실제로는 여기서 서버(DB)로 데이터를 전송합니다.
                console.log("저장 요청:", {
                    comment: comment,
                    timestamp: new Date()
                });

                alert("성공적으로 저장되었습니다!");
            }
        });
    </script>
</head>

<body>
<div class="container">
    <header class="header">
        <h1>🧠 Brain Tumor AI Analysis</h1>
    </header>

    <div class="main-content">
        <div class="image-section">
            <div class="image-card">
                <h3>Original / AI Overlay</h3>
                <div class="mri-placeholder" id="mriImage">
                    [ MRI 이미지 화면 ]
                </div>
            </div>
        </div>

        <div class="result-section">
            <div class="card result-card">
                <h2>AI Diagnosis Result</h2>
                <div class="result-item">
                    <span class="label">진단명:</span>
                    <span class="value highlight" id="diagnosisType">분석 중...</span>
                </div>
                <div class="result-item">
                    <span class="label">확신도(Confidence):</span>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" id="confidenceBar" style="width: 0%">0%</div>
                    </div>
                </div>
                <div class="status-badge" id="statusBadge">대기 중</div>
            </div>

            <div class="card comment-card">
                <h2>Doctor's Comment</h2>
                <textarea id="doctorComment" placeholder="여기에 의료진의 소견을 입력하세요..."></textarea>
                <button class="btn-save" onclick="saveData()">결과 저장 및 리포트 생성</button>
            </div>
        </div>
    </div>
</div>
</body>
</html>