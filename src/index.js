

// src/index.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import CryptoJS from "crypto-js";
import './styles.css';

// Global state container
const state = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  loadingManager: null,
  gltfLoader: null,
  exrLoader: null,
  currentModel: null,
  mixer: null,
  animations: [],
  currentAnimation: null,
  clock: new THREE.Clock()
};

// Container 

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
var fileData;

let hideTimeout = null;
let activeContainerId = null;

const urlParams = new URLSearchParams(window.location.search);
const graphics = urlParams.get("graphics") ?? "medium";
let antialiasEnabled = false;
if (graphics === "high") {
  antialiasEnabled = true;
}

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

// Initialize the scene
// function initScene() {
//   console.log("Initializing scene");
//   state.scene = new THREE.Scene();
//   state.scene.background = new THREE.Color(0x333333);
//   console.log("Scene initialized");
// }

// // Set up camera
// function initCamera() {
//   console.log("Setting up camera");
//   state.camera = new THREE.PerspectiveCamera(
//     45,
//     window.innerWidth / window.innerHeight,
//     0.1,
//     1000
//   );
//   state.camera.position.set(5, 2, 5);
//   console.log("Camera set up");
// }

// // Initialize renderer
// function initRenderer() {
//   console.log("Initializing renderer");
//   state.renderer = new THREE.WebGLRenderer({ antialias: true });
//   state.renderer.setSize(window.innerWidth, window.innerHeight);
//   state.renderer.setPixelRatio(window.devicePixelRatio);
//   state.renderer.shadowMap.enabled = true;
//   state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
//   state.renderer.toneMappingExposure = 1.0;
//   state.renderer.outputColorSpace = THREE.SRGBColorSpace;
//   document.body.appendChild(state.renderer.domElement);
//   console.log("Renderer initialized");
// }

// // Set up controls
// function initControls() {
//   console.log("Initializing controls");
//   state.controls = new OrbitControls(state.camera, state.renderer.domElement);
//   console.log("Controls initialized");
// }

// // Set up lights
// function setupLights() {
//   console.log("Setting up lights");
  
//   // Add ambient light
//   const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
//   state.scene.add(ambientLight);

//   // Add directional light
//   const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
//   directionalLight.position.set(5, 10, 5);
//   directionalLight.castShadow = true;
//   directionalLight.shadow.mapSize.width = 2048;
//   directionalLight.shadow.mapSize.height = 2048;
//   const d = 10;
//   directionalLight.shadow.camera.left = -d;
//   directionalLight.shadow.camera.right = d;
//   directionalLight.shadow.camera.top = d;
//   directionalLight.shadow.camera.bottom = -d;
//   state.scene.add(directionalLight);
  
//   console.log("Lights added to scene");
// }

// // Set up loaders
// function setupLoaders() {
//   console.log("Setting up loaders");
  
//   // Initialize loading manager
//   state.loadingManager = new THREE.LoadingManager();
//   state.loadingManager.onProgress = (url, loaded, total) => {
//     console.log(`Loading: ${url} - ${Math.round((loaded / total) * 100)}%`);
//   };

//   state.loadingManager.onLoad = () => {
//     console.log("Loading manager: All resources loaded");
//     hideLoadingScreen();
//   };

//   state.loadingManager.onError = (url) => {
//     console.error("Loading manager error for:", url);
//   };

//   // Set up Draco loader
//   const dracoLoader = new DRACOLoader();
//   dracoLoader.setDecoderPath(
//     "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
//   );
//   dracoLoader.setDecoderConfig({ type: "js" });

//   // Set up GLTF/GLB loader
//   state.gltfLoader = new GLTFLoader(state.loadingManager);
//   state.gltfLoader.setDRACOLoader(dracoLoader);

//   // Set up EXR loader
//   state.exrLoader = new EXRLoader(state.loadingManager);
// }

// Ensure loading screen exists
// function ensureLoadingScreen() {
//   let loadingScreen = document.getElementById("loading-screen");
//   if (!loadingScreen) {
//     console.log("Creating loading screen");
//     loadingScreen = document.createElement("div");
//     loadingScreen.id = "loading-screen";
//     loadingScreen.innerHTML = "Loading model...";
//     loadingScreen.style.position = "fixed";
//     loadingScreen.style.width = "100%";
//     loadingScreen.style.height = "100%";
//     loadingScreen.style.display = "flex";
//     loadingScreen.style.justifyContent = "center";
//     loadingScreen.style.alignItems = "center";
//     loadingScreen.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
//     loadingScreen.style.color = "white";
//     loadingScreen.style.fontSize = "24px";
//     loadingScreen.style.zIndex = "1000";
//     document.body.appendChild(loadingScreen);
//   }
// }

// Show loading screen
// function showLoadingScreen() {
//   const loadingScreen = document.getElementById("loading-screen");
//   if (loadingScreen) {
//     loadingScreen.style.display = "flex";
//   }
// }

// Hide loading screen
// function hideLoadingScreen() {
//   const loadingScreen = document.getElementById("loading-screen");
//   if (loadingScreen) {
//     loadingScreen.style.display = "none";
//   }
// }

// Add grid helper
// function addGrid() {
//   const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
//   state.scene.add(gridHelper);
//   console.log("Grid added to scene");
// }

// Setup animation mixer and clips
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

// Create UI controls for animations
// function createAnimationControls() {
//   // Remove existing controls if any
//   const existingControls = document.getElementById('animation-controls');
//   if (existingControls) {
//     existingControls.remove();
//   }

//   const controlsContainer = document.createElement('div');
//   controlsContainer.id = 'animation-controls';
//   controlsContainer.style.position = 'fixed';
//   controlsContainer.style.top = '20px';
//   controlsContainer.style.left = '20px';
//   controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
//   controlsContainer.style.color = 'white';
//   controlsContainer.style.padding = '15px';
//   controlsContainer.style.borderRadius = '8px';
//   controlsContainer.style.fontFamily = 'Arial, sans-serif';
//   controlsContainer.style.fontSize = '14px';
//   controlsContainer.style.zIndex = '1001';
//   controlsContainer.style.minWidth = '250px';

//   // Title
//   const title = document.createElement('h3');
//   title.textContent = 'Animation Controls';
//   title.style.margin = '0 0 10px 0';
//   title.style.fontSize = '16px';
//   controlsContainer.appendChild(title);

//   // Animation selector
//   if (state.animations.length > 1) {
//     const selectorLabel = document.createElement('label');
//     selectorLabel.textContent = 'Select Animation:';
//     selectorLabel.style.display = 'block';
//     selectorLabel.style.marginBottom = '5px';
//     controlsContainer.appendChild(selectorLabel);

//     const selector = document.createElement('select');
//     selector.id = 'animation-selector';
//     selector.style.width = '100%';
//     selector.style.marginBottom = '10px';
//     selector.style.padding = '5px';
    
//     state.animations.forEach((anim, index) => {
//       const option = document.createElement('option');
//       option.value = index;
//       option.textContent = `${anim.name} (${anim.duration.toFixed(1)}s)`;
//       selector.appendChild(option);
//     });

//     selector.addEventListener('change', (e) => {
//       playAnimation(parseInt(e.target.value));
//     });

//     controlsContainer.appendChild(selector);
//   }

//   // Control buttons container
//   const buttonsContainer = document.createElement('div');
//   buttonsContainer.style.display = 'flex';
//   buttonsContainer.style.gap = '10px';
//   buttonsContainer.style.marginBottom = '10px';

//   // Play/Pause button
//   const playPauseBtn = document.createElement('button');
//   playPauseBtn.id = 'play-pause-btn';
//   playPauseBtn.textContent = 'Pause';
//   playPauseBtn.style.flex = '1';
//   playPauseBtn.style.padding = '8px';
//   playPauseBtn.style.cursor = 'pointer';
//   playPauseBtn.addEventListener('click', toggleAnimation);
//   buttonsContainer.appendChild(playPauseBtn);

//   // Stop button
//   const stopBtn = document.createElement('button');
//   stopBtn.textContent = 'Stop';
//   stopBtn.style.flex = '1';
//   stopBtn.style.padding = '8px';
//   stopBtn.style.cursor = 'pointer';
//   stopBtn.addEventListener('click', stopAnimation);
//   buttonsContainer.appendChild(stopBtn);

//   controlsContainer.appendChild(buttonsContainer);

//   // Speed control
//   const speedLabel = document.createElement('label');
//   speedLabel.textContent = 'Speed:';
//   speedLabel.style.display = 'block';
//   speedLabel.style.marginBottom = '5px';
//   controlsContainer.appendChild(speedLabel);

//   const speedSlider = document.createElement('input');
//   speedSlider.type = 'range';
//   speedSlider.id = 'speed-slider';
//   speedSlider.min = '0.1';
//   speedSlider.max = '3.0';
//   speedSlider.step = '0.1';
//   speedSlider.value = '1.0';
//   speedSlider.style.width = '100%';
//   speedSlider.style.marginBottom = '5px';
//   speedSlider.addEventListener('input', (e) => {
//     setAnimationSpeed(parseFloat(e.target.value));
//   });
//   controlsContainer.appendChild(speedSlider);

//   const speedValue = document.createElement('span');
//   speedValue.id = 'speed-value';
//   speedValue.textContent = '1.0x';
//   speedValue.style.fontSize = '12px';
//   controlsContainer.appendChild(speedValue);

//   // Loop checkbox
//   const loopContainer = document.createElement('div');
//   loopContainer.style.marginTop = '10px';

//   const loopCheckbox = document.createElement('input');
//   loopCheckbox.type = 'checkbox';
//   loopCheckbox.id = 'loop-checkbox';
//   loopCheckbox.checked = true;
//   loopContainer.appendChild(loopCheckbox);

//   const loopLabel = document.createElement('label');
//   loopLabel.textContent = ' Loop Animation';
//   loopLabel.style.marginLeft = '5px';
//   loopLabel.style.cursor = 'pointer';
//   loopLabel.addEventListener('click', () => {
//     loopCheckbox.checked = !loopCheckbox.checked;
//     setAnimationLoop(loopCheckbox.checked);
//   });
//   loopContainer.appendChild(loopLabel);

//   controlsContainer.appendChild(loopContainer);

//   document.body.appendChild(controlsContainer);
// }

// // Play specific animation by index
// function playAnimation(index) {
//   if (!state.mixer || !state.animations[index]) {
//     console.warn(`Animation ${index} not found`);
//     return;
//   }

//   // Stop current animation
//   if (state.currentAnimation) {
//     state.currentAnimation.action.stop();
//   }

//   // Set new current animation
//   state.currentAnimation = state.animations[index];
  
//   // Configure and play the animation
//   const action = state.currentAnimation.action;
//   action.reset();
//   action.setLoop(THREE.LoopRepeat);
//   action.clampWhenFinished = true;
//   action.play();

//   console.log(`Playing animation: ${state.currentAnimation.name}`);

//   // Update UI
//   const playPauseBtn = document.getElementById('play-pause-btn');
//   if (playPauseBtn) {
//     playPauseBtn.textContent = 'Pause';
//   }

//   const selector = document.getElementById('animation-selector');
//   if (selector) {
//     selector.value = index;
//   }
// }

// Toggle animation play/pause
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

// Stop animation
// function stopAnimation() {
//   if (!state.currentAnimation) return;

//   state.currentAnimation.action.stop();
//   const playPauseBtn = document.getElementById('play-pause-btn');
//   if (playPauseBtn) {
//     playPauseBtn.textContent = 'Play';
//   }
//   console.log('Animation stopped');
// }

// Set animation speed
// function setAnimationSpeed(speed) {
//   if (!state.currentAnimation) return;

//   state.currentAnimation.action.setEffectiveTimeScale(speed);
  
//   const speedValue = document.getElementById('speed-value');
//   if (speedValue) {
//     speedValue.textContent = `${speed.toFixed(1)}x`;
//   }
  
//   console.log(`Animation speed set to: ${speed}x`);
// }

// Set animation loop
// function setAnimationLoop(loop) {
//   if (!state.currentAnimation) return;

//   const action = state.currentAnimation.action;
//   if (loop) {
//     action.setLoop(THREE.LoopRepeat);
//   } else {
//     action.setLoop(THREE.LoopOnce);
//     action.clampWhenFinished = true;
//   }
  
//   console.log(`Animation loop: ${loop ? 'enabled' : 'disabled'}`);
// }

// Play all animations simultaneously
// function playAllAnimations() {
//   if (!state.mixer || state.animations.length === 0) return;

//   state.animations.forEach((anim) => {
//     const action = anim.action;
//     action.reset();
//     action.setLoop(THREE.LoopRepeat);
//     action.play();
//   });

//   console.log('Playing all animations simultaneously');
// }

// Stop all animations
// function stopAllAnimations() {
//   if (!state.mixer) return;

//   state.animations.forEach((anim) => {
//     anim.action.stop();
//   });

//   const playPauseBtn = document.getElementById('play-pause-btn');
//   if (playPauseBtn) {
//     playPauseBtn.textContent = 'Play';
//   }

//   console.log('All animations stopped');
// }

// Load environment map
// async function loadEnvironmentMap() {
//   console.log("Loading environment map");
//   // Environment map loading logic can be added here
//   // For now, we'll proceed to load the model
//   loadModel();
// }

// Process mesh for shadows and materials
// function processMesh(child) {
//   if (child.isMesh) {
//     console.log(`Found mesh in model: ${child.name || "unnamed mesh"}`);
//     child.castShadow = true;
//     child.receiveShadow = true;

//     if (child.material) {
//       // Apply nice PBR material settings
//       child.material.roughness = 0.6;
//       child.material.metalness = 0.1;
//       child.material.envMapIntensity = 1.0;
//       child.material.needsUpdate = true;
//     }
//   }
// }

// Center model in the scene
// function centerModel(model) {
//   console.log("Centering model");
//   try {
//     // Create a bounding box
//     const boundingBox = new THREE.Box3().setFromObject(model);

//     // Get the center of the bounding box
//     const center = new THREE.Vector3();
//     boundingBox.getCenter(center);

//     console.log("Model bounding box:", {
//       min: boundingBox.min,
//       max: boundingBox.max,
//       center: center,
//     });

//     // Move the model so its center is at the origin
//     model.position.sub(center);

//     // Optional: Position the model so it's on the "ground"
//     const boundingBoxSize = new THREE.Vector3();
//     boundingBox.getSize(boundingBoxSize);
//     model.position.y = boundingBoxSize.y / 2;

//     console.log("Model centered at origin, height adjusted");
//   } catch (error) {
//     console.error("Error centering model:", error);
//   }
// }

// Fit camera to model bounding box
// function fitCameraToBoundingBox(model) {
//   console.log("Fitting camera to model");
//   try {
//     const boundingBox = new THREE.Box3().setFromObject(model);

//     const boundingBoxSize = new THREE.Vector3();
//     boundingBox.getSize(boundingBoxSize);

//     const center = new THREE.Vector3();
//     boundingBox.getCenter(center);

//     console.log("Model size:", boundingBoxSize);

//     // Get the bounding sphere
//     const boundingSphere = new THREE.Sphere();
//     boundingBox.getBoundingSphere(boundingSphere);

//     console.log("Bounding sphere radius:", boundingSphere.radius);

//     // Set camera distance based on bounding sphere radius
//     const offsetFactor = 2.0;
//     const cameraDistance = boundingSphere.radius * offsetFactor;

//     state.camera.position.set(
//       center.x + cameraDistance,
//       center.y + cameraDistance / 2,
//       center.z + cameraDistance
//     );

//     console.log("New camera position:", state.camera.position);

//     state.controls.target.copy(center);
//     state.controls.update();
//     console.log("Camera view adjusted to fit model");
//   } catch (error) {
//     console.error("Error fitting camera to model:", error);
//   }
// }

// // Handle successful model load
// function handleModelLoad(gltf, objectURL) {
//   console.log("Model loaded successfully:", gltf);
  
//   const model = gltf.scene;

//   // Auto-configure model materials and shadows
//   console.log("Configuring model materials and shadows");
//   model.traverse(processMesh);

//   // Center the model
//   centerModel(model);

//   // Add model to scene
//   state.scene.add(model);
//   state.currentModel = model;

//   // Set up animations if available
//   setupAnimations(gltf);

//   // Set camera to look at model
//   fitCameraToBoundingBox(model);

//   // Clean up the blob URL
//   URL.revokeObjectURL(objectURL);

//   // Hide loading screen
//   hideLoadingScreen();
// }

// // Handle model loading progress
// function handleModelProgress(xhr) {
//   const progress = Math.round((xhr.loaded / xhr.total) * 100);
//   console.log(`Loading model: ${progress}%`);
// }

// // Handle model loading error
// function handleModelError(error, objectURL) {
//   console.error("Error loading model:", error);
//   // Clean up even on error
//   URL.revokeObjectURL(objectURL);
//   hideLoadingScreen();
// }

// Load and decrypt model
// async function loadModel() {
//   showLoadingScreen();

//   try {
//     const modelFile = await import("./models/1720098399943043910948593699084_horse_and_stable.glb");
//     const response = await fetch(modelFile.default);

//     if (!response.ok) {
//       console.error("Failed to fetch model:", response.statusText);
//       hideLoadingScreen();
//       return;
//     }

//     // Get encrypted data
//     const encryptedData = await response.text();
//     console.log("Encrypted data received, length:", encryptedData.length);

//     // Decrypt the data
//     const decryptedBytes = CryptoJS.AES.decrypt(
//       encryptedData,
//       "bf3c199c2470cb477d907b1e0917c17b"
//     );

//     // Convert to string with UTF-8 encoding
//     const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);

//     if (!decryptedText) {
//       throw new Error("Failed to decrypt data - empty result");
//     }

//     console.log("Data decrypted successfully, length:", decryptedText.length);

//     // Decode from base64
//     const binaryString = atob(decryptedText);
//     const binaryLength = binaryString.length;
//     console.log("Binary data length after base64 decode:", binaryLength);

//     // Convert binary string to Uint8Array
//     const binaryData = new Uint8Array(binaryLength);
//     for (let i = 0; i < binaryLength; i++) {
//       binaryData[i] = binaryString.charCodeAt(i);
//     }

//     // Create blob and URL
//     const blob = new Blob([binaryData], { type: "model/gltf-binary" });
//     const objectURL = URL.createObjectURL(blob);

//     // Load the model using the blob URL
//     state.gltfLoader.load(
//       objectURL,
//       (gltf) => handleModelLoad(gltf, objectURL),
//       handleModelProgress,
//       (error) => handleModelError(error, objectURL)
//     );
//   } catch (error) {
//     console.error("Error in model loading process:", error);
//     hideLoadingScreen();
//   }
// }

// Handle window resize
// function onWindowResize() {
//   state.camera.aspect = window.innerWidth / window.innerHeight;
//   state.camera.updateProjectionMatrix();
//   state.renderer.setSize(window.innerWidth, window.innerHeight);
// }

// Animation loop
// function animate() {
//   requestAnimationFrame(animate);
  
//   // Update animation mixer
//   if (state.mixer) {
//     const deltaTime = state.clock.getDelta();
//     state.mixer.update(deltaTime);
//   }
  
//   state.controls.update();
//   state.renderer.render(state.scene, state.camera);
// }

// Container Functions //

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

// Touch Controls

function addTouchEventListeners(container) {
  container.addEventListener("touchstart", handleTouchStart, false);
  container.addEventListener("touchmove", handleTouchMove, false);
  container.addEventListener("touchend", handleTouchEnd, false);
}

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

// Scene Creation

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
  renderer.outputEncoding = THREE.SRGBColorSpace;
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

// Animate

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

async function loadEncryptedModel(containerId, fileData, animate, coordinates) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  sceneData.loadingElement.style.display = "block";
  try {
    const modelFile = await import(
      `./models/${fileData}.glb`
    );
    const response = await fetch(modelFile.default);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch model: ${response.status} ${response.statusText}`
      );
    }

    const encryptedData = await response.text();
    //console.log(encryptedData.slice(0, 100));
    //const encryptedData = fileData;

    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, "bf3c199c2470cb477d907b1e0917c17b");
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

function loadModel(objectURL, containerId, animate) {
  const sceneData = containerScenes.get(containerId);
  if (!sceneData) return;

  const loader = new GLTFLoader();

  try {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );
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

// function initGLBViewer() {
//   console.log("GLBViewer initialization started");

//   // Initialize all components
//   initScene();
//   initCamera();
//   initRenderer();
//   initControls();
  
//   // Set up scene elements
//   setupLights();
//   setupLoaders();
  
//   // Load content and start animation
//   loadModel();
//   animate();
  
//   console.log("GLBViewer initialization completed");
// }

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded, initializing GLB viewer");
});

const container = document.getElementById('main-container');

const button1 = document.createElement('button');
button1.id = 'add-button';
button1.textContent = 'Create Container 1';
button1.addEventListener('click', () => {createContainer(fileData= "17110907222010206687177821391_papaya")});
container.appendChild(button1);

const button2 = document.createElement('button');
button2.id = 'add-button';
button2.textContent = 'Create Container 2';
button2.addEventListener('click', () => {createContainer(fileData= "1720098399943043910948593699084_horse_and_stable")});
container.appendChild(button2);

const button3 = document.createElement('button');
button3.id = 'add-button';
button3.textContent = 'Create Container 3';
button3.addEventListener('click', () => {createContainer(fileData="171109134731104703100773586222_jasmine")});
container.appendChild(button3);