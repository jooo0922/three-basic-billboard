'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

/**
 * 캔버스 텍스처로 캐릭터의 명찰을 생성했지만, 
 * 카메라를 뒤로 돌리면 이름표가 뒤집어져서 보이는 문제가 있음.
 * 
 * 물론 명찰을 배지 형태로 사용할거라면 아무런 문제가 없지만,
 * 게임 캐릭터의 이름표 같은거로 쓸거라면, 카메라가 어디로 움직이든 이름표가 항상 카메라를 향하도록 해야
 * 이름표가 뒤집혀 보이는 현상이 발생하지 않을거임.
 * 
 * 이 작업을 해주기 위해서 가장 적합한 것이 three.js의 Sprite 객체를 사용하는 것임.
 * Sprite란, 카메라가 어느 방향과 위치에 있건 항상 카메라를 바라보는 평면(plane)이라고 보면 됨.
 * 일반적으로는 부분적으로 투명한 텍스처가 적용된 상태로 사용된다고 함.
 * 
 * SpriteMaterial은 당연히 Sprite 평면을 생성하기 위해 사용하는 머티리얼일 것이고...
 * Sprite는 생성할 때 인자로 항상 SpriteMaterial만 받음. 만약 따로 전달해주지 않는다면 흰색 SpriteMaterial이 자동으로 적용될거임.
 */

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 50;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 2, 5);

  // create OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2, 0); // OrbitControls가 카메라를 움직일 때마다 카메라의 시선을 해당 좌표값으로 고정시킴
  controls.update(); // OrbitControls의 속성값을 바꿔줬으면 업데이트를 호출해줘야 함.

  // create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white'); // 배경은 흰색으로 바꿔줌.

  // DirectionalLight(직사광)을 생성하여 씬에 추가하는 함수
  function addLight(position) {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...position); // 전달받은 x, y, z 좌표값이 담긴 배열의 요소들을 하나하나 낱개로 복사하여 position이라는 Vector3의 x, y, z에 각각 넣어줘서 조명의 위치를 설정해 줌.
    scene.add(light);
    scene.add(light.target); // 조명의 타겟도 씬에 추가함. 타겟의 좌표값을 별도 지정하지 않으면 (0, 0, 0) 지점을 향해 빛을 쏴주도록 되어있음.
  }
  addLight([-3, 1, 1]);
  addLight([2, 1, 0.5]); // 각각 다른 방향에서 오는 직사광을 두 개 만들어 줌.

  // 원통이 몸, 구체가 머리, 평면이 명찰인 캐릭터를 만들 때 사용할 공통 geometry들을 만들어 줌
  const bodyRadiusTop = 0.4;
  const bodyRadiusBottom = 0.2;
  const bodyHeight = 2;
  const bodyRadialSegments = 6;
  const bodyGeometry = new THREE.CylinderGeometry(
    bodyRadiusTop, bodyRadiusBottom, bodyHeight, bodyRadialSegments
  ); // 원통 지오메트리를 만듦.

  const headRadius = bodyRadiusTop * 0.8;
  const headLonSegments = 12;
  const headLatSegments = 5;
  const headGeometry = new THREE.SphereGeometry(
    headRadius, headLonSegments, headLatSegments
  ); // 구체 지오메트리를 만듦.

  const labelGeometry = new THREE.PlaneGeometry(1, 1); // 1*1 사이즈의 평면 지오메트리도 만듦.

  // 2D 캔버스를 생성한 뒤, 명찰에 들어갈 이름 텍스트를 캔버스에 렌더해줘서 리턴해주는 함수.
  function makeLabelCanvas(baseWidth, size, name) {
    const borderSize = 2; // 텍스트를 렌더링해주는 캔버스의 border 즉, 경계선의 두께를 2px로 할당해놓음
    const ctx = document.createElement('canvas').getContext('2d'); // 2D 캔버스 생성
    const font = `${size}px bold sans-serif`; // ctx.font에 할당해 줄 텍스트 스타일 값. 문자열의 순서는 CSS font 속성값과 동일한 구문 순서를 사용함. 전달받은 size값대로 32px로 지정해 줌.
    ctx.font = font;

    // 전달받은 name의 텍스트 길이를 measureText(name)으로 리턴받은 TextMetrics 객체의 width값을 이용해서 예측함. 나중에 캔버스 픽셀의 단위크기의 x방향(즉, 텍스트 width방향)의 scale을 정하는 데 사용할거임.
    const textWidth = ctx.measureText(name).width;

    const doubleBorderSize = borderSize * 2; // 이거는 경계선의 두께니까 width의 양 끝쪽, height의 위아래에 두개씩 추가해줘야 되는거니까 *2를 해준거임
    // const width = ctx.measureText(name).width + doubleBorderSize; // name을 캔버스에 렌더한다고 가정했을때의 width에다가 width의 양끝에 border 두께만큼 2씩 추가해 줌.
    const width = baseWidth + doubleBorderSize; // 텍스트 너비에 따라 명찰의 길이가 제각각인 걸 수정하려고 고정 너비값인 baseWidth값으로 캔버스의 width를 할당하려는 것.
    const height = size + doubleBorderSize; // 폰트 사이즈인 32px 만큼에 height의 양끝에 border 두께만큼 2씩 추가해 줌.
    ctx.canvas.width = width;
    ctx.canvas.height = height; // 위에서 구한 width, height값을 각각 캔버스의 width, height에 할당함.

    ctx.font = font; // 캔버스 해상도가 바뀌면 font를 다시 지정해줘야 한다고 함. 굳이 위에서 지정을 먼저 해준 이유는? 해당 폰트 스타일로 name을 캔버스에 렌더한다고 가정했을때의 width값을 얻고 싶었기 때문이었겠지
    // ctx.textBaseline = 'top'; // 실제 해당 캔버스의 베이스라인은 가만히 있지만, 해당 베이스라인이 top이 됨에 따라 텍스트는 베이스라인 밑에 바싹 붙여서 렌더됨.
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    // 텍스트를 고정너비로 맞춰준 캔버스에 렌더하기 때문에, 길이가 짧은 텍스트라면 그냥 렌더했을 때 캔버스의 한쪽 공간이 남을 수 있음.
    // 이를 방지하기 위해서 텍스트를 렌더링할 때, fillText()로 넘겨주는 x좌표값을 기준으로 텍스트를 가운데정렬 시키려고 하는 것. 
    // 그래서 캔버스의 원점을 캔버스의 가운데 지점으로 옮길거기 때문에, 베이스라인을 top으로 그대로 두면 텍스트가 너무 아래로 쳐져서 렌더되겠지? 그래서 베이스라인도 middle로 바꿔준 것.

    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, width, height); // 위에서 만든 width, height만큼의 사이즈를 가진 파란색 사각형으로 캔버스 전체를 덮어버림 -> 배경을 파랗게 지정한 것.

    /**
     * 고정너비에 맞춰서 텍스트를 렌더링 해주려면, 텍스트의 width가 고정너비보다 작은지, 큰지에 따라 캔버스의 x방향의 단위크기 scale값을 잘 조정해줘야 함.
     * 
     * 1. 텍스트 width가 고정너비보다 크다면, scaleFactor에는 1보다 작은 0.xxx... 값이 들어갈거고,
     * 캔버스 단위크기의 x방향을 0.xxx...px로 축소시켜줘야 텍스트가 약간 x방향으로 짜부되어서 캔버스 고정너비 안에 들어가도록 렌더될거임.
     * (참고로 이 말은, 캔버스의 1px을 렌더링하기 위해 x방향으로는 실제로 0.xxx...개의 픽셀을 사용할 것이라는 의미)
     * 
     * 2. 반면 텍스트 width가 고정너비보다 작다면, scaleFactor에는 1이 들어갈거고,
     * 캔버스 단위크기의 x방향은 원래의 단위크기인 1px 그대로 두니까 텍스트는 비율이나 크기 변화없이 캔버스에 그대로 렌더될거임.
     * (마찬가지로 캔버스의 1px을 렌더링하기 위해 x방향으로 실제 1개의 픽셀을 사용할 것이라는 의미)
     */
    const scaleFactor = Math.min(1, baseWidth / textWidth);
    ctx.translate(width / 2, height / 2); // 앞서 말했듯이 길이가 짧은 텍스트가 한쪽 공간이 남게 렌더되는 경우를 가정하여 x좌표값을 기준으로 center로 정렬되어 렌더될 수 있도록, 원점을 캔버스의 가운데로 일단 옮겨놓음.
    ctx.scale(scaleFactor, 1); // y방향의 단위크기는 그대로 두고, x방향의 단위크기만 텍스트의 너비에 따라 달리 지정해줌.
    ctx.fillStyle = 'white';
    ctx.fillText(name, 0, 0); // 흰색 텍스트로 렌더해 줌. 이때, 원점(즉, 캔버스의 정가운데)를 기준으로 가운데정렬하여 텍스트를 렌더해 줌.

    return ctx.canvas; // name 텍스트가 렌더된 캔버스를 리턴해 줌
  }

  // 위에서 만든 공통 지오메트리들과 명찰 캔버스로 캐릭터 메쉬를 만들고 씬에 추가해주는 함수
  function makePerson(x, labelWidth, size, name, color) {
    const canvas = makeLabelCanvas(labelWidth, size, name); // 전달받은 name으로 텍스트를 렌더해 준 명찰 캔버스를 리턴받아 할당해놓음
    const texture = new THREE.CanvasTexture(canvas); // 리턴받은 명찰 캔버스로 캔버스 텍스처를 만듦.

    texture.minFilter = THREE.LinearFilter; // 캔버스 텍스처는 2D이므로 원본보다 작을 경우 linearFilter로 대략적인 픽셀들을 필터링해줌.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping; // 텍스처 반복 유형은 캔버스 텍스처의 양끝 모서리, 즉 border로 설정한 파란 픽셀 모서리들을 늘여주도록 함

    // 명찰을 Sprite로 만들거기 때문에 SpriteMaterial을 미리 생성해놓음.
    const labelMaterial = new THREE.SpriteMaterial({
      map: texture, // 캔버스 텍스처 할당
      transparent: true // 투명도를 조절할 수 있도록 함. Sprite은 일반적으로 부분적으로 투명한 텍스처를 적용받기 때문에 그 텍스처가 할당되는 SpriteMaterial도 투명도 조절을 활성화 해두는 것 같음.
    });
    // 캐릭터 메쉬에 사용할 퐁-머티리얼
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color, // 전달받은 컬러값으로 지정
      flatShading: true // 물체를 각지게 표현함 
    });

    // 몸체, 머리, 명찰 메쉬들을 자식노드로 두어 같이 움직이게 할 부모노드를 생성함
    const root = new THREE.Object3D();
    root.position.x = x; // 전달받은 x좌표값으로 부모노드의 x좌표값 지정

    // 몸체, 머리, 명찰 메쉬들을 각각 생성해서 부모노드인 root에 추가해 줌
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    root.add(body);
    body.position.y = bodyHeight / 2; // 몸체 길이의 절반만큼(1px) y좌표값을 올려줌.

    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    root.add(head);
    head.position.y = bodyHeight + headRadius * 1.1; // 몸체 길이 + 구체 반지름의 1.1배 (2 + 0.352 = 2.352) 만큼 y좌표값을 올려줌.

    // 명찰의 scale을 조절하기 위해 필요한 값.
    const labelBaseScale = 0.01;
    const label = new THREE.Sprite(labelMaterial); // Mesh가 아닌 Sprite 객체로 명찰을 만듦.
    root.add(label);
    // 명찰을 Sprite로 만들다보니 캐릭터 메쉬랑 겹치는 현상이 발생해서, z값은 그대로 두고, y값만 캐릭터 머리 위로 올려줘서 아예 겹치는 일이 없도록 함. 
    label.position.y = head.position.y + headRadius + size * labelBaseScale;

    label.scale.x = canvas.width * labelBaseScale;
    label.scale.y = canvas.height * labelBaseScale;

    scene.add(root); // 씬에 최종적으로 부모노드를 추가함
    return root; // 부모노드를 리턴해 줌.
  }

  // makePerson을 호출하여 3개의 캐릭터 및 명찰 메쉬를 만듦
  makePerson(-3, 150, 32, 'Purple People Eater', 'purple');
  makePerson(0, 150, 32, 'Green Machine', 'green');
  makePerson(3, 150, 32, 'Red Menace', 'red');

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // animate
  function animate(t) {
    t *= 0.001; // 밀리초 단위 타임스탬프값을 초 단위로 변환함.

    // 렌더러가 리사이징되면 변경된 사이즈에 맞게 카메라 비율(aspect)도 업데이트 해줌.
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    requestAnimationFrame(animate); // 내부에서 반복 호출
  }

  requestAnimationFrame(animate);
}

main();