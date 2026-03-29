/**
 * app.js — Main Application Controller
 * Team: Pahadi Coders | HandSpace MVP
 *
 * Wires together:
 *   SceneManager    — Three.js 3D engine
 *   GestureRecognizer — MediaPipe hand tracking
 *   AIEngine        — Anthropic-powered explanations
 *   UI              — Tabs, toolbar, modals, status chips
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => new HandSpaceApp().boot());

class HandSpaceApp {

  constructor() {
    this.scene    = null;
    this.gesture  = null;
    this.ai       = null;

    this.gestureOn   = true;
    this.steps       = [];
    this.stepIdx     = 0;

    this._pinchMs    = 0;          // last pinch timestamp
    this._PINCH_GAP  = 900;        // ms between pinch-selections
    this._toastTimer = null;
  }

  /* ═══════════════════════════════════
     Boot
  ═══════════════════════════════════ */
  async boot() {
    /* 3D */
    this.scene = new SceneManager(document.getElementById('three-mount'));
    this.scene.onPartSelected = d => this._onPart(d);

    /* Gesture */
    this.gesture = new GestureRecognizer(
      document.getElementById('webcam'),
      document.getElementById('gesture-canvas')
    );
    await this.gesture.init();

    /* AI */
    const savedKey = localStorage.getItem('hs_key') || '';
    this.ai = new AIEngine(savedKey);
    if (savedKey) this._chipOn('chip-ai');

    /* Wire UI */
    this._bindTabs();
    this._bindToolbar();
    this._bindCamera();
    this._bindStepNav();
    this._bindModals();

    /* Populate */
    this._populateParts();
    this._buildSteps();

    this.toast('Welcome to HandSpace ✋  Open Camera tab to start gesturing');
  }

  /* ═══════════════════════════════════
     Tabs
  ═══════════════════════════════════ */
  _bindTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });
  }

  /* ═══════════════════════════════════
     Toolbar
  ═══════════════════════════════════ */
  _bindToolbar() {
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.scene.resetView();
      this.toast('View reset ✓');
    });

    document.getElementById('btn-wireframe').addEventListener('click', () => {
      const on = this.scene.toggleWireframe();
      document.getElementById('btn-wireframe').textContent = on ? '⬡ Solid' : '⬡ Wire';
      this.toast(on ? 'Wireframe ON' : 'Solid mode ON');
    });

    document.getElementById('btn-gesture').addEventListener('click', () => {
      this.gestureOn = !this.gestureOn;
      const btn = document.getElementById('btn-gesture');
      btn.textContent = this.gestureOn ? '✦ Gesture' : '✦ Paused';
      btn.classList.toggle('active', this.gestureOn);
      this.toast(this.gestureOn ? 'Gesture control enabled' : 'Gesture control paused');
    });

    document.getElementById('model-input').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const url = URL.createObjectURL(f);
      this.scene.loadGLB(url, parts => {
        this._populateParts();
        this._buildSteps();
        this.toast(`Model loaded: ${f.name}`);
      });
      this.toast('Loading model…');
    });

    document.getElementById('btn-diagram').addEventListener('click', () => {
      document.getElementById('diagram-modal').hidden = false;
    });
    document.getElementById('close-diagram').addEventListener('click', () => {
      document.getElementById('diagram-modal').hidden = true;
    });

    document.getElementById('btn-apikey').addEventListener('click', () => {
      document.getElementById('key-input').value = this.ai.apiKey || '';
      document.getElementById('key-modal').hidden = false;
    });
  }

  /* ═══════════════════════════════════
     Camera
  ═══════════════════════════════════ */
  _bindCamera() {
    document.getElementById('btn-camera').addEventListener('click', async () => {
      const btn = document.getElementById('btn-camera');
      if (!this.gesture.isRunning) {
        btn.textContent = '⏳ STARTING…';
        try {
          await this.gesture.startCamera();
          btn.textContent = '⏹ STOP CAMERA';
          document.getElementById('cam-offline').style.display = 'none';
          this._chipOn('chip-mp');
          this.toast('Camera active — try a gesture! 🖐');
        } catch {
          btn.textContent = '▶ INITIALISE CAMERA';
          this.toast('Camera denied. Check browser permissions.');
        }
      } else {
        this.gesture.stopCamera();
        btn.textContent = '▶ INITIALISE CAMERA';
        this._chipOff('chip-mp');
        this.toast('Camera stopped');
      }
    });

    /* Gesture callbacks */
    this.gesture.onGesture    = (g, lms) => this._onGesture(g, lms);
    this.gesture.onHandCount  = n => { document.getElementById('g-hands').textContent = n; };
  }

  /* ═══════════════════════════════════
     Step nav
  ═══════════════════════════════════ */
  _bindStepNav() {
    document.getElementById('btn-prev').addEventListener('click', () => {
      if (this.stepIdx > 0) this._goStep(this.stepIdx - 1);
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (this.stepIdx < this.steps.length - 1) this._goStep(this.stepIdx + 1);
    });
  }

  /* ═══════════════════════════════════
     Modals
  ═══════════════════════════════════ */
  _bindModals() {
    document.getElementById('btn-save-key').addEventListener('click', () => {
      const k = document.getElementById('key-input').value.trim();
      this.ai.setKey(k);
      localStorage.setItem('hs_key', k);
      document.getElementById('key-modal').hidden = true;
      if (k) this._chipOn('chip-ai'); else this._chipOff('chip-ai');
      this.toast(k ? 'API key saved ✓ — AI engine active' : 'API key cleared');
      if (k) this._buildSteps(); // regenerate steps with AI
    });

    document.getElementById('btn-cancel-key').addEventListener('click', () => {
      document.getElementById('key-modal').hidden = true;
    });

    /* Click outside diagram modal to close */
    document.getElementById('diagram-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget)
        e.currentTarget.hidden = true;
    });
  }

  /* ═══════════════════════════════════
     Gesture handler
  ═══════════════════════════════════ */
  _onGesture(gesture, landmarks) {
    const labels = {
      open_hand : '🖐 Open Hand → Rotate',
      fist      : '✊ Fist → Pan',
      pinch     : '🤏 Pinch → Select',
      peace     : '✌️ Peace → Next Step',
      two_hands : '🤲 Both Hands → Scale',
      point     : '☝️ Point → Select',
      none      : '—', idle: '—',
    };

    /* Camera tab readout */
    const lbl = labels[gesture.type];
    document.getElementById('g-type').textContent = lbl || gesture.type;
    document.getElementById('g-conf').textContent =
      gesture.confidence ? `${Math.round(gesture.confidence * 100)}%` : 'null';

    /* Mode badge */
    if (lbl && lbl !== '—') {
      document.getElementById('mb-label').textContent = lbl;
      document.getElementById('mb-icon').textContent  = lbl.split(' ')[0];
    }

    if (!this.gestureOn) return;

    /* Route to 3D engine */
    if (landmarks.length) this.scene.applyGesture(gesture, landmarks);

    /* Peace → next step (with cooldown) */
    if (gesture.type === 'peace') {
      const now = Date.now();
      if (now - this._pinchMs > this._PINCH_GAP) {
        this._pinchMs = now;
        if (this.stepIdx < this.steps.length - 1)
          this._goStep(this.stepIdx + 1);
      }
    }

    /* Pinch → select part at index-tip position */
    if (gesture.type === 'pinch' && landmarks.length) {
      const now = Date.now();
      if (now - this._pinchMs > this._PINCH_GAP) {
        this._pinchMs = now;
        const tip = landmarks[0][8]; // index fingertip
        this.scene.selectAtNDC(1 - tip.x, tip.y); // mirror x
      }
    }
  }

  /* ═══════════════════════════════════
     Part selected
  ═══════════════════════════════════ */
  async _onPart(data) {
    document.getElementById('part-name').textContent = data.name;
    document.getElementById('part-desc').textContent = '';
    document.getElementById('ai-text').textContent   = '';
    document.getElementById('ai-spinner').hidden     = false;

    /* Switch to info tab */
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-tab="info"]').classList.add('active');
    document.getElementById('tab-info').classList.add('active');

    /* Highlight item in parts list */
    document.querySelectorAll('.list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.name === data.name);
    });

    /* AI explanation */
    const txt = await this.ai.explain(data.name, data.info);
    document.getElementById('ai-spinner').hidden     = true;
    document.getElementById('ai-text').textContent   = txt;
    document.getElementById('part-desc').textContent = data.info;
  }

  /* ═══════════════════════════════════
     Parts & annotation lists
  ═══════════════════════════════════ */
  _populateParts() {
    const partsEl = document.getElementById('parts-list');
    const annEl   = document.getElementById('ann-list');
    partsEl.innerHTML = '';
    annEl.innerHTML   = '';

    this.scene.partsList.forEach(p => {
      /* Parts */
      const el = document.createElement('div');
      el.className = 'list-item'; el.dataset.name = p.name;
      el.innerHTML = `
        <div class="item-dot"></div>
        <div><div class="item-name">${p.name}</div></div>`;
      el.addEventListener('click', () => {
        this.scene.selectByName(p.name);
        this._onPart(p);
      });
      partsEl.appendChild(el);

      /* Annotations */
      const ae = document.createElement('div');
      ae.className = 'list-item'; ae.dataset.name = p.name;
      ae.innerHTML = `
        <div class="item-dot"></div>
        <div>
          <div class="item-name">${p.name}</div>
          <div class="item-sub">${(p.info || '').slice(0, 78)}…</div>
        </div>`;
      ae.addEventListener('click', () => {
        this.scene.selectByName(p.name);
        this._onPart(p);
      });
      annEl.appendChild(ae);
    });
  }

  /* ═══════════════════════════════════
     Guided steps
  ═══════════════════════════════════ */
  async _buildSteps() {
    const parts = this.scene.partsList;
    this.steps = await this.ai.generateSteps('Human Anatomy', parts);
    this._renderSteps();
    this._goStep(0);
  }

  _renderSteps() {
    const list = document.getElementById('steps-list');
    list.innerHTML = '';
    this.steps.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = `step-card${i === this.stepIdx ? ' active' : ''}`;
      el.dataset.idx = i;
      el.innerHTML = `
        <div class="step-num">${s.step || i + 1}</div>
        <div class="step-body">
          <div class="step-title">${s.title}</div>
          <div class="step-text">${s.instruction}</div>
        </div>`;
      el.addEventListener('click', () => this._goStep(i));
      list.appendChild(el);
    });
  }

  _goStep(idx) {
    this.stepIdx = idx;
    const s = this.steps[idx];
    if (!s) return;

    document.querySelectorAll('.step-card').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
    });
    document.getElementById('step-counter').textContent =
      `${idx + 1} / ${this.steps.length}`;

    if (s.partName) {
      this.scene.selectByName(s.partName);
      const p = this.scene.partsList.find(x => x.name === s.partName);
      if (p) this._onPart(p);
    }
    this.toast(`Step ${idx + 1}: ${s.title}`);
  }

  /* ═══════════════════════════════════
     Status chips
  ═══════════════════════════════════ */
  _chipOn(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('on');
    el.querySelector('.cdot')?.classList.add('on');
  }
  _chipOff(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('on');
    el.querySelector('.cdot')?.classList.remove('on');
  }

  /* ═══════════════════════════════════
     Toast
  ═══════════════════════════════════ */
  toast(msg, ms = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }
}
