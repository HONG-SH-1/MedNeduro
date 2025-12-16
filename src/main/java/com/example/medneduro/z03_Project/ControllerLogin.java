package com.example.medneduro.z03_Project;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class ControllerLogin {
    @Autowired(required = false)
    private ServiceLogin service;



    // http://localhost:8080/loginpage
    @GetMapping("loginpage")
    public String loginpage() {
        return "z01_Project/login";
    }

    @PostMapping("loginProc")
    public String loginProcess(@RequestParam(name="id", defaultValue = "") String id,
                            @RequestParam(name="pwd", defaultValue = "") String pwd,
                            @RequestParam(name="userType", defaultValue = "") String userType,
                            Model d, HttpSession session) {
        if ( id == null || id.trim().isEmpty() || pwd == null || pwd.trim().isEmpty() ) {
            d.addAttribute("msg","아이디와 비밀번호를 모두 입력해주세요!");
            return "z01_Project/login";
        }
        if (service.logincheck(userType, id, pwd)) {
            session.setAttribute("userType", userType);
            session.setAttribute("id", id);
            session.setAttribute("pwd", pwd);
            if (userType.equals("general")) {
                return "redirect:/maingeneralpage";
            }
            if (userType.equals("doctor")) {
                return "redirect:/maindoctorpage";
            }
        }
            else {
                d.addAttribute("msg", "아이디 혹은 비밀번호가 틀렸습니다 다시 로그인 해주세요.");
                return "z01_Project/login";
        }
        return "z01_Project/login";
    }
    @GetMapping("maindoctorpage")
    public String maindoctorpage() {
        return "z01_Project/maindoctor";
    }
    @GetMapping("maingeneralpage")
    public String maingeneralpage() {
        return "z01_Project/maingeneral";
    }
    @GetMapping("registerPage")
    public String registerPage() {
        return "z01_Project/register";
    }

}
