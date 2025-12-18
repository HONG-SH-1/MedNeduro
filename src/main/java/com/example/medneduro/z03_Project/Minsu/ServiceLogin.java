package com.example.medneduro.z03_Project.Minsu;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.Map;

@Transactional
@Service
public class ServiceLogin {

    @Autowired(required = false)
    private DAOLogin dao;

    // 로그인
    public boolean logincheck(String userType, String id, String pwd) {
        String dbType = "";
        if("general".equals(userType)) dbType = "G";
        if("doctor".equals(userType)) dbType = "D";

        Map<String, String> map1 = new HashMap<>();
        map1.put("ID", id);
        map1.put("PWD", pwd);
        map1.put("USER_TYPE", dbType);
        return dao.logincheck(map1) > 0;
    }

    public int checkId(String id){
        return dao.checkId(id);
    }

    // ★ 회원가입 프로세스
    public String registerProc(Register reg) {

        // 1. 중복 체크
        if(dao.checkId(reg.getId()) > 0) return "DUPLICATE_ID";

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
}