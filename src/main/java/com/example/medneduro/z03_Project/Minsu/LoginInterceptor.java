package com.example.medneduro.z03_Project.Minsu;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.PrintWriter;

// 클래스를 스프링 컨테이너에 Bean 개개체로 등록..
// 나중에 설정 클래스 InterceptorConfig에서 @Autowired로 가져오기 위해서
@Component
public class LoginInterceptor implements HandlerInterceptor{
    /*
    스프링이 제공하는 인터셉터 인터페이스(규격) 구현하기
    스프링 MVC의 정해진 흐름(컨트롤러 호출 전/후 등)에 직접 만든 로직을 끼워넣기 위함..

  preHandle
  - 시점: 사용장 요청이 컨트롤러에 도착하기 직전에 실행

  HttpServletRequest request
  - 출처: 톰캣(WAS)이 생성해서 넘겨줌
  - 기능: 사용자가 보낸 요청 정보(세션, 파라미터, 쿠기 등) 모두 담고 있는 바구니!

  HttpServletResponse response
  - 출처: 톰캣(WAS)이 생성해서 넘겨줌
  - 기능: 서버가 사용자에게 보낼 응답 정보(리다이렉트, 결과 데이터 등)를 제어하는 도구!

  Object handler
  - 기능: 현재 요청을 처리할 대상(컨트롤러의 어떤 메서드인지)에 대한 정보를 담고 있음
  */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception{
        HttpSession session = request.getSession();
        String userType = (String) session.getAttribute("userType"); // 세션에 저장된 권한(doctor/general)
        String uri = request.getRequestURI(); // 사용자가 요청한 주소 (예: /maindoctorpage)
        // [주의] URL과 URI는 다름!!
        // 디버깅용 로그(콘솔창 확인용 - 작동 여부 포함_
        System.out.println(">>> 인터셉터 감지: "+ uri + " (사용자 유형: "+ userType +") ");

        /*
        request.getSession()
        - 출처: request 객체 내부에서 꺼내옴
        - 기능: 현재 브라우저와 연결된 서버 측 저장소(세션)르 가져옴
        */
        String LoginId = (String) session.getAttribute("id");
        /*
        session.getAttribute("id")
        - 출처: 서버 메모리(세션 저장소)에서 가져옴
        - 기능: 로그인 성공 시 컨트롤러에서 session.setAttribute("id", id)로 저장했던 값을 꺼냄
        - 참고: 저장될 때 Object 타입으로 저장되므로 (String)으로 형변환이 필요..
        */
        // 조건문 및 강제 이동
        // 값이 비어있다면? 로그인 x
        if(LoginId == null){
            /* 
            ContextPath를 붙여서 정확한 경로로 이동
            
            equest.getContextPath
            - 기능: 프로젝트의 기본 경로(루트 경로)를 가져옴
            - 이유: 하드코딩하지 않고 유연하게 경로를 맞추기 위해서 (/myproject)
            
            response.sendRedirect
            - 기능: 사용자의 브라우저에게 이 주소로 다시 강제로 이동해! 라고 명령을 내립니다.
                    여기서는 로그인 페이지로 강제 이동시킴
            */
            System.out.println(">>> 비로그인 접근 차단! 로그인 페이지로 이동합니다.");
            response.sendRedirect(request.getContextPath()+"/loginpage");
            // 검문 통과 실패 및 컨트롤러 실행이 즉시 중단
            return false;
        }
        // 권한 체크 로직
        // contains 대신 명확하게 직관적으로 하기 위해 소문자로 변환 후 체크!
        String lowerUri = uri.toLowerCase();
        String msg = null;

        if(lowerUri.contains("doctor") && !"doctor".equals(userType)){
            msg = "의사 전용 메뉴입니다. 접근 권한이 없습니다.";
        }
        if(lowerUri.contains("general") && !"general".equals(userType)){
            msg = "일반 회원 전용 메뉴입니다. 접근 권한이 없습니다.";
        }
        if(msg != null){
            System.out.println(">>> 권한 없음 차단 : "+ msg); // 로그 확인용

            response.setContentType("text/html;charset=UTF-8");
            PrintWriter out = response.getWriter();

            // 완벽한 HTML 구조로 출력해야 브라우저가 100% 인식 가능함.
            out.println("<!DOCTYPE html>");
            out.println("<html><body>");
            out.println("<script>");
            out.println("alert('" + msg + "');");
            out.println("history.back();"); // 이전 페이지로 빽!
            out.println("</script>");
            out.println("</body></html>");

            out.flush();
            out.close(); // 펜 뚜껑 닫기 (중요)

            return false;
        }

            return true; // 모든 검문 통과시 컨트롤러로 이동!
    }

}

