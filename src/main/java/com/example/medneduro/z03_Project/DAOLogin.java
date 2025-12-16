package com.example.medneduro.z03_Project;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.Map;

@Mapper
public interface DAOLogin {
    @Select("SELECT COUNT(*) FROM INTEGRATED_ACCOUNT WHERE USER_TYPE=#{USER_TYPE} AND UPPER(LOGIN_ID) = UPPER(#{ID}) AND PASSWORD=#{PWD}")
    int logincheck(Map<String, String> map);

}
