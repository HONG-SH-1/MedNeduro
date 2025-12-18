package com.example.medneduro.z03_Project.Minsu;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
// import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    // 1. 암호화 도구 설정! (비밀번호 암호화 및 매칭해주는 메서드!)
    // @Bean이란? 스프링이 자기 보관함에 넣고 직접 관리하는 객체 --> 스프링이 관리하는 공용 객체
    // 일반 객체는 필요할 때마다 new로 생성하지만, 이건 프로그램이 시작 될 때 스프링에서 미리 만들어 보관함에 넣어둔 객체!
    // 만일 PasswordEncoder가 필요할 때마다 새로 만듦 --> 메모리 낭비 + 관리 어려움
    // 필요할 때마다(@Autowired) 보관함에서 꺼내 달라! - 이 보관함에 있는 객체를 Bean이라고 일컴
    // 해시와 솔트는 데이터(금고)를 지키는 기술로 DB가 털려도 비번을 모르게 하는 보안..!
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 2. 보안 설정 (모든 페이지 접속 허용하기)
    // 이 설정이 없으면 만든 페이지에 못 들어가고 로그인 창이 뜸
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                /*
                 CSRF 보안 기능 끄기 (개발 중엔 귀찮음)
                 CSRF란?
                 (Cross-Site Request Forgery)로 한국말로 "사이트 간 요청 위조"
                .을 찍는 이유로는 방금 설정한 그 객체에 대해서 다음 설정도 이어서 하겠다는 의미
                 주로 설정파일에서 많이 사용! (가독성 때문에)
                 나쁜 사이트가 내 권한을 가로채서 요청 보내는 걸 막는 방패 (연습 중엔 번거로워서 잠시 꺼두 됨!)

                .csrf(csrf -> csrf.withDefaults()) // 기본값이지만 명시적으로 표현!
                .csrf(csrf -> csrf.disable()) // csrf 끄기!

                ->란?
                자바 8부터 도입된 문법 람다식으로 해당 값을 받아서(input) -> 이렇게 처리해(Action)라는 의미
                csrf 객체를 받아서 -> 기능을 끄거나 켜라!
                */
                .csrf(withDefaults())
                // 요청에 대한 권한(Authorize) 설정!
                .authorizeHttpRequests(auth -> auth
                        // 어떤 any 요청이든 상관 없다!
                        .anyRequest()
                        // 모두에게 허용! - permit All 해달라!
                        .permitAll()
                );

        return http.build();
    }
}