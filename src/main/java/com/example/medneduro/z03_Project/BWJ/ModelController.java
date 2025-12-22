package com.example.medneduro.z03_Project.BWJ;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.*;
import java.util.*;

/**
 * ✅ ModelController
 * - 업로드/슬라이스/OBJ 생성 + 파일 서빙 + (추가) 파일 정리(삭제) API
 */
@RestController
@RequestMapping("/api")
public class ModelController {

    private final PythonRunnerService pythonRunnerService;

    public ModelController(PythonRunnerService pythonRunnerService) {
        this.pythonRunnerService = pythonRunnerService;
    }


    @Value("${app.upload-dir}")
    private String uploadDir;

    @Value("${app.output-slice-dir}")
    private String outputSliceDir;

    @Value("${app.output-obj-dir}")
    private String outputObjDir;

    @Value("${app.python-exec}")
    private String pythonExec;

    @Value("${app.python-slice-script}")
    private String sliceScriptPath;

    @Value("${app.python-obj-script}")
    private String objScriptPath;

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("ok", true, "message", "Server is running");
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadNii(@RequestParam("file") MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            return Map.of("ok", false, "message", "File is empty");
        }

        pythonRunnerService.ensureDirExists(uploadDir);

        String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "uploaded.nii");
        String lower = originalName.toLowerCase();

        String ext;
        if (lower.endsWith(".nii.gz")) ext = ".nii.gz";
        else if (lower.endsWith(".nii")) ext = ".nii";
        else ext = ".nii";

        String fileId = UUID.randomUUID().toString().replace("-", "");
        Path savedPath = Paths.get(uploadDir, fileId + ext);

        file.transferTo(savedPath.toFile());

        return Map.of(
                "ok", true,
                "fileId", fileId,
                "originalName", originalName,
                "savedPath", savedPath.toString().replace("\\", "/")
        );
    }

    @PostMapping(value = "/slices", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> makeSlices(@RequestBody Map<String, Object> body) {
        String fileId = String.valueOf(body.get("fileId"));
        String axis = String.valueOf(body.get("axis"));

        Set<String> allowed = Set.of("axial", "coronal", "sagittal");
        if (!allowed.contains(axis)) {
            return Map.of("ok", false, "message", "Invalid axis: " + axis);
        }

        Path niiPath = findUploadedNiiPath(fileId);
        if (niiPath == null) {
            return Map.of("ok", false, "message", "Uploaded NII not found for fileId=" + fileId);
        }

        String outDir = Paths.get(outputSliceDir, fileId, axis).toString();
        pythonRunnerService.ensureDirExists(outDir);
        // v파이썬 실행코드
        List<String> cmd = List.of(
                pythonExec,
                sliceScriptPath,
                "--input", niiPath.toString(),
                "--axis", axis,
                "--outdir", outDir
        );

        Map<String, Object> pyResult = pythonRunnerService.runPython(cmd);

        return Map.of(
                "ok", true,
                "fileId", fileId,
                "axis", axis,
                "sliceCount", pyResult.get("sliceCount"),
                "baseUrl", "/slices/" + fileId + "/" + axis + "/"
        );
    }

    @GetMapping("/slices/{fileId}/{axis}/{filename:.+}")
    public ResponseEntity<FileSystemResource> getSliceImage(
            @PathVariable String fileId,
            @PathVariable String axis,
            @PathVariable String filename
    ) {
        Path filePath = Paths.get(outputSliceDir, fileId, axis, filename);

        if (!Files.exists(filePath)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        MediaType mediaType = MediaType.IMAGE_PNG;
        try {
            String probe = Files.probeContentType(filePath);
            if (probe != null) mediaType = MediaType.parseMediaType(probe);
        } catch (Exception ignored) {}

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(new FileSystemResource(filePath));
    }

    @PostMapping(value = "/obj", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> makeObj(@RequestBody Map<String, Object> body) {
        String fileId = String.valueOf(body.get("fileId"));

        Path niiPath = findUploadedNiiPath(fileId);
        if (niiPath == null) {
            return Map.of("ok", false, "message", "Uploaded NII not found for fileId=" + fileId);
        }

        String outDir = Paths.get(outputObjDir, fileId).toString();
        pythonRunnerService.ensureDirExists(outDir);

        String outObjPath = Paths.get(outDir, "model.obj").toString();

        List<String> cmd = List.of(
                pythonExec,
                objScriptPath,
                "--input", niiPath.toString(),
                "--out", outObjPath
        );

        Map<String, Object> pyResult = pythonRunnerService.runPython(cmd);

        return Map.of(
                "ok", true,
                "fileId", fileId,
                "objUrl", "/obj/" + fileId + "/model.obj",
                "meta", pyResult
        );
    }

    @GetMapping("/obj/{fileId}/{filename:.+}")
    public ResponseEntity<FileSystemResource> getObj(
            @PathVariable String fileId,
            @PathVariable String filename
    ) {
        Path filePath = Paths.get(outputObjDir, fileId, filename);

        if (!Files.exists(filePath)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(new FileSystemResource(filePath));
    }

    /**
     * ✅ (추가) 4) 파일 정리(삭제) API
     *
     * 탭 X를 눌렀을 때 호출할 용도:
     * - uploads/{fileId}.nii or .nii.gz 삭제
     * - outputs/slices/{fileId}/... 폴더 통째 삭제
     * - outputs/obj/{fileId}/... 폴더 통째 삭제
     *
     * URL: DELETE /api/file/{fileId}
     */
    @DeleteMapping("/file/{fileId}")
    public Map<String, Object> deleteFile(@PathVariable String fileId) {
        try {
            boolean uploadDeleted = deleteUpload(fileId);
            boolean slicesDeleted = deleteDirectoryIfExists(Paths.get(outputSliceDir, fileId));
            boolean objDeleted = deleteDirectoryIfExists(Paths.get(outputObjDir, fileId));

            return Map.of(
                    "ok", true,
                    "fileId", fileId,
                    "uploadDeleted", uploadDeleted,
                    "slicesDeleted", slicesDeleted,
                    "objDeleted", objDeleted
            );
        } catch (Exception e) {
            return Map.of(
                    "ok", false,
                    "fileId", fileId,
                    "message", "Delete failed: " + e.getMessage()
            );
        }
    }

    /**
     * ✅ 업로드 파일 삭제(.nii / .nii.gz 둘 다 시도)
     */
    private boolean deleteUpload(String fileId) throws Exception {
        Path nii = Paths.get(uploadDir, fileId + ".nii");
        Path niiGz = Paths.get(uploadDir, fileId + ".nii.gz");

        boolean deletedAny = false;

        if (Files.exists(nii)) {
            Files.delete(nii);
            deletedAny = true;
        }
        if (Files.exists(niiGz)) {
            Files.delete(niiGz);
            deletedAny = true;
        }
        return deletedAny;
    }

    /**
     * ✅ 디렉토리(폴더) 통째 삭제
     * - Files.walk로 하위 파일 먼저 지우고, 마지막에 폴더 지움
     */
    private boolean deleteDirectoryIfExists(Path dir) throws Exception {
        if (!Files.exists(dir)) return false;

        // 어떤 문법? Files.walk(dir) : 하위까지 전부 순회 스트림
        // 역순 정렬: 파일 먼저 삭제 -> 폴더 삭제 가능
        try (var walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder())
                .forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (Exception e) {
                        throw new RuntimeException("Failed to delete: " + p + " / " + e.getMessage(), e);
                    }
                });
        }
        return true;
    }

    private Path findUploadedNiiPath(String fileId) {
        Path nii = Paths.get(uploadDir, fileId + ".nii");
        Path niiGz = Paths.get(uploadDir, fileId + ".nii.gz");

        if (Files.exists(nii)) return nii;
        if (Files.exists(niiGz)) return niiGz;
        return null;
    }
}
