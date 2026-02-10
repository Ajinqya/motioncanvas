import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Meeting Notes Scene 3 – Interactive UI Animation
 *
 * Scene 3: Cursor clicks plus button, sidebar opens with bounce animation
 * Based on SVG design showing card layout with sidebar and content area
 * Full timing control via params.
 */

interface Scene3Params {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  // Animation
  speed: number;
  // Phase 1 – Cursor to plus button
  cursorEntryStartMs: number;
  cursorEntryDurationMs: number;
  cursorHoverDurationMs: number;
  cursorClickDurationMs: number;
  sidebarRevealDurationMs: number;
  pauseAfterSidebarMs: number;
  // Phase 2 – Move to option box
  phase2MoveDurationMs: number;
  phase2HoverDurationMs: number;
  phase2ClickDurationMs: number;
  tickRevealDurationMs: number;
  sidebarSlideDownDurationMs: number;
  pauseAfterTickMs: number;
  // Phase 3 – Scale, fadeout, Granola
  phase3ScaleDurationMs: number;
  phase3FadeoutDurationMs: number;
  granolaRevealDelayMs: number;
  granolaRevealDurationMs: number;
  pauseAfterScaleMs: number;
  // Phase 4 & 5 – Typing
  typingDurationPerChar: number;
  typingCursorBlinkInterval: number;
  phase4HoldMs: number;
  holdAfterTyping2Ms: number;
  // Outro
  inputSlideOutDurationMs: number;
  inputSlideOutDistancePx: number;
}

const TYPING_TEXT_1 = "Create a sales deck from my call with Acme";
const TYPING_TEXT_2 = "Draft Linear tickets from today's standup";

const DEFAULT_TIMING = {
  cursorEntryStartMs: 300,
  cursorEntryDurationMs: 600,
  cursorHoverDurationMs: 200,
  cursorClickDurationMs: 150,
  sidebarRevealDurationMs: 300,
  pauseAfterSidebarMs: 200,
  phase2MoveDurationMs: 400,
  phase2HoverDurationMs: 150,
  phase2ClickDurationMs: 150,
  tickRevealDurationMs: 200,
  sidebarSlideDownDurationMs: 250,
  pauseAfterTickMs: 300,
  phase3ScaleDurationMs: 800,
  phase3FadeoutDurationMs: 500,
  granolaRevealDelayMs: 200,
  granolaRevealDurationMs: 400,
  pauseAfterScaleMs: 200,
  typingDurationPerChar: 60,
  typingCursorBlinkInterval: 530,
  phase4HoldMs: 500,
  holdAfterTyping2Ms: 500,
  inputSlideOutDurationMs: 600,
  inputSlideOutDistancePx: 1200,
};

function computeTotalDuration(t: typeof DEFAULT_TIMING): number {
  const cursorHoverStartMs = t.cursorEntryStartMs + t.cursorEntryDurationMs;
  const cursorClickStartMs = cursorHoverStartMs + t.cursorHoverDurationMs;
  const sidebarRevealStartMs = cursorClickStartMs;
  const phase2MoveStartMs =
    sidebarRevealStartMs + t.sidebarRevealDurationMs + t.pauseAfterSidebarMs;
  const phase2HoverStartMs = phase2MoveStartMs + t.phase2MoveDurationMs;
  const phase2ClickStartMs = phase2HoverStartMs + t.phase2HoverDurationMs;
  const sidebarSlideDownStartMs = phase2ClickStartMs + t.phase2ClickDurationMs;
  const phase3StartMs =
    sidebarSlideDownStartMs +
    t.sidebarSlideDownDurationMs +
    t.pauseAfterTickMs;
  const phase4StartMs =
    phase3StartMs + t.phase3ScaleDurationMs + t.pauseAfterScaleMs;
  const typing1DurationMs = TYPING_TEXT_1.length * t.typingDurationPerChar;
  const phase5StartMs =
    phase4StartMs + typing1DurationMs + t.phase4HoldMs;
  const typing2DurationMs = TYPING_TEXT_2.length * t.typingDurationPerChar;
  const inputSlideOutStartMs =
    phase5StartMs + typing2DurationMs + t.holdAfterTyping2Ms;
  return inputSlideOutStartMs + t.inputSlideOutDurationMs;
}

// Positions
const PLUS_BUTTON_POS = { x: 470.452, y: 586.954 };
const CURSOR_START_POS = { x: 100, y: 800 };
const CARD_CENTER_X = 426 + 1069 / 2;
const CARD_CENTER_Y = 444 + 191.905 / 2;
const SIDEBAR_SLIDE_DOWN_PX = 120;
const CURSOR_TARGET_POS = { x: PLUS_BUTTON_POS.x, y: PLUS_BUTTON_POS.y };
const OPTION_BOX_1_CENTER = { x: 493, y: 261 };
const CURSOR_TIP_OFFSET_X = -493;
const CURSOR_TIP_OFFSET_Y = -264;

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// Load SVG elements as images
let mainCardImage: HTMLImageElement | null = null;
let sidebarImage: HTMLImageElement | null = null;
let cursorImage: HTMLImageElement | null = null;
let granolaLogoImage: HTMLImageElement | null = null;
let imagesLoaded = false;

function loadSVGImages(): void {
  if (imagesLoaded) return;

  const mainCardSVG = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="1920" height="1080" fill="white"/>
<g filter="url(#filter0_d_3571_1094)">
<rect x="426" y="444" width="1069" height="191.905" rx="31.8155" fill="white"/>
<rect x="426.795" y="444.795" width="1067.41" height="190.314" rx="31.0201" stroke="black" stroke-opacity="0.2" stroke-width="1.59077"/>
<g transform="translate(455.509, 507.453) scale(0.8) translate(-455.509, -507.453)">
<path opacity="0.5" d="M455.509 507.453V476.146H467.371C469.575 476.146 471.472 476.528 473.059 477.292C474.646 478.056 475.866 479.159 476.719 480.599C477.601 482.01 478.042 483.686 478.042 485.626C478.042 487.037 477.704 488.301 477.028 489.418C476.381 490.506 475.543 491.373 474.514 492.02C473.485 492.667 472.412 493.019 471.295 493.078L471.031 492.681C472.941 492.681 474.441 493.122 475.528 494.004C476.645 494.886 477.292 496.297 477.469 498.237L478.35 507.453H474.514L473.72 498.634C473.603 497.341 473.133 496.385 472.309 495.768C471.516 495.151 470.208 494.842 468.385 494.842H459.301V507.453H455.509ZM459.301 491.138H467.856C469.767 491.138 471.281 490.653 472.398 489.683C473.515 488.713 474.073 487.331 474.073 485.538C474.073 483.715 473.5 482.319 472.353 481.349C471.207 480.349 469.546 479.85 467.371 479.85H459.301V491.138ZM492.556 507.982C490.351 507.982 488.44 507.483 486.824 506.483C485.236 505.484 484.001 504.072 483.12 502.25C482.267 500.398 481.841 498.237 481.841 495.768C481.841 493.299 482.267 491.153 483.12 489.33C484.001 487.507 485.221 486.096 486.779 485.097C488.367 484.068 490.234 483.554 492.38 483.554C494.408 483.554 496.201 484.039 497.759 485.009C499.317 485.949 500.522 487.331 501.375 489.154C502.257 490.976 502.698 493.196 502.698 495.812V496.914H485.721C485.868 499.413 486.53 501.295 487.705 502.559C488.911 503.823 490.528 504.455 492.556 504.455C494.085 504.455 495.334 504.102 496.304 503.396C497.304 502.661 497.994 501.706 498.377 500.53L502.345 500.839C501.728 502.926 500.552 504.646 498.817 505.998C497.112 507.321 495.025 507.982 492.556 507.982ZM485.721 493.651H498.641C498.465 491.388 497.803 489.727 496.657 488.669C495.54 487.61 494.114 487.081 492.38 487.081C490.586 487.081 489.102 487.64 487.926 488.757C486.779 489.844 486.045 491.476 485.721 493.651ZM507.054 514.067V484.083H510.493L510.581 489.11L510.052 488.845C510.64 487.111 511.61 485.802 512.962 484.921C514.344 484.009 515.931 483.554 517.725 483.554C520.047 483.554 521.943 484.127 523.413 485.273C524.912 486.42 526.015 487.919 526.72 489.771C527.455 491.623 527.822 493.622 527.822 495.768C527.822 497.914 527.455 499.913 526.72 501.765C526.015 503.617 524.912 505.116 523.413 506.263C521.943 507.409 520.047 507.982 517.725 507.982C516.519 507.982 515.388 507.776 514.329 507.365C513.3 506.953 512.419 506.38 511.684 505.645C510.978 504.91 510.493 504.043 510.228 503.044L510.758 502.426V514.067H507.054ZM517.372 504.455C519.4 504.455 521.002 503.69 522.178 502.162C523.354 500.633 523.942 498.502 523.942 495.768C523.942 493.034 523.354 490.903 522.178 489.374C521.002 487.845 519.4 487.081 517.372 487.081C516.02 487.081 514.844 487.405 513.844 488.051C512.874 488.698 512.11 489.668 511.551 490.962C511.022 492.255 510.758 493.857 510.758 495.768C510.758 497.679 511.022 499.281 511.551 500.574C512.08 501.868 512.845 502.838 513.844 503.485C514.844 504.131 516.02 504.455 517.372 504.455ZM536.987 507.453C535.635 507.453 534.533 507.1 533.68 506.395C532.828 505.689 532.401 504.572 532.401 503.044V476.146H536.105V502.735C536.105 503.205 536.223 503.573 536.458 503.837C536.723 504.072 537.09 504.19 537.561 504.19H539.589V507.453H536.987ZM543.433 514.067V510.804H546.123C546.946 510.804 547.549 510.672 547.931 510.407C548.343 510.172 548.651 509.775 548.857 509.217L549.695 507.012H548.416L539.862 484.083H543.919L550.886 503.573L557.544 484.083H561.601L552.12 510.407C551.679 511.672 551.018 512.598 550.136 513.185C549.254 513.773 548.034 514.067 546.476 514.067H543.433ZM561.228 507.453V502.47H566.21V507.453H561.228ZM569.437 507.453V502.47H574.42V507.453H569.437Z" fill="black"/>
</g>
<path d="M470.452 572.637L470.452 601.271M484.769 586.954H456.135" stroke="#353535" stroke-width="1.59077" stroke-linecap="round"/>
<path d="M1389.21 595.139C1383.65 595.139 1379.14 590.628 1379.14 585.064M1389.21 595.139C1394.78 595.139 1399.29 590.628 1399.29 585.064M1389.21 595.139V599.547M1384.18 579.352C1384.18 576.768 1386.43 574.359 1389.21 574.359C1392 574.359 1394.25 576.768 1394.25 579.352V585.739C1394.25 588.322 1392 590.416 1389.21 590.416C1386.43 590.416 1384.18 588.322 1384.18 585.739V579.352Z" stroke="#353535" stroke-width="1.59077" stroke-linecap="round"/>
<rect x="1426.6" y="565.477" width="42.9509" height="42.9509" rx="21.4754" fill="black"/>
<path d="M1448.07 595.738L1448.07 581.584M1441.24 586.953L1447.38 580.81C1447.76 580.429 1448.38 580.429 1448.76 580.81L1454.91 586.953" stroke="white" stroke-width="1.59077" stroke-miterlimit="1.02018" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<filter id="filter0_d_3571_1094" x="396" y="414" width="1129" height="251.906" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="15"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3571_1094"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3571_1094" result="shape"/>
</filter>
</defs>
</svg>`;

  const sidebarSVG = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter1_d_3571_1094)">
<rect x="450" y="218" width="153" height="322" rx="20" fill="white" shape-rendering="crispEdges"/>
<rect x="451" y="219" width="151" height="320" rx="19" stroke="black" stroke-opacity="0.2" stroke-width="2" shape-rendering="crispEdges"/>
<rect x="470" y="238" width="46" height="46" rx="11" fill="white"/>
<rect x="470.5" y="238.5" width="45" height="45" rx="10.5" stroke="black" stroke-opacity="0.1"/>
<g transform="translate(-2000, 0)">
<path d="M502 255L490.906 266.276C490.514 266.674 489.872 266.674 489.48 266.276L485 261.722" stroke="#3B82F6" stroke-width="2" stroke-miterlimit="1.02018" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<rect x="470" y="297" width="46" height="46" rx="11" fill="white"/>
<rect x="470.5" y="297.5" width="45" height="45" rx="10.5" stroke="black" stroke-opacity="0.1"/>
<rect x="470" y="356" width="46" height="46" rx="11" fill="white"/>
<rect x="470.5" y="356.5" width="45" height="45" rx="10.5" stroke="black" stroke-opacity="0.1"/>
<rect x="470" y="415" width="46" height="46" rx="11" fill="white"/>
<rect x="470.5" y="415.5" width="45" height="45" rx="10.5" stroke="black" stroke-opacity="0.1"/>
<rect x="470" y="474" width="46" height="46" rx="11" fill="white"/>
<rect x="470.5" y="474.5" width="45" height="45" rx="10.5" stroke="black" stroke-opacity="0.1"/>
<rect x="536" y="238" width="47" height="47" rx="10.2174" fill="#B7C937"/>
<mask id="mask1_3571_1094" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="543" y="245" width="33" height="33">
<path d="M575.848 245.152H543.152V277.848H575.848V245.152Z" fill="white"/>
</mask>
<g mask="url(#mask1_3571_1094)">
<path d="M559.322 277.757C562.694 277.757 566.229 277.01 567.653 275.974C568.562 275.326 569.013 275.389 569.823 274.614C570.049 274.388 570.147 274.321 570.211 274.258C573.291 271.728 575.074 268.454 575.074 264.208C575.074 257.301 570.179 252.6 563.177 252.6C557.017 252.6 552.316 256.522 552.316 261.547C552.316 266.118 555.882 269.391 560.971 269.391C561.264 269.391 561.394 269.229 561.718 269.229C562.952 269.229 563.956 268.873 564.604 268.193C564.928 267.837 565.545 267.122 565.609 267.09C565.901 266.829 565.964 266.442 566.031 266.28C566.095 266.118 566.225 266.019 566.292 265.793C566.356 265.533 566.26 265.208 566.26 264.92C566.26 264.402 566.486 263.884 566.486 263.397C566.486 262.037 564.865 260.673 563.406 260.673C563.244 260.673 563.244 260.543 563.145 260.543C563.047 260.543 562.952 260.641 562.853 260.641C562.754 260.641 562.627 260.479 562.497 260.479C562.367 260.479 562.303 260.61 562.109 260.61C561.686 260.61 561.655 260.673 561.331 260.673C561.232 260.673 561.07 260.705 561.006 260.737C560.876 260.8 560.876 260.899 560.746 260.899C560.572 260.899 560.485 260.932 560.485 260.997C560.485 261.353 560.516 261.29 560.354 261.29C560.181 261.29 560.072 261.3 560.03 261.322C559.9 261.385 559.998 261.547 559.868 261.646C559.738 261.709 559.706 261.808 559.674 262.002C559.643 262.195 559.449 262.262 559.449 262.456C559.449 262.555 559.48 262.618 559.48 262.682C559.48 262.876 559.093 262.812 559.093 263.006C559.093 263.136 559.191 263.232 559.191 263.362C559.191 263.461 559.128 263.524 559.128 263.623C559.128 263.721 559.191 263.785 559.191 263.848C559.191 264.01 558.966 264.042 558.966 264.172C558.966 264.303 559.096 264.398 559.096 264.497C559.096 264.56 558.998 264.595 558.998 264.69C558.998 264.786 558.966 264.627 559.16 264.916C559.29 265.11 559.29 265.208 559.16 265.371C559.029 265.533 558.772 265.631 558.448 265.631C557.088 265.631 556.926 264.236 556.178 264.01C555.953 263.947 555.918 263.912 555.918 263.816C555.918 263.721 555.918 263.753 556.048 263.623C556.178 263.492 556.21 263.397 556.21 263.298C556.21 263.2 556.21 263.168 556.147 263.105C555.886 262.682 555.759 262.164 555.759 261.582C555.759 258.601 559.389 256.103 562.828 256.103C563.864 256.103 563.702 256.363 564.319 256.363C564.481 256.363 564.417 256.363 564.643 256.332C565.228 256.233 566.296 256.462 567.138 256.881C569.471 258.048 570.997 260.804 570.997 264.014C570.997 269.494 566.134 273.479 559.65 273.479C556.115 273.479 553.684 272.376 551.284 269.687C551.023 269.395 551.414 269.751 550.991 269.007C550.473 268.098 550.537 268.683 550.537 268.683C550.375 268.489 550.082 267.936 549.92 267.742C549.726 267.517 549.465 267.548 549.37 267.418C549.24 267.256 549.434 266.963 549.37 266.801C549.307 266.541 548.754 266.153 548.69 265.959C548.627 265.765 548.398 264.532 548.398 264.306C548.398 264.046 548.591 264.014 548.591 263.852C548.591 263.626 548.299 263.559 548.137 263.235C547.975 262.911 547.876 262.164 547.876 261.353C547.876 260.93 547.876 260.768 548.007 259.796C548.038 259.472 548.525 259.472 548.525 259.116C548.525 258.985 548.461 258.823 548.461 258.728C548.461 258.598 548.461 258.566 548.493 258.467C549.853 252.762 555.95 248.516 562.726 248.516C565.059 248.516 566.842 248.938 569.598 250.105C570.507 250.492 571.835 249.812 571.835 249.101C571.899 248.875 571.772 248.808 571.737 248.678C571.705 248.547 571.575 248.385 571.444 248.353C571.381 248.322 571.346 248.223 571.282 248.128C571.183 247.966 571.088 247.902 570.828 247.835C570.697 247.804 570.634 247.772 570.567 247.705C570.468 247.575 570.405 247.511 570.274 247.444C570.144 247.381 570.049 247.444 569.982 247.413C569.918 247.381 569.883 247.314 569.82 247.282C569.788 247.25 569.721 247.25 569.626 247.25C566.356 245.499 564.217 245.238 561.366 245.238C555.206 245.238 549.694 247.899 546.29 252.533C545.998 252.92 546.16 253.569 545.741 253.96C544.93 254.707 543.926 258.791 543.926 261.385C543.926 263.556 544.444 266.442 545.124 268.031C546.452 271.143 545.871 269.846 546.065 270.138C546.452 270.755 546.777 270.819 546.939 271.012C546.939 271.012 547.037 271.206 547.037 271.4C547.037 271.53 547.037 271.562 547.069 271.626C547.168 271.819 547.619 272.144 547.749 272.274C548.042 272.566 548.267 273.183 548.754 273.669C549.501 274.417 550.568 274.998 553.973 276.587C555.171 277.137 554.491 276.848 554.621 276.88C554.913 276.978 555.301 276.978 555.53 277.141C555.66 277.239 555.498 277.204 555.854 277.204C555.918 277.204 555.918 277.236 555.985 277.267C556.048 277.299 556.115 277.398 556.21 277.398C556.274 277.398 556.309 277.334 556.404 277.366C556.499 277.398 556.728 277.56 556.922 277.659C557.084 277.757 557.116 277.757 557.183 277.69C557.377 277.56 557.507 277.722 557.701 277.722C557.764 277.722 557.863 277.69 558.057 277.69C558.318 277.69 558.318 277.754 559.322 277.754" fill="#292929"/>
</g>
</g>
<defs>
<filter id="filter1_d_3571_1094" x="420" y="188" width="213" height="382" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="15"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3571_1094"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_3571_1094" result="shape"/>
</filter>
</defs>
</svg>`;

  const cursorSVG = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter2_dddd_3571_1094)">
<path d="M506.017 305.013L493.042 266.897C492.44 265.129 494.129 263.44 495.897 264.042L534.012 277.018C536.048 277.711 536.045 280.59 534.008 281.279L518.618 286.483C517.141 286.982 515.982 288.142 515.483 289.618L510.279 305.008C509.59 307.045 506.71 307.048 506.017 305.013Z" fill="black" stroke="white" stroke-width="1.78571"/>
</g>
<defs>
<filter id="filter2_dddd_3571_1094" x="470.5" y="251.5" width="85" height="106.429" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="1.78571"/>
<feGaussianBlur stdDeviation="2.14286"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_3571_1094"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="7.85714"/>
<feGaussianBlur stdDeviation="3.92857"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.09 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect2_dropShadow_3571_1094"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="17.5"/>
<feGaussianBlur stdDeviation="5.35714"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect3_dropShadow_3571_1094"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset dy="31.4286"/>
<feGaussianBlur stdDeviation="6.25"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.01 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect4_dropShadow_3571_1094"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect4_dropShadow_3571_1094" result="shape"/>
</filter>
</defs>
</svg>`;

  const granolaLogoSVG = `<svg width="47" height="47" viewBox="0 0 47 47" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="47" height="47" rx="10.2174" fill="#B7C937"/>
<mask id="mask0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="6" y="7" width="34" height="34">
<path d="M39.848 7.152H7.152V39.848H39.848V7.152Z" fill="white"/>
</mask>
<g mask="url(#mask0)">
<path d="M23.322 39.757C26.694 39.757 30.229 39.01 31.653 37.974C32.562 37.326 33.013 37.389 33.823 36.614C34.049 36.388 34.147 36.321 34.211 36.258C37.291 33.728 39.074 30.454 39.074 26.208C39.074 19.301 34.179 14.6 27.177 14.6C21.017 14.6 16.316 18.522 16.316 23.547C16.316 28.118 19.882 31.391 24.971 31.391C25.264 31.391 25.394 31.229 25.718 31.229C26.952 31.229 27.956 30.873 28.604 30.193C28.928 29.837 29.545 29.122 29.609 29.09C29.901 28.829 29.964 28.442 30.031 28.28C30.095 28.118 30.225 28.019 30.292 27.793C30.356 27.533 30.26 27.208 30.26 26.92C30.26 26.402 30.486 25.884 30.486 25.397C30.486 24.037 28.865 22.673 27.406 22.673C27.244 22.673 27.244 22.543 27.145 22.543C27.047 22.543 26.952 22.641 26.853 22.641C26.754 22.641 26.627 22.479 26.497 22.479C26.367 22.479 26.303 22.61 26.109 22.61C25.686 22.61 25.655 22.673 25.331 22.673C25.232 22.673 25.07 22.705 25.006 22.737C24.876 22.8 24.876 22.899 24.746 22.899C24.572 22.899 24.485 22.932 24.485 22.997C24.485 23.353 24.516 23.29 24.354 23.29C24.181 23.29 24.072 23.3 24.03 23.322C23.9 23.385 23.998 23.547 23.868 23.646C23.738 23.709 23.706 23.808 23.674 24.002C23.643 24.195 23.449 24.262 23.449 24.456C23.449 24.555 23.48 24.618 23.48 24.682C23.48 24.876 23.093 24.812 23.093 25.006C23.093 25.136 23.191 25.232 23.191 25.362C23.191 25.461 23.128 25.524 23.128 25.623C23.128 25.721 23.191 25.785 23.191 25.848C23.191 26.01 22.966 26.042 22.966 26.172C22.966 26.303 23.096 26.398 23.096 26.497C23.096 26.56 22.998 26.595 22.998 26.69C22.998 26.786 22.966 26.627 23.16 26.916C23.29 27.11 23.29 27.208 23.16 27.371C23.029 27.533 22.772 27.631 22.448 27.631C21.088 27.631 20.926 26.236 20.178 26.01C19.953 25.947 19.918 25.912 19.918 25.816C19.918 25.721 19.918 25.753 20.048 25.623C20.178 25.492 20.21 25.397 20.21 25.298C20.21 25.2 20.21 25.168 20.147 25.105C19.886 24.682 19.759 24.164 19.759 23.582C19.759 20.601 23.389 18.103 26.828 18.103C27.864 18.103 27.702 18.363 28.319 18.363C28.481 18.363 28.417 18.363 28.643 18.332C29.228 18.233 30.296 18.462 31.138 18.881C33.471 20.048 34.997 22.804 34.997 26.014C34.997 31.494 30.134 35.479 23.65 35.479C20.115 35.479 17.684 34.376 15.284 31.687C15.023 31.395 15.414 31.751 14.991 31.007C14.473 30.098 14.537 30.683 14.537 30.683C14.375 30.489 14.082 29.936 13.92 29.742C13.726 29.517 13.465 29.548 13.37 29.418C13.24 29.256 13.434 28.963 13.37 28.801C13.307 28.541 12.754 28.153 12.69 27.959C12.627 27.765 12.398 26.532 12.398 26.306C12.398 26.046 12.591 26.014 12.591 25.852C12.591 25.626 12.299 25.559 12.137 25.235C11.975 24.911 11.876 24.164 11.876 23.353C11.876 22.93 11.876 22.768 12.007 21.796C12.038 21.472 12.525 21.472 12.525 21.116C12.525 20.985 12.461 20.823 12.461 20.728C12.461 20.598 12.461 20.566 12.493 20.467C13.853 14.762 19.95 10.516 26.726 10.516C29.059 10.516 30.842 10.938 33.598 12.105C34.507 12.492 35.835 11.812 35.835 11.101C35.899 10.875 35.772 10.808 35.737 10.678C35.705 10.547 35.575 10.385 35.444 10.353C35.381 10.322 35.346 10.223 35.282 10.128C35.183 9.966 35.088 9.902 34.828 9.835C34.697 9.804 34.634 9.772 34.567 9.705C34.468 9.575 34.405 9.511 34.274 9.444C34.144 9.381 34.049 9.444 33.982 9.413C33.918 9.381 33.883 9.314 33.82 9.282C33.788 9.25 33.721 9.25 33.626 9.25C30.356 7.499 28.217 7.238 25.366 7.238C19.206 7.238 13.694 9.899 10.29 14.533C9.998 14.92 10.16 15.569 9.741 15.96C8.93 16.707 7.926 20.791 7.926 23.385C7.926 25.556 8.444 28.442 9.124 30.031C10.452 33.143 9.871 31.846 10.065 32.138C10.452 32.755 10.777 32.819 10.939 33.012C10.939 33.012 11.037 33.206 11.037 33.4C11.037 33.53 11.037 33.562 11.069 33.626C11.168 33.819 11.619 34.144 11.749 34.274C12.042 34.566 12.267 35.183 12.754 35.669C13.501 36.417 14.568 36.998 17.973 38.587C19.171 39.137 18.491 38.848 18.621 38.88C18.913 38.978 19.301 38.978 19.53 39.141C19.66 39.239 19.498 39.204 19.854 39.204C19.918 39.204 19.918 39.236 19.985 39.267C20.048 39.299 20.115 39.398 20.21 39.398C20.274 39.398 20.309 39.334 20.404 39.366C20.499 39.398 20.728 39.56 20.922 39.659C21.084 39.757 21.116 39.757 21.183 39.69C21.377 39.56 21.507 39.722 21.701 39.722C21.764 39.722 21.863 39.69 22.057 39.69C22.318 39.69 22.318 39.754 23.322 39.754" fill="#292929"/>
</g>
</svg>`;

  function loadImage(
    svgContent: string,
    callback: (img: HTMLImageElement) => void
  ) {
    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      callback(img);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  loadImage(mainCardSVG, (img) => {
    mainCardImage = img;
  });
  loadImage(sidebarSVG, (img) => {
    sidebarImage = img;
  });
  loadImage(cursorSVG, (img) => {
    cursorImage = img;
  });
  loadImage(granolaLogoSVG, (img) => {
    granolaLogoImage = img;
  });

  imagesLoaded = true;
}

const animation: AnimationDefinition<Scene3Params> = {
  id: 'meeting-notes-scene3',
  name: 'Granola Scene 3 Animation',
  fps: 60,
  durationMs: computeTotalDuration(DEFAULT_TIMING),
  width: 1920,
  height: 1080,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#FFFFFF',
      speed: 1,
      cursorEntryStartMs: 150,
      cursorEntryDurationMs: 600,
      cursorHoverDurationMs: 100,
      cursorClickDurationMs: 225,
      sidebarRevealDurationMs: 300,
      pauseAfterSidebarMs: 200,
      phase2MoveDurationMs: 350,
      phase2HoverDurationMs: 250,
      phase2ClickDurationMs: 275,
      tickRevealDurationMs: 100,
      sidebarSlideDownDurationMs: 250,
      pauseAfterTickMs: 150,
      inputSlideOutDurationMs: 600,
      phase3ScaleDurationMs: 400,
      phase3FadeoutDurationMs: 500,
      granolaRevealDelayMs: 200,
      granolaRevealDurationMs: 400,
      pauseAfterScaleMs: 200,
      typingDurationPerChar: 60,
      typingCursorBlinkInterval: 530,
      phase4HoldMs: 500,
      holdAfterTyping2Ms: 500,
      inputSlideOutDistancePx: 1750,
    },
    schema: {
      ...folder('Layout', {
        scale: number({
          value: 1,
          min: 0.1,
          max: 3,
          step: 0.1,
          label: 'Scale',
        }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({
          value: 1,
          min: 0.1,
          max: 3,
          step: 0.1,
          label: 'Speed',
        }),
      }),
      ...folder('Timing - Phase 1 (Cursor to Plus)', {
        cursorEntryStartMs: number({
          value: 300,
          min: 0,
          max: 2000,
          step: 50,
          label: 'Cursor Entry Start (ms)',
        }),
        cursorEntryDurationMs: number({
          value: 600,
          min: 100,
          max: 2000,
          step: 50,
          label: 'Cursor Move Duration (ms)',
        }),
        cursorHoverDurationMs: number({
          value: 200,
          min: 0,
          max: 1000,
          step: 50,
          label: 'Hover Duration (ms)',
        }),
        cursorClickDurationMs: number({
          value: 150,
          min: 50,
          max: 500,
          step: 25,
          label: 'Click Duration (ms)',
        }),
        sidebarRevealDurationMs: number({
          value: 300,
          min: 100,
          max: 1000,
          step: 50,
          label: 'Sidebar Reveal (ms)',
        }),
        pauseAfterSidebarMs: number({
          value: 200,
          min: 0,
          max: 1000,
          step: 50,
          label: 'Pause After Sidebar (ms)',
        }),
      }),
      ...folder('Timing - Phase 2 (Option Box)', {
        phase2MoveDurationMs: number({
          value: 400,
          min: 100,
          max: 2000,
          step: 50,
          label: 'Move to Option (ms)',
        }),
        phase2HoverDurationMs: number({
          value: 150,
          min: 0,
          max: 500,
          step: 25,
          label: 'Hover (ms)',
        }),
        phase2ClickDurationMs: number({
          value: 150,
          min: 50,
          max: 500,
          step: 25,
          label: 'Click (ms)',
        }),
        tickRevealDurationMs: number({
          value: 200,
          min: 50,
          max: 800,
          step: 25,
          label: 'Tick Reveal (ms)',
        }),
        sidebarSlideDownDurationMs: number({
          value: 250,
          min: 100,
          max: 800,
          step: 25,
          label: 'Dropdown Slide Down (ms)',
        }),
        pauseAfterTickMs: number({
          value: 300,
          min: 0,
          max: 1500,
          step: 50,
          label: 'Pause After Tick (ms)',
        }),
      }),
      ...folder('Timing - Phase 3 (Scale & Fade)', {
        phase3ScaleDurationMs: number({
          value: 800,
          min: 200,
          max: 2000,
          step: 100,
          label: 'Text Box Scale (ms)',
        }),
        phase3FadeoutDurationMs: number({
          value: 500,
          min: 200,
          max: 1500,
          step: 50,
          label: 'Sidebar/Cursor Fade (ms)',
        }),
        granolaRevealDelayMs: number({
          value: 200,
          min: 0,
          max: 800,
          step: 50,
          label: 'Granola Reveal Delay (ms)',
        }),
        granolaRevealDurationMs: number({
          value: 400,
          min: 100,
          max: 1000,
          step: 50,
          label: 'Granola Reveal (ms)',
        }),
        pauseAfterScaleMs: number({
          value: 200,
          min: 0,
          max: 1000,
          step: 50,
          label: 'Pause After Scale (ms)',
        }),
      }),
      ...folder('Timing - Phase 4 & 5 (Typing)', {
        typingDurationPerChar: number({
          value: 60,
          min: 20,
          max: 150,
          step: 5,
          label: 'Ms Per Character',
        }),
        typingCursorBlinkInterval: number({
          value: 530,
          min: 200,
          max: 1000,
          step: 50,
          label: 'Cursor Blink (ms)',
        }),
        phase4HoldMs: number({
          value: 500,
          min: 0,
          max: 2000,
          step: 100,
          label: 'Hold After 1st Typing (ms)',
        }),
        holdAfterTyping2Ms: number({
          value: 500,
          min: 0,
          max: 3000,
          step: 100,
          label: 'Hold After 2nd Typing (ms)',
        }),
        inputSlideOutDurationMs: number({
          value: 600,
          min: 200,
          max: 1500,
          step: 50,
          label: 'Input Slide Out (ms)',
        }),
        inputSlideOutDistancePx: number({
          value: 1200,
          min: 200,
          max: 2500,
          step: 50,
          label: 'Input Slide Out Distance (px)',
        }),
      }),
    },
  },

  setup() {
    loadSVGImages();
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      backgroundColor,
      speed,
      cursorEntryStartMs,
      cursorEntryDurationMs,
      cursorHoverDurationMs,
      cursorClickDurationMs,
      sidebarRevealDurationMs,
      pauseAfterSidebarMs,
      phase2MoveDurationMs,
      phase2HoverDurationMs,
      phase2ClickDurationMs,
      tickRevealDurationMs,
      sidebarSlideDownDurationMs,
      pauseAfterTickMs,
      phase3ScaleDurationMs,
      phase3FadeoutDurationMs: _phase3FadeoutDurationMs,
      granolaRevealDelayMs,
      granolaRevealDurationMs,
      pauseAfterScaleMs,
      typingDurationPerChar,
      typingCursorBlinkInterval,
      phase4HoldMs,
      holdAfterTyping2Ms,
      inputSlideOutDurationMs,
      inputSlideOutDistancePx,
    } = params;

    // Compute derived timings from params
    const cursorHoverStartMs = cursorEntryStartMs + cursorEntryDurationMs;
    const cursorClickStartMs = cursorHoverStartMs + cursorHoverDurationMs;
    const sidebarRevealStartMs = cursorClickStartMs;
    const phase2MoveStartMs =
      sidebarRevealStartMs + sidebarRevealDurationMs + pauseAfterSidebarMs;
    const phase2HoverStartMs = phase2MoveStartMs + phase2MoveDurationMs;
    const phase2ClickStartMs = phase2HoverStartMs + phase2HoverDurationMs;
    const tickRevealStartMs = phase2ClickStartMs;
    const sidebarSlideDownStartMs = phase2ClickStartMs + phase2ClickDurationMs;
    const phase3StartMs =
      sidebarSlideDownStartMs +
      sidebarSlideDownDurationMs +
      pauseAfterTickMs;
    const granolaRevealStartMs = phase3StartMs + granolaRevealDelayMs;
    const phase4StartMs =
      phase3StartMs + phase3ScaleDurationMs + pauseAfterScaleMs;
    const typing1TotalDurationMs =
      TYPING_TEXT_1.length * typingDurationPerChar;
    const phase5StartMs = phase4StartMs + typing1TotalDurationMs + phase4HoldMs;
    const typing2TotalDurationMs =
      TYPING_TEXT_2.length * typingDurationPerChar;
    const inputSlideOutStartMs =
      phase5StartMs + typing2TotalDurationMs + holdAfterTyping2Ms;
    const totalDurationMs =
      inputSlideOutStartMs + inputSlideOutDurationMs;

    const elapsed =
      (progress * totalDurationMs * speed) % Math.max(1, totalDurationMs);

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();

    const scaleX = (width / 1920) * scale;
    const scaleY = (height / 1080) * scale;
    ctx.scale(scaleX, scaleY);

    // Input box slide-out (outro)
    let inputSlideX = 0;
    if (elapsed >= inputSlideOutStartMs) {
      const slideProgress = Math.min(
        1,
        (elapsed - inputSlideOutStartMs) / inputSlideOutDurationMs
      );
      inputSlideX =
        -inputSlideOutDistancePx * easeOutCubic(slideProgress);
    }

    // Phase 3: Text box scale
    const isPhase3 = elapsed >= phase3StartMs;
    let cardScale = 1;
    if (isPhase3) {
      const scaleProgress = Math.min(
        1,
        (elapsed - phase3StartMs) / phase3ScaleDurationMs
      );
      const eased = easeOutQuart(scaleProgress);
      cardScale = 1 + 0.4 * eased;
    }

    // Cursor fades with dropdown slide-down (no separate phase3 fade)

    // Sidebar slide down + fade (starts when tick appears, after click)
    const isSidebarSlidingDown =
      elapsed >= sidebarSlideDownStartMs &&
      elapsed < sidebarSlideDownStartMs + sidebarSlideDownDurationMs;
    let sidebarSlideProgress = 0;
    let sidebarVisible = elapsed >= sidebarRevealStartMs;
    let cursorVisible =
      elapsed >= cursorEntryStartMs &&
      elapsed < sidebarSlideDownStartMs + sidebarSlideDownDurationMs;
    if (isSidebarSlidingDown) {
      sidebarSlideProgress = Math.min(
        1,
        (elapsed - sidebarSlideDownStartMs) / sidebarSlideDownDurationMs
      );
      sidebarVisible = true;
    } else if (elapsed >= sidebarSlideDownStartMs + sidebarSlideDownDurationMs) {
      sidebarVisible = false;
    }

    // Draw main card (with input slide-out)
    if (mainCardImage && mainCardImage.width > 0) {
      ctx.save();
      ctx.translate(inputSlideX, 0);
      if (cardScale !== 1) {
        const cardCenterX = 426 + 1069 / 2;
        const cardCenterY = 444 + 191.905 / 2;
        ctx.translate(cardCenterX, cardCenterY);
        ctx.scale(cardScale, cardScale);
        ctx.translate(-cardCenterX, -cardCenterY);
      }
      ctx.drawImage(mainCardImage, 0, 0);

      if (elapsed >= phase4StartMs) {
        ctx.fillStyle = 'white';
        ctx.fillRect(448, 479, 110, 37);
      }

      ctx.restore();
    }

    // Plus button hover/click
    const plusButtonScale = (() => {
      if (elapsed >= cursorHoverStartMs && elapsed < cursorClickStartMs) {
        const hoverProgress =
          (elapsed - cursorHoverStartMs) / cursorHoverDurationMs;
        return 1 + 0.1 * Math.sin(hoverProgress * Math.PI * 2);
      } else if (
        elapsed >= cursorClickStartMs &&
        elapsed < cursorClickStartMs + cursorClickDurationMs
      ) {
        const clickProgress =
          (elapsed - cursorClickStartMs) / cursorClickDurationMs;
        return 0.85 + 0.15 * easeOutCubic(clickProgress);
      }
      return 1;
    })();

    const isClicking =
      elapsed >= cursorClickStartMs &&
      elapsed < cursorClickStartMs + cursorClickDurationMs;
    if (isClicking) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      const bgWidth = 50;
      const bgHeight = 50;
      const bgRadius = 8;
      const x = PLUS_BUTTON_POS.x - bgWidth / 2;
      const y = PLUS_BUTTON_POS.y - bgHeight / 2;
      ctx.beginPath();
      ctx.moveTo(x + bgRadius, y);
      ctx.lineTo(x + bgWidth - bgRadius, y);
      ctx.arc(
        x + bgWidth - bgRadius,
        y + bgRadius,
        bgRadius,
        -Math.PI / 2,
        0
      );
      ctx.lineTo(x + bgWidth, y + bgHeight - bgRadius);
      ctx.arc(
        x + bgWidth - bgRadius,
        y + bgHeight - bgRadius,
        bgRadius,
        0,
        Math.PI / 2
      );
      ctx.lineTo(x + bgRadius, y + bgHeight);
      ctx.arc(
        x + bgRadius,
        y + bgHeight - bgRadius,
        bgRadius,
        Math.PI / 2,
        Math.PI
      );
      ctx.lineTo(x, y + bgRadius);
      ctx.arc(x + bgRadius, y + bgRadius, bgRadius, Math.PI, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(inputSlideX, 0);
    if (cardScale !== 1) {
      ctx.translate(CARD_CENTER_X, CARD_CENTER_Y);
      ctx.scale(cardScale, cardScale);
      ctx.translate(-CARD_CENTER_X, -CARD_CENTER_Y);
    }

    ctx.save();
    ctx.translate(PLUS_BUTTON_POS.x, PLUS_BUTTON_POS.y);
    ctx.scale(plusButtonScale, plusButtonScale);
    ctx.translate(-PLUS_BUTTON_POS.x, -PLUS_BUTTON_POS.y);
    ctx.strokeStyle = '#353535';
    ctx.lineWidth = 1.59077 * 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(470.452, 572.637);
    ctx.lineTo(470.452, 601.271);
    ctx.moveTo(484.769, 586.954);
    ctx.lineTo(456.135, 586.954);
    ctx.stroke();
    ctx.restore();

    if (
      granolaLogoImage &&
      granolaLogoImage.width > 0 &&
      elapsed >= granolaRevealStartMs
    ) {
      const revealProgress = Math.min(
        1,
        (elapsed - granolaRevealStartMs) / granolaRevealDurationMs
      );
      const eased = easeOutCubic(revealProgress);
      ctx.save();
      ctx.globalAlpha = eased;
      const logoX = 509.631;
      const logoY = 563.453;
      const logoSize = 47;
      const logoScale = 0.8 + 0.2 * eased;
      const logoCenterX = logoX + logoSize / 2;
      const logoCenterY = logoY + logoSize / 2;
      ctx.translate(logoCenterX, logoCenterY);
      ctx.scale(logoScale, logoScale);
      ctx.translate(-logoCenterX, -logoCenterY);
      ctx.drawImage(granolaLogoImage, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    ctx.restore();

    // Sidebar (reveal, then slide down + fade when tick appears)
    if (sidebarImage && sidebarImage.width > 0 && sidebarVisible) {
      let opacity: number;
      let translateY = 0;
      let sidebarScale = 1;

      if (isSidebarSlidingDown) {
        const eased = easeOutCubic(sidebarSlideProgress);
        opacity = 1 - eased;
        translateY = SIDEBAR_SLIDE_DOWN_PX * eased;
      } else {
        const revealProgress = Math.min(
          1,
          (elapsed - sidebarRevealStartMs) / sidebarRevealDurationMs
        );
        const eased = easeOutQuart(revealProgress);
        opacity = eased;
        sidebarScale = 0.95 + 0.05 * eased;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(CARD_CENTER_X, CARD_CENTER_Y);
      ctx.translate(0, translateY);
      ctx.scale(sidebarScale * cardScale, sidebarScale * cardScale);
      ctx.translate(-CARD_CENTER_X, -CARD_CENTER_Y);
      ctx.drawImage(sidebarImage, 0, 0);
      ctx.restore();
    }

    const isClickingOption =
      elapsed >= phase2ClickStartMs &&
      elapsed < phase2ClickStartMs + phase2ClickDurationMs;
    if (isClickingOption && sidebarVisible) {
      const optionBoxTranslateY = isSidebarSlidingDown
        ? SIDEBAR_SLIDE_DOWN_PX * easeOutCubic(sidebarSlideProgress)
        : 0;
      ctx.save();
      ctx.translate(0, optionBoxTranslateY);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      const bx = 470;
      const by = 238;
      const bw = 46;
      const bh = 46;
      const br = 11;
      const cardCenterX = 426 + 1069 / 2;
      const cardCenterY = 444 + 191.905 / 2;
      if (cardScale !== 1) {
        ctx.translate(cardCenterX, cardCenterY);
        ctx.scale(cardScale, cardScale);
        ctx.translate(-cardCenterX, -cardCenterY);
      }
      ctx.beginPath();
      ctx.moveTo(bx + br, by);
      ctx.lineTo(bx + bw - br, by);
      ctx.arc(bx + bw - br, by + br, br, -Math.PI / 2, 0);
      ctx.lineTo(bx + bw, by + bh - br);
      ctx.arc(bx + bw - br, by + bh - br, br, 0, Math.PI / 2);
      ctx.lineTo(bx + br, by + bh);
      ctx.arc(bx + br, by + bh - br, br, Math.PI / 2, Math.PI);
      ctx.lineTo(bx, by + br);
      ctx.arc(bx + br, by + br, br, Math.PI, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (elapsed >= tickRevealStartMs && sidebarVisible) {
      const tickProgress = Math.min(
        1,
        (elapsed - tickRevealStartMs) / tickRevealDurationMs
      );
      const tickEased = easeOutCubic(tickProgress);
      const isTickRevealComplete = tickProgress >= 1;
      const tickOpacity = isSidebarSlidingDown
        ? tickEased * (1 - easeOutCubic(sidebarSlideProgress))
        : tickEased;
      const tickTranslateY = isSidebarSlidingDown
        ? SIDEBAR_SLIDE_DOWN_PX * easeOutCubic(sidebarSlideProgress)
        : 0;
      ctx.save();
      ctx.translate(0, tickTranslateY);
      ctx.globalAlpha = tickOpacity;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const tickCenterX = 493;
      const tickCenterY = 261;
      const tickScale = 0.5 + 0.5 * tickEased;
      const cardCenterX = 426 + 1069 / 2;
      const cardCenterY = 444 + 191.905 / 2;
      if (isTickRevealComplete && cardScale !== 1) {
        ctx.translate(cardCenterX, cardCenterY);
        ctx.scale(cardScale, cardScale);
        ctx.translate(-cardCenterX, -cardCenterY);
      }
      ctx.translate(tickCenterX, tickCenterY);
      ctx.scale(tickScale, tickScale);
      ctx.translate(-tickCenterX, -tickCenterY);
      ctx.beginPath();
      ctx.moveTo(502, 255);
      ctx.lineTo(490.906, 266.276);
      ctx.lineTo(485, 261.722);
      ctx.stroke();
      ctx.restore();
    }

    if (
      cursorImage &&
      cursorImage.width > 0 &&
      cursorVisible
    ) {
      let cursorX = CURSOR_START_POS.x;
      let cursorY = CURSOR_START_POS.y;

      if (elapsed < cursorHoverStartMs) {
        const entryProgress =
          (elapsed - cursorEntryStartMs) / cursorEntryDurationMs;
        const eased = easeOutCubic(entryProgress);
        cursorX =
          CURSOR_START_POS.x +
          (CURSOR_TARGET_POS.x - CURSOR_START_POS.x) * eased;
        cursorY =
          CURSOR_START_POS.y +
          (CURSOR_TARGET_POS.y - CURSOR_START_POS.y) * eased;
      } else if (elapsed < phase2MoveStartMs) {
        cursorX = CURSOR_TARGET_POS.x;
        cursorY = CURSOR_TARGET_POS.y;
      } else if (elapsed < phase2HoverStartMs) {
        const moveProgress =
          (elapsed - phase2MoveStartMs) / phase2MoveDurationMs;
        const eased = easeOutCubic(moveProgress);
        cursorX =
          CURSOR_TARGET_POS.x +
          (OPTION_BOX_1_CENTER.x - CURSOR_TARGET_POS.x) * eased;
        cursorY =
          CURSOR_TARGET_POS.y +
          (OPTION_BOX_1_CENTER.y - CURSOR_TARGET_POS.y) * eased;
      } else {
        cursorX = OPTION_BOX_1_CENTER.x;
        cursorY = OPTION_BOX_1_CENTER.y;
      }

      if (
        elapsed >= cursorClickStartMs &&
        elapsed < cursorClickStartMs + cursorClickDurationMs
      ) {
        const clickProgress =
          (elapsed - cursorClickStartMs) / cursorClickDurationMs;
        const clickOffset =
          clickProgress < 0.5
            ? 5 * (clickProgress * 2)
            : 5 * (1 - (clickProgress - 0.5) * 2);
        cursorY += clickOffset;
      }

      if (
        elapsed >= phase2ClickStartMs &&
        elapsed < phase2ClickStartMs + phase2ClickDurationMs
      ) {
        const clickProgress =
          (elapsed - phase2ClickStartMs) / phase2ClickDurationMs;
        const clickOffset =
          clickProgress < 0.5
            ? 5 * (clickProgress * 2)
            : 5 * (1 - (clickProgress - 0.5) * 2);
        cursorY += clickOffset;
      }

      const cursorOpacity = isSidebarSlidingDown
        ? 1 - easeOutCubic(sidebarSlideProgress)
        : 1;
      const cursorTranslateY = isSidebarSlidingDown
        ? SIDEBAR_SLIDE_DOWN_PX * easeOutCubic(sidebarSlideProgress)
        : 0;

      ctx.save();
      ctx.globalAlpha = cursorOpacity;
      ctx.translate(0, cursorTranslateY);
      if (cardScale !== 1) {
        ctx.translate(CARD_CENTER_X, CARD_CENTER_Y);
        ctx.scale(cardScale, cardScale);
        ctx.translate(-CARD_CENTER_X, -CARD_CENTER_Y);
      }
      ctx.drawImage(
        cursorImage,
        cursorX + CURSOR_TIP_OFFSET_X,
        cursorY + CURSOR_TIP_OFFSET_Y
      );
      ctx.restore();
    }

    if (elapsed >= phase4StartMs) {
      let currentText = '';
      let isTypingComplete = false;

      if (elapsed < phase5StartMs) {
        const typingProgress = Math.min(
          1,
          (elapsed - phase4StartMs) / typing1TotalDurationMs
        );
        const numCharsToShow = Math.floor(typingProgress * TYPING_TEXT_1.length);
        currentText = TYPING_TEXT_1.substring(0, numCharsToShow);
        isTypingComplete = numCharsToShow >= TYPING_TEXT_1.length;
      } else {
        const typingProgress = Math.min(
          1,
          (elapsed - phase5StartMs) / typing2TotalDurationMs
        );
        const numCharsToShow = Math.floor(typingProgress * TYPING_TEXT_2.length);
        currentText = TYPING_TEXT_2.substring(0, numCharsToShow);
        isTypingComplete = numCharsToShow >= TYPING_TEXT_2.length;
      }

      ctx.save();
      ctx.translate(inputSlideX, 0);

      if (cardScale !== 1) {
        ctx.translate(CARD_CENTER_X, CARD_CENTER_Y);
        ctx.scale(cardScale, cardScale);
        ctx.translate(-CARD_CENTER_X, -CARD_CENTER_Y);
      }

      ctx.translate(455.509, 507.453);
      ctx.scale(0.8, 0.8);
      ctx.translate(-455.509, -507.453);

      const textX = 455.509;
      const textY = 507.453;
      const fontSize = 43;

      if (elapsed >= phase5StartMs) {
        ctx.fillStyle = 'white';
        ctx.fillRect(textX - 5, textY - 35, 700, 50);
      }

      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(currentText, textX, textY);

      if (!isTypingComplete) {
        const textWidth = ctx.measureText(currentText).width;
        const typeCursorX = textX + textWidth + 2;
        const cursorTop = textY - 31.3;
        const cursorHeight = 31.3 + 6.6;
        const blinkProgress =
          (elapsed % typingCursorBlinkInterval) / typingCursorBlinkInterval;
        const cursorAlpha = blinkProgress < 0.5 ? 1 : 0;
        if (cursorAlpha > 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(typeCursorX, cursorTop, 1.5, cursorHeight);
        }
      }

      ctx.restore();
    }

    ctx.restore();
  },
};

export default animation;
