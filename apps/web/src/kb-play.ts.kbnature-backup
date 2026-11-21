import * as THREE from "three";

export interface KBPlayOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  controls?: { enabled: boolean };
}

export function initKBPlay(options: KBPlayOptions): void {
  const { scene, camera, renderer, controls } = options;
  const canvas = renderer.domElement;

  const eyeHeight = 1.65;
  const gravity = 22;
  const jumpStrength = 8.2;
  const walkSpeed = 5;
  const sprintSpeed = 9;

  let active = false;
  let lockedOnce = false;
  let frame = 0;
  let lastTime = 0;
  let verticalVelocity = 0;
  let onGround = false;
  let yaw = 0;
  let pitch = 0;
  let originalControls = true;
  let groundY = 0;

  const keys = new Set<string>();
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const direction = new THREE.Vector3();
  const bounds = new THREE.Box3().setFromObject(scene);

  const originalPosition = camera.position.clone();
  const originalQuaternion = camera.quaternion.clone();
  const originalRotationOrder = camera.rotation.order;

  const hud = document.createElement("div");
  hud.id = "kb-play-hud";
  hud.style.cssText = `
    position:fixed;inset:0;z-index:99980;pointer-events:none;
    display:none;color:white;font-family:system-ui,sans-serif;
  `;

  hud.innerHTML = `
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:9px;height:9px;border:1px solid white;border-radius:50%;
      box-shadow:0 0 4px #000"></div>
    <div style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);
      padding:10px 16px;border-radius:8px;background:#10121acc;
      border:1px solid #ffffff25;font-size:12px;text-align:center">
      <b>KBVERSE PLAY</b>
      <div style="color:#bbb;margin-top:5px">
        WASD Move · Mouse Look · SPACE Jump · SHIFT Sprint · ESC Exit
      </div>
    </div>
  `;

  document.body.appendChild(hud);

  const button = document.createElement("button");
  button.id = "kb-play-button";
  button.type = "button";
  button.textContent = "▶ PLAY";
  button.style.cssText = `
    position:fixed;right:18px;top:16px;z-index:99990;
    padding:10px 18px;border:1px solid #8272ff;
    border-radius:8px;background:#5142bd;color:white;
    font:700 12px system-ui;cursor:pointer;
    box-shadow:0 4px 20px #0005;
  `;
  document.body.appendChild(button);

  function groundAt(x: number, z: number, maxY: number): number | null {
    raycaster.set(new THREE.Vector3(x, maxY, z), down);
    raycaster.far = 100;

    const hits = raycaster.intersectObjects(scene.children, true);

    for (const hit of hits) {
      if (!hit.object.visible || hit.object.userData.kbPlayIgnore) continue;
      return hit.point.y;
    }

    return null;
  }

  function collides(x: number, z: number, dx: number, dz: number): boolean {
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < 0.0001) return false;

    direction.set(dx / distance, 0, dz / distance);

    const origin = new THREE.Vector3(
      x,
      camera.position.y - 0.55,
      z
    );

    raycaster.set(origin, direction);
    raycaster.far = distance + 0.42;

    return raycaster.intersectObjects(scene.children, true).some(hit =>
      hit.object.visible &&
      !hit.object.userData.kbPlayIgnore &&
      hit.distance < distance + 0.40
    );
  }

  function updateCamera(): void {
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }

  function start(): void {
    if (active) return;

    originalPosition.copy(camera.position);
    originalQuaternion.copy(camera.quaternion);

    originalControls = controls?.enabled ?? true;
    if (controls) controls.enabled = false;

    const center = new THREE.Vector3();

    if (!bounds.isEmpty()) {
      bounds.getCenter(center);
      groundY = Math.min(0, bounds.min.y);
    } else {
      center.set(0, 0, 0);
      groundY = 0;
    }

    const floor = groundAt(center.x, center.z, bounds.max.y + 50);
    const spawnY = floor !== null ? floor : groundY;

    camera.position.set(center.x, spawnY + eyeHeight + 0.08, center.z);

    yaw = camera.rotation.y;
    pitch = Math.max(-1.45, Math.min(1.45, camera.rotation.x));
    updateCamera();

    verticalVelocity = 0;
    onGround = true;
    lastTime = performance.now();
    active = true;
    lockedOnce = false;

    keys.clear();
    hud.style.display = "block";
    button.textContent = "■ EXIT PLAY";
    document.body.style.cursor = "none";

    frame = requestAnimationFrame(tick);

    try {
      canvas.requestPointerLock();
    } catch (error) {
      console.warn("[KB Play] Pointer lock unavailable:", error);
    }
  }

  function stop(): void {
    if (!active) return;

    active = false;
    cancelAnimationFrame(frame);
    keys.clear();

    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
    camera.rotation.order = originalRotationOrder;

    if (controls) controls.enabled = originalControls;

    hud.style.display = "none";
    button.textContent = "▶ PLAY";
    document.body.style.cursor = "";

    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  }

  function tick(now: number): void {
    if (!active) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const forward = new THREE.Vector3(
      -Math.sin(yaw), 0, -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
      Math.cos(yaw), 0, -Math.sin(yaw)
    );

    const movement = new THREE.Vector3();

    if (keys.has("KeyW")) movement.add(forward);
    if (keys.has("KeyS")) movement.sub(forward);
    if (keys.has("KeyD")) movement.add(right);
    if (keys.has("KeyA")) movement.sub(right);

    if (movement.lengthSq() > 0) {
      movement.normalize();

      const speed = keys.has("ShiftLeft") || keys.has("ShiftRight")
        ? sprintSpeed
        : walkSpeed;

      const dx = movement.x * speed * dt;
      const dz = movement.z * speed * dt;

      if (!collides(camera.position.x, camera.position.z, dx, 0)) {
        camera.position.x += dx;
      }

      if (!collides(camera.position.x, camera.position.z, 0, dz)) {
        camera.position.z += dz;
      }
    }

    if (keys.has("Space") && onGround) {
      verticalVelocity = jumpStrength;
      onGround = false;
      keys.delete("Space");
    }

    verticalVelocity -= gravity * dt;
    camera.position.y += verticalVelocity * dt;

    const feet = camera.position.y - eyeHeight;
    const floor = groundAt(
      camera.position.x,
      camera.position.z,
      feet + 0.35
    );

    if (floor !== null &&
        verticalVelocity <= 0 &&
        feet <= floor + 0.25 &&
        feet >= floor - 0.85) {
      camera.position.y = floor + eyeHeight;
      verticalVelocity = 0;
      onGround = true;
    } else if (feet <= groundY) {
      camera.position.y = groundY + eyeHeight;
      verticalVelocity = 0;
      onGround = true;
    } else {
      onGround = false;
    }

    frame = requestAnimationFrame(tick);
  }

  function onMouseMove(event: MouseEvent): void {
    if (!active || document.pointerLockElement !== canvas) return;

    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;
    pitch = Math.max(-1.48, Math.min(1.48, pitch));

    updateCamera();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!active) return;

    if (event.code === "Escape") {
      stop();
      return;
    }

    if ([
      "KeyW", "KeyA", "KeyS", "KeyD",
      "Space", "ShiftLeft", "ShiftRight",
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
    ].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    keys.delete(event.code);
  }

  function onPointerLockChange(): void {
    if (document.pointerLockElement === canvas) {
      lockedOnce = true;
    } else if (active && lockedOnce) {
      stop();
    }
  }

  button.addEventListener("click", () => {
    if (active) {
      stop();
    } else {
      start();
    }
  });

  canvas.addEventListener("click", () => {
    if (active && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("pointerlockchange", onPointerLockChange);

  window.addEventListener("blur", () => {
    if (active) stop();
  });

  console.info("[KB Play] First-person Play Mode ready.");
}
