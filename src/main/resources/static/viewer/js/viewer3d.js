/**
 * ✅ viewer3d.js
 * - 3D 변환/Three.js 로드 로직만 분리
 * - 원본 동작 그대로
 * 3d 변환 요청 + three 초기화 + obj 로딩 + 렌더링
 */

import { three } from "./state.js";
import { objApi } from "./api.js";

export function make3D(fileId) {
  $("#analysis2DView").addClass("hidden");
  $("#view3D").removeClass("hidden");

  objApi(fileId)
    .done(function (res) {
      if (!res.ok) {
        alert("3D 변환 실패: " + res.message);
        return;
      }

      const objUrl = res.objUrl;

      initThreeIfNeeded();
      loadObj(objUrl);
    })
    .fail(function (xhr) {
      alert("obj API 에러!\n" + (xhr.responseText || xhr.statusText));
    });
}

function initThreeIfNeeded() {
  if (!window.THREE || !window.OrbitControls || !window.OBJLoader) {
    alert("3D 라이브러리(Three.js)가 아직 로딩되지 않았어. 새로고침 후 다시 눌러줘!");
    return;
  }
  if (three.renderer) return;

  const container = document.getElementById("threeCanvas");

  const THREE = window.THREE;
  const OrbitControls = window.OrbitControls;

  three.scene = new THREE.Scene();
  three.scene.background = new THREE.Color(0x0f1116);

  const w = container.clientWidth;
  const h = container.clientHeight;

  three.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 2000);
  three.camera.position.set(0, 0, 200);

  three.renderer = new THREE.WebGLRenderer({ antialias: true });
  three.renderer.setSize(w, h);
  container.appendChild(three.renderer.domElement);

  const light1 = new THREE.DirectionalLight(0xffffff, 1.2);
  light1.position.set(1, 1, 1);
  three.scene.add(light1);

  const light2 = new THREE.AmbientLight(0xffffff, 0.6);
  three.scene.add(light2);

  three.controls = new OrbitControls(three.camera, three.renderer.domElement);

  window.addEventListener("resize", function () {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    three.camera.aspect = nw / nh;
    three.camera.updateProjectionMatrix();
    three.renderer.setSize(nw, nh);
  });

  animateThree();
}

function loadObj(url) {
  if (!window.THREE || !window.OBJLoader) return;

  const THREE = window.THREE;
  const OBJLoader = window.OBJLoader;

  if (three.obj) {
    three.scene.remove(three.obj);
    three.obj = null;
  }

  const loader = new OBJLoader();

  loader.load(
    url,
    function (obj) {
      obj.traverse(function (child) {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.8,
            metalness: 0.1
          });
        }
      });

      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);

      three.obj = obj;
      three.scene.add(obj);
    },
    function () {},
    function (err) {
      alert("OBJ 로드 실패: " + err);
    }
  );
}

function animateThree() {
  requestAnimationFrame(animateThree);
  if (three.controls) three.controls.update();
  if (three.renderer && three.scene && three.camera) {
    three.renderer.render(three.scene, three.camera);
  }
}
