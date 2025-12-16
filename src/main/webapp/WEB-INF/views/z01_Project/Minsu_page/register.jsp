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
    <title>MadNeduro - 회원가입</title>
    <link rel="stylesheet" href="/com/bootstrap.min.css">
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: 'Noto Sans KR', sans-serif; }
        ::-webkit-scrollbar { display: none; }
        #main {
            width : 100%; min-height : 100vh;
            background-image: url("/images/req1.png");
            background-size: cover; background-repeat: no-repeat; background-position: center;
            display: flex; justify-content: center; align-items: center; padding: 50px 0;
        }
        .register-container {
            background: rgba(20, 20, 30, 0.9); padding: 40px; border-radius: 15px;
            width: 500px; box-shadow: 0 0 20px rgba(0, 200, 255, 0.2); color: #ffffff;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .form-control { background-color: #2b2b3b; border: 1px solid #444; color: white; }
        .form-control:focus { background-color: #333344; color: white; border-color: #0d6efd; box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25); }
        .form-control::placeholder { color: #bbb; }
        .terms-box {
            height: 100px; overflow-y: scroll; background-color: #1a1a20; border: 1px solid #444;
            padding: 10px; font-size: 12px; color: #ccc; margin-bottom: 10px; border-radius: 5px;
        }
        .user-type-selector { display: flex; justify-content: center; gap: 15px; margin-bottom: 20px; }
        .user-type-selector input[type="radio"] { display: none; }
        .user-type-selector label {
            cursor: pointer; padding: 12px 40px; border-radius: 50px; background-color: #1a1a23;
            color: #666; border: 2px solid #333; font-weight: bold;
        }
        .user-type-selector label:hover { border-color: #555; color: #888; }
        .user-type-selector input[type="radio"]:checked + label {
            background-color: #000; color: white; border-color: #000; transform: scale(1.05);
        }
        .user-type-selector input[value="doctor"]:checked + label { background-color: #000; border-color: #000; }
    </style>
    <script src="/com/jquery-3.7.1.js"></script>
    <script src="/com/bootstrap.min.js"></script>
    <script type="text/javascript">
        $(document).ready(function () {
            var isIdChecked = false;
            $("input[name='id']").on("input",function(){
                isIdChecked = false;
            })


            $("input[name='rrn_front']").keyup(function(){
                if($(this).val().length >= 6) {
                    $("input[name='rrn_back']").focus();
                }
            });
            $("input[name='phoneNumber']").keyup(function(){
                var val = $(this).val().replace(/[^0-9]/g, ''); // 숫자만 남기기
                if(val.length > 3 && val.length < 8){
                    val = val.substr(0,3) + "-" + val.substr(3);
                }else if(val.length > 7){
                    val = val.substr(0,3) + "-" + val.substr(3, 4) + "-" + val.substr(7);
                }
                $(this).val(val);
            });

            $("#regBtn").click(function(){
                var id = $("input[name='id']").val();
                var pwd = $("input[name='pwd']").val();
                var pwd2 = $("#pwd2").val();
                var name = $("input[name='name']").val();
                var rrn_front = $("input[name='rrn_front']").val();
                var rrn_back = $("input[name='rrn_back']").val();
                var full_rrn = rrn_front + "-" + rrn_back;
                var phoneNumber = $("input[name='phoneNumber']").val();
                var isAgreed = $("#agreeCheck").is(":checked");

                if(isIdChecked == false){
                    alert("아이디를 중복확인을 해주세요!");
                    $("#checkBtn").focus();
                    return;
                }


                if(id == "") { alert("아이디를 입력해주세요."); $("input[name='id']").focus(); return; }
                if(pwd == "") { alert("비밀번호를 입력해주세요."); $("input[name='pwd']").focus(); return; }
                if(pwd != pwd2) { alert("비밀번호가 일치하지 않습니다."); $("#pwd2").focus(); return; }
                if(name == "") { alert("이름을 입력해주세요."); $("input[name='name']").focus(); return; }

                // 주민번호 검사
                if(rrn_front.length != 6 || rrn_back.length != 7) {
                    alert("주민등록번호를 올바르게 입력해주세요.");
                    $("input[name='rrn_front']").focus();
                    return;
                }

                if(phoneNumber == "") { alert("전화번호를 입력해주세요."); $("input[name='phoneNumber']").focus(); return; }
                if(!isAgreed) { alert("개인정보 수집 및 이용에 동의해주세요."); $("#agreeCheck").focus(); return; }

                if(confirm("가입하시겠습니까?")){
                    $("#final_rrn").val(full_rrn);
                    $("form").submit();
                }
            });

            $("#cancelBtn").click(function(){
                location.href = "${path}/loginpage";
            });
            var msg = "${msg}";
            if(msg != ""){alert(msg);}

            $("#checkBtn").click(function(){
               var id = $("input[name='id']").val();
               if(id == ""){
                   alert("아이디를 입력해주세요.")
                   $("input[name='id']").focus();
                   return;
               }
               $.ajax({
                   type : "get",
                   url : "${path}/checkId",
                   data : "id="+ id,
                   dataType : "text",
                   success : function(data){
                       alert(data);
                       if(data.includes("사용 가능")){
                           isIdChecked = true;
                       } else {
                           isIdChecked = false;
                           $("input[name='id']").val("");
                           $("input[name='id']").focus();
                       }
                   },
                   error : function(err){
                     console.log(err);
                   }
                   }
               )
            });
        });
    </script>
</head>

<body>
<div id="main">

    <div class="register-container">
        <h2 class="text-center fw-bold mb-4">회원가입</h2>

        <form action="${path}/registerProc" method="post">
            <input type="hidden" name="id_card" id="final_rrn">

            <div class="mb-3 text-center">
                <div class="user-type-selector">
                    <input type="radio" name="userType" id="type_gen" value="general" checked>
                    <label for="type_gen">일반 회원</label>

                    <input type="radio" name="userType" id="type_doc" value="doctor">
                    <label for="type_doc">의사 회원</label>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">아이디</label>
                <div class="input-group">
                    <input type="text" name="id" class="form-control" placeholder="아이디 입력">
                    <button type="button" id="checkBtn" class="btn btn-secondary">중복확인</button>
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">비밀번호</label>
                <input type="password" name="pwd" class="form-control" placeholder="비밀번호 입력">
            </div>

            <div class="mb-3">
                <label class="form-label">비밀번호 확인</label>
                <input type="password" id="pwd2" class="form-control" placeholder="비밀번호 재입력">
            </div>

            <div class="mb-3">
                <label class="form-label">이름</label>
                <input type="text" name="name" class="form-control" placeholder="이름 입력">
            </div>

            <div class="mb-3">
                <label class="form-label">주민등록번호</label>
                <div class="d-flex align-items-center gap : 50px">
                    <input type="text" name="rrn_front" class="form-control text-center" maxlength="6" placeholder="생년월일(6자리)">
                    <span class="text-white mx-2" >─</span>
                    <input type="text" name="rrn_back" class="form-control text-center" maxlength=1" placeholder="주민번호 뒷번호 1자리">
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">휴대전화번호</label>
                <input type="text" name="phoneNumber" class="form-control" maxlength="13" placeholder="숫자만 입력 (자동변환)">
            </div>

            <div class="mb-3">
                <label class="form-label text-warning" style="font-size:0.9rem;">개인정보 수집 및 이용 동의</label>
                <div class="terms-box">
                    1. 수집하는 개인정보 항목: 이름, 아이디, 비밀번호, 주민등록번호, 연락처<br>
                    2. 수집 목적: 의료법에 따른 본인 확인 및 진료 예약<br>
                    3. 보유 기간: 회원 탈퇴 시까지 (의료 기록은 법령에 따름)<br>
                    <br>
                    ※ 주민등록번호는 의료법 시행규칙에 의거하여 수집하며, 암호화되어 안전하게 저장됩니다.
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="agreeCheck">
                    <label class="form-check-label" for="agreeCheck">
                        위 약관에 동의합니다. (필수)
                    </label>
                </div>
            </div>

            <div class="d-flex justify-content-center mt-4 ">
                <button type="button" id="regBtn" class="btn btn-secondary btn-lg px-5">가입하기</button>
                <button type="button" id="cancelBtn" class="btn btn-dark btn-lg border-secondary px-5">취소</button>
            </div>
        </form>
    </div>

</div>
</body>
</html>