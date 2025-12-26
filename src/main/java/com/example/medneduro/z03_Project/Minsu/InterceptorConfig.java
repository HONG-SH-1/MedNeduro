package com.example.medneduro.z03_Project.Minsu;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


// 클래스를 스프링 설정 파일로 등록!
// 스프링 구동시 해당 클래스 내부에 웹 관련 설정이 있는 것을 알고 가장 먼저 읽음
@Configuration
// 웹 설정 인터페이스로 구현
// 스프링 MVC의 기본 기능을 원하는 대로 주무를 수 있도록 해주는 도구 세트(인터페이스)
public class InterceptorConfig implements WebMvcConfigurer {

    // 만든 검문소(LoginInterceptor)을 불러옴
    // LoginInterceptor 객체를 설정 파일로 쏙 넣어줌
    @Autowired
    private LoginInterceptor loginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 검문소 설치 시작!
        // addInterceptors는 인터셉터를 등록하는 전용 메서드!
        // 여기서 registry(등록부)에 등록한 검문소 이름을 올리는 것! (페이지)
        registry.addInterceptor(loginInterceptor)
                // 검사할 주소들(이 주소들은 로그인이 없으면 못들어감)
                .addPathPatterns("/**")

                // 제외할 주소들(로그인 안 해도 보여야할 페이지들)
                // 이 제외를 하지 않으면 해당 페이지로 갔을 때, 또 등록되지 않았다고 처리가 되어 무한 반복이 됨..
                .excludePathPatterns(
                        "/loginpage", // 로그인 화면 및 해당 페이지 로직
                        "/registerPage", // 회원가입 화면 및 가입 처리 로직(이게 있어야 회원가입 가능)
                        /*
                        회원가입 하다가 아이디 중복 확인을 누르면 /checkId 주소로 신호를 보내게 되는데
                        이 때 로그인을 하지 않았다고 다시 로그인페이지로 이동시켜버리는 중대한 오류가 발생함!
                        특정 페이지에 종속된 부품(회원가입)이 아니라 브라우저가 서버에 별도로 요청하는 독립된 주소기 때문에 별개로 허용 필요

                        즉, checkId의 경우 Ajax를 통해 따로 호출되기 때문에 페이지는 허용 O 그러나 별도이기 때문에
                        인터셉터는 메인 페이지로 돌려보낸다..
                        */
                        "/checkId",
                        "/api/logout",

                        "/viewer/css/**",
                        "/viewer/js/**",
                        "/viewer/img/**",
                        "/api/health",

                        // [중요] 정적 리소스 경로를 명확하게 지정해야 CSS/JS가 깨지지 않습니다.
                        "/css/**",
                        "/js/**",
                        "/images/**",
                        "/com/**",          // 부트스트랩 등이 들어있는 폴더
                        "/favicon.ico",     // 웹사이트 아이콘
                        "/error"            // 스프링 기본 에러 페이지
                );

    }

}
