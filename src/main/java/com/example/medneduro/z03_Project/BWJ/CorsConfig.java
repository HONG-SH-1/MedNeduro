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

        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")

                // ✅ 개발 편의상 전체 허용(추후 배포 시 필요한 메서드만 좁히기)
                .allowedMethods("*")

                .allowedHeaders("*")
                .exposedHeaders("*")

                // ✅ 쿠키/세션 안 쓰면 false가 안전
                .allowCredentials(false)

                .maxAge(3600);
    }
}
