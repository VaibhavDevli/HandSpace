/**
 * scene.js — Three.js 3D Scene Manager
 * Team: Pahadi Coders | HandSpace MVP
 *
 * Responsibilities:
 *   - Scene, camera, renderer, lighting setup
 *   - Procedural human anatomy model (fallback / demo)
 *   - GLTF/GLB model loading with auto-fit
 *   - Gesture-driven controls: rotate, pan, scale, zoom
 *   - Part selection via raycasting
 *   - Wireframe toggle, view reset
 */

'use strict';

class SceneManager {
  /**
   * @param {HTMLElement} mountEl – container div for the Three.js canvas
   */
  constructor(mountEl) {
    this.mount    = mountEl;
    this.scene    = null;
    this.camera   = null;
    this.renderer = null;
    this.model    = null;   // root Group of the current model
    this.parts    = [];     // selectable Mesh array
    this.selected = null;   // currently highlighted Mesh
    this.wire     = false;  // wireframe state
    this._ray     = new THREE.Raycaster();
    this._animId  = null;

    /* Gesture interaction state */
    this._gMode  = 'none';
    this._prevXY = null;    // {x,y} of last gesture position
    this._prevD  = null;    // previous two-hand distance

    /**
     * Callback fired when a part is selected via gesture or click.
     * @type {((userData:Object) => void)|null}
     */
    this.onPartSelected = null;

    this._build();
  }

  /* ═══════════════════════════════════════
     Scene setup
  ═══════════════════════════════════════ */
  _build() {
    const W = this.mount.clientWidth;
    const H = this.mount.clientHeight;

    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080912);
    this.scene.fog = new THREE.Fog(0x080912, 18, 55);

    /* Camera */
    this.camera = new THREE.PerspectiveCamera(48, W / H, 0.05, 200);
    this.camera.position.set(0, 0.4, 6);

    /* Renderer */
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.mount.appendChild(this.renderer.domElement);

    /* Lights */
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.40));

    const key = new THREE.DirectionalLight(0xeef5ff, 1.05);
    key.position.set(4, 8, 6); key.castShadow = true;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x88aaff, 0.30);
    fill.position.set(-5, -2, -4);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x00f5ff, 0.18);
    rim.position.set(0, 5, -8);
    this.scene.add(rim);

    /* Floor grid */
    const grid = new THREE.GridHelper(20, 28, 0x0d1830, 0x0b1428);
    grid.position.y = -2.6;
    this.scene.add(grid);

    /* Demo anatomy model */
    this._buildAnatomyModel();

    /* Resize handler */
    window.addEventListener('resize', () => this._resize());

    /* Render loop */
    this._loop();
  }

  /* ═══════════════════════════════════════
     Procedural Human Anatomy Demo Model
  ═══════════════════════════════════════ */
  _buildAnatomyModel() {
    this._clear();
    this.model = new THREE.Group();

    const mat = () => new THREE.MeshPhongMaterial({
      color      : 0x2a5ce8,
      specular   : 0x112244,
      shininess  : 38,
      transparent: true,
      opacity    : 0.91,
    });

    /* [name, geometry, [x,y,z], info] */
    const parts = [
      ['Head',
        new THREE.SphereGeometry(0.30, 24, 24),
        [0, 1.75, 0],
        'The skull encloses the brain (≈1400 g) and houses the cranial nerves. 22 fused bones form a rigid protective vault around the cerebral cortex.'],

      ['Neck',
        new THREE.CylinderGeometry(0.09, 0.11, 0.26, 12),
        [0, 1.36, 0],
        'Seven cervical vertebrae (C1–C7) stack here. The atlas (C1) allows nodding; the axis (C2) allows rotation. Major blood vessels and the spinal cord pass through the canal.'],

      ['Torso',
        new THREE.CylinderGeometry(0.42, 0.36, 1.05, 16),
        [0, 0.62, 0],
        'The thorax protects heart and lungs (12 pairs of ribs + sternum). The abdomen below houses the liver, stomach, intestines and kidneys — all separated by the diaphragm.'],

      ['Pelvis',
        new THREE.CylinderGeometry(0.34, 0.28, 0.28, 16),
        [0, 0.00, 0],
        'The pelvic girdle transfers upper-body weight to the femora. Formed by ilium, ischium, and pubis, it also protects the bladder, rectum, and reproductive organs.'],

      ['Left Shoulder',
        new THREE.SphereGeometry(0.13, 12, 12),
        [-0.58, 1.08, 0],
        'Glenohumeral joint — a ball-and-socket with the widest range of motion in the body. Stabilised by the rotator cuff (4 muscles) rather than bony architecture.'],

      ['Right Shoulder',
        new THREE.SphereGeometry(0.13, 12, 12),
        [0.58, 1.08, 0],
        'Glenohumeral joint — a ball-and-socket with the widest range of motion in the body. Stabilised by the rotator cuff (4 muscles) rather than bony architecture.'],

      ['Left Upper Arm',
        new THREE.CylinderGeometry(0.10, 0.09, 0.68, 10),
        [-0.59, 0.60, 0],
        'The humerus is the single bone of the upper arm. The biceps brachii (flexion) and triceps (extension) are the prime movers. The brachial artery runs alongside.'],

      ['Right Upper Arm',
        new THREE.CylinderGeometry(0.10, 0.09, 0.68, 10),
        [0.59, 0.60, 0],
        'The humerus is the single bone of the upper arm. The biceps brachii (flexion) and triceps (extension) are the prime movers. The brachial artery runs alongside.'],

      ['Left Forearm',
        new THREE.CylinderGeometry(0.085, 0.07, 0.62, 10),
        [-0.62, 0.05, 0],
        'Radius (thumb side) and ulna (pinky side) form the forearm. Pronation/supination occurs as the radius rotates around the ulna — unique to primates.'],

      ['Right Forearm',
        new THREE.CylinderGeometry(0.085, 0.07, 0.62, 10),
        [0.62, 0.05, 0],
        'Radius (thumb side) and ulna (pinky side) form the forearm. Pronation/supination occurs as the radius rotates around the ulna — unique to primates.'],

      ['Left Upper Leg',
        new THREE.CylinderGeometry(0.13, 0.11, 0.88, 12),
        [-0.21, -0.56, 0],
        'The femur is the longest bone in the body. The femoral head fits into the acetabulum of the pelvis. The femoral triangle contains the femoral artery, vein, and nerve.'],

      ['Right Upper Leg',
        new THREE.CylinderGeometry(0.13, 0.11, 0.88, 12),
        [0.21, -0.56, 0],
        'The femur is the longest bone in the body. The femoral head fits into the acetabulum of the pelvis. The femoral triangle contains the femoral artery, vein, and nerve.'],

      ['Left Knee',
        new THREE.SphereGeometry(0.11, 12, 12),
        [-0.21, -1.07, 0],
        'The knee is a hinge joint between femur and tibia. The patella (kneecap) improves quadriceps leverage. ACL, PCL, MCL, and LCL ligaments provide stability.'],

      ['Right Knee',
        new THREE.SphereGeometry(0.11, 12, 12),
        [0.21, -1.07, 0],
        'The knee is a hinge joint between femur and tibia. The patella (kneecap) improves quadriceps leverage. ACL, PCL, MCL, and LCL ligaments provide stability.'],

      ['Left Lower Leg',
        new THREE.CylinderGeometry(0.09, 0.07, 0.82, 10),
        [-0.21, -1.60, 0],
        'The tibia (medial, weight-bearing) and fibula (lateral, thinner) form the lower leg. The calf muscle (gastrocnemius + soleus) attaches via the Achilles tendon.'],

      ['Right Lower Leg',
        new THREE.CylinderGeometry(0.09, 0.07, 0.82, 10),
        [0.21, -1.60, 0],
        'The tibia (medial, weight-bearing) and fibula (lateral, thinner) form the lower leg. The calf muscle (gastrocnemius + soleus) attaches via the Achilles tendon.'],
    ];

    for (const [name, geo, pos, info] of parts) {
      const mesh = new THREE.Mesh(geo, mat());
      mesh.position.set(...pos);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = {
        name,
        info,
        origColor  : new THREE.Color(0x2a5ce8),
        origOpacity: 0.91,
        selected   : false,
      };
      this.model.add(mesh);
      this.parts.push(mesh);
    }

    this.scene.add(this.model);
  }

  /* ═══════════════════════════════════════
     Load external GLB / GLTF
  ═══════════════════════════════════════ */
  loadGLB(url, onReady) {
    const loader = new THREE.GLTFLoader();
    loader.load(url, gltf => {
      this._clear();
      this.model = gltf.scene;

      /* Auto-fit */
      const box  = new THREE.Box3().setFromObject(this.model);
      const size = box.getSize(new THREE.Vector3());
      const ctr  = box.getCenter(new THREE.Vector3());
      const s    = 3.2 / Math.max(size.x, size.y, size.z);
      this.model.scale.setScalar(s);
      this.model.position.sub(ctr.multiplyScalar(s));

      this.model.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = child.receiveShadow = true;
        child.userData.name     = child.name || 'Part';
        child.userData.info     = child.userData.info || `Component: ${child.userData.name}`;
        child.userData.origColor   = child.material.color?.clone() ?? new THREE.Color(1, 1, 1);
        child.userData.origOpacity = child.material.opacity ?? 1;
        child.userData.selected    = false;
        this.parts.push(child);
      });

      this.scene.add(this.model);
      if (onReady) onReady(this.parts.map(p => p.userData));
    }, undefined, err => console.error('GLB error:', err));
  }

  _clear() {
    if (this.model) this.scene.remove(this.model);
    this.model = null; this.parts = []; this.selected = null;
  }

  /* ═══════════════════════════════════════
     Gesture Controls
  ═══════════════════════════════════════ */
  applyGesture(gesture, lms) {
    if (!this.model) return;

    switch (gesture.type) {
      case 'open_hand':
        if (lms[0]) this._rotate(lms[0]);
        this._gMode = 'rotate';
        break;
      case 'fist':
        if (lms[0]) this._pan(lms[0]);
        this._gMode = 'pan';
        break;
      case 'two_hands':
        this._scale(gesture.distance);
        this._gMode = 'scale';
        break;
      case 'pinch':
        if (gesture.pinchDist !== undefined) this._zoom(gesture.pinchDist);
        this._gMode = 'pinch';
        break;
      case 'none': case 'idle':
        this._prevXY = null; this._prevD = null; this._gMode = 'none';
        break;
    }
  }

  _rotate(lm) {
    const wrist = lm[0];
    const cur = { x: wrist.x, y: wrist.y };
    if (this._prevXY && this._gMode === 'rotate') {
      this.model.rotation.y += (cur.x - this._prevXY.x) * Math.PI * 2.6;
      this.model.rotation.x += (cur.y - this._prevXY.y) * Math.PI * 2.6;
    }
    this._prevXY = cur;
  }

  _pan(lm) {
    const wrist = lm[0];
    const cur = { x: wrist.x, y: wrist.y };
    if (this._prevXY && this._gMode === 'pan') {
      this.model.position.x +=  (cur.x - this._prevXY.x) * 4;
      this.model.position.y += -(cur.y - this._prevXY.y) * 4;
    }
    this._prevXY = cur;
  }

  _scale(dist) {
    if (this._prevD !== null) {
      const s = this.model.scale.x;
      this.model.scale.setScalar(
        THREE.MathUtils.clamp(s * (dist / this._prevD), 0.15, 6)
      );
    }
    this._prevD = dist;
  }

  _zoom(pinchDist) {
    /* Smaller pinchDist → tighter pinch → zoom in */
    const target = THREE.MathUtils.mapLinear(pinchDist, 0.01, 0.08, 1.4, 0.85);
    this.camera.position.z = THREE.MathUtils.lerp(
      this.camera.position.z, target * 5, 0.06
    );
  }

  /* ═══════════════════════════════════════
     Part Selection (normalised screen coords)
  ═══════════════════════════════════════ */
  selectAtNDC(nx, ny) {
    if (!this.model) return null;
    const ndc = new THREE.Vector2(nx * 2 - 1, -(ny * 2) + 1);
    this._ray.setFromCamera(ndc, this.camera);
    const hits = this._ray.intersectObjects(this.parts, true);
    if (!hits.length) return null;
    return this._highlight(hits[0].object);
  }

  selectByName(name) {
    const m = this.parts.find(p => p.userData.name === name);
    if (m) this._highlight(m);
  }

  _highlight(mesh) {
    /* Deselect previous */
    if (this.selected) {
      this.selected.material.color.copy(this.selected.userData.origColor);
      if (this.selected.material.emissive)
        this.selected.material.emissive.set(0x000000);
      this.selected.userData.selected = false;
    }
    /* Highlight new */
    mesh.material.color.set(0xff5500);
    if (mesh.material.emissive) mesh.material.emissive.set(0x220800);
    mesh.userData.selected = true;
    this.selected = mesh;
    if (this.onPartSelected) this.onPartSelected(mesh.userData);
    return mesh.userData;
  }

  /* ═══════════════════════════════════════
     Utilities
  ═══════════════════════════════════════ */
  toggleWireframe() {
    this.wire = !this.wire;
    this.parts.forEach(p => { p.material.wireframe = this.wire; });
    return this.wire;
  }

  resetView() {
    if (!this.model) return;
    this.model.rotation.set(0, 0, 0);
    this.model.position.set(0, 0, 0);
    this.model.scale.setScalar(1);
    this.camera.position.set(0, 0.4, 6);
    this._prevXY = null; this._prevD = null;
  }

  /* ═══════════════════════════════════════
     Render loop
  ═══════════════════════════════════════ */
  _loop() {
    this._animId = requestAnimationFrame(() => this._loop());
    /* Idle auto-rotate */
    if (this.model && this._gMode === 'none') {
      this.model.rotation.y += 0.0018;
    }
    this.renderer.render(this.scene, this.camera);
  }

  _resize() {
    const W = this.mount.clientWidth;
    const H = this.mount.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  get partsList() { return this.parts.map(p => p.userData); }
}
