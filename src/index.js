

// src/index.js
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import CryptoJS from "crypto-js";

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

// Initialize the scene
function initScene() {
  console.log("Initializing scene");
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0x333333);
  console.log("Scene initialized");
}

// Set up camera
function initCamera() {
  console.log("Setting up camera");
  state.camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  state.camera.position.set(5, 2, 5);
  console.log("Camera set up");
}

// Initialize renderer
function initRenderer() {
  console.log("Initializing renderer");
  state.renderer = new THREE.WebGLRenderer({ antialias: true });
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.shadowMap.enabled = true;
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.0;
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(state.renderer.domElement);
  console.log("Renderer initialized");
}

// Set up controls
function initControls() {
  console.log("Initializing controls");
  state.controls = new OrbitControls(state.camera, state.renderer.domElement);
  console.log("Controls initialized");
}

// Set up lights
function setupLights() {
  console.log("Setting up lights");
  
  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  state.scene.add(ambientLight);

  // Add directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  const d = 10;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  state.scene.add(directionalLight);
  
  console.log("Lights added to scene");
}

// Set up loaders
function setupLoaders() {
  console.log("Setting up loaders");
  
  // Initialize loading manager
  state.loadingManager = new THREE.LoadingManager();
  state.loadingManager.onProgress = (url, loaded, total) => {
    console.log(`Loading: ${url} - ${Math.round((loaded / total) * 100)}%`);
  };

  state.loadingManager.onLoad = () => {
    console.log("Loading manager: All resources loaded");
    hideLoadingScreen();
  };

  state.loadingManager.onError = (url) => {
    console.error("Loading manager error for:", url);
  };

  // Set up Draco loader
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
  );
  dracoLoader.setDecoderConfig({ type: "js" });

  // Set up GLTF/GLB loader
  state.gltfLoader = new GLTFLoader(state.loadingManager);
  state.gltfLoader.setDRACOLoader(dracoLoader);

  // Set up EXR loader
  state.exrLoader = new EXRLoader(state.loadingManager);
}

// Ensure loading screen exists
function ensureLoadingScreen() {
  let loadingScreen = document.getElementById("loading-screen");
  if (!loadingScreen) {
    console.log("Creating loading screen");
    loadingScreen = document.createElement("div");
    loadingScreen.id = "loading-screen";
    loadingScreen.innerHTML = "Loading model...";
    loadingScreen.style.position = "fixed";
    loadingScreen.style.width = "100%";
    loadingScreen.style.height = "100%";
    loadingScreen.style.display = "flex";
    loadingScreen.style.justifyContent = "center";
    loadingScreen.style.alignItems = "center";
    loadingScreen.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    loadingScreen.style.color = "white";
    loadingScreen.style.fontSize = "24px";
    loadingScreen.style.zIndex = "1000";
    document.body.appendChild(loadingScreen);
  }
}

// Show loading screen
function showLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.display = "flex";
  }
}

// Hide loading screen
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.display = "none";
  }
}

// Add grid helper
function addGrid() {
  const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
  state.scene.add(gridHelper);
  console.log("Grid added to scene");
}

// Setup animation mixer and clips
function setupAnimations(gltf) {
  console.log("Setting up animations");
  
  if (!gltf.animations || gltf.animations.length === 0) {
    console.log("No animations found in the model");
    return;
  }

  console.log(`Found ${gltf.animations.length} animation(s):`, gltf.animations.map(anim => anim.name));

  // Create animation mixer
  state.mixer = new THREE.AnimationMixer(gltf.scene);
  state.animations = [];

  // Process all animation clips
  gltf.animations.forEach((clip, index) => {
    const action = state.mixer.clipAction(clip);
    
    const animationData = {
      name: clip.name || `Animation ${index + 1}`,
      clip: clip,
      action: action,
      duration: clip.duration
    };
    
    state.animations.push(animationData);
    console.log(`Animation "${animationData.name}" - Duration: ${animationData.duration.toFixed(2)}s`);
  });

  // Create animation controls UI
  createAnimationControls();

  // Auto-play first animation if available
  if (state.animations.length > 0) {
    playAnimation(0);
  }
}

// Create UI controls for animations
function createAnimationControls() {
  // Remove existing controls if any
  const existingControls = document.getElementById('animation-controls');
  if (existingControls) {
    existingControls.remove();
  }

  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'animation-controls';
  controlsContainer.style.position = 'fixed';
  controlsContainer.style.top = '20px';
  controlsContainer.style.left = '20px';
  controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  controlsContainer.style.color = 'white';
  controlsContainer.style.padding = '15px';
  controlsContainer.style.borderRadius = '8px';
  controlsContainer.style.fontFamily = 'Arial, sans-serif';
  controlsContainer.style.fontSize = '14px';
  controlsContainer.style.zIndex = '1001';
  controlsContainer.style.minWidth = '250px';

  // Title
  const title = document.createElement('h3');
  title.textContent = 'Animation Controls';
  title.style.margin = '0 0 10px 0';
  title.style.fontSize = '16px';
  controlsContainer.appendChild(title);

  // Animation selector
  if (state.animations.length > 1) {
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Select Animation:';
    selectorLabel.style.display = 'block';
    selectorLabel.style.marginBottom = '5px';
    controlsContainer.appendChild(selectorLabel);

    const selector = document.createElement('select');
    selector.id = 'animation-selector';
    selector.style.width = '100%';
    selector.style.marginBottom = '10px';
    selector.style.padding = '5px';
    
    state.animations.forEach((anim, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${anim.name} (${anim.duration.toFixed(1)}s)`;
      selector.appendChild(option);
    });

    selector.addEventListener('change', (e) => {
      playAnimation(parseInt(e.target.value));
    });

    controlsContainer.appendChild(selector);
  }

  // Control buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '10px';
  buttonsContainer.style.marginBottom = '10px';

  // Play/Pause button
  const playPauseBtn = document.createElement('button');
  playPauseBtn.id = 'play-pause-btn';
  playPauseBtn.textContent = 'Pause';
  playPauseBtn.style.flex = '1';
  playPauseBtn.style.padding = '8px';
  playPauseBtn.style.cursor = 'pointer';
  playPauseBtn.addEventListener('click', toggleAnimation);
  buttonsContainer.appendChild(playPauseBtn);

  // Stop button
  const stopBtn = document.createElement('button');
  stopBtn.textContent = 'Stop';
  stopBtn.style.flex = '1';
  stopBtn.style.padding = '8px';
  stopBtn.style.cursor = 'pointer';
  stopBtn.addEventListener('click', stopAnimation);
  buttonsContainer.appendChild(stopBtn);

  controlsContainer.appendChild(buttonsContainer);

  // Speed control
  const speedLabel = document.createElement('label');
  speedLabel.textContent = 'Speed:';
  speedLabel.style.display = 'block';
  speedLabel.style.marginBottom = '5px';
  controlsContainer.appendChild(speedLabel);

  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.id = 'speed-slider';
  speedSlider.min = '0.1';
  speedSlider.max = '3.0';
  speedSlider.step = '0.1';
  speedSlider.value = '1.0';
  speedSlider.style.width = '100%';
  speedSlider.style.marginBottom = '5px';
  speedSlider.addEventListener('input', (e) => {
    setAnimationSpeed(parseFloat(e.target.value));
  });
  controlsContainer.appendChild(speedSlider);

  const speedValue = document.createElement('span');
  speedValue.id = 'speed-value';
  speedValue.textContent = '1.0x';
  speedValue.style.fontSize = '12px';
  controlsContainer.appendChild(speedValue);

  // Loop checkbox
  const loopContainer = document.createElement('div');
  loopContainer.style.marginTop = '10px';

  const loopCheckbox = document.createElement('input');
  loopCheckbox.type = 'checkbox';
  loopCheckbox.id = 'loop-checkbox';
  loopCheckbox.checked = true;
  loopContainer.appendChild(loopCheckbox);

  const loopLabel = document.createElement('label');
  loopLabel.textContent = ' Loop Animation';
  loopLabel.style.marginLeft = '5px';
  loopLabel.style.cursor = 'pointer';
  loopLabel.addEventListener('click', () => {
    loopCheckbox.checked = !loopCheckbox.checked;
    setAnimationLoop(loopCheckbox.checked);
  });
  loopContainer.appendChild(loopLabel);

  controlsContainer.appendChild(loopContainer);

  document.body.appendChild(controlsContainer);
}

// Play specific animation by index
function playAnimation(index) {
  if (!state.mixer || !state.animations[index]) {
    console.warn(`Animation ${index} not found`);
    return;
  }

  // Stop current animation
  if (state.currentAnimation) {
    state.currentAnimation.action.stop();
  }

  // Set new current animation
  state.currentAnimation = state.animations[index];
  
  // Configure and play the animation
  const action = state.currentAnimation.action;
  action.reset();
  action.setLoop(THREE.LoopRepeat);
  action.clampWhenFinished = true;
  action.play();

  console.log(`Playing animation: ${state.currentAnimation.name}`);

  // Update UI
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.textContent = 'Pause';
  }

  const selector = document.getElementById('animation-selector');
  if (selector) {
    selector.value = index;
  }
}

// Toggle animation play/pause
function toggleAnimation() {
  if (!state.currentAnimation) return;

  const action = state.currentAnimation.action;
  const playPauseBtn = document.getElementById('play-pause-btn');

  if (action.paused) {
    action.paused = false;
    playPauseBtn.textContent = 'Pause';
    console.log('Animation resumed');
  } else {
    action.paused = true;
    playPauseBtn.textContent = 'Play';
    console.log('Animation paused');
  }
}

// Stop animation
function stopAnimation() {
  if (!state.currentAnimation) return;

  state.currentAnimation.action.stop();
  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.textContent = 'Play';
  }
  console.log('Animation stopped');
}

// Set animation speed
function setAnimationSpeed(speed) {
  if (!state.currentAnimation) return;

  state.currentAnimation.action.setEffectiveTimeScale(speed);
  
  const speedValue = document.getElementById('speed-value');
  if (speedValue) {
    speedValue.textContent = `${speed.toFixed(1)}x`;
  }
  
  console.log(`Animation speed set to: ${speed}x`);
}

// Set animation loop
function setAnimationLoop(loop) {
  if (!state.currentAnimation) return;

  const action = state.currentAnimation.action;
  if (loop) {
    action.setLoop(THREE.LoopRepeat);
  } else {
    action.setLoop(THREE.LoopOnce);
    action.clampWhenFinished = true;
  }
  
  console.log(`Animation loop: ${loop ? 'enabled' : 'disabled'}`);
}

// Play all animations simultaneously
function playAllAnimations() {
  if (!state.mixer || state.animations.length === 0) return;

  state.animations.forEach((anim) => {
    const action = anim.action;
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.play();
  });

  console.log('Playing all animations simultaneously');
}

// Stop all animations
function stopAllAnimations() {
  if (!state.mixer) return;

  state.animations.forEach((anim) => {
    anim.action.stop();
  });

  const playPauseBtn = document.getElementById('play-pause-btn');
  if (playPauseBtn) {
    playPauseBtn.textContent = 'Play';
  }

  console.log('All animations stopped');
}

// Load environment map
async function loadEnvironmentMap() {
  console.log("Loading environment map");
  // Environment map loading logic can be added here
  // For now, we'll proceed to load the model
  loadModel();
}

// Process mesh for shadows and materials
function processMesh(child) {
  if (child.isMesh) {
    console.log(`Found mesh in model: ${child.name || "unnamed mesh"}`);
    child.castShadow = true;
    child.receiveShadow = true;

    if (child.material) {
      // Apply nice PBR material settings
      child.material.roughness = 0.6;
      child.material.metalness = 0.1;
      child.material.envMapIntensity = 1.0;
      child.material.needsUpdate = true;
    }
  }
}

// Center model in the scene
function centerModel(model) {
  console.log("Centering model");
  try {
    // Create a bounding box
    const boundingBox = new THREE.Box3().setFromObject(model);

    // Get the center of the bounding box
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    console.log("Model bounding box:", {
      min: boundingBox.min,
      max: boundingBox.max,
      center: center,
    });

    // Move the model so its center is at the origin
    model.position.sub(center);

    // Optional: Position the model so it's on the "ground"
    const boundingBoxSize = new THREE.Vector3();
    boundingBox.getSize(boundingBoxSize);
    model.position.y = boundingBoxSize.y / 2;

    console.log("Model centered at origin, height adjusted");
  } catch (error) {
    console.error("Error centering model:", error);
  }
}

// Fit camera to model bounding box
function fitCameraToBoundingBox(model) {
  console.log("Fitting camera to model");
  try {
    const boundingBox = new THREE.Box3().setFromObject(model);

    const boundingBoxSize = new THREE.Vector3();
    boundingBox.getSize(boundingBoxSize);

    const center = new THREE.Vector3();
    boundingBox.getCenter(center);

    console.log("Model size:", boundingBoxSize);

    // Get the bounding sphere
    const boundingSphere = new THREE.Sphere();
    boundingBox.getBoundingSphere(boundingSphere);

    console.log("Bounding sphere radius:", boundingSphere.radius);

    // Set camera distance based on bounding sphere radius
    const offsetFactor = 2.0;
    const cameraDistance = boundingSphere.radius * offsetFactor;

    state.camera.position.set(
      center.x + cameraDistance,
      center.y + cameraDistance / 2,
      center.z + cameraDistance
    );

    console.log("New camera position:", state.camera.position);

    state.controls.target.copy(center);
    state.controls.update();
    console.log("Camera view adjusted to fit model");
  } catch (error) {
    console.error("Error fitting camera to model:", error);
  }
}

// Handle successful model load
function handleModelLoad(gltf, objectURL) {
  console.log("Model loaded successfully:", gltf);
  
  const model = gltf.scene;

  // Auto-configure model materials and shadows
  console.log("Configuring model materials and shadows");
  model.traverse(processMesh);

  // Center the model
  centerModel(model);

  // Add model to scene
  state.scene.add(model);
  state.currentModel = model;

  // Set up animations if available
  setupAnimations(gltf);

  // Set camera to look at model
  fitCameraToBoundingBox(model);

  // Clean up the blob URL
  URL.revokeObjectURL(objectURL);

  // Hide loading screen
  hideLoadingScreen();
}

// Handle model loading progress
function handleModelProgress(xhr) {
  const progress = Math.round((xhr.loaded / xhr.total) * 100);
  console.log(`Loading model: ${progress}%`);
}

// Handle model loading error
function handleModelError(error, objectURL) {
  console.error("Error loading model:", error);
  // Clean up even on error
  URL.revokeObjectURL(objectURL);
  hideLoadingScreen();
}

// Load and decrypt model
async function loadModel() {
  showLoadingScreen();

  try {
    const modelFile = await import("./models/1720098399943043910948593699084_horse_and_stable.glb");
    const response = await fetch(modelFile.default);

    if (!response.ok) {
      console.error("Failed to fetch model:", response.statusText);
      hideLoadingScreen();
      return;
    }

    // Get encrypted data
    const encryptedData = await response.text();
    console.log("Encrypted data received, length:", encryptedData.length);

    // Decrypt the data
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedData,
      "bf3c199c2470cb477d907b1e0917c17b"
    );

    // Convert to string with UTF-8 encoding
    const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      throw new Error("Failed to decrypt data - empty result");
    }

    console.log("Data decrypted successfully, length:", decryptedText.length);

    // Decode from base64
    const binaryString = atob(decryptedText);
    const binaryLength = binaryString.length;
    console.log("Binary data length after base64 decode:", binaryLength);

    // Convert binary string to Uint8Array
    const binaryData = new Uint8Array(binaryLength);
    for (let i = 0; i < binaryLength; i++) {
      binaryData[i] = binaryString.charCodeAt(i);
    }

    // Create blob and URL
    const blob = new Blob([binaryData], { type: "model/gltf-binary" });
    const objectURL = URL.createObjectURL(blob);

    // Load the model using the blob URL
    state.gltfLoader.load(
      objectURL,
      (gltf) => handleModelLoad(gltf, objectURL),
      handleModelProgress,
      (error) => handleModelError(error, objectURL)
    );
  } catch (error) {
    console.error("Error in model loading process:", error);
    hideLoadingScreen();
  }
}

// Handle window resize
function onWindowResize() {
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update animation mixer
  if (state.mixer) {
    const deltaTime = state.clock.getDelta();
    state.mixer.update(deltaTime);
  }
  
  state.controls.update();
  state.renderer.render(state.scene, state.camera);
}

// Initialize the entire application
function initGLBViewer() {
  console.log("GLBViewer initialization started");

  // Initialize all components
  initScene();
  initCamera();
  initRenderer();
  initControls();
  
  // Set up scene elements
  setupLights();
  setupLoaders();
  addGrid();
  
  // Set up UI and event handlers
  ensureLoadingScreen();
  window.addEventListener("resize", onWindowResize);
  
  // Load content and start animation
  loadEnvironmentMap();
  animate();
  
  console.log("GLBViewer initialization completed");
}

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded, initializing GLB viewer");
  initGLBViewer();
});