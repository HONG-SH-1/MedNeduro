package com.example.medneduro.z03_Project.Minsu;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;


// 푸쉬테스트 # 작성자 변운조
@Controller
public class ControllerLogin {
    @Autowired(required = false)
    private ServiceLogin service;
    // http://localhost:8080/loginpage
    // ... (로그인 관련 코드는 기존 유지) ...
    @GetMapping("loginpage")
    public String loginpage() {
        return "z01_Project/Minsu_page/login";
    }

    @PostMapping("loginpage")
    public String loginProcess(@RequestParam(name="id", defaultValue = "") String id,
                               @RequestParam(name="pwd", defaultValue = "") String pwd,
                               @RequestParam(name="userType", defaultValue = "") String userType,
                               Model d, HttpSession session) {
        // 아이디는 영문과 숫자만 허용하는 정규식
        if(!id.matches("^[a-zA-Z0-9]*$")){
            d.addAttribute("msg","아이디는 영문과 숫자만 입력 가능합니다.");
            return "z01_Project/Minsu_page/login";
        }
        // .isEmpty()는 문자열의 길이가 0인지 확인 -> ""(빈 문자열)인지 확인
        // 내부적으로는 str.length() == 0 와 동일!
        if (id == null || id.trim().isEmpty() || pwd == null || pwd.trim().isEmpty()) {
            // null 체크를 먼저 하는 이유로는 문자열이 null 인 상태로 호출하면 NullPointerException가 발생!
            // 따라서 이렇게 순서로 체크 혹은 공백까지 제거!
            d.addAttribute("msg","아이디와 비밀번호를 모두 입력해주세요!");
            return "z01_Project/Minsu_page/login";
        }



        // 서비스단에서 비밀번호 대조 후 그 값을 컨트롤 단으로 다시 불러서 확인!
        // matches()의 결과값 SUCCESS/WRONG_PWD를 여기서 받음
        String result = service.logincheck(userType, id, pwd);
        if ("SUCCESS".equals(result)) {
            // [인증 성공] 세션에 증표 젖아(비밀번호는 저장 x!!!!)
            session.setAttribute("userType", userType);
            session.setAttribute("id", id);

                return "general".equals(userType) ? "redirect:/viewer/index.html" : "redirect:/maindoctorpage";
            /*
            ### 세션을 사용하는 이유! ###
            1. 저장의 타이밍!
            브라우저에서 각 값들을 담아 서버에 전송(submit)
            서버는 db의 암호회된 비번을 가져와서 확인하는데, 이 때 해당 메서드가 true가 되는 찰나에 컨트롤러에서 세션 실행!
            이후 사용자가 브라우저를 종료 및 로그아웃 전까지는 아이디와 타입을 기억하게 됨

            2. 세션에 저장하는 이유!
            웹 브라우저와 서버는 단기 기억 상실증(HTTP의 Stateless 특성)으로 인해 세션에 저장
            세션에 아이디와 타입을 담아두면 다른 페이지로 이동 할 때마다 증표처럼 사용 가능!
            심지어 다른 컨트롤러나 jsp에서도 요긴하게 사용 가능!


            session.setAttribute("pwd", pwd);
            보안상 비번은 세션에 안 담는 게 좋음
            사용자 식별[ID + 사용자 유형(userType)] 값만 세션에 저장. 비밀번호는 로그인이 완료된 시점부터는 더 이상 필요하지 않으며,
            만약 세션 하이재킹(Session Hijacking) 공격을 당할 경우 비밀번호가 노출될 위험 -> 보안을 위해 세션에 저장 X!
             */

        }  else {
            if("NO_ID".equals(result)){
                d.addAttribute("msg","존재하지 않는 아이디입니다.");
            } else {
                d.addAttribute("msg","비밀번호가 일치하지 않습니다.");
            }
        }
        return "z01_Project/Minsu_page/login";
    }

    // 페이지 이동 매핑 유지 -> 뷰 매핑
    @GetMapping("maindoctorpage")
    public String maindoctorpage(Model d, HttpSession session

                                 ) {

        // 1. 세션에서 로그인한 의사 ID 가져오기
        String loginId = (String) session.getAttribute("id");


        // 2. 로그인 상태라면 리스트 조회
        if (loginId != null) {
            // Service에 있는 getMyMriList 메서드 호출
            List<MriListM> list = service.getMyMriList(loginId);

            // 3. 모델에 담기 (이름: "recentLogs")
            // 이제 JSP에서 ${recentLogs}로 사용할 수 있게 됩니다.
            d.addAttribute("recentLogs", list);
            d.addAttribute("patientList", list);

            System.out.println("조회된 리스트 개수: " + list.size()); // (로그 확인용)
        }

        return "z01_Project/Minsu_page/maindoctor";
    }
    // return으로 페이지 전환
    @GetMapping("maingeneralpage")
    public String maingeneralpage(Model d) {


        return "z01_Project/Minsu_page/maingeneral";
    }
    @GetMapping("registerPage")
    public String registerPage() { return "z01_Project/Minsu_page/register"; }

    //http://localhost:8080/registerPage

    // ★ 회원가입 처리 (수정 완료 버전)
    @PostMapping("registerPage")
    public String registerProc(Register register, RedirectAttributes d) {

        // 1. 서비스 호출
        String result = service.registerProc(register);

        // 형식 검증하기 - DB에 가기 전에 입구에서 차단!
        // 영문과 숫자만 허용 (XSS 및 Injection 공격 방지)
        if(register.getId() != null && !register.getId().matches("^[a-zA-Z0-9]*$")) {
            d.addFlashAttribute("msg", "아이디는 영문과 숫자만 사용할 수 있습니다.");
            return "redirect:/registerPage";
        }


    /*
    기존 if문 여러번을 사용하면 DB에 조회, 저장하는 2번의 통신을 하지만
    tyy-catch를 사용하면 일단 DB 저장 후 오류가 나면 그 때 처리하는 방법!!

    */
    try{ // try 시도 중 에러가 나면 catch 블록으로 점프
        // 2. 결과에 따른 메시지 처리 (DB 에러 없이 로직상 리턴된 경우)
        if(result.equals("SUCCESS")) {
            d.addFlashAttribute("msg", "회원가입이 완료되었습니다! 로그인 해주세요.");
            return "redirect:/loginpage"; // 성공 시 로그인 페이지로
        }

        // --- 실패 케이스들 (모두 다시 가입 페이지로 튕겨줌) ---
        else if(result.equals("DUPLICATE_ID")) {
            d.addFlashAttribute("msg", "이미 사용 중인 아이디입니다.");
        }
        else if("STAFF_NOT_FOUND".equals(result)) {
            d.addFlashAttribute("msg", "등록된 의료진 정보가 없습니다. 인사팀에 문의하세요.");
        }
        else if("ALREADY_REGISTERED".equals(result)) {
            d.addFlashAttribute("msg", "이미 가입된 의료진 계정이 있습니다.");
        }
        else {
            d.addFlashAttribute("msg", "회원가입 중 알 수 없는 오류가 발생했습니다.");
        }
        // DataIntegrityViolationException = 무결성 제약 조건 위반 에러
    } catch(DataIntegrityViolationException e) {
        // 여기서 DB 무결성 에러(주민번호/전화번호 중복 등)를 낚아채기!
        System.out.println("DB 중복 에러 발생: "+ e.getMessage()); // 로그용
        d.addFlashAttribute("msg","이미 가입된 회원 정보(주민번호 등)입니다.");
        // redircer하면 Model에 담은 데이터는 날아가지만, addFlashAttribute는 단 한 번 다음페이지 까지 살아서 메시지르 전달해줌
    } catch (Exception e){
        // 그 외 예상치 못한 모든 에러 처리
        e.printStackTrace();
        d.addFlashAttribute("msg","시스템 에러가 발생했습니다. 관리자에게 문의하세요.");
    }
        // 실패 시 공통적으로 가입 페이지로 리다이렉트
        return "redirect:/registerPage";
    }

    @GetMapping("checkId")
    @ResponseBody // Ajax를 사용할 친구
    public String checkId(@RequestParam(name="id",defaultValue = "") String id){
        int count = service.checkId(id);
        if(count == 0){
            return "사용 가능한 아이디입니다."; // JSP Ajax 로직에 맞춰 메시지 조정
        } else {
            return "중복된 아이디입니다.";
        }
    }
    // 로그아웃 프로세스
    // 세션의 모든 정보(id, userType 등)를 즉시 삭제하고 로그인 페이지로 이동합니다.
    @PostMapping("/api/logout")
    @ResponseBody
    public String logout(HttpSession session){
        session.invalidate();
        return "ok";
        // ok로 보내줘야 Ajax를 사용 가능함
    }








    // http://localhost:8080/test1Page
    @GetMapping("test1Page")
    public String test1Page() {return "z01_Project/Minsu_page/test1";}

    // http://localhost:8080/test2Page
    @GetMapping("test2Page")
    public String test2Page() {return "z01_Project/Minsu_page/test2";}
}

