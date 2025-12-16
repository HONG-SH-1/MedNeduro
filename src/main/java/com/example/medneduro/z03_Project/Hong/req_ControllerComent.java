package com.example.medneduro.z03_Project.Hong;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class req_ControllerComent {

    @Autowired(required = false)
    private req_ServiceComent service;

    // http://localhost:8080/coment
    @GetMapping("coment")
    public String coment() {return "z01_Project/coment";}

}
