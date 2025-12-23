package com.example.medneduro.z03_Project.Minsu;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.PublicKey;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
// 위 임포트는 비밀번호 보안을 위해 추가 됨..

@Transactional
@Service
public class ServiceLogin {

    @Autowired(required = false)
    private DAOLogin dao;

    // 암호화 도구(Bean) 설정
    @Autowired
    private PasswordEncoder passwordEncoder;

    // 로그인
    public boolean logincheck(String userType, String id, String pwd) {
        // 1. DB 타입 변환
        // dbType란?
        // 데이터 다이어트로 화면에서 사용자 타입을 general 또는 doctor라는 긴 단어로 받지만. 이를 약어로 설정하는 것!
        String dbType = "";
        // DB에 보낼 짧은 이름을 담을 빈 바구니
        if("general".equals(userType)) dbType = "G";
        // 화면에서 "general" 넘어옴 -> "G"를 담아!
        if("doctor".equals(userType)) dbType = "D";
        // 화면에서 "doctor" 넘어옴 -> "D"를 담아!

        // 2. DAO에 보낼 파라미터 준비 (비밀번호는 굳이 안 담아도 됨)
        Map<String, String> map1 = new HashMap<>();
        map1.put("ID", id);
        map1.put("USER_TYPE", dbType);

        // 3. DB에서 암호화된 비밀번호 문자열을 가져옴
        String encodedPassword = dao.getEncodedPassword(map1);

        // 4. [방어 로직] 아이디가 틀려서 DB에 결과가 없으면 encodedPassword는 null임!
        if (encodedPassword == null) {
            return false; // 아이디가 없으니 바로 실패 처리
        }

        /*
         5. [핵심] 암호화 전용 비교 메서드 활용 (Spring Security)
          1. 메커니즘:
         - 스프링 시큐리티의 'BCrypt' 알고리즘을 사용하여 보안 검증을 수행함.
          2. 내부 동작 (matches):
         - DB에 저장된 암호문에서 자동으로 'Salt(소금)' 값을 추출하여 분리함.
         - 로그인 창에 입력된 '평문 비밀번호'에 추출한 소금을 동일하게 배합함.
         - 소금이 뿌려진 입력값을 다시 해싱(Hashing) 처리하여 새로운 암호문을 생성함.
         - 최종적으로 생성된 값과 DB의 해싱 값을 비교하여 일치 여부를 판별함.
          3. matches()를 사용하는 이유:
         - BCrypt는 'Salt'를 사용하기 때문에 동일한 비밀번호도 생성 시마다 결과값이 달라짐.
         - 따라서 자바의 일반적인 문자열 비교(==, equals)로는 대조가 불가능함.
         - matches() 메서드만이 내부적인 솔트 추출 및 재해싱 과정을 거쳐 정확한 검증이 가능함.
         */
        return passwordEncoder.matches(pwd, encodedPassword);
    }

    public int checkId(String id){
        return dao.checkId(id);
    }

    // ★ 회원가입 프로세스
    public String registerProc(Register reg) {

        // 1. 중복 체크
        if(dao.checkId(reg.getId()) > 0) return "DUPLICATE_ID";

        // 비밀번호 암호화 실행하는 로직!
        // 사용자가 입력한 생 비밀번호를 암호화 시킴.. --> 암호화 시킨 값을 DTO에 세팅하는 코드
        String securePassword = passwordEncoder.encode(reg.getPwd());
        reg.setPwd(securePassword);

        // 2. 성별 변환
        String rawGender = reg.getGender();
        if("1".equals(rawGender) || "3".equals(rawGender)) reg.setGender("M");
        else if("2".equals(rawGender) || "4".equals(rawGender)) reg.setGender("F");

        // 3. 타입 변환
        String rawType = reg.getUserType();
        if("general".equals(rawType)) reg.setUserType("G");
        if("doctor".equals(rawType)) reg.setUserType("D");

        // 4. 분기 처리
        if("G".equals(reg.getUserType())) {
            // ==========================================
            // [CASE 1] 일반 사용자 (General) -> 신규 생성
            // ==========================================

            // 1) 통합 계정 생성 (먼저 실행해서 accountId 확보)
            dao.insertAccount(reg);

            // 2) 일반 사용자 정보 테이블에 INSERT
            int result = dao.insertGeneralMember(reg);

            if(result == 0) {
                throw new RuntimeException("일반 사용자 정보 등록 실패");
            }

        } else if("D".equals(reg.getUserType())) {
            
            //  의료진 (Doctor) -> 매칭

            // 1) 이름+면허번호+부서번호를 DAO단에서 매칭 후, 조회된 ACCOUNT_ID 값을 저장.
            Integer existingAccountId = dao.findMedicalStaffAccountId(reg);

            // 2) 정보 없음 (회사에 등록된 의사가 아님)
            if(existingAccountId == null) return "STAFF_NOT_FOUND";

            // 3) 이미 가입된 계정이 있음
            if(existingAccountId != 0) return "ALREADY_REGISTERED";

            // 4) 통합 계정 생성
            dao.insertAccount(reg);

            // 5) 의료진 테이블 연결 (Update)
            if(dao.linkMedicalStaffAccount(reg) == 0) {
                throw new RuntimeException("의료진 연결 실패");
            }
        }

        return "SUCCESS";
    }

    public List<MriListM> getMyMriList(String loginId){
        return dao.getMriList(loginId);
    }

}