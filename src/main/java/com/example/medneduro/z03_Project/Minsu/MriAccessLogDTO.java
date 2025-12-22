package com.example.medneduro.z03_Project.Minsu;

import java.util.Date;


public class MriAccessLogDTO {
    private String patientName;
    private String gender;
    private int age;
    private String doctorName;
    private int mriId;
    private Date checkDt;

    public MriAccessLogDTO() {
    }

    public MriAccessLogDTO(String patientName, String gender, int age, String doctorName, int mriId, Date checkDt) {
        this.patientName = patientName;
        this.gender = gender;
        this.age = age;
        this.doctorName = doctorName;
        this.mriId = mriId;
        this.checkDt = checkDt;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public int getMriId() {
        return mriId;
    }

    public void setMriId(int mriId) {
        this.mriId = mriId;
    }

    public Date getCheckDt() {
        return checkDt;
    }

    public void setCheckDt(Date checkDt) {
        this.checkDt = checkDt;
    }
}
