## 2025-05-10 - TimeController Accessibility & Control Focus States
**Learning:** Icon-only playback control buttons and timeline range sliders in custom playback components often lack explicit ARIA attributes (`aria-label`, `aria-pressed`, `aria-valuetext`) and keyboard focus rings (`focus-visible:ring-2`). Adding a disabled state to step-back buttons when at step 0 prevents invalid interaction states.
**Action:** Always verify icon-only buttons in timeline/player bars have ARIA labels, focus indicators, and explicit disabled states for boundary steps.
