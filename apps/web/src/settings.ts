import * as THREE from "three";

type Settings = {
  shader: string;
  graphics: string;
  shadows: string;
  sound: number;
  sfx: number;
  viewDistance: number;
};

type SettingsOptions = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  keyLight: THREE.DirectionalLight;
};

const STORAGE_KEY = "kbverse-settings-v2";

const defaults: Settings = {
  shader: "standard",
  graphics: "balanced",
  shadows: "medium",
  sound: 70,
  sfx: 70,
  viewDistance: 60
};

const graphicsProfiles: Record<string, number> = {
  potato: 0.65,
  low: 0.85,
  balanced: 1,
  high: 1.35,
  ultra: 1.75
};

const shadowProfiles: Record<string, number> = {
  off: 0,
  low: 512,
  medium: 1024,
  high: 2048
};

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved
      ? { ...defaults, ...JSON.parse(saved) }
      : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function installSettings(options: SettingsOptions): void {
  const { renderer, camera, scene, keyLight } = options;

  if (document.getElementById("kbverse-settings-root")) return;

  let settings = loadSettings();

  let audioContext: AudioContext | null = null;
  let soundGain: GainNode | null = null;
  let sfxGain: GainNode | null = null;

  function initAudio(): void {
    if (audioContext) {
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }
      return;
    }

    audioContext = new AudioContext();

    soundGain = audioContext.createGain();
    sfxGain = audioContext.createGain();

    soundGain.gain.value = settings.sound / 100;
    sfxGain.gain.value = settings.sfx / 100;

    soundGain.connect(audioContext.destination);
    sfxGain.connect(audioContext.destination);
  }

  function playTest(channel: "sound" | "sfx"): void {
    initAudio();
    if (!audioContext || !soundGain || !sfxGain) return;

    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();

    oscillator.type = channel === "sound" ? "sine" : "triangle";
    oscillator.frequency.value = channel === "sound" ? 440 : 660;

    envelope.gain.setValueAtTime(0.0001, audioContext.currentTime);
    envelope.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.025
    );
    envelope.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + 0.35
    );

    oscillator.connect(envelope);
    envelope.connect(channel === "sound" ? soundGain : sfxGain);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.36);
  }

  const style = document.createElement("style");
  style.textContent = `
    #kbverse-settings-root {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 99999;
      font-family: Inter, system-ui, sans-serif;
      color: #eef3ff;
    }

    #kbverse-settings-toggle {
      width: 48px;
      height: 48px;
      border: 1px solid #52617e;
      border-radius: 15px;
      background: #172238;
      color: white;
      font-size: 22px;
      cursor: pointer;
      box-shadow: 0 8px 28px #0008;
    }

    #kbverse-settings-panel {
      display: none;
      position: absolute;
      right: 0;
      bottom: 60px;
      width: min(340px, calc(100vw - 36px));
      max-height: 75vh;
      overflow-y: auto;
      padding: 18px;
      border: 1px solid #34435f;
      border-radius: 16px;
      background: #111a2bed;
      box-shadow: 0 14px 45px #0009;
      backdrop-filter: blur(16px);
    }

    #kbverse-settings-panel.open { display: block; }

    #kbverse-settings-panel h2 {
      margin: 0 0 16px;
      font-size: 17px;
    }

    .kb-setting { margin: 14px 0; }

    .kb-setting label {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 7px;
      color: #cbd6ed;
      font-size: 12px;
    }

    .kb-setting select {
      width: 100%;
      padding: 9px;
      border: 1px solid #3b4b69;
      border-radius: 8px;
      background: #202d46;
      color: white;
    }

    .kb-setting input {
      width: 100%;
      accent-color: #7c9cff;
    }

    .kb-audio-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .kb-audio-row input { flex: 1; }

    .kb-test-button {
      padding: 6px 9px;
      border: 1px solid #53668c;
      border-radius: 7px;
      background: #263653;
      color: white;
      cursor: pointer;
      font-size: 11px;
    }

    #kbverse-settings-reset {
      width: 100%;
      margin-top: 12px;
      padding: 10px;
      border: 1px solid #53668c;
      border-radius: 9px;
      background: #263653;
      color: white;
      cursor: pointer;
    }

    #kbverse-settings-note {
      margin-top: 10px;
      color: #8e9db9;
      font-size: 10px;
      line-height: 1.5;
    }
  `;

  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "kbverse-settings-root";

  root.innerHTML = `
    <section id="kbverse-settings-panel">
      <h2>⚙ KBVERSE Settings</h2>

      <div class="kb-setting">
        <label for="kb-shader">Shader Mode</label>
        <select id="kb-shader" data-setting="shader">
          <option value="off">Off</option>
          <option value="standard">Standard</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <div class="kb-setting">
        <label for="kb-graphics">Graphics</label>
        <select id="kb-graphics" data-setting="graphics">
          <option value="potato">Potato</option>
          <option value="low">Low</option>
          <option value="balanced">Balanced</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </select>
      </div>

      <div class="kb-setting">
        <label for="kb-shadows">Shadow Quality</label>
        <select id="kb-shadows" data-setting="shadows">
          <option value="off">Off</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div class="kb-setting">
        <label for="kb-sound">Sound <span id="kb-sound-value"></span></label>
        <div class="kb-audio-row">
          <input id="kb-sound" data-setting="sound" type="range" min="0" max="100">
          <button class="kb-test-button" id="kb-test-sound">Test</button>
        </div>
      </div>

      <div class="kb-setting">
        <label for="kb-sfx">SFX <span id="kb-sfx-value"></span></label>
        <div class="kb-audio-row">
          <input id="kb-sfx" data-setting="sfx" type="range" min="0" max="100">
          <button class="kb-test-button" id="kb-test-sfx">Test</button>
        </div>
      </div>

      <div class="kb-setting">
        <label for="kb-distance">View Distance <span id="kb-distance-value"></span></label>
        <input id="kb-distance" data-setting="viewDistance" type="range" min="10" max="100" step="5">
      </div>

      <button id="kbverse-settings-reset">Reset Defaults</button>

      <div id="kbverse-settings-note">
        Settings are saved automatically. Audio test buttons verify the Sound and SFX channels.
      </div>
    </section>

    <button id="kbverse-settings-toggle" title="Settings" aria-label="Open settings">⚙</button>
  `;

  document.body.appendChild(root);

  const panel = root.querySelector<HTMLElement>("#kbverse-settings-panel")!;
  const toggle = root.querySelector<HTMLButtonElement>("#kbverse-settings-toggle")!;

  function apply(): void {
    const pixelRatio = graphicsProfiles[settings.graphics] ?? 1;

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, pixelRatio)
    );

    // Keep tone mapping stable. Shader selection must not alter shadow rendering.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const exposure: Record<string, number> = {
      off: 1.15,
      standard: 1.15,
      advanced: 1.15
    };

    renderer.toneMappingExposure =
      exposure[settings.shader] ?? 1.15;

    const shadowSize = shadowProfiles[settings.shadows] ?? 1024;

    renderer.shadowMap.enabled = shadowSize > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    keyLight.castShadow = shadowSize > 0;

    if (shadowSize > 0) {
      keyLight.shadow.mapSize.set(shadowSize, shadowSize);
    }

    keyLight.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;

    camera.far = Math.max(30, settings.viewDistance * 3);
    camera.updateProjectionMatrix();

    if (scene.fog instanceof THREE.Fog) {
      scene.fog.far = camera.far * 0.85;
    }

    if (soundGain) {
      soundGain.gain.value = settings.sound / 100;
    }

    if (sfxGain) {
      sfxGain.gain.value = settings.sfx / 100;
    }

    root.querySelector<HTMLElement>("#kb-sound-value")!.textContent =
      `${settings.sound}%`;

    root.querySelector<HTMLElement>("#kb-sfx-value")!.textContent =
      `${settings.sfx}%`;

    root.querySelector<HTMLElement>("#kb-distance-value")!.textContent =
      `${settings.viewDistance}%`;
  }

  function updateControls(): void {
    for (const key of [
      "shader",
      "graphics",
      "shadows",
      "sound",
      "sfx",
      "viewDistance"
    ] as const) {
      const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(
        `[data-setting="${key}"]`
      )!;

      control.value = String(settings[key]);
    }

    apply();
  }

  function save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    apply();
  }

  root.addEventListener("input", (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const key = target.dataset.setting as keyof Settings | undefined;
    if (!key) return;

    if (
      key === "sound" ||
      key === "sfx" ||
      key === "viewDistance"
    ) {
      settings[key] = Number(target.value);
      save();
    }
  });

  root.addEventListener("change", (event: Event) => {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) return;

    const key = target.dataset.setting as keyof Settings | undefined;

    if (
      key !== "shader" &&
      key !== "graphics" &&
      key !== "shadows"
    ) return;

    settings[key] = target.value;
    save();
  });

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
  });

  root.querySelector("#kb-test-sound")!.addEventListener("click", () => {
    playTest("sound");
  });

  root.querySelector("#kb-test-sfx")!.addEventListener("click", () => {
    playTest("sfx");
  });

  root.querySelector("#kbverse-settings-reset")!.addEventListener("click", () => {
    settings = { ...defaults };
    updateControls();
    save();
  });

  updateControls();
}
