package com.example.medneduro.z03_Project.Minsu;

import java.util.Date;

public class Register {
    private String id;
    private String pwd;
    private String name;
    private Date brithDate;
    private String gender;
    private String phoneNumber;
    private String userType;

    public Register(){

    }
    public Register(String id, String pwd, String name, Date brithDate, String gender, String phoneNumber, String userType) {
        this.id = id;
        this.pwd = pwd;
        this.name = name;
        this.brithDate = brithDate;
        this.gender = gender;
        this.phoneNumber = phoneNumber;
        this.userType = userType;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Date getBrithDate() {
        return brithDate;
    }

    public void setBrithDate(Date brithDate) {
        this.brithDate = brithDate;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }
}
