package com.example.medneduro.z03_Project.Minsu;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Transactional
@Service
public class ServiceLogin {
    @Autowired(required = false)
    private DAOLogin dao;

    public boolean logincheck(String userType, String id, String pwd) {
        String dbType = "";
        if(userType.equals("general")){
            dbType = "G";
        }
        if(userType.equals("doctor")){
            dbType = "D";
        }
        Map<String, String> map1 = new HashMap<>();
        map1.put("ID",id);
        map1.put("PWD",pwd);
        map1.put("USER_TYPE",dbType);
        return dao.logincheck(map1) > 0;
    }

    public int registerProc(Register reg) {
        if(dao.checkId(reg.getId()) > 0){
            return 0;
        }
        if(dao.checkId(reg.getId()) == 0){
            String userType = reg.getUserType();
            if("general".equals(userType)){
               reg.setUserType("G");
            }
            if("doctor".equals(userType)){
                reg.setUserType("D");
            }
            String gender = reg.getGender();
            if("1".equals(gender) || "3".equals(gender)){
                reg.setGender("M");
            }
            if("2".equals(gender) || "4".equals(gender)){
                reg.setGender("W");
            }
        }
        return dao.registerProc(reg);

    }

    public int checkId(String id){
        return dao.checkId(id);
    }


}
