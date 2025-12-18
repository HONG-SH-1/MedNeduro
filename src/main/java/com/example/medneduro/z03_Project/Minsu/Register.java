package com.example.medneduro.z03_Project.Minsu;

import org.springframework.format.annotation.DateTimeFormat;

import java.util.Date;

public class Register {
        // [1] 계정 정보
        private Integer accountId;       // DB 생성 ID
        private String id;           // 로그인 ID
        private String pwd;          // 비번
        private String userType;     // "general"(G) / "doctor"(D)

        // [2] 공통 개인 정보
        private String name;         // 이름 (필수)
        private String phoneNumber;  // 전화번호 (환자 매칭용)
        private String email;        // 이메일

        // [3] 환자 전용 (G)
        private String birthDate;    // 생년월일 (환자 매칭용)
        private String gender;       // 성별 (환자 매칭용)

        // [4] 의료진 전용 (D) - ★ 추가된 부분
        private String licenseNo;    // 의사 면허 번호 (의사 매칭 핵심)
        private String deptId;       // 진료과 코드 (의사 매칭 핵심)


    public Register() {
    }

    public Register(Integer accountId, String id, String pwd, String userType, String name, String phoneNumber, String email, String birthDate, String gender, String licenseNo, String deptId) {
        this.accountId = accountId;
        this.id = id;
        this.pwd = pwd;
        this.userType = userType;
        this.name = name;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.birthDate = birthDate;
        this.gender = gender;
        this.licenseNo = licenseNo;
        this.deptId = deptId;
    }

    public int getAccountId() {
        return accountId;
    }

    public void setAccountId(Integer accountId) {
        this.accountId = accountId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPwd() {
        return pwd;
    }

    public void setPwd(String pwd) {
        this.pwd = pwd;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(String birthDate) {
        this.birthDate = birthDate;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getLicenseNo() {
        return licenseNo;
    }

    public void setLicenseNo(String licenseNo) {
        this.licenseNo = licenseNo;
    }

    public String getDeptId() {
        return deptId;
    }

    public void setDeptId(String deptId) {
        this.deptId = deptId;
    }
}
