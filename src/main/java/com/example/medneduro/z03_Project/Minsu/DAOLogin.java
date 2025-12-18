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

    // 3. [공통] 통합 계정 생성
    // 실행 시 SEQ_INTEGRATED_ACCOUNT.NEXTVAL로 번호를 따서 reg.accountId에 넣어줍니다.
    @Insert("INSERT INTO INTEGRATED_ACCOUNT " +
            "(ACCOUNT_ID, LOGIN_ID, PASSWORD, USER_TYPE, LAST_LOGIN_DATE, JOIN_DATE) " +
            "VALUES (#{accountId}, #{id}, #{pwd}, #{userType}, NULL, SYSDATE)")
    @SelectKey(statement = "SELECT SEQ_INTEGRATED_ACCOUNT.NEXTVAL FROM DUAL",
            keyProperty = "accountId", before = true, resultType = int.class)
    int insertAccount(Register reg);

    // ================= [일반 사용자 (G) - 신규 가입 (INSERT)] =================
    // 용도: '일반 회원'으로 가입할 때 실행됩니다.
    //        UPDATE가 아니라 INSERT(새로 만들기)
    //       'GEN-' || SEQ... 구문으로 고유번호(GEN_ID)를 자동 생성합니다.
    @Insert("INSERT INTO GENERAL " +
            "(GENERAL_ID, ACCOUNT_ID, GENERAL_NAME, EMAIL, PHONE_NUMBER, GENDER, BIRTH_DATE) " +
            "VALUES " +
            "('GEN-' || SEQ_GENERAL_MEMBER.NEXTVAL, #{accountId}, #{name}, " +
            "#{email, jdbcType=VARCHAR}, " +       // <-- 수정됨!
            "#{phoneNumber, jdbcType=VARCHAR}, " + // <-- 수정됨!
            "#{gender, jdbcType=CHAR}, " +         // <-- 수정됨!
            "#{birthDate, jdbcType=VARCHAR})")     // <-- 수정됨!
    int insertGeneralMember(Register reg);


    // ================= [의료진 (D) - 기존 매칭 (SELECT -> UPDATE)] =================
    // 4. 의료진 정보 확인 (이름 + 면허번호 + 부서코드)
    @Select("SELECT NVL(ACCOUNT_ID, 0) FROM MEDICAL_STAFF " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo} " +
            "AND DEPT_ID = #{deptId}")
    Integer findMedicalStaffAccountId(Register reg);

    // 5. 의료진 계정 연결
    @Update("UPDATE MEDICAL_STAFF SET ACCOUNT_ID = #{accountId} " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo} " +
            "AND DEPT_ID = #{deptId}")
    int linkMedicalStaffAccount(Register reg);
}