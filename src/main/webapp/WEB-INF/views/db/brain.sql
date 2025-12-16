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



-- 1. 부모 테이블: DEPARTMENT (진료과 코드 정보)
CREATE TABLE DEPARTMENT (
                            DEPT_ID   VARCHAR2(10)  NOT NULL,
                            DEPT_NAME   VARCHAR2(50)  NOT NULL,
                            CONSTRAINT PK_DEPARTMENT PRIMARY KEY (DEPT_ID)
);

-- 2. 부모 테이블: INTEGRATED_ACCOUNT (통합 계정)
CREATE TABLE INTEGRATED_ACCOUNT (
                                    ACCOUNT_ID      NUMBER         NOT NULL,
                                    LOGIN_ID        VARCHAR2(50)   NOT NULL,
    -- [보안] 비밀번호는 단방향 암호화(Hash)되므로 길이가 깁니다.
                                    PASSWORD        VARCHAR2(255)  NOT NULL,
                                    USER_TYPE       VARCHAR2(10)   NOT NULL,
                                    LAST_LOGIN_DATE DATE,
                                    JOIN_DATE       DATE           DEFAULT SYSDATE,
                                    CONSTRAINT PK_INTEGRATED_ACCOUNT PRIMARY KEY (ACCOUNT_ID),
    -- [제약] 로그인 ID는 중복될 수 없음
                                    CONSTRAINT UK_ACCOUNT_LOGIN_ID UNIQUE (LOGIN_ID)
);
create sequence SEQ_INTEGRATED_ACCOUNT
    START WITH 1
    increment by 1
    MAXVALUE 999999
    MINVALUE 1
    CYCLE
    NOCACHE;
INSERT INTO INTEGRATED_ACCOUNT VALUES (seq_integrated_account.nextval, 'testG', '1111', 'G', sysdate, sysdate);
INSERT INTO INTEGRATED_ACCOUNT VALUES (seq_integrated_account.nextval, 'testD', '2222', 'D', sysdate, sysdate);

-- 3. 자식 테이블: MEDICAL_STAFF (의료진 인사 정보)
CREATE TABLE MEDICAL_STAFF (
                             STAFF_ID     VARCHAR2(20)   NOT NULL,
                             ACCOUNT_ID   NUMBER         NOT NULL,
                             DEPT_ID    VARCHAR2(10)   NOT NULL,
                             STAFF_NAME   VARCHAR2(50)   NOT NULL,
  -- [보안] 암호화된 텍스트 저장을 위해 길이 확장 (20 -> 200)
                             EMAIL        VARCHAR2(200),
                             PHONE_NUMBER VARCHAR2(200),
                             JOB_TYPE     VARCHAR2(20),
                             RANK_ID    VARCHAR2(20),
                             LICENSE_NO   VARCHAR2(50),
                             CONSTRAINT PK_MEDICAL_STAFF PRIMARY KEY (STAFF_ID),
  -- [제약] 이메일, 전화번호, 면허번호는 중복 불가 (찾기 기능 및 무결성)
                             CONSTRAINT UK_STAFF_EMAIL UNIQUE (EMAIL),
                             CONSTRAINT UK_STAFF_PHONE UNIQUE (PHONE_NUMBER),
                             CONSTRAINT UK_STAFF_LICENSE UNIQUE (LICENSE_NO),
                             CONSTRAINT FK_STAFF_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                                 REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID),
                             CONSTRAINT FK_STAFF_DEPT FOREIGN KEY (DEPT_ID)
                                 REFERENCES DEPARTMENT(DEPT_ID)
);

-- 4. 자식 테이블: PATIENT (환자 상세 정보)
CREATE TABLE PATIENT (
                         PATIENT_ID     VARCHAR2(20)   NOT NULL,
                         ACCOUNT_ID     NUMBER         NOT NULL,
                         PATIENT_NAME   VARCHAR2(50)   NOT NULL,
    -- [보안] 암호화된 텍스트 저장을 위해 길이 확장
                         EMAIL          VARCHAR2(200),
                         PHONE_NUMBER   VARCHAR2(200),
                         SSN            VARCHAR2(255)  NOT NULL, -- 주민번호는 반드시 암호화 (길이 넉넉히)
                         BLOOD_TYPE     VARCHAR2(5),
                         GENDER         CHAR(1),
                         BIRTH_DATE     VARCHAR2(8),
                         INSURANCE_TYPE VARCHAR2(20),
                         CONSTRAINT PK_PATIENT PRIMARY KEY (PATIENT_ID),
    -- [제약] 환자 연락처 및 주민번호 중복 불가
                         CONSTRAINT UK_PATIENT_EMAIL UNIQUE (EMAIL),
                         CONSTRAINT UK_PATIENT_PHONE UNIQUE (PHONE_NUMBER),
                         CONSTRAINT UK_PATIENT_SSN UNIQUE (SSN),
                         CONSTRAINT FK_PATIENT_ACCOUNT FOREIGN KEY (ACCOUNT_ID)
                             REFERENCES INTEGRATED_ACCOUNT(ACCOUNT_ID)
);

-- 5. 로그 테이블: SYSTEM_LOG
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

-- 6. 핵심 테이블: BRAIN_MRI_FOLDER
CREATE TABLE BRAIN_MRI_FOLDER (
                                  MRI_ID              NUMBER         NOT NULL,
                                  PATIENT_ID          VARCHAR2(20)   NOT NULL,
                                  DOCTOR_ID           VARCHAR2(20)   NOT NULL,
                                  IMAGE_FOLDER_PATH   VARCHAR2(255),
                                  MRI_DATE            DATE,
                                  TOTAL_SLICES        NUMBER,
                                  STATUS              VARCHAR2(20),
                                  AI_ANALYSIS_STATUS  VARCHAR2(20),
                                  AI_MODEL_VERSION    VARCHAR2(20),
                                  CONSTRAINT PK_BRAIN_MRI_FOLDER PRIMARY KEY (MRI_ID),
                                  CONSTRAINT FK_MRI_PATIENT FOREIGN KEY (PATIENT_ID)
                                      REFERENCES PATIENT(PATIENT_ID),
                                  CONSTRAINT FK_MRI_DOCTOR FOREIGN KEY (DOCTOR_ID)
                                      REFERENCES MEDICAL_STAFF(STAFF_ID)
);

-- 7. 분석 테이블: DIAGNOSIS_REPORT
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

-- 8. 분석 테이블: TUMOR_ANNOTATION
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

