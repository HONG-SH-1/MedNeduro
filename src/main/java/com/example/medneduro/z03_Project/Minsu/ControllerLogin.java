package com.example.medneduro.z03_Project.Minsu;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

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

    @PostMapping("loginProc")
    public String loginProcess(@RequestParam(name="id", defaultValue = "") String id,
                               @RequestParam(name="pwd", defaultValue = "") String pwd,
                               @RequestParam(name="userType", defaultValue = "") String userType,
                               Model d, HttpSession session) {
        if (id == null || id.trim().isEmpty() || pwd == null || pwd.trim().isEmpty()) {
            d.addAttribute("msg","아이디와 비밀번호를 모두 입력해주세요!");
            return "z01_Project/Minsu_page/login";
        }
        if (service.logincheck(userType, id, pwd)) {
            session.setAttribute("userType", userType);
            session.setAttribute("id", id);
            // session.setAttribute("pwd", pwd); // 보안상 비번은 세션에 안 담는 게 좋음
            if (userType.equals("general")) {
                return "redirect:/viewer/index.html";
            }
            if (userType.equals("doctor")) {
                return "redirect:/viewer/index.html";
            }
        } else {
            d.addAttribute("msg", "아이디 혹은 비밀번호가 틀렸습니다 다시 로그인 해주세요.");
            return "z01_Project/Minsu_page/login";
        }
        return "z01_Project/Minsu_page/login";
    }

    // ... (페이지 이동 매핑 유지) ...
    @GetMapping("maindoctorpage")
    public String maindoctorpage() { return "z01_Project/Minsu_page/maindoctor"; }
    @GetMapping("maingeneralpage")
    public String maingeneralpage() { return "z01_Project/Minsu_page/maingeneral"; }
    @GetMapping("registerPage")
    public String registerPage() { return "z01_Project/Minsu_page/register"; }


    // ★ 회원가입 처리 (수정됨)
    @PostMapping("registerProc")
    public String registerProc(Register register, RedirectAttributes d) {
        // 서비스 결과(String) 받기
        String result = service.registerProc(register);

        if(result.equals("SUCCESS")) {
            d.addFlashAttribute("msg", "회원가입이 완료되었습니다! 로그인 해주세요.");
            return "redirect:/loginpage";
        }
        else if(result.equals("DUPLICATE_ID")) {
            d.addFlashAttribute("msg", "이미 사용 중인 아이디입니다.");
            return "redirect:/registerPage";
        }
        // 동일 인물 데이터 유효성 검사 수정 전
        else if(result.equals("PATIENT_NOT_FOUND")) {
            d.addFlashAttribute("msg", "일치하는 환자 정보가 없습니다. 병원 원무과에 문의해주세요.");
            return "redirect:/registerPage";
        }
        else {
            d.addFlashAttribute("msg", "회원가입 중 오류가 발생했습니다.");
            return "redirect:/registerPage";
        }
    }

    @GetMapping("checkId")
    @ResponseBody
    public String checkId(@RequestParam(name="id",defaultValue = "") String id){
        int count = service.checkId(id);
        if(count == 0){
            return "사용 가능한 아이디입니다."; // JSP Ajax 로직에 맞춰 메시지 조정
        } else {
            return "중복된 아이디입니다.";
        }
    }
    // http://localhost:8080/test1Page
    @GetMapping("test1Page")
    public String test1Page() {return "z01_Project/Minsu_page/test1";}

    // http://localhost:8080/test2Page
    @GetMapping("test2Page")
    public String test2Page() {return "z01_Project/Minsu_page/test2";}
}

