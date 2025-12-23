<%@ page language="java" contentType="text/html; charset=UTF-8"
         pageEncoding="UTF-8"
         import="java.util.*"
%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<c:set var="path" value="${pageContext.request.contextPath}"/>
<fmt:requestEncoding value="UTF-8"/>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>MedNeuro - Login</title>
    <link rel="stylesheet" href="/com/bootstrap.min.css">

    <style>
        /* [변수 설정] */
        :root {
            --bg-dark: #121212;
            --panel-dark: #1E1E1E;
            --input-bg: #2C2C2E;
            --border-color: #3A3A3C;
            --primary-color: #4D79FF; /* MedNeuro 메인 블루 */
            --text-main: #FFFFFF;
            --text-sub: #A0A0A0;
        }

        /* [전체 초기화 및 배경] */
        body, html {
            margin: 0; padding: 0; width: 100%; height: 100%;
            font-family: 'Segoe UI', 'Noto Sans KR', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            overflow: hidden;
            display: flex; justify-content: center; align-items: center;
        }

        /* [메인 컨테이너] */
        .auth-container {
            width: 90%; max-width: 1000px; height: 600px;
            background: var(--panel-dark);
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            display: flex; overflow: hidden;
            border: 1px solid #333;
        }

        /* [왼쪽: 브랜딩 배너] */
        .auth-banner {
            flex: 0.5; /* 50% 너비 */
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            position: relative;
            display: flex; flex-direction: column;
            justify-content: center; padding: 60px;
            color: white; overflow: hidden;
        }

        /* 배경 이미지 오버레이 */
        .auth-banner::before {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('${path}/images/req2.png'); /* 기존 배경 활용 */
            background-size: cover; background-position: center;
            opacity: 0.3; z-index: 1; mix-blend-mode: overlay;
        }

        .banner-content { position: relative; z-index: 2; text-align: left; }
        .brand-logo { font-size: 3rem; font-weight: 800; margin-bottom: 20px; letter-spacing: -1px; }
        .brand-slogan { font-size: 1.2rem; font-weight: 300; color: #ccc; line-height: 1.6; margin-bottom: 40px; }

        /* 기능 리스트 아이콘 스타일 */
        .feature-list { list-style: none; padding: 0; }
        .feature-list li { margin-bottom: 12px; font-size: 1rem; color: #ddd; display: flex; align-items: center; }
        .feature-list li::before {
            content: "✓"; margin-right: 12px; color: var(--primary-color);
            font-weight: bold; font-size: 1.1rem;
        }

        /* [오른쪽: 로그인 폼] */
        .auth-form-wrapper {
            flex: 0.5; /* 50% 너비 */
            background-color: var(--panel-dark);
            display: flex; flex-direction: column; justify-content: center;
            padding: 50px;
        }

        .form-header { margin-bottom: 30px; text-align: left; }
        .form-header h2 { font-size: 2rem; font-weight: bold; margin-bottom: 8px; }
        .form-header p { color: var(--text-sub); margin: 0; font-size: 0.95rem; }

        /* [탭 스타일] */
        .nav-tabs { border-bottom: 2px solid #333; margin-bottom: 25px; }
        .nav-tabs .nav-link {
            color: var(--text-sub); border: none; background: transparent;
            font-weight: 600; padding: 10px 20px; transition: all 0.3s;
        }
        .nav-tabs .nav-link:hover { color: white; }
        .nav-tabs .nav-link.active {
            color: var(--primary-color) !important;
            background: transparent;
            border-bottom: 2px solid var(--primary-color);
            margin-bottom: -2px; /* 라인 겹치기 */
        }

        /* [입력 필드] */
        .form-label { display: none; } /* 모던한 느낌을 위해 라벨 숨김 (placeholder 활용) */

        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            color: white; height: 50px;
            border-radius: 8px; font-size: 1rem; padding: 0 15px;
            margin-bottom: 15px; transition: all 0.3s;
        }
        .form-control:focus {
            background-color: #38383a;
            border-color: var(--primary-color);
            color: white; box-shadow: 0 0 0 3px rgba(77, 121, 255, 0.2);
        }
        .form-control::placeholder { color: #666; }

        /* [버튼] */
        .btn-login {
            width: 100%; height: 50px;
            background-color: var(--primary-color);
            color: white; border: none; border-radius: 8px;
            font-size: 1.1rem; font-weight: bold; cursor: pointer; margin-top: 10px;
            transition: filter 0.2s;
        }
        .btn-login:hover { filter: brightness(1.1); }

        .auth-footer { margin-top: 30px; text-align: center; color: var(--text-sub); font-size: 0.9rem; }
        .link-signup { color: var(--primary-color); text-decoration: none; font-weight: bold; margin-left: 5px; cursor: pointer; }
        .link-signup:hover { text-decoration: underline; }

    </style>

    <script src="/com/jquery-3.7.1.js"></script>
    <script src="/com/bootstrap.min.js"></script>
    <script type="text/javascript">
        function setType(type) {
            $("#userType").val(type);
            $(".nav-link").removeClass("active");

            // 탭 활성화 로직
            if(type === 'general') {
                $("#tab-gen").addClass("active");
            } else {
                $("#tab-doc").addClass("active");
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

<div class="auth-container">

    <div class="auth-banner">
        <div class="banner-content">
            <div class="brand-logo">MedNeuro</div>
            <p class="brand-slogan">
                모든 사람을 위한<br>
                MRI 의료 정보 시스템
            </p>
            <ul class="feature-list">
                <li>환자 의료 기록 관리</li>
                <li>AI 기반 진단 보조</li>
                <li>안전한 데이터 보안</li>
            </ul>
        </div>
    </div>

    <div class="auth-form-wrapper">
        <div class="form-header">
            <h2>로그인</h2>
            <p>로그인 정보를 입력해주세요</p>
        </div>

        <ul class="nav nav-tabs nav-fill">
            <li class="nav-item">
                <a class="nav-link active" id="tab-gen" onclick="setType('general')" href="#">일반 회원</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" id="tab-doc" onclick="setType('doctor')" href="#">의사 회원</a>
            </li>
        </ul>

        <form action="" method="post">
            <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}"/>
            <input type="hidden" name="userType" id="userType" value="general">

            <div class="mb-3">
                <input type="text" name="id" class="form-control" placeholder="아이디">
            </div>

            <div class="mb-4">
                <label class="form-label" for="pwd">비밀번호</label>
                <input id="pwd" type="password" name="pwd" class="form-control" placeholder="비밀번호">
            </div>

            <button type="submit" class="btn-login">로그인</button>
        </form>

        <div class="auth-footer">
            계졍이 없으신가요?
            <span id="reg-btn" class="link-signup">회원 가입 하기</span>
        </div>
    </div>

</div>

</body>
</html>