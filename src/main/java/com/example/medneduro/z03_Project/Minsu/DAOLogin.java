package com.example.medneduro.z03_Project.Minsu;

import org.apache.ibatis.annotations.*;
import java.util.Map;

@Mapper
public interface DAOLogin {

    // 1. 로그인
    @Select("SELECT COUNT(*) FROM INTEGRATED_ACCOUNT WHERE USER_TYPE=#{USER_TYPE} AND UPPER(LOGIN_ID) = UPPER(#{ID}) AND PASSWORD=#{PWD}")
    int logincheck(Map<String, String> map);

    // 2. ID 중복체크
    @Select("SELECT count(*) FROM INTEGRATED_ACCOUNT WHERE UPPER(LOGIN_ID) = UPPER(#{id})")
    int checkId(String id);

    // 3. 통합 계정 생성
    @Insert("INSERT INTO INTEGRATED_ACCOUNT " +
            "(ACCOUNT_ID, LOGIN_ID, PASSWORD, USER_TYPE, LAST_LOGIN_DATE, JOIN_DATE) " +
            "VALUES (#{accountId}, #{id}, #{pwd}, #{userType}, NULL, SYSDATE)")
    @SelectKey(statement = "SELECT SEQ_INTEGRATED_ACCOUNT.NEXTVAL FROM DUAL",
            keyProperty = "accountId", before = true, resultType = int.class)
    int insertAccount(Register reg);

    // ================= [환자 (G) 매칭: 이름+폰+생일+성별] =================
    @Select("SELECT NVL(ACCOUNT_ID, 0) FROM GENERAL " +
            "WHERE GENERAL_NAME = #{name} " +
            "AND PHONE_NUMBER = #{phoneNumber} " +
            "AND BIRTH_DATE = #{birthDate} " +
            "AND GENDER = #{gender}")
    Integer findPatientAccountId(Register reg);

    @Update("UPDATE PATIENT SET ACCOUNT_ID = #{accountId} " +
            "WHERE PATIENT_NAME = #{name} " +
            "AND PHONE_NUMBER = #{phoneNumber} " +
            "AND BIRTH_DATE = #{birthDate} " +
            "AND GENDER = #{gender}")
    int linkPatientAccount(Register reg);

    @Update("UPDATE PATIENT SET ACCOUNT_ID = #{accountId} " +
            "WHERE PATIENT_NAME = #{name} " +
            "AND PHONE_NUMBER = #{phoneNumber} " +
            "AND BIRTH_DATE = #{birthDate} " +
            "AND GENDER = #{gender}")
    int linkGeneralAccount(Register reg);

    // ================= [의료진 (D) 매칭: 이름+면허번호+부서코드] =================
    // ★ 수정됨: 전화번호 대신 면허번호(Unique)와 부서코드로 정확하게 찾습니다.
    @Select("SELECT NVL(ACCOUNT_ID, 0) FROM MEDICAL_STAFF " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo} " +
            "AND DEPT_ID = #{deptId}")
    Integer findMedicalStaffAccountId(Register reg);

    // ★ 수정됨: 위 조건과 동일하게 업데이트
    @Update("UPDATE MEDICAL_STAFF SET ACCOUNT_ID = #{accountId} " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo} " +
            "AND DEPT_ID = #{deptId}")
    int linkMedicalStaffAccount(Register reg);
}