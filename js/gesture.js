/**
 * gesture.js — Hand Gesture Recognition Module
 * Team: Pahadi Coders | HandSpace MVP
 *
 * Wraps MediaPipe Hands to:
 *   1. Stream webcam through the Hands pipeline
 *   2. Draw landmarks on an overlay canvas
 *   3. Classify the dominant gesture each frame
 *   4. Emit smoothed gesture events via callbacks
 *
 * Gestures → 3D actions:
 *   open_hand  → Rotate model (palm facing camera)
 *   fist       → Pan model   (all fingers curled)
 *   pinch      → Select part / zoom (thumb + index touch)
 *   peace      → Next step   (index + middle extended)
 *   point      → Pointer     (index only)
 *   two_hands  → Scale       (two-hand spread/pinch)
 *   none/idle  → No input
 */

'use strict';

class GestureRecognizer {
  /**
   * @param {HTMLVideoElement}  videoEl   – source webcam feed
   * @param {HTMLCanvasElement} canvasEl  – overlay for landmark drawing
   */
  constructor(videoEl, canvasEl) {
    this.video      = videoEl;
    this.canvas     = canvasEl;
    this.ctx        = canvasEl.getContext('2d');

    /** @type {Hands|null} */
    this.mp         = null;
    /** @type {Camera|null} */
    this.camera     = null;
    this.running    = false;

    /* Smoothing buffer – majority vote over last N frames */
    this._buf       = [];
    this._SMOOTH    = 5;

    /* Pinch-zoom tracking */
    this._prevPinch = null;

    /* Public callbacks — assigned by app.js */
    /** @type {((gesture:{type,confidence,...}, landmarks:Array) => void)|null} */
    this.onGesture   = null;
    /** @type {((n:number) => void)|null} */
    this.onHandCount = null;
  }

  /* ──────────────────────────────────────────────
     Init MediaPipe Hands
  ────────────────────────────────────────────── */
  async init() {
    this.mp = new Hands({
      locateFile: f =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    this.mp.setOptions({
      maxNumHands           : 2,
      modelComplexity       : 1,
      minDetectionConfidence: 0.72,
      minTrackingConfidence : 0.58,
    });
    this.mp.onResults(r => this._onResults(r));
    return this;
  }

  /* ──────────────────────────────────────────────
     Camera lifecycle
  ────────────────────────────────────────────── */
  async startCamera() {
    if (this.running) return;
    this.camera = new Camera(this.video, {
      onFrame : async () => {
        if (this.mp) await this.mp.send({ image: this.video });
      },
      width : 640,
      height: 480,
    });
    await this.camera.start();
    this.running = true;
  }

  stopCamera() {
    this.camera?.stop();
    this.running = false;
    this.camera = null;
  }

  /* ──────────────────────────────────────────────
     Results processing
  ────────────────────────────────────────────── */
  _onResults(results) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    /* Draw mirrored video frame */
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, W, H);
    ctx.restore();

    const lmGroups = results.multiHandLandmarks || [];

    if (this.onHandCount) this.onHandCount(lmGroups.length);

    if (!lmGroups.length) {
      this._emit({ type: 'none', confidence: 1.0 }, []);
      return;
    }

    /* Draw hand skeleton (mirrored) */
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    for (const lm of lmGroups) {
      drawConnectors(ctx, lm, HAND_CONNECTIONS,
        { color: 'rgba(0,245,255,0.6)', lineWidth: 1.5 });
      drawLandmarks(ctx, lm,
        { color: '#4f8eff', lineWidth: 1, radius: 3 });
    }
    ctx.restore();

    const gesture = lmGroups.length >= 2
      ? this._twoHand(lmGroups[0], lmGroups[1])
      : this._oneHand(lmGroups[0]);

    this._emit(gesture, lmGroups);
  }

  /* ──────────────────────────────────────────────
     Single-hand classification
  ────────────────────────────────────────────── */
  _oneHand(lm) {
    const ext = this._extensions(lm);

    /* Pinch: thumb tip very close to index tip */
    const pinchDist = this._dist(lm[4], lm[8]);
    if (pinchDist < 0.075) {
      return { type: 'pinch', confidence: 0.92, pinchDist, lm };
    }

    const nExt = [ext.index, ext.middle, ext.ring, ext.pinky]
      .filter(Boolean).length;

    /* Open hand (3-4 fingers up) → rotate */
    if (nExt >= 3) {
      return { type: 'open_hand', confidence: 0.88, lm };
    }
    /* Fist (0-1 fingers) → pan */
    if (nExt <= 1 && !ext.index) {
      return { type: 'fist', confidence: 0.86, lm };
    }
    /* Peace: only index + middle → next step */
    if (ext.index && ext.middle && !ext.ring && !ext.pinky) {
      return { type: 'peace', confidence: 0.87, lm };
    }
    /* Point: index only → select */
    if (ext.index && !ext.middle && !ext.ring && !ext.pinky) {
      return { type: 'point', confidence: 0.85, lm };
    }

    return { type: 'idle', confidence: 0.5, lm };
  }

  /* ──────────────────────────────────────────────
     Two-hand classification
  ────────────────────────────────────────────── */
  _twoHand(lm1, lm2) {
    return {
      type      : 'two_hands',
      confidence: 0.93,
      distance  : this._dist(lm1[8], lm2[8]),
      lm1, lm2,
    };
  }

  /* ──────────────────────────────────────────────
     Temporal smoothing & emit
  ────────────────────────────────────────────── */
  _emit(gesture, landmarks) {
    this._buf.push(gesture.type);
    if (this._buf.length > this._SMOOTH) this._buf.shift();

    /* Majority vote */
    const freq = {};
    this._buf.forEach(t => (freq[t] = (freq[t] || 0) + 1));
    gesture.type = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])[0][0];

    if (this.onGesture) this.onGesture(gesture, landmarks);
  }

  /* ──────────────────────────────────────────────
     Helpers
  ────────────────────────────────────────────── */
  /** Which fingers are extended, based on tip-vs-pip Y position */
  _extensions(lm) {
    return {
      thumb : lm[4].x < lm[3].x,     // simplified (right hand)
      index : lm[8].y  < lm[6].y,
      middle: lm[12].y < lm[10].y,
      ring  : lm[16].y < lm[14].y,
      pinky : lm[20].y < lm[18].y,
    };
  }

  /** Euclidean distance between two MediaPipe landmarks (normalised 0-1) */
  _dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  get isRunning() { return this.running; }
}
