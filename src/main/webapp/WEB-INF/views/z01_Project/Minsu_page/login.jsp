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
    body, html {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden;
        font-family: 'nato sans kr', sans-serif;
    }
    #banner{
        width: 100%;
        height : 10%;
        color : #E5F2F2;
        font-family: 'nato sans kr', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    #main {
        width: 100%;
        height: 100vh;
        background-image:url("/images/main.png");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        flex-direction: column;
    }
    .login-container {
        width: 400px;
        margin: 100px auto;
        background: rgba(0, 0, 0, 0.9);
        padding: 30px;
        border-radius: 10px;
    }
    form ,li {
        color : white;
    }
    .nav-tabs .nav-link { cursor: pointer;}
    .nav-tabs .nav-link.active {
        color: black !important;
        background-color: white;
        font-weight: bold;
    }
    .nav-tabs .nav-link {
        color: rgba(255, 255, 255, 0.5);
    }
    .nav-tabs .nav-link:hover {
        color: white;
        border-color: white;
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
                console.log("현재 로그인 모드: " + type);
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

                })
            })
    </script>
</head>

<body>
    <div id="main">
        <div id="banner">
            <h2>MadNeduro</h2>
        </div>
        <div class="login-container">
            <ul class="nav nav-tabs nav-fill" id="loginTab">
                <li class="nav-item">
                    <a class="nav-link active" onclick="setType('general')">일반 회원</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" onclick="setType('doctor')">의사 회원</a>
                </li>
            </ul>
            <form action="/loginProc" method="post" class="mt-4">
                <input type="hidden" name="userType" id="userType" value="general">
                <div class="mb-3">
                    <label class="form-label">아이디</label>
                    <input type="text" name="id" class="form-control" placeholder="아이디를 입력하세요">
                </div>
                <div class="mb-3">
                    <label class="form-label">비밀번호</label>
                    <input type="password" name="pwd" class="form-control" placeholder="비밀번호를 입력하세요">
                </div>
                <button type="submit" class="btn btn-primary w-100">로그인</button>
            </form>
                <button id="reg-btn" type="button" class="btn btn-secondary w-100 mt-3">회원가입</button>

        </div>
    </div>
</body>
<script type="text/javascript">
    var msg = "${msg}";
    if(msg !== "") {alert(msg);}

</script>
</html>