# 🏗 HandSpace — System Architecture

## Component Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║                        HANDSPACE MVP                                 ║
║                   (Runs entirely in browser)                         ║
╠══════════════════╦═══════════════════╦═══════════════════════════════╣
║   INPUT LAYER    ║   PROCESSING      ║   OUTPUT LAYER                ║
╠══════════════════╬═══════════════════╬═══════════════════════════════╣
║                  ║                   ║                               ║
║  📷 Webcam       ║  gesture.js       ║  🧊 Three.js Viewport         ║
║  getUserMedia    ║  ├─ MediaPipe     ║  ├─ Procedural anatomy model  ║
║  640×480 @30fps  ║  │   Hands API    ║  ├─ GLB/GLTF loader           ║
║                  ║  ├─ 21-landmark   ║  ├─ Raycasting selection      ║
║  🖱 Mouse Click  ║  │   detection    ║  ├─ Gesture-driven rotation   ║
║  (fallback)      ║  ├─ Finger ext.   ║  ├─ Gesture-driven pan        ║
║                  ║  │   classifier   ║  ├─ Gesture-driven scale      ║
║  📁 GLB File     ║  └─ 5-frame       ║  └─ Wireframe toggle          ║
║  File upload     ║      smoothing    ║                               ║
║                  ║                   ║  📋 Side Panel UI             ║
║  🔑 API Key      ║  scene.js         ║  ├─ Info tab (part details)   ║
║  localStorage    ║  ├─ Scene setup   ║  ├─ Steps tab (guided learn)  ║
║                  ║  ├─ Lighting      ║  └─ Camera tab (live feed)    ║
║                  ║  └─ Render loop   ║                               ║
║                  ║                   ║  🤖 AI Explanations           ║
║                  ║  ai.js            ║  ├─ Part-level descriptions   ║
║                  ║  ├─ Anthropic API ║  ├─ Guided learning steps     ║
║                  ║  ├─ Session cache ║  └─ Fallback static text      ║
║                  ║  └─ Fallback text ║                               ║
╚══════════════════╩═══════════════════╩═══════════════════════════════╝
```

---

## Data Flow

### Gesture → 3D Action

```
Webcam frame
    │
    ▼
MediaPipe Hands (WASM)
    │  21 (x,y,z) landmarks per hand
    ▼
Finger Extension Classifier
    │  {index, middle, ring, pinky, thumb} boolean map
    ▼
Gesture Classifier
    │  Pinch dist < 0.075 → 'pinch'
    │  3+ fingers up     → 'open_hand'
    │  0-1 fingers       → 'fist'
    │  index+middle only → 'peace'
    │  2 hands detected  → 'two_hands'
    ▼
5-Frame Temporal Smoother (majority vote)
    │  Eliminates single-frame noise
    ▼
Intent → 3D Action Mapper
    │  open_hand → model.rotation += delta
    │  fist      → model.position += delta
    │  two_hands → model.scale *= ratio
    │  pinch     → camera.z lerp + raycasting
    │  peace     → stepIndex++
    ▼
Three.js Renderer (next frame)
```

### Part Selection → AI Explanation

```
User pinches / clicks model
    │
    ▼
THREE.Raycaster.intersectObjects(parts)
    │  Returns nearest Mesh hit
    ▼
mesh.userData.name, mesh.userData.info
    │
    ▼  ┌── cache hit? → return cached text (0ms)
AIEngine.explain(name, info)
    │   └── cache miss → fetch Anthropic API (1-2s)
    ▼
claude-sonnet-4-20250514
    │  System: expert tutor prompt
    │  max_tokens: 320
    ▼
Educational paragraph (3-5 sentences)
    │
    ▼
UI: #ai-text updated, part highlighted orange
```

---

## Module Responsibilities

### `gesture.js` — GestureRecognizer
- Wraps MediaPipe Hands lifecycle (init, startCamera, stopCamera)
- Draws landmarks on overlay canvas (mirrored)
- Classifies single-hand (5 types) and two-hand gestures
- Applies temporal smoothing over last 5 frames
- Exposes `onGesture(gesture, landmarks)` and `onHandCount(n)` callbacks

### `scene.js` — SceneManager
- Initialises Three.js scene, camera (PerspectiveCamera 48°), renderer (WebGL)
- Builds procedural human anatomy model (16 named mesh parts)
- Handles GLB/GLTF loading with auto-fit bounding box
- Maps gesture events to model transforms (rotate/pan/scale/zoom)
- Raycasting-based part selection at normalised screen coordinates
- Exposes `onPartSelected(userData)` callback

### `ai.js` — AIEngine
- Calls Anthropic `/v1/messages` endpoint (browser-direct)
- Generates contextual 3-5 sentence educational explanations
- Generates 6-step guided learning paths (JSON array)
- In-session caching to avoid redundant API calls
- Graceful fallback to static text when no API key

### `app.js` — HandSpaceApp
- Single controller class, initialised on DOMContentLoaded
- Wires all three modules together
- Manages tab switching, toolbar buttons, modal dialogs
- Handles gesture → UI routing (badge updates, status chips)
- Manages step navigation (keyboard + gesture + click)
- Toast notification system

---

## File Dependency Graph

```
index.html
├── css/style.css
├── js/gesture.js      (no dependencies)
├── js/scene.js        (depends on: Three.js global)
├── js/ai.js           (no dependencies)
└── js/app.js          (depends on: gesture.js, scene.js, ai.js)

External CDN (loaded by index.html):
├── three.min.js       (r128)
├── GLTFLoader.js      (Three.js addon)
├── @mediapipe/hands
├── @mediapipe/camera_utils
└── @mediapipe/drawing_utils
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| API key exposure | Key stored in `localStorage` only; never in source code |
| Webcam privacy | MediaPipe runs in WASM — no video bytes leave the device |
| XSS | No user HTML is rendered; all text via `.textContent` |
| CORS | Anthropic API requires `anthropic-dangerous-direct-browser-access` header (acknowledged) |
| GLB malicious models | Models rendered in sandboxed WebGL context — no code execution |
