-- [1] MEDICAL_STAFF (의료진)
-- PK인 STAFF_ID는 자동 생성됨
CREATE INDEX IX_STAFF_ACCOUNT_ID ON MEDICAL_STAFF(ACCOUNT_ID);
CREATE INDEX IX_STAFF_DEPT_CODE ON MEDICAL_STAFF(DEPT_ID);
CREATE INDEX IX_STAFF_RANK_CODE ON MEDICAL_STAFF(RANK_ID); -- 직급 코드로 조회할 경우 대비

-- [2] PATIENT (환자)
-- PK인 PATIENT_ID는 자동 생성됨
CREATE INDEX IX_PATIENT_ACCOUNT_ID ON PATIENT(ACCOUNT_ID);

-- [3] SYSTEM_LOG (로그)
-- PK인 LOG_ID는 자동 생성됨
CREATE INDEX IX_LOG_ACCOUNT_ID ON SYSTEM_LOG(ACCOUNT_ID);
CREATE INDEX IX_LOG_TARGET_MRI_ID ON SYSTEM_LOG(TARGET_MRI_ID); -- 특정 MRI 조회 이력 검색용

-- [4] BRAIN_MRI_FOLDER (MRI 폴더)
-- PK인 MRI_ID는 자동 생성됨
CREATE INDEX IX_MRI_PATIENT_ID ON BRAIN_MRI_FOLDER(PATIENT_ID);
CREATE INDEX IX_MRI_DOCTOR_ID ON BRAIN_MRI_FOLDER(DOCTOR_ID);

-- [5] DIAGNOSIS_REPORT (판독지)
-- PK인 REPORT_ID는 자동 생성됨
CREATE INDEX IX_REPORT_MRI_ID ON DIAGNOSIS_REPORT(MRI_ID);
CREATE INDEX IX_REPORT_WRITER_ID ON DIAGNOSIS_REPORT(WRITER_ID);

-- [6] TUMOR_ANNOTATION (종양 마킹)
-- PK인 ANNOT_ID는 자동 생성됨
CREATE INDEX IX_ANNOT_MRI_ID ON TUMOR_ANNOTATION(MRI_ID);
CREATE INDEX IX_ANNOT_WRITER_ID ON TUMOR_ANNOTATION(WRITER_ACCOUNT_ID); -- 작성자 계정 ID

-- [참고] DEPARTMENT 테이블의 DEPT_CODE와
-- INTEGRATED_ACCOUNT 테이블의 ACCOUNT_ID는
-- 이미 PK라서 인덱스가 자동 생성되어 있습니다.



-- [1] 시퀀스 생성
CREATE SEQUENCE SEQ_INTEGRATED_ACCOUNT
    START WITH 1
    INCREMENT BY 1
    MAXVALUE 999999
    MINVALUE 1
    CYCLE
    NOCACHE;

-- [2] 부모 테이블: DEPARTMENT (진료과)
CREATE TABLE DEPARTMENT (
                            DEPT_ID   VARCHAR2(10)  NOT NULL,
                            DEPT_NAME VARCHAR2(50)  NOT NULL,
                            CONSTRAINT PK_DEPARTMENT PRIMARY KEY (DEPT_ID)
);

-- [3] 부모 테이블: INTEGRATED_ACCOUNT (통합 계정)
CREATE TABLE INTEGRATED_ACCOUNT (
                                    ACCOUNT_ID      NUMBER         NOT NULL,
                                    LOGIN_ID        VARCHAR2(50)   NOT NULL,
                                    PASSWORD        VARCHAR2(255)  NOT NULL, -- 암호화된 비밀번호
                                    USER_TYPE       VARCHAR2(10)   NOT NULL,
                                    LAST_LOGIN_DATE DATE,
                                    JOIN_DATE       DATE           DEFAULT SYSDATE,
                                    CONSTRAINT PK_INTEGRATED_ACCOUNT PRIMARY KEY (ACCOUNT_ID),
                                    CONSTRAINT UK_ACCOUNT_LOGIN_ID UNIQUE (LOGIN_ID)
);

-- [4] 자식 테이블: MEDICAL_STAFF (의료진)
CREATE TABLE MEDICAL_STAFF (
                               STAFF_ID     VARCHAR2(20)   NOT NULL,
                               ACCOUNT_ID   NUMBER,        -- ALTER 내용 반영: NULL 허용
                               DEPT_ID      VARCHAR2(10)   NOT NULL,
                               STAFF_NAME   VARCHAR2(50)   NOT NULL,
                               EMAIL        VARCHAR2(200), -- 암호화 대비 길이 확장
                               PHONE_NUMBER VARCHAR2(200),
                               GENDER         CHAR(1),
                               BIRTH_DATE     VARCHAR2(8),
                               JOB_TYPE     VARCHAR2(20),
                               RANK_ID      VARCHAR2(20),
                               LICENSE_NO   VARCHAR2(50),
                               CONSTRAINT PK_MEDICAL_STAFF PRIMARY KEY (STAFF_ID),
                               CONSTRAINT UK_STAFF_EMAIL UNIQUE (EMAIL),
                               CONSTRAINT UK_STAFF_PHONE UNIQUE (PHONE_NUMBER),
                               CONSTRAINT UK_STAFF_LICENSE UNIQUE (LICENSE_NO),
                               CONSTRAINT FK_STAFF_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                                   REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID),
                               CONSTRAINT FK_STAFF_DEPT FOREIGN KEY (DEPT_ID)
                                   REFERENCES DEPARTMENT(DEPT_ID)
);

-- 의료진 관련 인덱스
CREATE INDEX IX_STAFF_ACCOUNT_ID ON MEDICAL_STAFF(ACCOUNT_ID);
CREATE INDEX IX_STAFF_DEPT_CODE ON MEDICAL_STAFF(DEPT_ID);
CREATE INDEX IX_STAFF_RANK_CODE ON MEDICAL_STAFF(RANK_ID);
CREATE SEQUENCE SQ_STAFF_ID
    START WITH 1
    INCREMENT BY 1    MAXVALUE 999999
    MINVALUE 1
    NOCACHE;
CREATE TABLE GENERAL (
                         GENERAL_ID     VARCHAR2(20)   NOT NULL,
                         ACCOUNT_ID     NUMBER,        -- ALTER 내용 반영: NULL 허용
                         GENERAL_NAME   VARCHAR2(50)   NOT NULL,
                         EMAIL          VARCHAR2(200),
                         PHONE_NUMBER   VARCHAR2(200),
                         GENDER         CHAR(1),
                         BIRTH_DATE     VARCHAR2(8),
                         CONSTRAINT PK_GENERAL PRIMARY KEY (GENERAL_ID),
                         CONSTRAINT UK_GENERAL_EMAIL UNIQUE (EMAIL),
                         CONSTRAINT UK_GENERAL_PHONE_NUMBER UNIQUE (PHONE_NUMBER),
                         CONSTRAINT FK_GENERAL_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                            REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID)
);
CREATE INDEX IX_GENERAL_MATCHING ON GENERAL (GENERAL_NAME, PHONE_NUMBER, BIRTH_DATE, GENDER);
CREATE INDEX IX_GENERAL_EMAIL ON GENERAL (EMAIL);
CREATE SEQUENCE SEQ_GENERAL_MEMBER
    START WITH 1
    INCREMENT BY 1;
CREATE SEQUENCE SEQ_GENERAL_ID
    START WITH 1
    INCREMENT BY 1    MAXVALUE 999999
    MINVALUE 1
    CYCLE
    NOCACHE;
COMMIT;
-- [5] 자식 테이블: PATIENT (환자)
CREATE TABLE PATIENT (
                         PATIENT_ID     VARCHAR2(20)   NOT NULL,
                         ACCOUNT_ID     NUMBER,        -- ALTER 내용 반영: NULL 허용
                         PATIENT_NAME   VARCHAR2(50)   NOT NULL,
                         EMAIL          VARCHAR2(200),
                         PHONE_NUMBER   VARCHAR2(200),
                         SSN            VARCHAR2(500)  NOT NULL, -- ALTER 내용 반영: 길이 500
                         BLOOD_TYPE     VARCHAR2(5),
                         GENDER         CHAR(1),
                         BIRTH_DATE     VARCHAR2(8),
                         INSURANCE_TYPE VARCHAR2(20),
                         CONSTRAINT PK_PATIENT PRIMARY KEY (PATIENT_ID),
                         CONSTRAINT UK_PATIENT_EMAIL UNIQUE (EMAIL),
                         CONSTRAINT UK_PATIENT_SSN UNIQUE (SSN),
                         CONSTRAINT FK_PATIENT_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                             REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID)
);

-- 환자 관련 인덱스
CREATE INDEX IX_PATIENT_ACCOUNT_ID ON PATIENT(ACCOUNT_ID);
-- 복합 인덱스 (환자 검색용)
CREATE INDEX IX_PATIENT_MATCHING ON PATIENT (PATIENT_NAME, PHONE_NUMBER, BIRTH_DATE, GENDER);

-- [6] 로그 테이블: SYSTEM_LOG
CREATE TABLE SYSTEM_LOG (
                            LOG_ID        NUMBER        NOT NULL,
                            ACCOUNT_ID    NUMBER,
                            TARGET_MRI_ID NUMBER,
                            ACTION_TYPE   VARCHAR2(50),
                            IP_ADDR       VARCHAR2(40),
                            LOG_DATE      DATE          DEFAULT SYSDATE,
                            CONSTRAINT PK_SYSTEM_LOG PRIMARY KEY (LOG_ID),
                            CONSTRAINT FK_LOG_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                                REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID)
);

-- 로그 인덱스
CREATE INDEX IX_LOG_ACCOUNT_ID ON SYSTEM_LOG(ACCOUNT_ID);
CREATE INDEX IX_LOG_TARGET_MRI_ID ON SYSTEM_LOG(TARGET_MRI_ID);

-- [7] 핵심 테이블: BRAIN_MRI_FOLDER
CREATE TABLE BRAIN_MRI_FOLDER (
                                  MRI_ID              NUMBER         NOT NULL,
                                  PATIENT_ID          VARCHAR2(20),
                                  DOCTOR_ID           VARCHAR2(20)   NOT NULL,
                                  GENERAL_ID          VARCHAR2(20),
                                  IMAGE_FOLDER_PATH   VARCHAR2(255),
                                  UPLOAD_DT           DATE          DEFAULT SYSDATE,
                                  TOTAL_SLICES        NUMBER,
                                  STATUS              VARCHAR2(20),
                                  AI_ANALYSIS_STATUS  VARCHAR2(20),
                                  AI_MODEL_VERSION    VARCHAR2(20),
                                  CONSTRAINT PK_BRAIN_MRI_FOLDER PRIMARY KEY (MRI_ID),
                                  CONSTRAINT FK_MRI_PATIENT FOREIGN KEY (PATIENT_ID)
                                      REFERENCES PATIENT(PATIENT_ID),
                                  CONSTRAINT FK_MRI_DOCTOR FOREIGN KEY (DOCTOR_ID)
                                      REFERENCES MEDICAL_STAFF(STAFF_ID),
                                  CONSTRAINT FK_MRI_GENERAL FOREIGN KEY (GENERAL_ID)
                                      REFERENCES GENERAL(GENERAL_ID)
);


-- MRI 인덱스
CREATE INDEX IX_MRI_PATIENT_ID ON BRAIN_MRI_FOLDER(PATIENT_ID);
CREATE INDEX IX_MRI_DOCTOR_ID ON BRAIN_MRI_FOLDER(DOCTOR_ID);
CREATE INDEX IX_MRI_GENERAL_ID ON BRAIN_MRI_FOLDER(GENERAL_ID);

-- [7-1] 최근 기록 테이블 : MRI_ACCESS_LOG
CREATE TABLE MRI_ACCESS_LOG (
                                LOG_ID              NUMBER         GENERATED BY DEFAULT AS IDENTITY, -- 순번 자동 생성
                                MRI_ID              NUMBER         NOT NULL,  -- 어떤 MRI를 봤는지
                                DOCTOR_ID           VARCHAR2(20),             -- 누가 봤는지
                                CHECK_DT            DATE           DEFAULT SYSDATE, -- 언제 봤는지 (자동입력)
                                CONSTRAINT PK_MRI_ACCESS_LOG PRIMARY KEY (LOG_ID),
                                CONSTRAINT FK_LOG_MRI FOREIGN KEY (MRI_ID) REFERENCES BRAIN_MRI_FOLDER(MRI_ID)
);
CREATE INDEX IX_LOG_MRI_ID ON MRI_ACCESS_LOG(MRI_ID);

-- [8] 분석 테이블: DIAGNOSIS_REPORT
CREATE TABLE DIAGNOSIS_REPORT (
                                  REPORT_ID   NUMBER         NOT NULL,
                                  MRI_ID      NUMBER         NOT NULL,
                                  WRITER_ID   VARCHAR2(20)   NOT NULL,
                                  TUMOR_TYPE  VARCHAR2(100),
                                  FINDINGS    CLOB,
                                  CONCLUSION  CLOB,
                                  IS_FINAL    CHAR(1) DEFAULT 'N',
                                  CREATE_DATE DATE DEFAULT SYSDATE,
                                  UPDATE_DATE DATE,
                                  FINAL_DATE  DATE,
                                  CONSTRAINT PK_DIAGNOSIS_REPORT PRIMARY KEY (REPORT_ID),
                                  CONSTRAINT FK_REPORT_MRI FOREIGN KEY (MRI_ID)
                                      REFERENCES BRAIN_MRI_FOLDER(MRI_ID),
                                  CONSTRAINT FK_REPORT_WRITER FOREIGN KEY (WRITER_ID)
                                      REFERENCES MEDICAL_STAFF(STAFF_ID)
);

-- 판독지 인덱스
CREATE INDEX IX_REPORT_MRI_ID ON DIAGNOSIS_REPORT(MRI_ID);
CREATE INDEX IX_REPORT_WRITER_ID ON DIAGNOSIS_REPORT(WRITER_ID);

-- [9] 분석 테이블: TUMOR_ANNOTATION
CREATE TABLE TUMOR_ANNOTATION (
                                  ANNOT_ID          NUMBER        NOT NULL,
                                  MRI_ID            NUMBER        NOT NULL,
                                  WRITER_ACCOUNT_ID NUMBER        NOT NULL,
                                  IMAGE_Z_INDEX     NUMBER,
                                  COORDINATE_JSON   CLOB,
                                  IS_AI_GENERATED   CHAR(1),
                                  CONFIDENCE_SCORE  NUMBER(5,4),
                                  CREATE_DATE       DATE DEFAULT SYSDATE,
                                  CONSTRAINT PK_TUMOR_ANNOTATION PRIMARY KEY (ANNOT_ID),
                                  CONSTRAINT FK_ANNOT_MRI FOREIGN KEY (MRI_ID)
                                      REFERENCES BRAIN_MRI_FOLDER(MRI_ID),
                                  CONSTRAINT FK_ANNOT_WRITER FOREIGN KEY (WRITER_ACCOUNT_ID)
                                      REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID)
);

-- 어노테이션 인덱스
CREATE INDEX IX_ANNOT_MRI_ID ON TUMOR_ANNOTATION(MRI_ID);
CREATE INDEX IX_ANNOT_WRITER_ID ON TUMOR_ANNOTATION(WRITER_ACCOUNT_ID);
/*
- 수정 완료
ALTER TABLE MEDICAL_STAFF MODIFY(ACCOUNT_ID NUMBER NULL);
ALTER TABLE PATIENT MODIFY(ACCOUNT_ID NUMBER NULL);
ALTER TABLE PATIENT MODIFY (SSN VARCHAR2(500));
-- 문법: ALTER TABLE 테이블명 DROP CONSTRAINT 제약조건명;
ALTER TABLE PATIENT DROP CONSTRAINT UK_PATIENT_PHONE;

-- 문법: CREATE INDEX 인덱스명 ON 테이블명 (컬럼1, 컬럼2, ...);
CREATE INDEX IX_PATIENT_MATCHING
    ON PATIENT (PATIENT_NAME, PHONE_NUMBER, BIRTH_DATE, GENDER);

-- 오라클 기준: 해당 테이블의 제약조건 조회

SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM USER_CONSTRAINTS
WHERE TABLE_NAME = 'PATIENT';
*/
commit;
SELECT * FROM INTEGRATED_ACCOUNT;
SELECT * FROM PATIENT;
SELECT * FROM GENERAL;
SELECT * FROM MEDICAL_STAFF;
SELECT * FROM DEPARTMENT;
SELECT * FROM BRAIN_MRI_FOLDER;
SELECT * FROM MRI_ACCESS_LOG;



INSERT INTO PATIENT(PATIENT_ID,ACCOUNT_ID,PATIENT_NAME,EMAIL,PHONE_NUMBER,SSN,BLOOD_TYPE,GENDER,BIRTH_DATE,INSURANCE_TYPE)
VALUES (1,null,'홍길동','1111@gmail.com','010-1234-5678','20251217-1234567','rh+B','M','20251217',null);
INSERT INTO INTEGRATED_ACCOUNT VALUES (SEQ_INTEGRATED_ACCOUNT.NEXTVAL, 'testG', '1111', 'G', SYSDATE, SYSDATE);
INSERT INTO INTEGRATED_ACCOUNT VALUES (SEQ_INTEGRATED_ACCOUNT.NEXTVAL, 'testD', '2222', 'D', SYSDATE, SYSDATE);
INSERT INTO DEPARTMENT(DEPT_ID, DEPT_NAME) VALUES (10,'내과');
INSERT INTO PATIENT(PATIENT_ID,ACCOUNT_ID,PATIENT_NAME,EMAIL,PHONE_NUMBER,SSN,BLOOD_TYPE,GENDER,BIRTH_DATE,INSURANCE_TYPE)
VALUES (2,null,'변길동','11133@gmail.com','010-1234-1234','20251217-2345678','rh+B','M','20251218',null);

INSERT INTO MEDICAL_STAFF(STAFF_ID, ACCOUNT_ID, DEPT_ID, STAFF_NAME, EMAIL, PHONE_NUMBER, GENDER, BIRTH_DATE, JOB_TYPE, RANK_ID, LICENSE_NO)
VALUES(SQ_STAFF_ID.nextval,NULL,10,'김길동','1234@gmail.com','010-1111-2222','M','20251219','의사','과장','111111');
-- 1. 시퀀스 삭제 (존재한다면)
DROP SEQUENCE SEQ_INTEGRATED_ACCOUNT;

-- 2. 테이블 삭제 (제약조건 무시하고 강제 삭제)
DROP TABLE TUMOR_ANNOTATION CASCADE CONSTRAINTS;
DROP TABLE DIAGNOSIS_REPORT CASCADE CONSTRAINTS;
DROP TABLE BRAIN_MRI_FOLDER CASCADE CONSTRAINTS;
DROP TABLE SYSTEM_LOG CASCADE CONSTRAINTS;
DROP TABLE PATIENT CASCADE CONSTRAINTS;
DROP TABLE MEDICAL_STAFF CASCADE CONSTRAINTS;
DROP TABLE INTEGRATED_ACCOUNT CASCADE CONSTRAINTS;
DROP TABLE DEPARTMENT CASCADE CONSTRAINTS;
DROP TABLE MRI_ACCESS_LOG CASCADE CONSTRAINTS;

-- 삭제 확인 (이 쿼리 결과가 없어야 함)
SELECT table_name FROM user_tables;