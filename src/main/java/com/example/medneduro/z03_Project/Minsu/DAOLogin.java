package com.example.medneduro.z03_Project.Minsu;

import org.apache.ibatis.annotations.*;
import java.util.Map;

@Mapper
public interface DAOLogin {
    /*
     [보안 로그인 단계 1: 암호화된 비밀번호 추출]
     1. 이유: BCrypt 암호화는 복호화(암호를 다시 평문으로 풀기)가 불가능함.
     2. 원리: SQL에서 직접 "PWD = '1234'"로 비교할 수 없으므로,
     일단 DB에 저장된 암호문($2a$10...)을 자바로 가져와야 하기 때문에
     3. 처리:
     - 입력받은 ID가 DB에 존재하는지 확인.
     - 존재하면 해당 계정의 PASSWORD(암호문)를 String으로 리턴.
     - 존재하지 않으면 null을 리턴 (서비스단에서 null 체크 필수).
     4. 이후 로직: 서비스단에서 passwordEncoder.matches("사용자입력비번", "리턴된암호문")를 실행하여 검증.
    */
    @Select("SELECT PASSWORD FROM INTEGRATED_ACCOUNT WHERE USER_TYPE=#{USER_TYPE} AND UPPER(LOGIN_ID) = UPPER(#{ID})")
    String getEncodedPassword(Map<String, String> map);

    // 2. ID 중복체크
    @Select("SELECT count(*) FROM INTEGRATED_ACCOUNT WHERE UPPER(LOGIN_ID) = UPPER(#{id})")
    int checkId(String id);
    /*
    INT는 NULL을 가질 수 없기 때문에 COUNT(*) - 조건이 없을 때도 숫자 0이라는 값을 받기 위해 사용

    Integer을 사용하지 않은 이유!
    Integer은 값이 없을 수 있다! 즉, 0점과 nulㅣ(미응시)를 구분하기 위해 워퍼클래스 사용
    DB의 ID(pk)키는 Long / Integer을 많이 씀,, 객체가 생성되기 전에는 ID가 없을 수 있기 때문에..!
    JPA(엔티티)도 참조 타입이어야 하므로 래퍼 클래스 권장!

    단!!
    값이 무조건 존재한다! 즉, NN일 경우 무조건 int 사용!
    SELECT/UPDATE/DELETE도 - 0행 수행이 됨! - 이라는 것을 보여주기 위해서 권장!
    무겁게 워퍼 클래스가 아닌 INT로 처리
    반복문도 동일한 느낌처럼 가볍고 연산 속도가 빠른 INT! - 메모리를 적게 먹음

    결과가 확실히 숫자다 (COUNT, 개수, 연산) -> int (가볍고 빠름)

    값이 비어있을 수도 있다 (DTO, 입력값, DB 조회) ->  Integer (null 표현 가능)

    UPPER 사용?
    로그인 아이디와 비밀번호를 모두 대문자로 통일하여 해당 아이디의 철자는 같지만, 대소문자가 다르면 로그인이 될 수 있기 때문에
    이 점을 방지하고자 UPPER 혹은 LOWER 처리 !
    PWD는 대소문자 및 특수문자 사용 가능이기 때문에 받고 보안 처리..

    Tip
    Request/Response DTO - Integer : 입력값이 안 들어올 수도 있으니까 (null 대비).
    DB 컬럼이 NULL 허용 - Integer : DB의 NULL을 자바에서도 표현해야 함!
    DB 컬럼이 NOT NULL -	int (또는 Integer) : 값이 100% 보장되지만, DTO 통일성을 위해 Integer를 사용하긴 함
    SQL 결과 - (Count, 행 개수) - int : 결과는 무조건 숫자(0 포함)
    산술 연산 / 루프 - int : NullPointerException 걱정 없고 빠름

    but,,, Integer의 경우 산술 연산시 자바는 내부적으로 Unboxing 처리를 하려고 하지만, null인 값을 벗기려고 하면
    에러(NullPointerException)가 나옴!!
    그래서 보통 삼항연산자 (값)?"ㅁ":"ㅁ"를 많이 사용함!
     */



    // 3. [공통] 통합 계정 생성
    // 실행 시 SEQ_INTEGRATED_ACCOUNT.NEXTVAL로 번호를 따서 reg.accountId에 넣어줍니다.
    @Insert("INSERT INTO INTEGRATED_ACCOUNT " +
            "(ACCOUNT_ID, LOGIN_ID, PASSWORD, USER_TYPE, LAST_LOGIN_DATE, JOIN_DATE) " +
            "VALUES (#{accountId}, #{id}, #{pwd}, #{userType}, NULL, SYSDATE)")
    // 일반회원이든, 의사든 이 SelectKey를 통해 시퀀스 번호를 가져옴
    // keyProperty = 값 --> 해당 값이 Register 객체의 setAccountId(값)을 강제로 실행!
    // 이후 #{accountId}를 통해 할당된 값을 가져옴..
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
            "#{email, jdbcType=VARCHAR}, " +
            "#{phoneNumber, jdbcType=VARCHAR}, " +
            "#{gender, jdbcType=CHAR}, " +
            "#{birthDate, jdbcType=VARCHAR})")
    int insertGeneralMember(Register reg);


    // ================= [의료진 (D) - 기존 매칭 (SELECT -> UPDATE)] =================
    // 4. 의료진 정보 확인
    // (이름 + 면허번호 + 부서코드) -> 해당 계정 아이디 유무 확인
    @Select("SELECT NVL(ACCOUNT_ID, 0) FROM MEDICAL_STAFF " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo, jdbcType=VARCHAR} " +
            "AND DEPT_ID = #{deptId, jdbcType=VARCHAR}")
    Integer findMedicalStaffAccountId(Register reg);

    // 5. 의료진 계정 연결
    // (이름 + 면허번호 + 부서코드) -> 해당 의사로 조건문 설정
    // 생성된 통합계정 아이디를 해당 컬럼에 넣어줌
    @Update("UPDATE MEDICAL_STAFF SET ACCOUNT_ID = #{accountId} " +
            "WHERE STAFF_NAME = #{name} " +
            "AND LICENSE_NO = #{licenseNo} " +
            "AND DEPT_ID = #{deptId}")
    int linkMedicalStaffAccount(Register reg);
}

/*
추후 팁!
COUNT(*) 외에도 MAX(), MIN(), SUM(), AVG() 같은 함수를 사용할 때!
이 경우에는 0이 아닌 null이 나오기 때문에 워퍼 클래스 Integer을 사용하는 것을 권장..!



 */