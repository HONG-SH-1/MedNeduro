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
    <title>MedNeuro - Create Account</title>
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

        /* [전체 레이아웃 초기화] */
        body, html {
            margin: 0; padding: 0; width: 100%; height: 100%;
            font-family: 'Segoe UI', 'Noto Sans KR', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            overflow: hidden; /* 전체 스크롤 방지 */
            display: flex; justify-content: center; align-items: center;
        }

        /* [메인 컨테이너: 분할 화면] */
        .auth-container {
            width: 90%; max-width: 1200px; height: 85vh;
            background: var(--panel-dark);
            border-radius: 20px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6);
            display: flex; overflow: hidden;
            border: 1px solid #333;
        }

        /* [왼쪽: 브랜딩 배너 영역] */
        .auth-banner {
            flex: 0.45; /* 45% 너비 */
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            position: relative;
            display: flex; flex-direction: column;
            justify-content: space-between; padding: 60px;
            color: white; overflow: hidden;
        }

        /* 배경 이미지 오버레이 (선택사항: 이미지가 있다면 url 변경) */
        .auth-banner::before {
            content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('${path}/images/req2.png'); /* 기존 배경 이미지 활용 */
            background-size: cover; background-position: center;
            opacity: 0.4; z-index: 1; mix-blend-mode: overlay;
        }

        .banner-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; }
        .brand-logo { font-size: 2.5rem; font-weight: 800; margin-bottom: 10px; letter-spacing: -1px; }
        .brand-desc { font-size: 1.1rem; color: #ccc; font-weight: 300; }
        .brand-footer { margin-top: auto; font-size: 0.9rem; color: rgba(255,255,255,0.5); }

        /* [오른쪽: 입력 폼 영역] */
        .auth-form-wrapper {
            flex: 0.55; /* 55% 너비 */
            background-color: var(--panel-dark);
            display: flex; flex-direction: column;
            padding: 40px 60px;
            overflow-y: auto; /* ★ 세로 스크롤 허용 */
        }

        /* 스크롤바 디자인 */
        .auth-form-wrapper::-webkit-scrollbar { width: 6px; }
        .auth-form-wrapper::-webkit-scrollbar-thumb { background-color: #333; border-radius: 3px; }
        .auth-form-wrapper::-webkit-scrollbar-track { background-color: transparent; }

        .form-header { margin-bottom: 30px; }
        .form-header h2 { font-size: 2rem; font-weight: bold; margin-bottom: 10px; }
        .form-header p { color: var(--text-sub); margin: 0; }

        /* [입력 필드 커스텀 스타일] */
        .form-label { color: var(--text-sub); font-size: 0.9rem; margin-bottom: 6px; font-weight: 500; }

        .form-control {
            background-color: var(--input-bg);
            border: 1px solid var(--border-color);
            color: white;
            padding: 12px 15px; border-radius: 8px; font-size: 0.95rem;
            transition: all 0.3s;
        }
        .form-control:focus {
            background-color: #38383a;
            border-color: var(--primary-color);
            color: white; box-shadow: 0 0 0 2px rgba(77, 121, 255, 0.2);
        }
        .form-control::placeholder { color: #555; }

        /* [회원 유형 탭] */
        .user-type-selector {
            display: flex; background-color: var(--input-bg);
            border-radius: 8px; padding: 4px; margin-bottom: 25px;
            border: 1px solid var(--border-color);
        }
        .user-type-selector input[type="radio"] { display: none; }
        .user-type-selector label {
            flex: 1; text-align: center; padding: 10px 0; cursor: pointer;
            border-radius: 6px; color: var(--text-sub); font-weight: 600; font-size: 0.95rem;
            transition: all 0.3s;
        }
        .user-type-selector input[type="radio"]:checked + label {
            background-color: #404042; color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        /* [버튼 스타일] */
        .btn-auth-primary {
            width: 100%; padding: 14px;
            background-color: var(--primary-color);
            color: white; border: none; border-radius: 8px;
            font-size: 1rem; font-weight: bold; cursor: pointer; margin-top: 10px;
            transition: filter 0.2s;
        }
        .btn-auth-primary:hover { filter: brightness(1.1); }

        .btn-check-custom {
            background-color: #3A3A3C; color: #ddd; border: 1px solid var(--border-color);
            border-radius: 0 8px 8px 0; transition: 0.2s;
        }
        .btn-check-custom:hover { background-color: #555; color: white; }

        .btn-cancel {
            width: 100%; padding: 14px; background: transparent;
            border: 1px solid var(--border-color); color: var(--text-sub);
            border-radius: 8px; font-weight: 600; margin-top: 10px;
            transition: 0.2s;
        }
        .btn-cancel:hover { border-color: #666; color: white; }

        /* [약관 박스] */
        .terms-box {
            background-color: var(--input-bg); border: 1px solid var(--border-color);
            color: var(--text-sub); padding: 15px; border-radius: 8px;
            font-size: 0.85rem; height: 100px; overflow-y: auto; margin-bottom: 10px;
            line-height: 1.5;
        }

        /* [유틸] */
        .text-accent { color: var(--primary-color); cursor: pointer; text-decoration: none; }
        .d-none-custom { display: none; }

        #checkBtn{
            font-size: 13px;
        }
        .terms-box::-webkit-scrollbar{
          display: none;
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
    </style>

    <script src="/com/jquery-3.7.1.js"></script>
    <script src="/com/bootstrap.min.js"></script>
    <script type="text/javascript">
        $(document).ready(function () {
            // [기존 로직 유지]
            var isIdChecked = false;
            $("input[name='id']").on("input",function(){ isIdChecked = false; })

            $("input[name='birthDate']").keyup(function(){
                if($(this).val().length >= 8) { $("input[name='gender']").focus(); }
            });

            $("input[name='phoneNumber']").keyup(function(){
                var val = $(this).val().replace(/[^0-9]/g, '');
                if(val.length > 3 && val.length < 8){
                    val = val.substr(0,3) + "-" + val.substr(3);
                }else if(val.length > 7){
                    val = val.substr(0,3) + "-" + val.substr(3, 4) + "-" + val.substr(7);
                }
                $(this).val(val);
            });

            // 의사/일반 회원 토글 애니메이션 적용
            $("input[name='userType']").change(function(){
                if($(this).val() == 'doctor') {
                    $("#doctorFields").slideDown(300);
                } else {
                    $("#doctorFields").slideUp(300, function(){
                        $("input[name='licenseNo']").val("");
                        $("input[name='deptId']").val("");
                    });
                }
            });

            $("#regBtn").click(function(){
                var id = $("input[name='id']").val();
                var pwd = $("input[name='pwd']").val();
                var pwd2 = $("#pwd2").val();
                var name = $("input[name='name']").val();
                var birthDate = $("input[name='birthDate']").val();
                var gender = $("input[name='gender']").val();
                var phoneNumber = $("input[name='phoneNumber']").val();
                var isAgreed = $("#agreeCheck").is(":checked");
                var userType = $("input[name='userType']:checked").val();

                if(isIdChecked == false){ alert("아이디 중복확인을 해주세요!"); $("#checkBtn").focus(); return; }
                if(id == "") { alert("아이디를 입력해주세요."); $("input[name='id']").focus(); return; }
                if(pwd == "") { alert("비밀번호를 입력해주세요."); $("input[name='pwd']").focus(); return; }
                if(pwd != pwd2) { alert("비밀번호가 일치하지 않습니다."); $("#pwd2").focus(); return; }
                if(name == "") { alert("이름을 입력해주세요."); $("input[name='name']").focus(); return; }

                if(userType == 'doctor') {
                    var licenseNo = $("input[name='licenseNo']").val();
                    var deptId = $("input[name='deptId']").val();
                    if(licenseNo == "") { alert("의사 면허 번호를 입력해주세요."); $("input[name='licenseNo']").focus(); return; }
                    if(deptId == "") { alert("부서 번호를 입력해주세요."); $("input[name='deptId']").focus(); return; }
                }

                if(birthDate.length != 8 || gender.length != 1) {
                    alert("주민등록번호를 올바르게 입력해주세요."); $("input[name='birthDate']").focus(); return;
                }
                if(phoneNumber == "") { alert("전화번호를 입력해주세요."); $("input[name='phoneNumber']").focus(); return; }
                if(!isAgreed) { alert("개인정보 수집 및 이용에 동의해주세요."); $("#agreeCheck").focus(); return; }

                if(confirm("가입하시겠습니까?")){ $("form").submit(); }
            });
            // 취소 버튼 삭제 ;; 12월 23일
            <%--$("#cancelBtn").click(function(){ location.href = "${path}/loginpage"; });--%>
            <%--var msg = "${msg}"; if(msg != ""){ alert(msg); }--%>

            $("#checkBtn").click(function(){
                var id = $("input[name='id']").val();
                if(id == ""){ alert("아이디를 입력해주세요."); $("input[name='id']").focus(); return; }
                $.ajax({
                    type : "get", url : "${path}/checkId", data : "id="+ id, dataType : "text",
                    success : function(data){
                        alert(data);
                        if(data.includes("사용 가능")){ isIdChecked = true; }
                        else { isIdChecked = false; $("input[name='id']").val(""); $("input[name='id']").focus(); }
                    },
                    error : function(err){ console.log(err); }
                })
            });
        });
    </script>
</head>

<body>
<div class="auth-container">

    <div class="auth-banner">
        <div class="banner-content">
            <div>
                <div class="brand-logo">MedNeuro</div>
                <div class="brand-desc">MRI 3D 의료 정보 시스템</div>
            </div>
            <div class="brand-footer">
                &copy; 2025 MedNeuro. All Rights Reserved.
            </div>
        </div>
    </div>

    <div class="auth-form-wrapper">
        <div class="form-header">
            <h2>회원 가입</h2>
            <p>회원 정보를 입력해주세요.</p>
        </div>

        <form action="" method="post">
            <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}"/>

            <div class="user-type-selector">
                <input type="radio" name="userType" id="type_gen" value="general" checked>
                <label for="type_gen">일반 회원</label>

                <input type="radio" name="userType" id="type_doc" value="doctor">
                <label for="type_doc">의사 회원</label>
            </div>

            <div id="doctorFields" style="display: none;">
                <div class="row mb-3">
                    <div class="col-6">
                        <label class="form-label">의사 면허 번호</label>
                        <input type="text" name="licenseNo" class="form-control" placeholder="의사 면허 번호">
                    </div>
                    <div class="col-6">
                        <label class="form-label">부서 번호</label>
                        <input type="number" name="deptId" class="form-control" placeholder="부서 번호" step="10" max="100" min="0">
                    </div>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">아이디</label>
                <div class="input-group">
                    <input type="text" name="id" class="form-control" placeholder="ID" style="border-right: 0;">
                    <button type="button" id="checkBtn" class="btn btn-check-custom">중복확인</button>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">비밀번호</label>
                <input type="password" name="pwd" class="form-control" placeholder="비밀번호를 입력해주세요.">
            </div>

            <div class="mb-3">
                <label class="form-label">비밀번호 확인</label>
                <input type="password" id="pwd2" class="form-control" placeholder="비밀번호를 다시 입력해주세요.">
            </div>

            <div class="mb-3">
                <label class="form-label">이름</label>
                <input type="text" name="name" class="form-control" placeholder="이름">
            </div>

            <div class="mb-3">
                <label class="form-label">주민등록번호</label>
                <div class="d-flex align-items-center gap-2">
                    <input type="text" name="birthDate" class="form-control text-center" maxlength="8" placeholder="생년월일(8자리)">
                    <span style="color:#555">─</span>
                    <input type="text" name="gender" class="form-control text-center" maxlength="1" placeholder="●" >
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">휴대전화번호</label>
                <input type="text" name="phoneNumber" class="form-control" maxlength="13" placeholder="010-0000-0000">
            </div>

            <div class="mb-4">
                <label class="form-label text-warning">약관 동의</label>
                <div class="terms-box">
                    1. 수집 항목: 이름, 아이디, 비밀번호, 주민번호, 연락처<br>
                    2. 목적: 본인 확인 및 진료 예약 시스템 활용<br>
                    3. 보유 기간: 회원 탈퇴 시까지<br>
                    ※ 귀하의 정보는 암호화되어 안전하게 보호됩니다.
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="agreeCheck" style="background-color: var(--input-bg); border-color: #555;">
                    <label class="form-check-label" for="agreeCheck" style="color: var(--text-sub); font-size: 0.9rem;">
                        위 약관에 동의합니다. (필수)
                    </label>
                </div>
            </div>

            <button type="button" id="regBtn" class="btn-auth-primary">회원가입</button>
            <div class="text-center mt-3">
                <span style="color: var(--text-sub); font-size: 0.9rem;">계정이 있으신가요?</span>
                <a href="${path}/loginpage" class="text-accent" style="font-weight: bold; font-size: 0.9rem;">로그인 창으로 이동</a>
            </div>
        </form>
    </div>
</div>
</body>
</html>