<<<<<<< HEAD
# ✋ HandSpace — AI-Driven Inclusive 3D Learning Platform

> **Hackathon Round 2 MVP** | Team: **Pahadi Coders**  
> Theme: Education & Skill Development

[![Live Demo](https://img.shields.io/badge/Demo-Live-00f5ff?style=for-the-badge)](https://your-demo-link.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-HTML%20%7C%20Three.js%20%7C%20MediaPipe%20%7C%20Anthropic-blueviolet?style=for-the-badge)]()
[![No Backend](https://img.shields.io/badge/Backend-None%20(100%%25%20Client--Side)-success?style=for-the-badge)]()

---

## 📌 Problem Statement

Most educational content today is static — textbooks, slides, images, and videos are 2D and passive. Students learning spatial or mechanical concepts (anatomy, architecture, engineering) need **interactive 3D exploration**, which:

- Existing AI tutors **cannot** provide (text-only)
- Existing interactive solutions (VR/AR) **require expensive hardware** and complex setup

---

## 💡 Proposed Solution

**HandSpace** is a fully browser-based, AI-powered 3D learning platform that lets students:

| Feature | Description |
|---------|-------------|
| 🖐 **Gesture Control** | Rotate, pan, zoom, and select 3D model parts using hand gestures via webcam |
| 🧠 **AI Explanations** | Click or pinch any model component to get a context-aware AI-generated explanation |
| 📋 **Guided Steps** | AI-generated step-by-step learning paths tailored to each model |
| 📦 **Model Loading** | Load any `.glb` / `.gltf` 3D model — anatomy, architecture, engines, etc. |
| ⚡ **No Hardware** | Works on any laptop/desktop with a webcam — no VR/AR devices needed |

---

## 🎮 Gesture Controls

| Gesture | Action | Detection Method |
|---------|--------|-----------------|
| 🖐 Open Hand (3-4 fingers up) | **Rotate** model | 3+ finger extensions detected |
| ✊ Fist (fingers curled) | **Pan** model | 0-1 finger extensions |
| 🤏 Pinch (thumb + index close) | **Select part / Zoom** | Landmark distance < 0.075 |
| ✌️ Peace (index + middle) | **Next learning step** | Specific finger combination |
| 🤲 Both hands (spread/pinch) | **Scale** model | Inter-hand distance delta |

---

## 🛠 Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                      HANDSPACE MVP                       │
├─────────────────┬──────────────────┬────────────────────┤
│   UI LAYER      │   AI LAYER       │   3D LAYER         │
│  HTML5 + CSS3   │  MediaPipe Hands │  Three.js r128     │
│  Vanilla JS     │  Anthropic API   │  GLTFLoader        │
│  Space Mono     │  CNN Landmarks   │  WebGL Renderer    │
│  Orbitron Font  │  Temporal Smooth │  Raycasting        │
└─────────────────┴──────────────────┴────────────────────┘
         │                │                  │
         └────────────────┼──────────────────┘
                          │
              100% Client-Side Execution
              (No server required)
```

### Key Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| [Three.js](https://threejs.org) | r128 | 3D rendering via WebGL |
| [MediaPipe Hands](https://mediapipe.dev) | latest | Hand landmark detection |
| [Anthropic Claude](https://anthropic.com) | claude-sonnet-4 | AI explanations |
| Google Fonts | — | Orbitron + Syne + Space Mono |

---

## 🚀 Quick Start

### Option 1 — Node.js serve (recommended)
```bash
git clone https://github.com/pahadi-coders/handspace-mvp
cd handspace-mvp
npx serve .
# Open http://localhost:3000
```

### Option 2 — Python
```bash
python -m http.server 8080
# Open http://localhost:8080
```

### Option 3 — VS Code
Install the **Live Server** extension → Right-click `index.html` → **Open with Live Server**

> ⚠️ **Must be served over HTTP/S** — `getUserMedia` (webcam API) is blocked on `file://` URLs.

### Option 4 — Deploy in 30 seconds
```bash
# Vercel
npx vercel .

# Netlify
npx netlify deploy --dir .
```

---

## 🤖 Enable AI Explanations

1. Get a free API key at [console.anthropic.com](https://console.anthropic.com)
2. Click **◉ API Key** in the toolbar
3. Paste your key (`sk-ant-…`) and click **Save Key**

The key is stored in `localStorage` — it **never leaves your device** except when calling Anthropic's API directly.

---

## 📂 Load Your Own 3D Model

1. Click **⊕ Model** in the toolbar
2. Select any `.glb` or `.gltf` file
3. The model auto-centres and scales
4. All mesh children become individually selectable, clickable parts

**Free 3D model sources:**
- [Sketchfab](https://sketchfab.com) (download as GLTF)  
- [poly.pizza](https://poly.pizza) (CC0 GLB files)  
- [pmnd.rs market](https://market.pmnd.rs)

---

## 🗂 Project Structure

```
handspace-mvp/
├── index.html          ← Entry point, full UI layout + system diagram modal
├── css/
│   └── style.css       ← Holographic HUD design, responsive layout
├── js/
│   ├── gesture.js      ← MediaPipe wrapper, 5-gesture classifier, smoothing
│   ├── scene.js        ← Three.js scene, anatomy model, GLB loader, raycasting
│   ├── ai.js           ← Anthropic API, in-session cache, fallback stubs
│   └── app.js          ← Main controller, event wiring, state management
├── docs/
│   ├── ARCHITECTURE.md ← System component diagram (text)
│   └── SCALABILITY.md  ← Scalability & reliability analysis
└── README.md
```

---

## 🏗 System Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Webcam Feed │────▶│ Hand Detection│────▶│   Gesture    │
│ getUserMedia │     │  MediaPipe   │     │  Classifier  │
│  640×480     │     │  21 Landmarks│     │  Rule + CNN  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                             ┌────────────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Intent Recognizer│
                    │ Temporal Smooth  │
                    │ (5-frame window) │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  3D Engine   │ │  AI Engine   │ │   UI Layer   │
   │  Three.js    │ │  Anthropic   │ │  Tabs/Panel  │
   │  GLB Models  │ │  claude-4    │ │  HUD Badges  │
   │  Raycasting  │ │  Explanations│ │  Step Guide  │
   └──────────────┘ └──────────────┘ └──────────────┘
```

---

## ⚡ Scalability & Reliability

See [`docs/SCALABILITY.md`](docs/SCALABILITY.md) for full analysis.

| Concern | Approach |
|---------|----------|
| **Concurrency** | 100% client-side — unlimited users, zero server load |
| **Global reach** | Static files on any CDN (Vercel, Netlify, GitHub Pages) |
| **New subjects** | Drop in a new `.glb` file — no code changes needed |
| **AI privacy** | MediaPipe runs in-browser; no video ever leaves the device |
| **Offline** | Core 3D + gesture work offline (AI needs network only) |
| **Low-end devices** | Tested on integrated GPU laptops; Three.js pixelRatio capped at 2 |

---

## 👥 Team — Pahadi Coders

| Member | Role | GitHub |
|--------|------|--------|
| **Priyanshu Ghanshala** | Team Lead, Full-Stack & AI | [@priyanshu-gh](https://github.com/) |
| **Vaibhav Devli** | 3D Engine & Three.js | [@vaibhav-gh](https://github.com/) |
| **Harshit Payal** | MediaPipe & Gesture System | [@harshit-gh](https://github.com/) |
| **Shiv Sunder** | UI/UX & CSS Design | [@shiv-gh](https://github.com/) |

---

## 📋 Round 2 Checklist

- [x] Functional MVP — runs in browser, no backend
- [x] Core feature: hand gesture → 3D model interaction
- [x] Core feature: AI-powered part explanations (Anthropic API)
- [x] Core feature: AI-generated step-by-step learning
- [x] Core feature: GLB/GLTF model loading
- [x] System diagram (in-app modal + `docs/ARCHITECTURE.md`)
- [x] Scalability & reliability note (`docs/SCALABILITY.md`)
- [x] GitHub repository with code
- [ ] Video demo (record and add link)

---

## 🎥 Video Demo

> 📹 [Watch the prototype video](https://drive.google.com/file/d/10aim21MGEzQ3uBTogvaQU7ocJb2iB5Yh/view?usp=share_link)

---

## 📜 License

MIT — free for educational use.
=======
# HandSpace
**HandSpace** is a fully browser-based, AI-powered 3D learning platform that lets students
>>>>>>> da3717c8787928848ab61b9ca1d0f4204282195d
