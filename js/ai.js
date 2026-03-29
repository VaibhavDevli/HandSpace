/**
 * ai.js — AI Explanation Engine
 * Team: Pahadi Coders | HandSpace MVP
 *
 * Calls the Anthropic Messages API to produce:
 *   1. Context-aware educational explanations for selected model parts
 *   2. AI-generated step-by-step guided learning paths
 *
 * Falls back gracefully when no API key is set.
 * Results are cached in-session to avoid redundant calls.
 */

'use strict';

class AIEngine {
  /**
   * @param {string} [apiKey=''] – Anthropic API key (sk-ant-…)
   */
  constructor(apiKey = '') {
    this.apiKey = apiKey;
    this.model  = 'claude-sonnet-4-20250514';
    this._cache = {};   // { cacheKey: string }
  }

  setKey(k) { this.apiKey = k; }
  hasKey()  { return typeof this.apiKey === 'string' && this.apiKey.startsWith('sk-ant-'); }

  /* ──────────────────────────────────────────────
     Generate an educational explanation for a part
  ────────────────────────────────────────────── */
  async explain(partName, partInfo, subject = 'human anatomy') {
    /* No key — return baseline info */
    if (!this.hasKey()) {
      return partInfo || `Select a part to learn about it. (Add an API key for AI explanations.)`;
    }

    const key = `explain::${subject}::${partName}`;
    if (this._cache[key]) return this._cache[key];

    const prompt =
`You are an expert educational AI tutor specialising in ${subject}.

A student using an interactive 3D learning platform has selected: **${partName}**

Baseline information: "${partInfo}"

Write an engaging educational explanation in 3–5 flowing sentences that:
1. Describes this structure and its key physical characteristics
2. Explains its primary function within the system
3. Mentions one memorable or surprising scientific fact
4. Uses clear language appropriate for high-school to university level

Important: Write in plain paragraphs only — no headers, no bullet points, no markdown.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method : 'POST',
        headers: {
          'Content-Type'      : 'application/json',
          'x-api-key'         : this.apiKey,
          'anthropic-version' : '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model     : this.model,
          max_tokens: 320,
          messages  : [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const text = data.content?.find(b => b.type === 'text')?.text?.trim()
        || partInfo;

      this._cache[key] = text;
      return text;

    } catch (err) {
      console.error('[AIEngine] explain error:', err);
      return `${partInfo}\n\n(AI unavailable: ${err.message})`;
    }
  }

  /* ──────────────────────────────────────────────
     Generate a guided step-by-step learning path
  ────────────────────────────────────────────── */
  async generateSteps(modelName, parts, subject = 'human anatomy') {
    if (!this.hasKey()) return this._defaultSteps(parts);

    const key = `steps::${modelName}`;
    if (this._cache[key]) return this._cache[key];

    const names = parts.slice(0, 12).map(p => p.name).join(', ');

    const prompt =
`You are an expert educational AI tutor.

A student is exploring an interactive 3D model of: **${modelName}** (subject: ${subject})

Available selectable components: ${names}

Generate exactly 6 learning steps that guide the student through understanding this model in a logical, progressive sequence.

Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences.
Format: [{"step":1,"title":"Short title","instruction":"1-2 sentence action the student should take.","partName":"Exact part name from the list above"}]`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method : 'POST',
        headers: {
          'Content-Type'      : 'application/json',
          'x-api-key'         : this.apiKey,
          'anthropic-version' : '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model     : this.model,
          max_tokens: 650,
          messages  : [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const raw  = data.content?.find(b => b.type === 'text')?.text?.trim() || '[]';
      const steps = JSON.parse(raw.replace(/```json|```/g, '').trim());
      this._cache[key] = steps;
      return steps;

    } catch (err) {
      console.error('[AIEngine] steps error:', err);
      return this._defaultSteps(parts);
    }
  }

  /* Fallback steps (no API key) */
  _defaultSteps(parts) {
    return parts.slice(0, 6).map((p, i) => ({
      step       : i + 1,
      title      : p.name,
      instruction: `Click the "${p.name}" on the 3D model (or pinch-gesture near it) to examine its structure and function.`,
      partName   : p.name,
    }));
  }
}
