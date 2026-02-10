import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Meeting Notes Scene 2 – Logo Hub Animation
 *
 * Scene 2: Logo hub showing Granola (center) with connecting lines to other app logos
 *
 * Features:
 * - Logos appear with scale animation (easeOutBack)
 * - Connecting lines draw from center to satellite logos
 * - Staggered timing for visual interest
 * - SVG logos: Granola, OpenAI, GitHub, Cursor, Claude, Figma, Windsurf
 * - Full timing control via params
 */

interface LogoHubParams {
  // Layout
  scale: number;
  // Colors
  backgroundColor: string;
  lineColor: string;
  // Animation
  speed: number;
  // Timing
  centerLogoStartMs: number;
  centerLogoDurationMs: number;
  satelliteStaggerMs: number;
  satelliteLogoDurationMs: number;
  lineRevealDurationMs: number;
  lineRevealDelayMs: number;
  holdWithPowerMs: number;
  attractionDurationMs: number;
  finalHoldMs: number;
}

// SVG data for each logo
const LOGO_SVGS: Record<string, string> = {
  L0: `<svg width="88" height="88" viewBox="0 0 137 137" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="137" height="137" rx="29.7826" fill="#B7C937"/><mask id="mg" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="20" y="20" width="97" height="97"><path d="M116.152 20.8477H20.8477V116.152H116.152V20.8477Z" fill="white"/></mask><g mask="url(#mg)"><path d="M67.9815 115.895C77.8118 115.895 88.1145 113.717 92.2644 110.697C94.9145 108.807 96.2294 108.992 98.5917 106.732C99.2493 106.075 99.5367 105.88 99.7217 105.695C108.699 98.3196 113.897 88.777 113.897 76.3993C113.897 56.2663 99.6294 42.5635 79.219 42.5635C61.2637 42.5635 47.561 53.9962 47.561 68.6439C47.561 81.9666 57.956 91.5092 72.7887 91.5092C73.6413 91.5092 74.0214 91.0366 74.9664 91.0366C78.5617 91.0366 81.4891 89.9992 83.3791 88.0166C84.3241 86.9793 86.1217 84.8942 86.3067 84.8016C87.1591 84.0415 87.344 82.9116 87.5391 82.4392C87.7241 81.9666 88.1041 81.6789 88.2995 81.0216C88.4844 80.2615 88.2068 79.3165 88.2068 78.4743C88.2068 76.9643 88.8644 75.4543 88.8644 74.0366C88.8644 70.0717 84.1391 66.0966 79.8868 66.0966C79.4141 66.0966 79.4141 65.7163 79.1264 65.7163C78.839 65.7163 78.5617 66.004 78.274 66.004C77.9863 66.004 77.6164 65.5316 77.2364 65.5316C76.8564 65.5316 76.6714 65.9117 76.1065 65.9117C74.874 65.9117 74.7814 66.0966 73.8364 66.0966C73.549 66.0966 73.0764 66.1889 72.8914 66.2813C72.5114 66.4662 72.5114 66.7539 72.1314 66.7539C71.6248 66.7539 71.3713 66.8498 71.3713 67.0416C71.3713 68.0789 71.4636 67.894 70.9913 67.894C70.4844 67.894 70.1693 67.925 70.0463 67.9866C69.666 68.1713 69.9537 68.6439 69.5736 68.9316C69.1936 69.1163 69.1013 69.404 69.0087 69.9689C68.9163 70.5339 68.3514 70.729 68.3514 71.294C68.3514 71.5817 68.4437 71.7666 68.4437 71.9516C68.4437 72.5165 67.3137 72.3316 67.3137 72.8966C67.3137 73.2766 67.6014 73.5539 67.6014 73.9339C67.6014 74.2216 67.4165 74.4065 67.4165 74.694C67.4165 74.9817 67.6014 75.1666 67.6014 75.3516C67.6014 75.8239 66.9441 75.9165 66.9441 76.2966C66.9441 76.6766 67.3242 76.9539 67.3242 77.2416C67.3242 77.4265 67.0365 77.529 67.0365 77.8065C67.0365 78.0838 66.9441 77.6216 67.5091 78.4638C67.8891 79.0288 67.8891 79.3165 67.5091 79.7889C67.1291 80.2615 66.3792 80.5489 65.4342 80.5489C61.4692 80.5489 60.9965 76.4815 58.8188 75.8239C58.1615 75.639 58.0588 75.5365 58.0588 75.2589C58.0588 74.9816 58.0588 75.074 58.4388 74.694C58.8188 74.3139 58.9115 74.0366 58.9115 73.7489C58.9115 73.4615 58.9115 73.3689 58.7265 73.184C57.9665 71.9516 57.5966 70.4416 57.5966 68.7467C57.5966 60.0567 68.1765 52.7737 78.202 52.7737C81.2219 52.7737 80.7496 53.534 82.5472 53.534C83.0196 53.534 82.8346 53.534 83.4922 53.4414C85.1973 53.154 88.3096 53.8214 90.7646 55.044C97.5645 58.444 102.012 66.4766 102.012 75.8343C102.012 91.807 87.8372 103.425 68.9369 103.425C58.6342 103.425 51.5465 100.21 44.5513 92.372C43.7912 91.5193 44.9313 92.557 43.6987 90.3897C42.1887 87.7393 42.3736 89.4444 42.3736 89.4444C41.9011 88.8797 41.0485 87.267 40.576 86.702C40.0111 86.0444 39.251 86.137 38.9736 85.757C38.5936 85.2843 39.1585 84.432 38.9736 83.9593C38.7887 83.1993 37.176 82.0693 36.9911 81.5043C36.8062 80.9394 36.1386 77.3443 36.1386 76.6867C36.1386 75.9267 36.7035 75.8343 36.7035 75.3617C36.7035 74.7044 35.851 74.5093 35.3785 73.564C34.9059 72.619 34.6183 70.4416 34.6183 68.0789C34.6183 66.8462 34.6183 66.3739 34.9984 63.5389C35.0909 62.5939 36.5084 62.5939 36.5084 61.5562C36.5084 61.1762 36.3235 60.7036 36.3235 60.4263C36.3235 60.0463 36.3235 59.9539 36.4159 59.6662C40.3809 43.036 58.1514 30.6583 77.9041 30.6583C84.7041 30.6583 89.9018 31.891 97.9344 35.291C100.584 36.4209 104.457 34.4384 104.457 32.3635C104.642 31.7061 104.272 31.5109 104.169 31.1309C104.077 30.7508 103.697 30.2783 103.317 30.1858C103.132 30.0934 103.029 29.8058 102.844 29.5284C102.557 29.0559 102.279 28.871 101.519 28.6759C101.139 28.5834 100.954 28.491 100.759 28.2958C100.472 27.9157 100.287 27.7309 99.9066 27.5357C99.5266 27.3508 99.2493 27.5357 99.054 27.4432C98.8693 27.3508 98.7666 27.1556 98.5816 27.0632C98.489 26.9707 98.2939 26.9707 98.0166 26.9707C88.4844 21.8656 82.2491 21.1055 73.9392 21.1055C55.9838 21.1055 39.9186 28.8608 29.996 42.3683C29.1434 43.4982 29.6159 45.3883 28.3936 46.5284C26.031 48.7061 23.1035 60.6112 23.1035 68.1713C23.1035 74.4989 24.6135 82.9116 26.596 87.5443C30.4685 96.6142 28.7736 92.8342 29.3386 93.6869C30.4685 95.4843 31.4135 95.6692 31.886 96.2342C31.886 96.2342 32.1736 96.7992 32.1736 97.3642C32.1736 97.7442 32.1736 97.8368 32.2661 98.0215C32.5537 98.5865 33.8685 99.5315 34.2485 99.9115C35.1011 100.764 35.7585 102.562 37.176 103.979C39.3537 106.157 42.4661 107.852 52.3888 112.485C55.8811 114.087 53.8988 113.245 54.2788 113.337C55.1315 113.625 56.2614 113.625 56.9288 114.097C57.3089 114.385 56.8365 114.282 57.8738 114.282C58.0588 114.282 58.0588 114.375 58.2542 114.467C58.4388 114.559 58.6342 114.847 58.9115 114.847C59.0964 114.847 59.1992 114.662 59.4764 114.755C59.7537 114.847 60.4214 115.32 60.9864 115.607C61.4588 115.895 61.5514 115.895 61.7465 115.7C62.3114 115.32 62.6915 115.792 63.2564 115.792C63.4414 115.792 63.7288 115.7 64.2938 115.7C65.0541 115.7 65.0541 115.884 67.9815 115.884" fill="#292929"/></g></svg>`,
  L1: `<svg width="82" height="82" viewBox="0 0 163 163" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M152.813 30.5586C152.813 19.3014 143.695 10.1836 132.438 10.1836H30.563C19.3058 10.1836 10.188 19.3014 10.188 30.5586V132.434C10.188 143.691 19.3058 152.809 30.563 152.809H132.438C143.695 152.809 152.813 143.691 152.813 132.434V30.5586Z" fill="#67A090"/><path fill-rule="evenodd" clip-rule="evenodd" d="M49.9192 47.4435C29.8498 50.2196 22.362 75.8921 34.9436 90.6131C31.9382 99.5017 35.3511 110.759 42.4314 118.501C49.3589 126.066 59.5209 130.192 69.9631 126.04C70.0395 126.677 70.2942 127.314 70.7017 127.874C76.6614 135.693 88.0204 136.992 97.9533 133.146C105.874 130.09 112.674 123.901 114.966 116.005C121.69 114.07 127.319 108.747 130.579 102.049C135.138 92.6251 135.01 80.6803 127.166 72.301C127.421 71.8171 127.624 71.3332 127.777 70.9257C130.4 63.6417 128.694 55.186 124.11 48.4114C118.023 39.4209 107.046 33.4612 95.4064 36.7976C95.1517 36.4665 94.897 36.1609 94.6678 35.8553C88.759 28.1128 77.5273 26.1771 67.6709 29.2079C58.8842 31.9076 51.4473 38.4531 49.8937 47.4181L49.9192 47.4435ZM99.8125 81.5971L99.9908 106.582C99.9908 107.881 99.354 109.103 98.2334 109.817C98.2334 109.817 86.4414 117.432 76.4322 122.831C76.5595 122.958 76.6614 123.086 76.7887 123.239C80.7873 128.485 88.5298 128.587 95.2026 126.015C102.054 123.366 108.115 117.712 108.115 110.275V86.8946L99.7615 81.5717L99.8125 81.5971ZM41.54 96.1398C40.9287 101.972 43.7048 108.543 48.0854 113.331C53.1792 118.883 60.7434 122.143 68.435 118.374C76.5595 114.426 88.0204 107.27 92.3501 104.519L92.2992 96.9803L69.4537 109.46C68.3586 110.046 67.0597 110.097 65.9645 109.536C65.9645 109.536 51.3454 102.456 41.54 96.0889V96.1398ZM114.049 81.5717C115.145 82.2848 115.807 83.4818 115.807 84.8062V107.473C119.194 105.614 121.945 102.431 123.728 98.7376C127.497 90.9442 127.064 80.6548 118.43 74.8479C111.146 69.9324 101.723 64.3293 97.775 62.0117L89.9561 66.2904L114.024 81.5971L114.049 81.5717ZM49.6645 55.237C34.969 58.497 31.1742 79.9162 44.4943 88.9067C51.9567 93.9495 63.2393 99.6799 67.5436 101.819L75.5153 97.4642L51.4473 82.132C50.3522 81.4443 49.69 80.2218 49.69 78.9229V55.237H49.6645ZM82.3154 70.4418C82.3154 70.4418 73.4014 75.3064 73.325 75.3573V87.0475L83.1559 93.3128C83.1559 93.3128 92.1209 88.4228 92.2483 88.3718L92.1718 76.7326L82.3409 70.4673L82.3154 70.4418ZM88.1987 39.9557C84.0219 35.1421 76.5086 34.5309 69.9886 36.5429C63.2648 38.6059 57.3051 43.6232 57.3051 50.9328V76.86L65.6589 82.1829L65.4551 54.6257C65.4551 53.2504 66.1683 51.977 67.3653 51.2893C67.3653 51.2893 78.3423 44.9476 88.1987 39.9557ZM120.977 67.3346C122.276 62.521 120.824 57.1471 117.844 52.741C112.98 45.5843 103.862 40.8217 94.4895 45.3806C86.6197 49.2264 77.1198 54.5493 73.1212 56.816L73.1976 66.7489L96.0431 54.2692C97.2147 53.6324 98.6409 53.6579 99.787 54.3201C99.787 54.3201 111.554 61.1203 121.002 67.3346H120.977Z" fill="white"/></svg>`,
  L2: `<svg width="68" height="68" viewBox="0 0 117 117" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M109.688 21.9336C109.688 13.8533 103.143 7.30859 95.0625 7.30859H21.9375C13.8572 7.30859 7.3125 13.8533 7.3125 21.9336V95.0586C7.3125 103.139 13.8572 109.684 21.9375 109.684H95.0625C103.143 109.684 109.688 103.139 109.688 95.0586V21.9336Z" fill="#00020C"/><path fill-rule="evenodd" clip-rule="evenodd" d="M48.8655 87.142C48.8655 89.153 48.8472 91.3467 48.8472 93.3577C48.8472 93.833 48.6096 94.29 48.2256 94.5825C47.8417 94.875 47.3299 94.9481 46.8728 94.8202C31.5166 89.8842 20.3833 75.4786 20.3833 58.4953C20.3833 37.4536 37.458 20.3789 58.4997 20.3789C79.5414 20.3789 96.6161 37.4536 96.6161 58.4953C96.6161 75.4603 85.5011 89.8477 70.1814 94.7836C69.7244 94.9298 69.2125 94.8384 68.8286 94.5459C68.4447 94.2534 68.2071 93.8147 68.2071 93.3211C68.1705 88.8422 68.1522 83.5589 68.1522 81.1641C68.1522 78.7692 65.8122 76.7948 65.8122 76.7948C65.8122 76.7948 83.088 74.6742 83.088 59.7202C83.088 50.2322 79.3221 47.033 79.3221 47.033C80.1264 43.6327 80.0167 40.3969 79.1392 37.3256C79.0113 36.8869 78.5725 36.5944 78.1155 36.6309C74.441 36.96 71.0772 38.2945 68.0242 40.7259C68.0242 40.7259 62.6313 39.2452 58.518 39.2452C54.4047 39.2452 49.0117 40.7259 49.0117 40.7259C45.9588 38.3128 42.5767 36.96 38.9205 36.6309C38.4635 36.5944 38.0247 36.8869 37.8967 37.3256C37.0192 40.3969 36.9096 43.6327 37.6956 47.033C37.6956 47.033 33.948 50.2322 33.948 59.7202C33.948 74.6742 51.2238 76.7948 51.2238 76.7948C51.2238 76.7948 48.8838 78.7692 48.8838 81.1641V81.7125C47.5675 82.1878 45.776 82.6266 43.765 82.4986C38.2989 82.133 37.5677 76.2464 35.3191 75.2958C33.6738 74.6011 32.065 74.5097 30.8402 74.6194C30.4746 74.6559 30.1821 74.9119 30.0906 75.2592C29.9992 75.6066 30.1272 75.9722 30.4197 76.1916C31.9005 77.197 33.8749 78.623 34.4233 79.665C35.9041 82.4438 38.1892 86.8495 41.1325 87.3248C44.7156 87.9098 47.275 87.5625 48.9021 87.1055L48.8655 87.142Z" fill="white"/></svg>`,
  L3: `<svg width="72" height="72" viewBox="0 0 119 119" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#cc)"><mask id="mc0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="119" height="119"><path d="M0 0H119V119H0V0Z" fill="white"/></mask><g mask="url(#mc0)"><path d="M90.6445 0H28.3555C12.6952 0 0 12.6952 0 28.3555V90.6445C0 106.305 12.6952 119 28.3555 119H90.6445C106.305 119 119 106.305 119 90.6445V28.3555C119 12.6952 106.305 0 90.6445 0Z" fill="black"/><mask id="mc1" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="19" y="20" width="81" height="79"><path d="M19.7559 20.6875H99.4766V98.3164H19.7559V20.6875Z" fill="white"/></mask><g mask="url(#mc1)"><mask id="mc2" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="19" y="20" width="81" height="79"><path d="M19.7559 20.6875H99.4766V98.3164H19.7559V20.6875Z" fill="white"/></mask><g mask="url(#mc2)"><path d="M59.3668 98.3145L93.9956 78.9072L59.3668 59.5L24.7383 78.9072L59.3668 98.3145Z" fill="url(#pc0)"/><path d="M93.9955 78.9092V40.0947L59.3667 20.6875V59.502L93.9955 78.9092Z" fill="url(#pc1)"/><path d="M59.3668 20.6875L24.7383 40.0947V78.9092L59.3668 59.502V20.6875Z" fill="url(#pc2)"/><path d="M93.9955 40.0938L59.3667 98.3154V59.501L93.9955 40.0938Z" fill="#E4E4E4"/><path d="M93.9956 40.0938L59.3668 59.501L24.7383 40.0938H93.9956Z" fill="white"/></g></g></g></g><defs><linearGradient id="pc0" x1="59.3668" y1="59.5" x2="59.3668" y2="98.3145" gradientUnits="userSpaceOnUse"><stop offset="0.16" stop-color="white" stop-opacity="0.39"/><stop offset="0.658" stop-color="white" stop-opacity="0.8"/></linearGradient><linearGradient id="pc1" x1="93.9955" y1="40.2144" x2="59.8441" y2="60.7796" gradientUnits="userSpaceOnUse"><stop offset="0.182" stop-color="white" stop-opacity="0.31"/><stop offset="0.715" stop-color="white" stop-opacity="0"/></linearGradient><linearGradient id="pc2" x1="59.3668" y1="20.6875" x2="26.0989" y2="79.6766" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="0.6"/><stop offset="0.667" stop-color="white" stop-opacity="0.22"/></linearGradient><clipPath id="cc"><rect width="119" height="119" fill="white"/></clipPath></defs></svg>`,
  L4: `<svg width="92" height="92" viewBox="0 0 206 206" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#ccl)"><path fill-rule="evenodd" clip-rule="evenodd" d="M46.5158 0H159.484C185.068 0 206 20.9323 206 46.5158V158.534C206 184.118 185.068 205.05 159.484 205.05H46.5158C20.9323 205.05 0 184.118 0 158.534V46.5158C0 20.9323 20.9323 0 46.5158 0Z" fill="#D77655"/><path d="M57.2414 127.391L86.876 110.763L87.3741 109.319L86.876 108.516L85.432 108.516L80.4792 108.211L63.5469 107.753L48.8622 107.143L34.6349 106.38L31.0553 105.617L27.6997 101.194L28.0453 98.9872L31.0557 96.9634L35.3676 97.3396L44.8963 97.9902L59.1944 98.9767L69.5676 99.5871L84.9343 101.184H87.3741L87.7201 100.197L86.8861 99.5871L86.2351 98.9767L71.4385 88.9495L55.4212 78.3526L47.0315 72.2506L42.4959 69.1594L40.2078 66.2609L39.2216 59.9357L43.3404 55.4001L48.8726 55.7763L50.2861 56.1529L55.8899 60.4644L67.8592 69.7291L83.4895 81.241L85.7776 83.1429L86.693 82.4923L86.8048 82.0344L85.7776 80.316L77.2761 64.9493L68.2049 49.3191L64.1673 42.8409L63.0995 38.9563C62.7233 37.3598 62.4489 36.0176 62.4489 34.38L67.137 28.0137L69.7301 27.1797L75.9846 28.0137L78.6187 30.3019L82.5034 39.1905L88.7984 53.184L98.5613 72.2112L101.419 77.8553L102.944 83.0825L103.514 84.679L104.499 84.6786V83.7633L105.303 73.0445L106.788 59.885L108.232 42.9528L108.73 38.1834L111.089 32.4677L115.777 29.3765L119.438 31.1259L122.448 35.4374L122.032 38.224L120.242 49.8578L116.733 68.0816L114.445 80.285H115.778L117.304 78.7598L123.476 70.5632L133.85 57.5969L138.426 52.4513L143.765 46.7666L147.192 44.0612L153.67 44.0608L158.439 51.1489L156.304 58.4712L149.632 66.9321L144.1 74.1014L136.168 84.7796L131.215 93.3218L131.673 94.0034L132.853 93.8915L150.771 90.0777L160.453 88.3287L172.006 86.3459L177.233 88.7866L177.802 91.2678L175.748 96.3426L163.392 99.3936L148.901 102.292L127.32 107.397L127.056 107.591L127.361 107.967L137.083 108.882L141.242 109.106H151.422L170.378 110.52L175.33 113.794L178.3 117.801L177.802 120.852L170.175 124.737L159.883 122.296L135.863 116.581L127.625 114.527L126.486 114.526V115.208L133.351 121.92L145.93 133.279L161.683 147.923L162.486 151.544L160.463 154.401L158.327 154.096L144.486 143.682L139.147 138.995L127.056 128.815L126.253 128.814V129.882L129.039 133.96L143.755 156.079L144.517 162.862L143.45 165.069L139.636 166.401L135.446 165.639L126.832 153.547L117.944 139.93L110.774 127.726L109.9 128.224L105.67 173.794L103.686 176.123L99.1101 177.872L95.2967 174.974L93.2729 170.286L95.2967 161.021L97.7373 148.93L99.72 139.319L101.51 127.38L102.578 123.414L102.507 123.15L101.632 123.261L92.632 135.617L78.9438 154.116L68.1131 165.709L65.52 166.737L61.0246 164.407L61.4419 160.248L63.9537 156.547L78.9438 137.479L87.9845 125.662L93.8217 118.838L93.781 117.851H93.4354L53.6219 143.702L46.5334 144.618L43.4824 141.76L43.859 137.072L45.3031 135.547L57.2724 127.309L57.2317 127.35L57.2414 127.391Z" fill="#FCF2EE"/></g><defs><clipPath id="ccl"><rect width="206" height="205.05" fill="white"/></clipPath></defs></svg>`,
  L5: `<svg width="78" height="78" viewBox="0 0 185 185" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M173.438 34.6836C173.438 21.907 163.09 11.5586 150.313 11.5586H34.688C21.9114 11.5586 11.563 21.907 11.563 34.6836V150.309C11.563 163.085 21.9114 173.434 34.688 173.434H150.313C163.09 173.434 173.438 163.085 173.438 150.309V34.6836Z" fill="#161616"/><path fill-rule="evenodd" clip-rule="evenodd" d="M112.763 72.293C123.95 72.293 133.027 81.3695 133.027 92.5563C133.027 103.743 123.95 112.82 112.763 112.82C101.577 112.82 92.5 103.743 92.5 92.5563C92.5 81.3695 101.577 72.293 112.763 72.293Z" fill="#0CC2FF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M132.969 52.0273C132.969 40.8406 123.921 31.793 112.735 31.793H72.208C61.0213 31.793 51.9736 40.8406 51.9736 52.0273C51.9736 63.2141 61.0213 72.2617 72.208 72.2617H112.735C123.921 72.2617 132.969 63.2141 132.969 52.0273Z" fill="#FF7568"/><path fill-rule="evenodd" clip-rule="evenodd" d="M92.4713 72.293H72.208C66.8314 72.293 61.6861 74.432 57.8994 78.2187C54.1127 82.0055 51.9736 87.1508 51.9736 92.5273C51.9736 97.9039 54.1127 103.049 57.8994 106.836C61.6861 110.623 66.8314 112.762 72.208 112.762H92.4713V72.293Z" fill="#AF5BFF"/><path fill-rule="evenodd" clip-rule="evenodd" d="M92.4713 31.793H72.208C66.8314 31.793 61.6861 33.932 57.8994 37.7188C54.1127 41.5055 51.9736 46.6508 51.9736 52.0273C51.9736 57.4039 54.1127 62.5492 57.8994 66.3359C61.6861 70.1227 66.8314 72.2617 72.208 72.2617H92.4713V31.793Z" fill="#FF4611"/><path fill-rule="evenodd" clip-rule="evenodd" d="M92.5001 112.707H72.2368C66.8603 112.707 61.7149 114.846 57.9282 118.633C54.1415 122.42 52.0024 127.565 52.0024 132.941C52.0024 138.318 54.1415 143.463 57.9282 147.25C61.7149 151.037 66.8603 153.176 72.2368 153.176C77.6134 153.176 82.7587 151.037 86.5454 147.25C90.3321 143.463 92.4712 138.318 92.4712 132.941V112.707H92.5001Z" fill="#00E681"/></svg>`,
  L6: `<svg width="72" height="72" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="110" height="110" rx="12.8906" fill="#FBF5EB"/><mask id="mw0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="12" y="12" width="86" height="86"><path d="M12.8906 12.8906H97.1094V97.1094H12.8906V12.8906Z" fill="white"/></mask><g mask="url(#mw0)"><mask id="mw1" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="12" y="12" width="86" height="86"><path d="M12.8906 12.8906H97.1094V97.1094H12.8906V12.8906Z" fill="white"/></mask><g mask="url(#mw1)"><path fill-rule="evenodd" clip-rule="evenodd" d="M96.3374 30.4515H95.5374C94.0186 30.4563 92.5354 30.9116 91.2755 31.7599C90.0157 32.6081 89.0359 33.8111 88.4602 35.2166C88.0779 36.1497 87.8833 37.1491 87.8874 38.1575V55.3942C87.8874 58.8332 85.0661 61.6229 81.7113 61.6229C80.6967 61.6142 79.6988 61.3635 78.8004 60.8917C77.9021 60.4199 77.1292 59.7407 76.546 58.9103L59.0986 33.7711C58.3894 32.7422 57.4407 31.9012 56.3342 31.3205C55.2278 30.7398 53.9967 30.4368 52.7472 30.4375C48.7678 30.4375 45.1885 33.8484 45.1885 38.0628V55.3978C45.1885 58.8367 42.3917 61.6264 39.0124 61.6264C37.0122 61.6264 35.0262 60.6123 33.8471 58.914L14.3223 30.7813C13.8802 30.1496 12.8906 30.462 12.8906 31.2376V46.2706C12.8906 47.0286 13.1222 47.7655 13.5502 48.3901L32.7628 76.0735C33.8998 77.7087 35.57 78.9228 37.5036 79.365C42.3356 80.474 46.7852 76.7192 46.7852 71.9363V54.6152C46.7852 51.1764 49.5468 48.3866 52.9612 48.3866H52.9682C55.0245 48.3866 56.951 49.3972 58.1337 51.0991L75.581 76.2349C76.2799 77.274 77.2264 78.1228 78.3352 78.7048C79.444 79.2868 80.6802 79.5836 81.9324 79.5686C85.996 79.5686 89.4805 76.1541 89.4805 71.9432V54.6117C89.4805 51.1728 92.2423 48.383 95.6566 48.383H96.3374C96.7654 48.383 97.1094 48.0321 97.1094 47.604V31.2271C97.11 31.1252 97.0904 31.0242 97.0519 30.9299C97.0133 30.8356 96.9565 30.7499 96.8847 30.6777C96.8131 30.6053 96.7279 30.5477 96.6339 30.5083C96.54 30.4689 96.4393 30.4484 96.3374 30.448V30.4515Z" fill="black"/></g></g></svg>`,
};

// Initial positions (relative to center) - spread out
const LOGO_POSITIONS_INITIAL: Record<string, { x: number; y: number }> = {
  L0: { x: 0, y: 0 },           // Center: Granola (stays here)
  L1: { x: -145, y: -175 },     // OpenAI (upper-left)
  L2: { x: 115, y: -160 },      // GitHub (upper-right)
  L3: { x: 320, y: -10 },       // Cursor (far right)
  L4: { x: 140, y: 175 },       // Claude (bottom-right)
  L5: { x: -130, y: 180 },      // Figma (bottom-left)
  L6: { x: -290, y: -15 },      // Windsurf (far left)
};

// Final positions - deterministic, near center
const LOGO_POSITIONS_FINAL: Record<string, { x: number; y: number }> = {
  L0: { x: 0, y: 0 },
  L1: { x: -18, y: 12 },
  L2: { x: 15, y: -20 },
  L3: { x: 22, y: 8 },
  L4: { x: -12, y: -15 },
  L5: { x: 18, y: 18 },
  L6: { x: -10, y: -22 },
};

// Satellite logo IDs (all except center L0)
const SATELLITE_IDS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const;

// Easing functions
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Custom cubic-bezier easing: cubic-bezier(1, -0.002, 0, 1.003) - for attraction animation
function cubicBezierEasing(t: number): number {
  const x1 = 1, y1 = -0.002, x2 = 0, y2 = 1.003;
  let tGuess = t;
  for (let i = 0; i < 8; i++) {
    const mt = 1 - tGuess;
    const x = 3 * mt * mt * tGuess * x1 + 3 * mt * tGuess * tGuess * x2 + tGuess * tGuess * tGuess;
    const dx = 3 * mt * mt * x1 + 6 * mt * tGuess * (x2 - x1) + 3 * tGuess * tGuess * (1 - x2);
    const error = x - t;
    if (Math.abs(error) < 0.0001) break;
    tGuess = Math.max(0, Math.min(1, tGuess - error / dx));
  }
  const mt = 1 - tGuess;
  return 3 * mt * mt * tGuess * y1 + 3 * mt * tGuess * tGuess * y2 + tGuess * tGuess * tGuess;
}

// Custom cubic-bezier easing: cubic-bezier(0.25, 0.1, 0.25, 1) - for Granola logo animation
function cubicBezierGranolaEasing(t: number): number {
  const x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1;
  let tGuess = t;
  for (let i = 0; i < 8; i++) {
    const mt = 1 - tGuess;
    const x = 3 * mt * mt * tGuess * x1 + 3 * mt * tGuess * tGuess * x2 + tGuess * tGuess * tGuess;
    const dx = 3 * mt * mt * x1 + 6 * mt * tGuess * (x2 - x1) + 3 * tGuess * tGuess * (1 - x2);
    const error = x - t;
    if (Math.abs(error) < 0.0001) break;
    tGuess = Math.max(0, Math.min(1, tGuess - error / dx));
  }
  const mt = 1 - tGuess;
  return 3 * mt * mt * tGuess * y1 + 3 * mt * tGuess * tGuess * y2 + tGuess * tGuess * tGuess;
}

// Dotted line animation settings
const DOT_LINE_DASH_LENGTH = 8;
const DOT_LINE_GAP_LENGTH = 6;
const DOT_LINE_OFFSET_SPEED = 0.02;

// Cache SVG images
const svgImages: Map<string, HTMLImageElement> = new Map();
let imagesLoaded = false;

function loadSVGImages(): void {
  if (imagesLoaded) return;
  Object.keys(LOGO_SVGS).forEach((id) => {
    const img = new Image();
    const blob = new Blob([LOGO_SVGS[id]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      svgImages.set(id, img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  });
  imagesLoaded = true;
}

// Default timing values (used for durationMs and defaults)
const DEFAULT_TIMING = {
  centerLogoStartMs: 200,
  centerLogoDurationMs: 600,
  satelliteStaggerMs: 300,
  satelliteLogoDurationMs: 500,
  lineRevealDurationMs: 400,
  lineRevealDelayMs: 50,
  holdWithPowerMs: 3500,
  attractionDurationMs: 1200,
  finalHoldMs: 1000,
};

function computeTotalDuration(t: typeof DEFAULT_TIMING): number {
  const lastSatelliteStart =
    t.centerLogoStartMs +
    t.centerLogoDurationMs +
    t.satelliteStaggerMs * 6;
  const logoRevealEnd = lastSatelliteStart + t.satelliteLogoDurationMs;
  return logoRevealEnd + t.holdWithPowerMs + t.attractionDurationMs + t.finalHoldMs;
}

const DEFAULT_TOTAL_MS = computeTotalDuration(DEFAULT_TIMING);

const animation: AnimationDefinition<LogoHubParams> = {
  id: 'meeting-notes-scene2',
  name: 'Meeting Notes Scene 2',
  fps: 60,
  durationMs: DEFAULT_TOTAL_MS,
  width: 1280,
  height: 720,
  background: '#f5f3f0',

  params: {
    defaults: {
      scale: 1,
      backgroundColor: '#f5f3f0',
      lineColor: 'rgba(55, 55, 55, 0.28)',
      speed: 1.4,
      centerLogoStartMs: 200,
      centerLogoDurationMs: 300,
      satelliteStaggerMs: 100,
      satelliteLogoDurationMs: 150,
      lineRevealDurationMs: 250,
      lineRevealDelayMs: 0,
      holdWithPowerMs: 0,
      attractionDurationMs: 500,
      finalHoldMs: 400,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#f5f3f0', label: 'Background' }),
        lineColor: color({ value: 'rgba(55, 55, 55, 0.28)', label: 'Line Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
      ...folder('Timing', {
        centerLogoStartMs: number({
          value: 200,
          min: 0,
          max: 2000,
          step: 50,
          label: 'Center logo start (ms)',
        }),
        centerLogoDurationMs: number({
          value: 600,
          min: 100,
          max: 2000,
          step: 50,
          label: 'Center logo duration (ms)',
        }),
        satelliteStaggerMs: number({
          value: 300,
          min: 0,
          max: 1000,
          step: 50,
          label: 'Satellite stagger (ms)',
        }),
        satelliteLogoDurationMs: number({
          value: 500,
          min: 100,
          max: 1500,
          step: 50,
          label: 'Satellite logo duration (ms)',
        }),
        lineRevealDurationMs: number({
          value: 400,
          min: 100,
          max: 1000,
          step: 50,
          label: 'Line draw duration (ms)',
        }),
        lineRevealDelayMs: number({
          value: 50,
          min: 0,
          max: 300,
          step: 25,
          label: 'Line delay after logo (ms)',
        }),
        holdWithPowerMs: number({
          value: 3500,
          min: 0,
          max: 8000,
          step: 100,
          label: 'Hold with lines (ms)',
        }),
        attractionDurationMs: number({
          value: 1200,
          min: 200,
          max: 3000,
          step: 50,
          label: 'Attraction duration (ms)',
        }),
        finalHoldMs: number({
          value: 1000,
          min: 0,
          max: 3000,
          step: 100,
          label: 'Final hold (ms)',
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
      lineColor,
      speed,
      centerLogoStartMs,
      centerLogoDurationMs,
      satelliteStaggerMs,
      satelliteLogoDurationMs,
      lineRevealDurationMs,
      lineRevealDelayMs,
      holdWithPowerMs,
      attractionDurationMs,
      finalHoldMs,
    } = params;

    // Build logo timeline from params
    const logoTimeline: Array<[string, number, number]> = [
      ['L0', centerLogoStartMs, centerLogoDurationMs],
    ];
    const satelliteStart = centerLogoStartMs + centerLogoDurationMs;
    SATELLITE_IDS.forEach((id, i) => {
      logoTimeline.push([
        id,
        satelliteStart + satelliteStaggerMs * i,
        satelliteLogoDurationMs,
      ]);
    });

    const logoRevealEnd =
      satelliteStart + satelliteStaggerMs * 6 + satelliteLogoDurationMs;
    const attractionStart = logoRevealEnd + holdWithPowerMs;
    const totalDuration =
      logoRevealEnd + holdWithPowerMs + attractionDurationMs + finalHoldMs;

    // Convert progress to elapsed time in ms
    let elapsed = progress * totalDuration * speed;
    if (elapsed >= totalDuration) {
      elapsed = totalDuration - 1;
    }

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const isRevealPhase = elapsed < logoRevealEnd;
    const isHoldPhase =
      elapsed >= logoRevealEnd && elapsed < attractionStart;
    const isAttractionPhase =
      elapsed >= attractionStart &&
      elapsed < attractionStart + attractionDurationMs;
    const isFinalHoldPhase =
      elapsed >= attractionStart + attractionDurationMs;

    const getLogoPosition = (id: string) => {
      if (isAttractionPhase || isFinalHoldPhase) {
        const attractionProgress = isAttractionPhase
          ? Math.min(
              1,
              (elapsed - attractionStart) / attractionDurationMs
            )
          : 1;
        const eased = cubicBezierEasing(attractionProgress);
        const initial = LOGO_POSITIONS_INITIAL[id];
        const final = LOGO_POSITIONS_FINAL[id];
        return {
          x: initial.x + (final.x - initial.x) * eased,
          y: initial.y + (final.y - initial.y) * eased,
        };
      }
      return LOGO_POSITIONS_INITIAL[id];
    };

    const lineColorMatch = lineColor.match(/rgba?\(([^)]+)\)/);
    const lineRgba = lineColorMatch
      ? lineColorMatch[1].split(',').map((s) => s.trim())
      : ['55', '55', '55', '0.28'];

    const lineTimeline = logoTimeline.slice(1).map(([id, start, _dur]) => ({
      id,
      start: start + lineRevealDelayMs,
      duration: lineRevealDurationMs,
    }));

    lineTimeline.forEach((lt) => {
      const t = Math.max(0, Math.min(1, (elapsed - lt.start) / lt.duration));
      if (t <= 0 && !isHoldPhase && !isAttractionPhase && !isFinalHoldPhase)
        return;

      const logoPos = getLogoPosition(lt.id);
      const dx = logoPos.x;
      const dy = logoPos.y;
      const lineProgress = isRevealPhase ? easeOutCubic(t) : 1;

      ctx.save();
      ctx.setLineDash([DOT_LINE_DASH_LENGTH, DOT_LINE_GAP_LENGTH]);
      ctx.lineDashOffset =
        -(elapsed * DOT_LINE_OFFSET_SPEED) %
        (DOT_LINE_DASH_LENGTH + DOT_LINE_GAP_LENGTH);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx * lineProgress, dy * lineProgress);

      const alpha =
        parseFloat(lineRgba[3] || '0.28') *
        (isRevealPhase ? Math.min(t / 0.4, 1) : 1);
      ctx.strokeStyle = `rgba(${lineRgba[0]}, ${lineRgba[1]}, ${lineRgba[2]}, ${alpha})`;
      ctx.lineWidth = 1.15;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    });

    const logosToDraw = logoTimeline.filter(([id]) => id !== 'L0');
    const granolaLogo = logoTimeline.find(([id]) => id === 'L0');

    logosToDraw.forEach(([id, start, dur]) => {
      const t = Math.max(0, Math.min(1, (elapsed - start) / dur));
      if (t <= 0 && !isHoldPhase && !isAttractionPhase && !isFinalHoldPhase)
        return;

      const logoScale = isRevealPhase ? easeOutBack(t) : 1;
      const opacity = isRevealPhase ? Math.min(t / 0.25, 1) : 1;
      const logoPos = getLogoPosition(id);

      const img = svgImages.get(id);
      if (img && img.width > 0 && img.height > 0) {
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(logoPos.x, logoPos.y);
        ctx.scale(logoScale, logoScale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();
      }
    });

    if (granolaLogo) {
      const [id, start, dur] = granolaLogo;
      const t = Math.max(0, Math.min(1, (elapsed - start) / dur));
      if (t > 0 || isHoldPhase || isAttractionPhase || isFinalHoldPhase) {
        let logoScale = 1;
        if (isRevealPhase && t > 0) {
          const eased = cubicBezierGranolaEasing(t);
          logoScale = 1.5 - 0.5 * eased;
        }
        const logoPos = getLogoPosition(id);

        const img = svgImages.get(id);
        if (img && img.width > 0 && img.height > 0) {
          ctx.save();
          ctx.translate(logoPos.x, logoPos.y);
          ctx.scale(logoScale, logoScale);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();
        }
      }
    }

    ctx.restore();
  },
};

export default animation;
