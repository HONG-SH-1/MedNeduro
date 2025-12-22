/**
 * ✅ state.js
 * - 원본 app.js에 있던 "전역 상태"를 모듈로 분리
 * - 동작은 그대로, 위치만 바꾼 것
 * 여러 모듈이 공유해야하는 전역 상태를 한곳에서 관리
 */

export const API_BASE = `http://localhost:8080/api`;

/**
 * ✅ 멀티탭(세션) 저장 구조
 * - key(fileId) 기준으로 업로드 파일을 세션처럼 관리
 */
export const sessions = new Map(); // fileId -> session

// ✅ 현재 활성 탭(fileId)
let activeSessionId = null;

// ✅ 3D(Three.js) 상태
export const three = { scene:null, camera:null, renderer:null, controls:null, obj:null };

/**
 * ✅ activeSessionId getter/setter
 * - 다른 모듈에서 안전하게 접근/변경하기 위해 함수로 제공
 */
export function getActiveSessionId() {
  return activeSessionId;
}

export function setActiveSessionId(fileId) {
  activeSessionId = fileId;
}
