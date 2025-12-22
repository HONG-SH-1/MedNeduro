package com.example.medneduro.z03_Project.Minsu;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // ★ 여기에 실제 파일이 저장된 폴더 경로를 적으세요! (마지막에 슬래시 / 필수)
    // 윈도우 예시: "file:///C:/Users/내이름/Desktop/mri_data/"
    // 맥/리눅스 예시: "file:///Users/내이름/Documents/mri_data/"
    // 만약 프로젝트 안에 있다면 절대경로를 알아내서 적어야 합니다.
    private String path = "file:///C:/MedNeuro/uploads";

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 브라우저에서 /mri-file/ 로 시작하는 주소를 치면
        // 실제 내 컴퓨터의 path 경로에서 파일을 찾겠다는 뜻
        registry.addResourceHandler("/mri-file/**")
                .addResourceLocations(path);
    }
}
