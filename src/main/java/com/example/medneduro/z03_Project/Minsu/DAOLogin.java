package com.example.medneduro.z03_Project.Minsu;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

@Mapper
public interface DAOLogin {
    @Select("SELECT COUNT(*) FROM INTEGRATED_ACCOUNT WHERE USER_TYPE=#{USER_TYPE} AND UPPER(LOGIN_ID) = UPPER(#{ID}) AND PASSWORD=#{PWD}")
    int logincheck(Map<String, String> map);

    @Insert("Insert INTO INTEGRATED_ACCOUNT " +
            "(ACCOUNT_ID,LOGIN_ID, PASSWORD, NAME,RRN,PHONE,USER_TYPE,LAST_LOGIN_DATE,JOIN_DATE)" +
            "VALUES(SEQ_INTEGRATED_ACCOUNT.NEXTVAL,#{id},#{pwd},#{name},#{id_card},#{phoneNumber},#{userType},NULL,SYSDATE)")
    int registerProc(Register reg);

    @Select("Select count(*) from INTEGRATED_ACCOUNT where UPPER(LOGIN_ID) = UPPER(#{id})")
    int checkId(String id) ;

}
