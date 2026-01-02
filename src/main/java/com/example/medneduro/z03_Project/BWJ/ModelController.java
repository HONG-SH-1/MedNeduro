package com.example.medneduro.z03_Project.BWJ;

import com.example.medneduro.z03_Project.Minsu.ServiceLogin;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.*;
import java.util.*;
import java.util.zip.GZIPInputStream;

/**
 * ✅ ModelController
 * - 업로드/슬라이스/OBJ 생성 + 파일 서빙 + (추가) 파일 정리(삭제) API
 */
@RestController
@RequestMapping("/api")
public class ModelController {
    @Autowired
    private Comment2DService comment2DService;
    private final PythonRunnerService pythonRunnerService;
    @Autowired

    private ServiceLogin serviceLogin;


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

    // 변경사항 
    // 파일 확장자만 체크할 뿐만 아니라 저장 전에 실제 DICOM/NIfTI 헤더를 검증하는 로직 추가
    /*
    1. 매직넘버란? - 지문!
    파일을 구분할 때는 확장자만 봄 -> 사용자가 임의로 변경 가능 - 해커가 악성코드가 담긴 .exe 파일을 사진.jpg로 바꿔서 올릴 수 있음
    컴퓨터는 이를 막기 위해 파일의 가장 앞 부분(헤더)에 숨겨진 특수한 바이트 값을 확인하는데, 이것을 매직넘버라고 부름

    NIfTI 파일은 두 가지 버전이 존재, 각각 정해진 위치에 고유한 코드가 있음
    위치: 파일의 맨 앞부터 344바이트 지점 (오프셋344)
    값:
        1) n+1: NIfTI-1 형식을 의미(데이터와 헤더가 합쳐진 .nii)
        2) ni1: NIfTI-1 형식을 의미(.hdr - 헤더와 데이터 - .img가 나뉜 경우)

    DICOM 파일은 맨 처음에 담겨져 있지 않기에 이 부분을 조심해야 됨
    Preamble(128 바이트): 파일의 맨 앞 128바이트는 비어 있거나 특정 소프트웨어가 자유롭게 사용할 수 있는 공간.
    ★ Prefix(4 바이트): 바로 뒤 128~131번 인덱스에 DICM이라는 글자가 등장!

    따라서 new byte[132]만큼 읽을 수 뒤에 4자리만 딱 잘라서 확인..
    89 50 4E 47 - PNG 이미지 파일의 매직 넘버
    */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> uploadNii(@RequestParam("file") MultipartFile file) throws Exception {

        // 파일 이름
        String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "uploaded.nii");
        String lower = originalName.toLowerCase();

        // 1. 기본적인 파일 존재 여부 체크
        if (file == null || file.isEmpty()) {
            return Map.of("ok", false, "message", "File is empty");
        }
        // 2. 실제 파일 헤더 검증 로직 추가
        try(InputStream is = file.getInputStream()) {
            InputStream finalIs = is;
            
            // .gz 압축 파일이라면 압축을 풀어서 내부 매직 넘버를 확인하기
            if(lower.endsWith(".gz")){
                // .gz라면 원본(is)을 압축 해제 도구로 감싸서 새로운 빨대 만들기..
                finalIs = new GZIPInputStream(is);
            }

            // 넉넉하게 읽기
            byte[] header = new byte[350];
            // is가 아니라 압축이 풀리는 finalIs에서 읽기
            int bytesRead = finalIs.read(header);
            System.out.println("읽어온 바이트 수:" + bytesRead);

            if(bytesRead < 350 ){
                return Map.of("ok", false, "message", "유효하지 않은 파일 크기입니다.");
            }

            // DICOM 여부 확인 (128~131 "DICM")
            String dicomMagic = new String(Arrays.copyOfRange(header, 128, 132)); // 129~131
            // BIfTI 여부 확인 (344~346: "n+1 또는 nii")
            String niftiMagic = new String(Arrays.copyOfRange(header, 344, 347)).trim();
            System.out.println("최종 검사 - DICOM: [" + dicomMagic + "], NIfTI: [" + niftiMagic + "]");

            boolean isDicom = dicomMagic.equals("DICM");
            boolean isNifti = niftiMagic.equals("n+1") || niftiMagic.equals("ni1");

            // 둘 다 아니라면 차단시키기
            if(!isDicom && !isNifti) {
                return Map.of("ok",false, "message","지원하지 않는 형식이거나 위변조된 파일입니다.");
            }
        }

        pythonRunnerService.ensureDirExists(uploadDir);

        String ext;
        if (lower.endsWith(".nii.gz")) ext = ".nii.gz";
        else if (lower.endsWith(".nii")) ext = ".nii";
        else ext = ".nii";

        String fileId = UUID.randomUUID().toString().replace("-", "");
        Path savedPath = Paths.get(uploadDir, fileId + ext);

        // 서버에 저장!!
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
        List<String> cmd = List.of(
                pythonExec,
                sliceScriptPath,
                "--input", niiPath.toString(),
                "--axis", axis,
                "--out", outDir
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
        } catch (Exception ignored) {
        }

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
     * <p>
     * 탭 X를 눌렀을 때 호출할 용도:
     * - uploads/{fileId}.nii or .nii.gz 삭제
     * - outputs/slices/{fileId}/... 폴더 통째 삭제
     * - outputs/obj/{fileId}/... 폴더 통째 삭제
     * <p>
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

    @PostMapping(value = "/load-local", consumes = MediaType.APPLICATION_JSON_VALUE)
    /*
        PostMapping : 이 함수는 우체통입니다.
        웹 브라우저(자바스크립트)가 데이터를 보낼 때(Post) 받아주는 역할을 합니다.
        value = "/load-local" : 우체통의 주소입니다. (예 : localhost:8080/api/load-local)
        consumes = MediaType.APPLICATION_JSON_VALUE : 나는 JSON 데이터만 먹습니다. 라는 뜻입니다.
        프론트엔드에서 보낸 데이터가 application/json (JSON 형식) 일 때만 이 자바 함수를 실행시켜라. 만약 다른 형식이 오면 거절하는 문지기 변수입니다.
        MediaType 은 스프링 프레임워크가 만든 데이터 종류 이름표 모음집입니다.
        오타가 발생할 수 있어 미리 정의된 상수(APPLICATION_JSON_VALUE)를 가져다 씁니다.
        APPLICATION_JSON_VALUE = application/json 이라는 문자열으로 바꿔서 읽어줍니다.
    */
    public Map<String, Object> loadLocalFile(@RequestBody Map<String, String> body) throws IOException {
// @RequestBody = 자바스크립트가 보낸 데이터(JSON.stringify(...)) 는 HTTP 요청 본문(Body)이라는 상자에 담겨 옵니다.
// throws IOException : 에러가 발생할 수 있다고 경고하는 것 입니다.
// 파일처리는 예외가 많이 발생하기에 처리하다가 에러가 나면 호출한 곳으로 throw한다는 뜻입니다. (스프링 부트가 알아서 처리)
        String filePath = body.get("filePath");
        // 문자열 경로를 자바가 다룰 수 있는 Path로 변환시키기 String -> Path로 변환
        Path source = Paths.get(filePath);
        // Path : 주소를 나타내는 객체
        // Paths.get(문자열) : 글자로 된 주소를 자바가 이해하는 네비게이션 주소로 바꿔주는 기능입니다.
        // 단순 글자(String)일 때는 기능이 없음, Path 전환하면 복사, 이동, 삭제 명령어 가능..

        // 만약 file.nii 처럼 파일명만 왔을 경우.. 기본 업로드 폴더 경로르 앞에 붙여서 완성시키기!
        if (!source.isAbsolute()) {
            source = Paths.get(uploadDir, filePath);
        }

        // [방어 로직] 실제 그 위치에 파일이 없으면 "없다"고 에러를 보냅니다.
        if (!Files.exists(source)) {
            // Files.exists(...) 주소지에 건물이 진짜 있는지 확인하는 기능입니다. 있으면 true 없으면 false를 반환
            // return Map.of("ok", false, "message","파일이 서버에 없습니다 :" + filePath);
            return Map.of("ok", false, "message", "파일이 서버에 없습니다 :" + source.toString());
        }
        
        // 전체 경로에서 파일 이름만 뚝 떼어내기 (예: "brain_test.nii.gz")
        String fileName = source.getFileName().toString(); // 파일 이름을 문자열로 변환 시킨 후
        String ext = "";
        String fileId = "";

        // 확장자 분리 로직 (.nii.gz 또는 .nii)
        // String ext = originalName.toLowerCase().endsWith(".nii.gz") ? ".nii.gz" : ".nii";
        // ID와 꼬리표(ext) 분리하기
        if (fileName.toLowerCase().endsWith(".nii.gz")) {
            ext = ".nii.gz";
            // 파일명에서 확장자를 뺀 나머지를 ID로 일단 가정
            // 뒤에 7글자(.nii.gz)를 잘라내고 앞부분만 ID로 씁니다
            fileId = fileName.substring(0, fileName.length() - 7);
        } else if (fileName.toLowerCase().endsWith(".nii")) {
            ext = ".nii";
            // 뒤에 4글자(.nii)를 잘라냅니다.
            fileId = fileName.substring(0, fileName.length() - 4);
        } else {
            ext = "";
            fileId = fileName; // 확장자가 없으면 전체를 ID로
        }

        // 내 작업대 (uploaDir)의 절대 경로 가져오기
        Path uploadDirPath = Paths.get(uploadDir).toAbsolutePath();
        // 요청된 파일이 들어있는 부모 폴더의 경로 가져오기
        Path sourceParentPath = source.toAbsolutePath().getParent();

        // 조건: 가져온 파일의 위치가 내 창고(uploadDir)와 똑같다면?
        // "가져온 파일의 부모 폴더가 내 작업대랑 똑같니?"
        if (sourceParentPath != null && sourceParentPath.equals(uploadDirPath)) {
            // 이미 저장된 파일이라면?
            System.out.println("이미 서버에 있는 폴더입니다. (ID 재사용:" + fileName + ")");
            // ★ 중요: Files.copy(복사)를 하지 않고 바로 넘어갑니다!
            // 기존 파일명(UUID)을 그대로 fileId로 사용합니다.
        } else {
            // 외부 파일인 경우(바탕화면, usb 등에서 처음 가져온 경우)

            System.out.println("외부 파일입니다. 서버 폴더로 복사합니다.");

            // 1. 고정 ID 생성 (Random이 아님!)
            // UUID 고유 식별자 - 유일한 난수 ID 생성
            // 파일의 경로 글자(String)를 재료로 UUID를 만듭니다.
            // 경로가 같으면 100번 눌러도 항상 똑같은 ID가 나옵니다.
            fileId = UUID.randomUUID().toString().replace("-", "");
            // 위 코드에서는 random을 사용했지만, nameUUIDformBytes를 사용해도 됨 둘 다 무방..
            // 외부 파일은 어차피 한 번만 들어오고 그 뒤로는 저장된 파일로 빠지기 때문에..
            // 완벽을 추구하려면 nameUUIDFromBytes가 좋음..

            // 2. 복사할 목표 위치 설정 (작업대 + 새ID + 확장자)
            Path targetPath = Paths.get(uploadDir, fileId + ext);

            // 3. 진짜 복사 수행 (이때만 용량이 늘어남)
            // 단, 이미 같은 경로로 만든 파일이 있다면 건너 뜀(StatndardCopyOption 덕분에)
            if (!Files.exists(targetPath)) {
                Files.copy(source, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

        }
    /*
        새 이름표(ID) 만들기
        고유한 ID를 만드는 과정입니다.
        UUID.randomUUID() : 전 세계에서 유일한 무작위 ID를 생성합니다. (예 : 550e8400-e29b-41d4-a716-446655440000)
        .toString() : 문자열로 변경
        .replace("-","") : 중간에 있는 하이픈( - ) 이 보기 싫으니 싹 지워버립니다.
        결과 : 550e8400e29b41d4a716446655440000

        난수 고유한 ID를 만드는 이유!
        1) 중복 방지: 파일 명이 같을 수 있음 - 난수로 이름을 바꾸지 않으면 나중에 올린 파일이 먼저 올린 파일을 지워버림!
        2) 보안: 파일명에 개인정보가 있을 수 있음 - 서버 경로가 노출되어도 해당 파일이 누구의 것인지 알 수 없음!
        3) 일관성: 한글/공백/특수문자가 있으면 파이썬(AI) 프로그램은 읽다 오류가 발생할 수 있음.. -
            난수는 영문/숫자로만 구성이 되어 있기 때문에 시스템간 통신에 매우 안전!
            String originalName = source.getFileName().toString();
            여긴 왜 .replace를 사용하지 않는가..? 실제 이름이라서?


     */
        // 환자 정보 매칭
        // DB에서 이 파일 경로와 관련된 히스토리를 가져오기
        List<Map<String, String>> historyList = serviceLogin.getHistoryList(filePath);
        // 기본값 설정하기 (DB에 없을 경우..)
        String cleanName = "Unknow" + ext;
        // 비교를 위해 현재 파일명을 변수에 담기
        String targetFileName = fileName;

        // DB 기록이 있다면? 분석 시작하기!
        if (historyList != null && !historyList.isEmpty()) {
            // 1. 환자 이름 가져오기 (리스트의 첫 번째 데이터에서 꺼내기)
            Map<String, String> firstItem = historyList.get(0);
            String pName = firstItem.get("patientName");
            // 대소문자 문제나 null 방지용..
            if (pName == null) pName = firstItem.get("PATIENTNAME");
            if (pName == null) pName = "Patient";

            // 2. 순서 찾기
            // 해당 파일이 몇 번째인가?
            int seqNum = 1;
            int totalCount = historyList.size();
            boolean found = false;

            System.out.println("=== 파일 찾기 디버깅 시작 ===");
            System.out.println("찾는 파일명: " + targetFileName);

            // 리스트를 하나씩 돌면서 내 파일명과 동일한게 있는지 찾기..
            for (int i = 0; i < totalCount; i++) {
                Map<String, String> item = historyList.get(i);

                // DB에 저장된 경로를 가져옵니다.
                String dbFullPath = item.get("fileName");
                // null 방지 로직
                if (dbFullPath == null) dbFullPath = item.get("FILENAME");
                if (dbFullPath == null) dbFullPath = item.get("IMAGE_FOLDER_PATH");
                // 경로에서 파일명만 쏙 뽑아오기
                if (dbFullPath != null) {
                    String dbFileName = Paths.get(dbFullPath).getFileName().toString();
                    // 파일을 찾았다면?
                    if (dbFileName.equals(targetFileName)) {
                        // 최신순 정렬이므로 전채 개수에서 현재 인덱스를 빼면 순서 1,2,3..으로 나옴!
                        seqNum = totalCount - i;
                        found = true;
                        // 찾았으면 반복문 종료
                        break;
                    }
                }
            }
            System.out.println("=== 디버깅 종료 (찾았나? " + found + ") ===");

            // (3) 이름 결정 (예: "홍길동_003.nii")
            if (!found) {
                cleanName = pName + "_Unknown" + ext;
            } else {
                // %s:문자열, %03d:숫자를 3자리(001) 포맷팅하기
                cleanName = String.format("%s_%03d%s", pName, seqNum, ext);
            }
        }


        Long medMriId = null;
        String staffId = null;
        String patientId = null;

        List<Map<String, String>> historyListWithIds = serviceLogin.getHistoryListWithIds(filePath);
        if (historyListWithIds != null && !historyListWithIds.isEmpty()) {
            System.out.println("✅ if문 시작 - historyListWithIds 개수: " + historyListWithIds.size());

            // ★ 첫 row 기준으로 가져오기
            Map<?, ?> row = historyListWithIds.get(0);

            // 디버깅: row 내용 전체 출력
            System.out.println("📦 row 내용: " + row);

            // MED_MRI_ID 추출
            Object medObj = row.get("MED_MRI_ID");
            if (medObj == null) medObj = row.get("medMriId");

            if (medObj != null) {
                try {
                    medMriId = Long.valueOf(String.valueOf(medObj));
                    System.out.println("✅ medMriId: " + medMriId);
                } catch (Exception e) {
                    System.err.println("❌ medMriId 변환 실패: " + e.getMessage());
                }
            }

            // STAFF_ID 추출
            Object staffObj = row.get("STAFF_ID");
            if (staffObj == null) staffObj = row.get("staffId");

            if (staffObj != null) {
                staffId = String.valueOf(staffObj);
                System.out.println("✅ staffId: " + staffId);
            }

            // PATIENT_ID 추출
            Object patientObj = row.get("PATIENT_ID");
            if (patientObj == null) patientObj = row.get("patientId");

            if (patientObj != null) {
                patientId = String.valueOf(patientObj);
                System.out.println("✅ patientId: " + patientId);
            }
        }

        // 최종 null 체크 (디버깅용)
        if (medMriId == null) {
            System.out.println("❌ medMriId is null");
        }
        if (staffId == null) {
            System.out.println("❌ staffId is null");
        }
        if (patientId == null) {
            System.out.println("❌ patientId is null");
        }

        return Map.of(
                "ok", true,
                "fileId", fileId, // 탭을 열 때 이 ID를 사용하기
                "originalName", cleanName, // 탭 제목에는 예쁜 이름으로 보여주기
                // 만약 hisotryList가 null이면 빈 리스트를 보내서 js에러 막기..
                "historyList", historyList != null ? historyList : Collections.emptyList(),
                "medMriId", medMriId,
                "staffId", staffId,
                "patientId", patientId
        );
    }

    @RestController
    @RequestMapping("/api/comments")
    public class DiagnosisComment2DController {

        /**
         * ✔ Service 의존성
         * - final + 생성자 주입 (현업 표준)
         */
        private final Comment2DService service;

        /**
         * ✔ 생성자 주입
         * - Lombok 없이 직접 작성
         * - Spring이 자동으로 Bean 주입
         */
        public DiagnosisComment2DController(Comment2DService service) {
            this.service = service;
        }

        /**
         * ✅ 저장 (신규 / 수정)
         * - RequestBody JSON → DTO 자동 바인딩
         * - 반환: { ok: true, commentId: xxx }
         */
        @PostMapping("/2d")
        public Map<String, Object> save(@RequestBody Comment2DDto dto) {
            Long id = service.save(dto);
            return Map.of(
                    "ok", true,
                    "commentId", id
            );
        }

        /**
         * ✅ 조회 (해당 슬라이스의 코멘트 목록)
         * - QueryString 기반 파라미터 바인딩
         */
        @GetMapping("/2d")
        public Map<String, Object> list(
                @RequestParam Long medMriId,
                @RequestParam String axis,
                @RequestParam Integer sliceIndex
        ) {
            List<Comment2DDto> list =
                    service.list(medMriId, axis, sliceIndex);

            return Map.of(
                    "ok", true,
                    "items", list
            );
        }

        /**
         * ✅ 삭제
         * - REST 규칙에 맞게 DELETE 사용
         */
        @DeleteMapping("/2d/{commentId}")
        public Map<String, Object> delete(@PathVariable Long commentId) {
            service.delete(commentId);
            return Map.of("ok", true);
        }

        @GetMapping("/2d/mri")
        public Map<String, Object> listByMri(@RequestParam Long medMriId) {
            List<Comment2DDto> items = service.listByMri(medMriId);
            return Map.of(
                    "ok", true,
                    "count", items.size(),
                    "items", items
            );
        }

    }
}
    /*
        파일이 .nii 인지 .nii.gz (압축파일)인지 확인해서, 복사본에도 똑같은 꼬리표를 붙여줘야 합니다.
        originalName = 원본 파일의 이름을 가져옵니다.
        toLowerCase() = 대문자가 섞여 있을까봐 소문자로 바꿉니다.

    pythonRunnerService.ensureDirExists(uploadDir);
      */

    /*
        폴더가 있으면 그 폴더안에 넣고 없으면 폴더를 새로 생성하는 코드입니다
    // 복사본이 놓일 "정확한 좌표" 계산
    Path targetPath = Paths.get(uploadDir, fileId + ext);

    // 작업대 설정 - 물리적 파일 복사
    Files.copy(source, targetPath, StandardCopyOption.REPLACE_EXISTING);
    */

    /*
        복사할 위치 정하고 복사하기
        Path targetPath (목표 지점 게산) :
            작업대 폴더(uploadDir)안에 + 아까 만든 ID(fileId) + 꼬리표 (ext)를 합친 주소를 만듭니다.
            예: C:/MedNeuro/uploads/ + abcd1234 + .nii
            결과: C:/MedNeuro/uploads/abcd1234.nii (여기가 복사본이 놓일 자리입니다.)
            --> 파일이 저장될 큰 방(up...) + 무작위로 지은 새 이름(filedId) + 원본과 똑같은 꼬리표(ext)
        Files.copy(...) 실제 복사 :
        source : 원본 파일
        targetPaht : 복사본 놓을 자리 (작업대 위)
        REPLACE_EXISTING 만약 폴더에 같은 이름의 파일이 있으면 덮어쓰기(Replace)한다는 에러 방지용 코드입니다.

        복사를 하지 않고 복사본을 만드는 이유!
        => 작업 공간의 분리
        1) 원본 보존: 의료 데이터는 매우 중요, 원본 파일을 직접 열어서 분석하다가 프로그램이 강제로 종료 및 에러가 나면
            원본 데이터가 깨질 위험이 있기 때문에 희생양(복사본)을 만들어 분석에 사용!
        2) 샌드박스 효과: 사용자의 로컬 폴더(C:/User/...)는 서버나 파이썬 엔진이 접근하기에 보안 권한이 복잡할 수 있기에
            서버가 자유롭게 읽고 쓸 수 있는 전용 작업대(uploadDir)로 파일을 가져오기!
        3) 파이썬(AI)서버 연동: 보통 자바가 파일을 받으면 파이썬 서버가 그 파일을 읽어서 AI 분석을 수행함
            이 때, 자바와 파이썬이 공유할 수 있는 "특정 폴더"에 파일이 놓여 있어야 통신이 원활함..

        덮어쓰기가 필요한 이유?
        => 로직의 연속성을 위해
        1) 재시도 처리: 사용자가 파일을 로드 -> 실수로 브라우저를 새로고침 -> 똑같은 파일을 다시 보낼 위험이 있음
            이 때, 덮어쓰기 옵션이 존재 -> "파일이 존재합니다" 에러를 방지 및 불완전한 기존 파일을 지우고 새 파일로 교체!

    List<Map<String, String>> historyList = serviceLogin.getHistoryList(filePath);

    // 기본값 설정 DB에 환자 정보가 없을 때에 설정...
    String cleanName = "Unknow" + ext;

    // DB에 정보가 있다면? => 환자 이름을 꺼내서 파일명으로 쓰기!
        if (historyList != null && !historyList.isEmpty()) {

            // (1) 환자 이름 가져오기 (첫 번째 데이터 기준)
            Map<String, String> firstItem = historyList.get(0);
            String pName = firstItem.get("patientName");
            if (pName == null) pName = firstItem.get("PATIENTNAME"); // 대소문자 방어
            if (pName == null) pName = "Patient";

            // (2) 순서 찾기 로직
            int seqNum = 1;
            int totalCount = historyList.size();
            boolean found = false;

            System.out.println("=== 파일 찾기 디버깅 시작 ===");
            System.out.println("찾는 파일명: " + targetFileName);

            for (int i = 0; i < totalCount; i++) {
                Map<String, String> item = historyList.get(i);

                // DB에서 경로 꺼내기
                String dbFullPath = item.get("fileName");
                if (dbFullPath == null) dbFullPath = item.get("FILENAME");
                if (dbFullPath == null) dbFullPath = item.get("IMAGE_FOLDER_PATH"); // 혹시 몰라 추가

                if (dbFullPath != null) {
                    // [★핵심] DB 경로에서도 "파일명만" 추출해서 비교합니다.
                    // 윈도우(\), 리눅스(/) 경로 구분자 모두 처리
                    String dbFileName = Paths.get(dbFullPath).getFileName().toString();

                    // 디버깅 로그 (콘솔에서 확인 가능)
                    System.out.println("비교 중... DB파일: " + dbFileName + " vs 타겟: " + targetFileName);

                    if (dbFileName.equals(targetFileName)) {
                        // 찾았다!
                        seqNum = totalCount - i; // 최신순 정렬이므로 역순 계산
                        found = true;
                        break;
                    }
                }
            }
            System.out.println("=== 디버깅 종료 (찾았나? " + found + ") ===");

            // (3) 못 찾았으면, 그냥 1번을 부여하거나 "Unknown" 대신 환자 이름이라도 넣기
            if (!found) {
                // 리스트에는 있는데 매칭이 안 된 경우 -> 그냥 최신 파일(마지막 번호)로 간주하거나
                // 최소한 "홍길동_Unknown.nii" 처럼 이름은 살려줍니다.
                cleanName = pName + "_Unknown" + ext;
            } else {
                // 정상적으로 찾은 경우 -> "홍길동_001.nii"
                cleanName = String.format("%s_%03d%s", pName, seqNum, ext);
            }
        }
  */


    // REST API (Ajax 통신)

    /*
        출력 형식
        {
          "ok": true,
          "fileId": 105,
          "originalName": "kim_brain_mri.jpg",
          "historyList": [
        {
          "fileName": "/upload/2024/old_mri_01.jpg",
          "patientName": "홍길동",
          "uploadDt": "2023-12-01 14:00"
        },
        {
          "fileName": "/upload/2024/old_mri_02.jpg",
          "patientName": "홍길동",
          "uploadDt": "2024-05-10 09:30"
        }
        ]
}
    */
