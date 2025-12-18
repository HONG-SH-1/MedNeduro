package com.example.medneduro.z03_Project.BWJ;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

/**
 * ✅ PythonRunnerService (안정성 개선 버전)
 *
 * 핵심:
 * 1) stdout/stderr를 동시에 읽어서 버퍼 데드락 방지
 * 2) stdout이 여러 줄일 때 마지막 JSON 라인을 파싱 시도(방어)
 */
@Service
public class PythonRunnerService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> runPython(List<String> command) {
        ProcessBuilder pb = new ProcessBuilder(command);

        // ✅ 필요하면 작업 폴더 고정(상대경로/리소스 문제 방지)
        // pb.directory(new File("C:/MedNeuro"));

        ExecutorService es = Executors.newFixedThreadPool(2);

        try {
            Process process = pb.start();

            // ✅ Future로 stdout/stderr 동시 수집
            Future<String> outFuture = es.submit(() -> readAll(process.getInputStream()));
            Future<String> errFuture = es.submit(() -> readAll(process.getErrorStream()));

            int exitCode = process.waitFor();

            // ✅ 출력 수집 (시간 제한으로 무한 대기 방지)
            String stdout = outFuture.get(10, TimeUnit.SECONDS);
            String stderr = errFuture.get(10, TimeUnit.SECONDS);

            if (exitCode != 0) {
                throw new RuntimeException(
                        "Python failed (exitCode=" + exitCode + ")\n" +
                                "STDOUT:\n" + stdout + "\n" +
                                "STDERR:\n" + stderr
                );
            }

            if (stdout == null || stdout.trim().isEmpty()) {
                throw new RuntimeException(
                        "Python returned empty stdout.\n" +
                                "STDERR:\n" + stderr
                );
            }

            // ✅ stdout이 여러 줄이면 마지막 JSON 줄을 우선 파싱
            String jsonCandidate = extractLastJsonLine(stdout);

            return objectMapper.readValue(jsonCandidate, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to run python: " + e.getMessage(), e);
        } finally {
            es.shutdownNow(); // ✅ 항상 스레드 종료
        }
    }

    /**
     * ✅ InputStream 전체 읽기
     * - try-with-resources: 자동 close
     */
    private String readAll(InputStream is) throws IOException {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }

    /**
     * ✅ stdout에 여러 줄이 있을 수 있을 때, JSON처럼 생긴 마지막 줄을 골라 파싱
     * - 외부 스크립트가 실수로 print를 섞는 경우 방어
     */
    private String extractLastJsonLine(String stdout) {
        String[] lines = stdout.split("\\R"); // \\R: 어떤 줄바꿈이든 분리
        for (int i = lines.length - 1; i >= 0; i--) {
            String line = lines[i].trim();
            if (line.startsWith("{") && line.endsWith("}")) {
                return line;
            }
        }
        return stdout.trim();
    }

    /**
     * ✅ 디렉토리 생성 유틸
     */
    public void ensureDirExists(String dirPath) {
        try {
            java.nio.file.Files.createDirectories(java.nio.file.Paths.get(dirPath));
        } catch (IOException e) {
            throw new RuntimeException("Failed to create directory: " + dirPath, e);
        }
    }
}
