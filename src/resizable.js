import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import CryptoJS from "crypto-js";


const containerStates = [];
let containerCount = 0;
let activeContainer = null;
let initialX, initialY;
let initialDist = 0;
let currentScale = 1;
let isBeingRotated = false;
let isDragging = false;
const containerScenes = new Map();
let isAllAnimationPaused = false;
let highestZIndex = 1;
let wasScaling = false;

let hideTimeout = null;
let activeContainerId = null;

const urlParams = new URLSearchParams(window.location.search);
const graphics = urlParams.get("graphics") ?? "medium";
let antialiasEnabled = false;
if (graphics === "high") {
  antialiasEnabled = true;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const moveIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="5 9 2 12 5 15" />
  <polyline points="9 5 12 2 15 5" />
  <polyline points="15 19 12 22 9 19" />
  <polyline points="19 9 22 12 19 15" />
  <line x1="2" y1="12" x2="22" y2="12" />
  <line x1="12" y1="2" x2="12" y2="22" />
</svg>
`;

const rotateIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 2v6h-6" />
  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
  <path d="M21 12a9 9 0 1 1-9-9" />
</svg>`;

const playIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="5 3 19 12 5 21 5 3" />
</svg>
`;

const pauseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="4" width="4" height="16" />
  <rect x="14" y="4" width="4" height="16" />
</svg>`;

const closeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18" />
  <line x1="6" y1="6" x2="18" y2="18" />
</svg>`;

const mainContainer = document.getElementById("main-container");


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function createContainer(fileData, coordinates, filename) {
  if (containerStates.length >= 3) {
    document.getElementById("warning-message").style.display = "block";
    setTimeout(() => {
      document.getElementById("warning-message").style.display = "none";
    }, 3000);
    window.flutter_invoke?.postMessage("loaded");
    return;
  }

  if (containerStates.length > 0) {
    toggleAllAnimations(true);
  }
  containerCount++;

  const baseWidth = 300;
  const baseHeight = 300;

  const state = {
    id: containerCount,
    left: 0,
    top: 0,
    scale: 1,
    width: baseWidth,
    height: baseHeight,
    rotationEnabled: false,
    animationPlaying: true,
  };

  const container = document.createElement("div");
  container.className = "draggable-container";
  container.id = `container-${state.id}`;
  container.style.width = `${baseWidth}px`;
  container.style.height = `${baseHeight}px`;
  container.style.zIndex = highestZIndex + 1;
  highestZIndex += 1;

  const loadingElement = document.createElement("div");
  loadingElement.id = `loading-${state.id}`;
  loadingElement.classList.add("loading");

  container.appendChild(loadingElement);
  container.classList.add("skeleton");

  // Your button creation code...
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = closeIconSvg;
  closeBtn.className = "close-button hidden-control";
  closeBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    mainContainer.removeChild(container);
    const index = containerStates.findIndex((c) => c.id === state.id);
    if (index !== -1) containerStates.splice(index, 1);
    window.flutter_invoke?.postMessage("closed#_" + filename);
  });
  container.appendChild(closeBtn);

  const rotateBtn = document.createElement("button");
  rotateBtn.innerHTML = rotateIconSvg;
  rotateBtn.className = "rotate-button hidden-control";
  rotateBtn.dataset.enabled = "false";
  rotateBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    toggleRotation(state.id, rotateBtn);
  });
  container.appendChild(rotateBtn);

  const animateBtn = document.createElement("button");
  animateBtn.innerHTML = pauseIconSvg;
  animateBtn.className = "animate-button hidden-control";
  animateBtn.id = `animate-button-${state.id}`;
  animateBtn.dataset.playing = "true";
  animateBtn.addEventListener("touchstart", (e) => {
    e.stopPropagation();
    toggleAnimation(state.id, animateBtn);
  });

  container.appendChild(animateBtn);

  const margin =
    Math.min(mainContainer.clientWidth, mainContainer.clientHeight) * 0.2;
  const minLeft = margin;
  const maxLeft = mainContainer.clientWidth - margin - baseWidth / 2;
  const minTop = margin;
  const maxTop = mainContainer.clientHeight - margin - baseHeight / 2;

  const left = minLeft + Math.random() * (maxLeft - minLeft);
  const top = minTop + Math.random() * (maxTop - minTop);

  container.style.left = `${left}px`;
  container.style.top = `${top}px`;

  state.left = left;
  state.top = top;
  containerStates.push(state);

  mainContainer.appendChild(container);
  addTouchEventListeners(container);

  createScene(container, state.id, fileData, coordinates);
  window.flutter_invoke?.postMessage("loaded");

  showContainerControls(state.id);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function showContainerControls(containerId) {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  const containers = document.querySelectorAll(".draggable-container");
  containers.forEach((container) => {
    container.classList.remove("active-container");

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => button.classList.add("hidden-control"));
  });

  const activeContainer = document.getElementById(`container-${containerId}`);
  if (activeContainer) {
    activeContainer.classList.add("active-container");

    const buttons = activeContainer.querySelectorAll("button");
    buttons.forEach((button) => button.classList.remove("hidden-control"));

    activeContainerId = containerId;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function hideContainerControls() {
  const containers = document.querySelectorAll(".draggable-container");
  containers.forEach((container) => {
    container.classList.remove("active-container");

    const containerId = parseInt(container.id.replace("container-", ""));
    const containerState = containerStates.find((c) => c.id === containerId);

    if (containerState && containerState.rotationEnabled) {
      const rotateBtn = container.querySelector(".rotate-button");
      if (rotateBtn) {
        toggleRotation(containerId, rotateBtn);
      }
    }

    const buttons = container.querySelectorAll("button");
    buttons.forEach((button) => button.classList.add("hidden-control"));
  });

  activeContainerId = null;
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function toggleAnimation(containerId, button) {
  const stateIndex = containerStates.findIndex((c) => c.id === containerId);
  if (stateIndex === -1) return;

  containerStates[stateIndex].animationPlaying =
    !containerStates[stateIndex].animationPlaying;
  const isPlaying = containerStates[stateIndex].animationPlaying;

  button.dataset.playing = isPlaying.toString();
  button.innerHTML = isPlaying ? pauseIconSvg : playIconSvg;

  const sceneData = containerScenes.get(containerId);
  if (sceneData) {
    sceneData.isAnimationPlaying = isPlaying;

    if (
      sceneData.mixer &&
      sceneData.animationActions &&
      sceneData.animationActions.length > 0
    ) {
      if (isPlaying) {
        sceneData.animationActions.forEach((action) => {
          action.paused = false;
        });
      } else {
        sceneData.animationActions.forEach((action) => {
          action.paused = true;
        });
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setupAnimations(gltf, containerId) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  if (gltf.animations && gltf.animations.length > 0) {
    sceneData.mixer = new THREE.AnimationMixer(gltf.scene);
    sceneData.animationActions = [];

    gltf.animations.forEach((clip) => {
      const action = sceneData.mixer.clipAction(clip);
      sceneData.animationActions.push(action);
      action.play();
    });

    const containerState = containerStates.find((c) => c.id === containerId);
    if (containerState) {
      sceneData.isAnimationPlaying = containerState.animationPlaying;
      if (!containerState.animationPlaying) {
        sceneData.animationActions.forEach((action) => {
          action.paused = true;
        });
      }
    } else {
      sceneData.isAnimationPlaying = true;
    }
  } else {
    console.log("No animations found in the GLTF file.");
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function toggleRotation(containerId, button) {
  const stateIndex = containerStates.findIndex((c) => c.id === containerId);
  if (stateIndex === -1) return;

  containerStates[stateIndex].rotationEnabled =
    !containerStates[stateIndex].rotationEnabled;
  const isEnabled = containerStates[stateIndex].rotationEnabled;

  button.dataset.enabled = isEnabled.toString();
  button.innerHTML = isEnabled ? moveIconSvg : rotateIconSvg;

  const sceneData = containerScenes.get(containerId);
  if (sceneData) {
    sceneData.controls.enabled = isEnabled;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function addTouchEventListeners(container) {
  container.addEventListener("touchstart", handleTouchStart, false);
  container.addEventListener("touchmove", handleTouchMove, false);
  container.addEventListener("touchend", handleTouchEnd, false);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function handleTouchStart(e) {
  activeContainer = this;
  const containerId = parseInt(activeContainer.id.replace("container-", ""));

  highestZIndex += 1;
  activeContainer.style.zIndex = highestZIndex;
  if (!isBeingRotated) {
    isAllAnimationPaused = true;
  }

  if (e.touches.length > 2) {
    return;
  }

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  showContainerControls(containerId);

  const containerState = containerStates.find((c) => c.id === containerId);

  if (containerState && containerState.rotationEnabled) {
    return;
  }

  e.preventDefault();

  if (e.touches.length === 1) {
    initialX = e.touches[0].clientX - parseFloat(activeContainer.style.left);
    initialY = e.touches[0].clientY - parseFloat(activeContainer.style.top);

    isDragging = false;
  } else if (e.touches.length === 2) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    initialDist = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    const containerWidth = parseInt(activeContainer.style.width);
    currentScale = containerWidth / 300;
  }
}

mainContainer.addEventListener("touchstart", function (e) {
  if (e.target === mainContainer && !isBeingRotated) {
    hideContainerControls();
  }
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function handleTouchMove(e) {
  if (!activeContainer) return;

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  const containerId = parseInt(activeContainer.id.replace("container-", ""));
  const containerState = containerStates.find((c) => c.id === containerId);

  if (containerState && containerState.rotationEnabled) {
    return;
  }

  e.preventDefault();

  if (e.touches.length > 2) return;

  if (e.touches.length === 1) {
    if (wasScaling) return;

    if (!isDragging) {
      isDragging = true;
      hideContainerControls();
    }

    const newX = e.touches[0].clientX - initialX;
    const newY = e.touches[0].clientY - initialY;

    const containerWidth = activeContainer.offsetWidth;
    const containerHeight = activeContainer.offsetHeight;

    const margin = -0.75;
    const minX = margin * containerWidth;
    const minY = margin * containerHeight;
    const maxX = mainContainer.clientWidth - containerWidth * 0.25;
    const maxY = mainContainer.clientHeight - containerHeight * 0.25;

    activeContainer.style.left = `${Math.max(minX, Math.min(maxX, newX))}px`;
    activeContainer.style.top = `${Math.max(minY, Math.min(maxY, newY))}px`;

    const state = containerStates.find((c) => c.id === containerId);
    if (state) {
      state.left = newX;
      state.top = newY;
    }
  } else if (e.touches.length === 2) {
    wasScaling = true;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    const currentDist = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    let scale = (currentDist / initialDist) * currentScale;
    scale = Math.max(0.5, Math.min(3, scale));

    const baseWidth = 300; 
    const baseHeight = 300; 

    const oldWidth = parseInt(activeContainer.style.width);
    const oldHeight = parseInt(activeContainer.style.height);
    const newWidth = Math.round(baseWidth * scale);
    const newHeight = Math.round(baseHeight * scale);

    const currentLeft = parseFloat(activeContainer.style.left);
    const currentTop = parseFloat(activeContainer.style.top);

    const widthDiff = newWidth - oldWidth;
    const heightDiff = newHeight - oldHeight;

    const newLeft = currentLeft - widthDiff / 2;
    const newTop = currentTop - heightDiff / 2;

    activeContainer.style.width = `${newWidth}px`;
    activeContainer.style.height = `${newHeight}px`;
    activeContainer.style.left = `${newLeft}px`;
    activeContainer.style.top = `${newTop}px`;
    activeContainer.style.transform = "scale(1)"; // Reset the transform

    // Update the renderer size
    const sceneData = containerScenes.get(containerId);
    if (sceneData) {
      sceneData.width = newWidth;
      sceneData.height = newHeight;
      // if (sceneData.renderer) {
      //   sceneData.renderer.setSize(newWidth, newHeight);
      // }

      // Make sure the camera exists
      // if (sceneData.camera) {
      //   sceneData.camera.aspect = newWidth / newHeight;
      //   sceneData.camera.updateProjectionMatrix();
      // }
    }

    const state = containerStates.find((c) => c.id === containerId);
    if (state) {
      state.scale = scale;
      state.width = newWidth;
      state.height = newHeight;
      state.left = newLeft;
      state.top = newTop;
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function handleTouchEnd(e) {
  toggleAllAnimations(false);
  if (activeContainer) {
    const containerId = parseInt(activeContainer.id.replace("container-", ""));
    const sceneData = containerScenes.get(containerId);
    let width = parseInt(activeContainer.style.width);
    let height = parseInt(activeContainer.style.height);
    if (sceneData.renderer) {
      sceneData.renderer.setSize(width, height);
    }

    if (isDragging) {
      isDragging = false;
      showContainerControls(containerId);
    }
    if (wasScaling) {
      wasScaling = false;
    }
    activeContainer = null;

    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    hideTimeout = setTimeout(() => {
      hideContainerControls();
    }, 6000);
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createScene(container, containerId, fileData, coordinates) {
  const loadingElement = document.getElementById(`loading-${containerId}`);

  const scene = new THREE.Scene();
  scene.background = null;

  const width = parseInt(container.style.width);
  const height = parseInt(container.style.height);
  const aspectRatio = width / height;

  const camera = new THREE.PerspectiveCamera(40, aspectRatio, 0.1, 10000);
  camera.position.z = 2;

  const renderer = new THREE.WebGLRenderer({
    antialias: antialiasEnabled,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(
    graphics === "high" || graphics === "medium" ? window.devicePixelRatio : 1.7
  );
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.autoRotate = false;
  controls.enabled = false;

  controls.minDistance = 0.1;
  controls.maxDistance = 5000;

  controls.addEventListener("start", function () {
    isBeingRotated = true;
  });

  controls.addEventListener("end", function () {
    isBeingRotated = false;
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // if (graphics === "high") {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  // } else {
  //   const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  //   scene.add(hemisphereLight);
  // }

  const clock = new THREE.Clock();
  let mixer = null;
  let isAnimationPlaying = true;
  let model = null;

  containerScenes.set(containerId, {
    scene,
    camera,
    renderer,
    controls,
    clock,
    mixer,
    animationActions: [],
    isAnimationPlaying,
    loadingElement,
    model,
    width,
    height,
  });

  loadEncryptedModel(containerId, fileData, animate, coordinates);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function animate(containerId) {
  if (!document.getElementById(`container-${containerId}`)) {
    return;
  }

  if (isAllAnimationPaused) {
    return;
  }

  // Use a less frequent animation loop when many containers are present
  if (containerStates.length > 2) {
    // Throttle animation updates for better performance
    const shouldAnimate = Date.now() % 2 === 0; // Only animate on even milliseconds
    if (!shouldAnimate) {
      requestAnimationFrame(() => animate(containerId));
      return;
    }
  }

  requestAnimationFrame(() => animate(containerId));

  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  sceneData.controls.update();

  const delta = sceneData.clock.getDelta();
  if (sceneData.mixer && sceneData.isAnimationPlaying) {
    sceneData.mixer.update(delta);
  }

  sceneData.renderer.render(sceneData.scene, sceneData.camera);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function reduceKeyframes(clip) {
  // Create a new, simplified clip
  const tracks = [];

  clip.tracks.forEach((track) => {
    // Get original times and values
    const times = track.times;
    const values = track.values;

    if (times.length <= 2) {
      // If only 2 or fewer keyframes, keep as is
      tracks.push(track);
      return;
    }

    // Create simplified arrays - take every other keyframe
    const newTimes = [];
    const newValues = [];
    const valueSize = track.getValueSize();

    for (let i = 0; i < times.length; i += 2) {
      newTimes.push(times[i]);

      for (let j = 0; j < valueSize; j++) {
        newValues.push(values[i * valueSize + j]);
      }
    }

    // Make sure we have the last keyframe
    if (times.length % 2 !== 0) {
      const lastIndex = times.length - 1;
      newTimes.push(times[lastIndex]);

      for (let j = 0; j < valueSize; j++) {
        newValues.push(values[lastIndex * valueSize + j]);
      }
    }

    // Create a new track with fewer keyframes
    const newTrack = new THREE[track.constructor.name](
      track.name,
      newTimes,
      newValues,
      track.interpolation
    );

    tracks.push(newTrack);
  });

  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function optimizeAnimations(gltf, containerId) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  if (gltf.animations && gltf.animations.length > 0) {
    sceneData.mixer = new THREE.AnimationMixer(gltf.scene);
    sceneData.animationActions = [];

    // Limit the number of simultaneously playing animations for performance
    const maxAnimations = containerStates.length > 2 ? 1 : 2;
    const animationsToPlay = gltf.animations.slice(0, maxAnimations);

    animationsToPlay.forEach((clip) => {
      if (containerStates.length > 2) {
        const optimizedClip = reduceKeyframes(clip);
        const action = sceneData.mixer.clipAction(optimizedClip);
        sceneData.animationActions.push(action);
        action.play();
      } else {
        const action = sceneData.mixer.clipAction(clip);
        sceneData.animationActions.push(action);
        action.play();
      }
    });

    sceneData.isAnimationPlaying = true;
  } else {
    document.getElementById(`animate-button-${containerId}`).style.display =
      "none";
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function fitModelToContainer(model, containerId) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  model.scale.set(1, 1, 1);
  model.position.set(0, 0, 0);

  const boundingBox = new THREE.Box3().setFromObject(model);

  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const center = new THREE.Vector3();
  boundingBox.getCenter(center);

  const containerAspect = sceneData.width / sceneData.height;
  let optimalScale;

  const modelAspectXY = size.x / size.y;

  if (containerAspect >= 1) {
    if (modelAspectXY >= containerAspect) {
      optimalScale = (sceneData.width * 0.85) / size.x;
    } else {
      optimalScale = (sceneData.height * 0.85) / size.y;
    }
  } else {
    if (modelAspectXY <= containerAspect) {
      optimalScale = (sceneData.height * 0.85) / size.y;
    } else {
      optimalScale = (sceneData.width * 0.85) / size.x;
    }
  }

  if (size.z > Math.max(size.x, size.y) * 1.5) {
    optimalScale = Math.min(optimalScale, (sceneData.width * 0.85) / size.z);
  }

  model.scale.set(optimalScale, optimalScale, optimalScale);

  const scaledBoundingBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBoundingBox.getCenter(scaledCenter);

  model.position.sub(scaledCenter);

  const scaledSize = new THREE.Vector3();
  scaledBoundingBox.getSize(scaledSize);
  const maxScaledDimension = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);

  const fov = sceneData.camera.fov * (Math.PI / 180);
  const distance = maxScaledDimension / 2 / Math.tan(fov / 2);

  sceneData.camera.position.z = distance * 1.2;

  sceneData.camera.near = distance * 0.01;
  sceneData.camera.far = distance * 100;

  sceneData.camera.updateProjectionMatrix();

  if (sceneData.controls) {
    sceneData.controls.minDistance = distance * 0.1;
    sceneData.controls.maxDistance = distance * 50;
  }

  sceneData.model = model;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function toggleAllAnimations(value) {
  isAllAnimationPaused = value;

  if (!isAllAnimationPaused) {
    containerStates.forEach((state) => {
      const containerId = state.id;
      const containerElement = document.getElementById(
        `container-${containerId}`
      );
      if (containerElement && containerScenes.has(containerId)) {
        animate(containerId);
      }
    });
  }

  return value;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function loadEncryptedModel(containerId, fileData, animate, coordinates) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  sceneData.loadingElement.style.display = "block";
  try {
    // const response = await fetch(
    //   `./models/17110152191230910308750020248_lifecycleofcockroachpart1.glb`
    // );

    // if (!response.ok) {
    //   throw new Error(
    //     `Failed to fetch model: ${response.status} ${response.statusText}`
    //   );
    // }

    // const encryptedData = await response.text();
    // console.log(encryptedData.slice(0, 100));
    const encryptedData = fileData;

    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, coordinates);
    const decryptedData = CryptoJS.enc.Utf8.stringify(decryptedBytes);

    if (!decryptedData) {
      throw new Error(
        "Failed to decrypt model data. Check the decryption key."
      );
    }

    const binaryString = atob(decryptedData);
    const binaryLength = binaryString.length;
    const binaryData = new Uint8Array(binaryLength);
    for (let i = 0; i < binaryLength; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([binaryData], { type: "model/gltf-binary" });
    const objectURL = URL.createObjectURL(blob);

    loadModel(objectURL, containerId, animate);
  } catch (error) {
    sceneData.loadingElement.textContent = `Error: ${error.message}`;
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadModel(objectURL, containerId, animate) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  const loader = new GLTFLoader();

  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("./draco/");
    dracoLoader.setDecoderConfig({ type: "js" });

    // Set the DRACO loader for the GLTF loader
    loader.setDRACOLoader(dracoLoader);

    console.log("DRACOLoader initialized successfully");
  } catch (error) {
    console.error("Error initializing DRACOLoader:", error);
    sceneData.loadingElement.textContent = `DRACOLoader error: ${error.message}`;
    return;
  }
  if (typeof MeshoptDecoder !== "undefined") {
    console.log(
      "MeshoptDecoder is available.  ########################################"
    );
    loader.setMeshoptDecoder(MeshoptDecoder);
  } else {
    console.warn(
      "THREE.MeshoptDecoder is not available. Compressed models may not load correctly."
    );
  }

  loader.load(
    objectURL,
    (gltf) => {
      const model = gltf.scene;

      fitModelToContainer(model, containerId);

      setupAnimations(gltf, containerId);

      model.traverse((node) => {
        if (node.isMesh) {
          if (node.material) {
            node.material.roughness = 0.6;
            node.material.metalness = 0.1;
            node.material.envMapIntensity = 0.5;
            node.castShadow = false;
            node.receiveShadow = false;
          }
        }
      });

      sceneData.scene.add(model);
      sceneData.loadingElement.style.display = "none";
      const container = document.getElementById(`container-${containerId}`);
      container.classList.remove("skeleton");

      if (isAllAnimationPaused) {
        toggleAllAnimations(false);
      } else {
        animate(containerId);
      }

      toggleAnimation(
        containerId,
        document.getElementById(`animate-button-${containerId}`)
      );
    },
    (xhr) => {
      sceneData.loadingElement.textContent = "100 %";
    },
    (error) => {
      console.log(error.message);
      sceneData.loadingElement.textContent = `Error loading model: ${error.message}`;
    }
  );
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



window.createContainer = createContainer;

