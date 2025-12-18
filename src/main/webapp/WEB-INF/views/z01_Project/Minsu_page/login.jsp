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
    <title>MadNeduro Login</title>
    <link rel="stylesheet" href="/com/bootstrap.min.css">
    <style>
        /* 1. 전체 배경 설정 */
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            font-family: 'Noto Sans KR', sans-serif;
            overflow: hidden;

            /* 배경 이미지 설정 */
            background-image: url("/images/req2.png");
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;

            /* 중앙 정렬을 위한 Flexbox */
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* 배경 위에 어두운 막을 씌워 카드 집중도 향상 */
        body::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6); /* 60% 어둡게 */
            backdrop-filter: blur(5px);      /* 배경 흐림 효과 */
            z-index: -1;
        }

        /* 2. 중앙 플로팅 카드 (핵심) */
        .login-card {
            width: 900px;  /* 카드의 전체 너비 */
            height: 550px; /* 카드의 전체 높이 */
            background-color: #1a1a1a;
            border-radius: 20px; /* 둥근 모서리 */
            box-shadow: 0 15px 35px rgba(0,0,0,0.8); /* 깊은 그림자 */
            display: flex; /* 좌우 분할 */
            overflow: hidden; /* 자식 요소가 둥근 모서리를 넘치지 않게 */
            border: 1px solid rgba(255,255,255,0.1);
        }

        /* 3. 카드 왼쪽: 브랜드 영역 (레퍼런스의 파란 부분 -> 다크 그라데이션으로 변경) */
        .card-left {
            width: 50%;
            padding: 50px;
            background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); /* 고급스러운 다크 블루 그라데이션 */
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
        }

        /* 장식용 원 (레퍼런스의 배경 무늬 흉내) */
        .card-left::after {
            content: "";
            position: absolute;
            top: -50px; left: -50px;
            width: 200px; height: 200px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
        }

        .brand-title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 20px;
            color: #E5F2F2;
        }

        .brand-desc {
            font-size: 1rem;
            color: #aaa;
            margin-bottom: 40px;
            line-height: 1.6;
        }

        /* 기능 리스트 아이콘 스타일 */
        .feature-list { list-style: none; padding: 0; }
        .feature-list li {
            margin-bottom: 15px;
            font-size: 0.95rem;
            color: #ccc;
            display: flex;
            align-items: center;
        }
        .feature-list li::before {
            content: "✔";
            margin-right: 10px;
            color: #0d6efd; /* 파란색 체크 */
            font-weight: bold;
        }

        /* 4. 카드 오른쪽: 로그인 폼 영역 */
        .card-right {
            width: 50%;
            padding: 50px;
            background-color: #1a1a20; /* 폼 배경은 아주 어두운 색 */
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        /* 로그인 폼 제목 */
        .login-header {
            font-size: 1.8rem;
            font-weight: bold;
            color: white;
            margin-bottom: 30px;
        }

        /* 입력창 스타일 (다크 테마) */
        .form-control {
            background-color: #2b2b3b;
            border: 1px solid #444;
            color: white;
            height: 45px;
        }
        .form-control:focus {
            background-color: #333344;
            color: white;
            border-color: #0d6efd;
            box-shadow: none;
        }
        .form-label { color: #ccc; font-size: 0.9rem;}

        /* 탭 스타일 커스텀 */
        .nav-tabs { border-bottom: 1px solid #444; margin-bottom: 20px; }
        .nav-tabs .nav-link {
            color: #888;
            border: none;
            background: transparent;
        }
        .nav-tabs .nav-link.active {
            color: white !important;
            background-color: #2b2b3b;
            border-radius: 5px 5px 0 0;
            font-weight: bold;
            border: 1px solid #444;
            border-bottom: none;
        }

        /* 반응형: 화면이 작아지면 세로로 배치 */
        @media (max-width: 900px) {
            .login-card { width: 90%; height: auto; flex-direction: column; }
            .card-left { width: 100%; padding: 30px; height: 200px; }
            .card-right { width: 100%; padding: 30px; }
            .feature-list { display: none; } /* 모바일에서 리스트 숨김 */
        }
    </style>
    <script src="/com/jquery-3.7.1.js"></script>
    <script src="/com/bootstrap.min.js"></script>
    <script type="text/javascript">
        function setType(type) {
            $("#userType").val(type);

            $(".nav-link").removeClass("active");
            if(type === 'general') {
                $(".nav-link").eq(0).addClass("active");
            } else {
                $(".nav-link").eq(1).addClass("active");
            }
        }

        $(document).ready(function() {
            $("form").submit(function(){
                var id = $("input[name='id']").val();
                var pwd = $("input[name='pwd']").val();

                if(id === ""){
                    alert("아이디를 입력해주세요.")
                    $("input[name='id']").focus();
                    return false;
                }
                if(pwd === ""){
                    alert("비밀번호를 입력해주세요.")
                    $("input[name='pwd']").focus();
                    return false;
                }
            });

            $("#reg-btn").click(function(){
                location.href="/registerPage";
            });

            var msg = "${msg}";
            if(msg !== "") { alert(msg); }
        })
    </script>
</head>

<body>

<div class="login-card">

    <div class="card-left">
        <div class="brand-title">MadNeduro</div>
        <p class="brand-desc">
            환자 관리와 진료 예약을 위한<br>
            통합 의료 정보 시스템
        </p>
        <ul class="feature-list">
            <li>실시간 진료 예약</li>
            <li>환자 의료 기록 관리</li>
            <li>AI 기반 진단 보조</li>
            <li>안전한 데이터 보안</li>
        </ul>
    </div>

    <div class="card-right">
        <div class="login-header">Login</div>

        <ul class="nav nav-tabs nav-fill" id="loginTab">
            <li class="nav-item">
                <a class="nav-link active" onclick="setType('general')">일반 회원</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" onclick="setType('doctor')">의사 회원</a>
            </li>
        </ul>

        <form action="/loginProc" method="post">
            <input type="hidden" name="userType" id="userType" value="general">

            <div class="mb-3">
                <label class="form-label">아이디</label>
                <input type="text" name="id" class="form-control" placeholder="아이디를 입력하세요">
            </div>

            <div class="mb-4">
                <label class="form-label">비밀번호</label>
                <input type="password" name="pwd" class="form-control" placeholder="비밀번호를 입력하세요">
            </div>

            <button type="submit" class="btn btn-primary w-100 py-2">로그인</button>
        </form>

        <button id="reg-btn" type="button" class="btn btn-outline-secondary w-100 mt-3 py-2">회원가입</button>
    </div>

</div>

</body>
</html>