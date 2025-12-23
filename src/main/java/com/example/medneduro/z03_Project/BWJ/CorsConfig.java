package com.example.medneduro.z03_Project.BWJ;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * ✅ CorsConfig (전역 CORS 설정)
 *
 * 개선 포인트:
 * - 탭 닫을 때 서버 파일 삭제를 위해 DELETE 메서드도 허용
 * - 개발 중엔 allowedOriginPatterns("*") OK
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {

        String[] origins = {
                "http://localhost:5500",
                "http://127.0.0.1:5500",
                "http://192.168.0.28:5500"
        };

        // ✅ API용
        registry.addMapping("/api/**")
                .allowedOrigins(origins)
                .allowedMethods("GET","POST","PUT","DELETE","OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);

        // ✅ OBJ 같은 정적 리소스용 (/obj/**)
        registry.addMapping("/obj/**")
                .allowedOrigins(origins)
                .allowedMethods("GET","OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
