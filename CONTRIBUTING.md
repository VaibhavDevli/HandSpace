# Contributing — Pahadi Coders

## Team Structure & Ownership

| Member | Primary Files | Secondary |
|--------|--------------|-----------|
| **Priyanshu Ghanshala** (Lead) | `js/ai.js`, `js/app.js` | Architecture decisions, integration |
| **Vaibhav Devli** | `js/scene.js` | Three.js, GLB loading, 3D controls |
| **Harshit Payal** | `js/gesture.js` | MediaPipe, gesture classification |
| **Shiv Sunder** | `css/style.css`, `index.html` | UI/UX, responsive design |

---

## Git Workflow

### Branches
```
main          ← stable, demo-ready
develop       ← integration branch
feat/gesture  ← Harshit's gesture work
feat/scene    ← Vaibhav's 3D work
feat/ai       ← Priyanshu's AI work
feat/ui       ← Shiv's UI work
```

### Commit Convention
```
feat(gesture): add two-hand scale recognition
fix(scene): correct raycasting NDC coordinates
docs(readme): add deployment instructions
style(css): improve mode badge animation
refactor(ai): extract cache logic to method
```

### PR Rules
1. All PRs target `develop`
2. At least 1 team member review required
3. No console.errors in production code
4. Test on Chrome + Edge before merging

---

## Dev Setup

```bash
git clone https://github.com/pahadi-coders/handspace-mvp
cd handspace-mvp
npx serve .          # or python -m http.server 8080
```

Open Chrome/Edge at `http://localhost:3000`

---

## Testing Checklist

Before any commit to `main`:

- [ ] 3D model loads and auto-rotates
- [ ] Camera starts without errors (Chrome + Edge)
- [ ] Open hand gesture rotates model
- [ ] Fist gesture pans model
- [ ] Pinch selects a model part
- [ ] Peace gesture advances step
- [ ] Both hands gesture scales model
- [ ] AI explanation generates (with valid API key)
- [ ] Fallback text shows (without API key)
- [ ] GLB model loads from file input
- [ ] Wireframe toggle works
- [ ] Reset view works
- [ ] System diagram modal opens/closes
- [ ] Responsive layout on <960px

---

## Code Style

- **No frameworks** — vanilla JS ES6+ only
- **Classes** for major modules (GestureRecognizer, SceneManager, AIEngine, HandSpaceApp)
- **JSDoc comments** on all public methods
- **`'use strict'`** at top of every JS file
- **CSS variables** for all colours (never hardcoded hex in rules)
- Prefer `const` > `let` > `var`
