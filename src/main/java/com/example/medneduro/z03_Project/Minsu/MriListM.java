package com.example.medneduro.z03_Project.Minsu;

// import java.util.Date;

public class MriListM {

    // 1. SQL에서 조회하는 컬럼(별칭)과 이름을 똑같이 맞춰줍니다.
    private String medMriId;      // [추가됨] ID가 있어야 상세페이지 이동 가능
    private String fileName;      // 파일명
    private String status;        // [추가됨] AI 분석 상태
    private String uploadDt;      // [추가됨] 업로드 날짜 (String으로 받음)

    private String patientName;   // 환자 이름
    private String gender;        // 성별
    private String birthDate;     // 생년월일

    // 2. 타입을 Date -> String으로 변경 (SQL에서 TO_CHAR로 변환했기 때문)
    private String lastCheckTime;

    public MriListM() {
    }

    // 생성자, Getter, Setter (필드가 늘어났으니 다시 생성해야 합니다)

    public String getMedMriId() { return medMriId; }
    public void setMedMriId(String medMriId) { this.medMriId = medMriId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getUploadDt() { return uploadDt; }
    public void setUploadDt(String uploadDt) { this.uploadDt = uploadDt; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getBirthDate() { return birthDate; }
    public void setBirthDate(String birthDate) { this.birthDate = birthDate; }

    public String getLastCheckTime() { return lastCheckTime; }
    public void setLastCheckTime(String lastCheckTime) { this.lastCheckTime = lastCheckTime; }
}