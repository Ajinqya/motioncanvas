import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Clueso Logo Animation
 * Ease-out reveal animation for logo with puzzle icon and text
 */

interface CluesoLogoParams {
  // Layout
  scale: number;
  
  // Colors
  gradientStart: string;
  gradientEnd: string;
  textColor: string;
  backgroundColor: string;
  
  // Timing
  staggerDelay: number;
  animationDuration: number;
  
  // Effects
  scaleFrom: number;
}

// Ease-out cubic function: starts fast, ends slow
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Clamp value between 0 and 1
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

const animation: AnimationDefinition<CluesoLogoParams> = {
  id: 'clueso-logo',
  name: 'Clueso Logo',
  fps: 60,
  durationMs: 2500,
  width: 800,    // 16:9 aspect ratio
  height: 450,
  background: '#FFFFFF',

  params: {
    defaults: {
      scale: 0.5,
      gradientStart: '#FE89EB',
      gradientEnd: '#C12EAF',
      textColor: '#ebebeb',
      backgroundColor: '#0f0f0f',
      staggerDelay: 0.08,
      animationDuration: 0.4,
      scaleFrom: 0.8,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1.2, min: 0.5, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        gradientStart: color({ value: '#FE89EB', label: 'Gradient Start' }),
        gradientEnd: color({ value: '#C12EAF', label: 'Gradient End' }),
        textColor: color({ value: '#171717', label: 'Text Color' }),
        backgroundColor: color({ value: '#FFFFFF', label: 'Background' }),
      }),
      ...folder('Animation', {
        staggerDelay: number({ value: 0.08, min: 0, max: 0.3, step: 0.01, label: 'Stagger Delay' }),
        animationDuration: number({ value: 0.6, min: 0.2, max: 2, step: 0.1, label: 'Duration' }),
        scaleFrom: number({ value: 0.5, min: 0, max: 1, step: 0.1, label: 'Scale From' }),
      }),
    },
  },

  render({ ctx, time, width, height, params }) {
    const {
      scale,
      gradientStart,
      gradientEnd,
      textColor,
      backgroundColor,
      staggerDelay,
      animationDuration,
      scaleFrom,
    } = params;

    // Clear with background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center the entire logo on canvas
    const logoWidth = 524;
    const logoHeight = 100;
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-logoWidth / 2, -logoHeight / 2);

    // Create gradient for puzzle icon
    const gradient = ctx.createLinearGradient(108, -8, -14.5, 114.5);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);

    // Helper to calculate animation progress for each element
    const getProgress = (index: number): number => {
      const startTime = index * staggerDelay;
      const elapsed = time - startTime;
      const rawProgress = elapsed / animationDuration;
      return easeOutCubic(clamp01(rawProgress));
    };

    // Helper to draw with animation transform
    const drawAnimated = (
      index: number,
      originX: number,
      originY: number,
      drawFn: () => void
    ) => {
      const progress = getProgress(index);
      const elementScale = scaleFrom + (1 - scaleFrom) * progress;
      const opacity = progress;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(originX, originY);
      ctx.scale(elementScale, elementScale);
      ctx.translate(-originX, -originY);
      drawFn();
      ctx.restore();
    };

    // ===== PUZZLE ICON PATHS =====
    
    // Main puzzle piece (index 0)
    drawAnimated(0, 50, 50, () => {
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(16.5858, 0.5858);
      ctx.lineTo(99.4142, 83.4142);
      ctx.bezierCurveTo(99.7893, 83.7893, 100, 84.298, 100, 84.8284);
      ctx.lineTo(100, 97);
      ctx.bezierCurveTo(100, 98.6569, 98.6569, 100, 97, 100);
      ctx.lineTo(70, 100);
      ctx.bezierCurveTo(68.8954, 100, 68, 99.1046, 68, 98);
      ctx.lineTo(68, 94);
      ctx.bezierCurveTo(68, 84.0589, 59.9411, 76, 50, 76);
      ctx.bezierCurveTo(40.0589, 76, 32, 84.0589, 32, 94);
      ctx.lineTo(32, 98);
      ctx.bezierCurveTo(32, 99.1046, 31.1046, 100, 30, 100);
      ctx.lineTo(3, 100);
      ctx.bezierCurveTo(1.34315, 100, 0, 98.6569, 0, 97);
      ctx.lineTo(0, 70);
      ctx.bezierCurveTo(0, 68.8954, 0.89543, 68, 2, 68);
      ctx.lineTo(6, 68);
      ctx.bezierCurveTo(15.9411, 68, 24, 59.9411, 24, 50);
      ctx.bezierCurveTo(24, 40.0589, 15.9411, 32, 6, 32);
      ctx.lineTo(2, 32);
      ctx.bezierCurveTo(0.895431, 32, 0, 31.1046, 0, 30);
      ctx.lineTo(0, 3);
      ctx.bezierCurveTo(0, 1.34315, 1.34315, 0, 3, 0);
      ctx.lineTo(15.1716, 0);
      ctx.bezierCurveTo(15.702, 0, 16.2107, 0.210717, 16.5858, 0.5858);
      ctx.closePath();
      ctx.fill();
    });

    // Middle diagonal stripe (index 1)
    drawAnimated(1, 67, 33, () => {
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(52.5858, 0.5858);
      ctx.lineTo(99.4142, 47.4142);
      ctx.bezierCurveTo(99.7893, 47.7893, 100, 48.298, 100, 48.8284);
      ctx.lineTo(100, 65.5858);
      ctx.bezierCurveTo(100, 66.4767, 98.9229, 66.9229, 98.2929, 66.2929);
      ctx.lineTo(33.7071, 1.70711);
      ctx.bezierCurveTo(33.0771, 1.07714, 33.5233, 0, 34.4142, 0);
      ctx.lineTo(51.1716, 0);
      ctx.bezierCurveTo(51.702, 0, 52.2107, 0.210716, 52.5858, 0.5858);
      ctx.closePath();
      ctx.fill();
    });

    // Top right corner triangle (index 2)
    drawAnimated(2, 85, 15, () => {
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(69.7071, 1.70711);
      ctx.lineTo(98.2929, 30.2929);
      ctx.bezierCurveTo(98.9229, 30.9229, 100, 30.4767, 100, 29.5858);
      ctx.lineTo(100, 3);
      ctx.bezierCurveTo(100, 1.34315, 98.6569, 0, 97, 0);
      ctx.lineTo(70.4142, 0);
      ctx.bezierCurveTo(69.5233, 0, 69.0771, 1.07714, 69.7071, 1.70711);
      ctx.closePath();
      ctx.fill();
    });

    // ===== TEXT LETTERS =====
    
    // Letter C (index 3)
    drawAnimated(3, 177, 50, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(152.171, 50.6085);
      ctx.bezierCurveTo(152.171, 53.8986, 152.426, 56.9551, 152.937, 59.778);
      ctx.bezierCurveTo(153.468, 62.601, 154.233, 65.1701, 155.234, 67.4853);
      ctx.bezierCurveTo(156.255, 69.8005, 157.5, 71.8518, 158.97, 73.639);
      ctx.bezierCurveTo(160.44, 75.4058, 162.125, 76.8986, 164.024, 78.1171);
      ctx.bezierCurveTo(165.943, 79.3356, 168.066, 80.2597, 170.394, 80.8893);
      ctx.bezierCurveTo(172.722, 81.4986, 175.233, 81.8032, 177.928, 81.8032);
      ctx.bezierCurveTo(181.195, 81.8032, 184.146, 81.3361, 186.78, 80.4019);
      ctx.bezierCurveTo(189.434, 79.4677, 191.761, 78.0765, 193.762, 76.2284);
      ctx.bezierCurveTo(195.763, 74.3802, 197.438, 72.0853, 198.785, 69.3436);
      ctx.bezierCurveTo(200.153, 66.5816, 201.164, 63.3829, 201.817, 59.7476);
      ctx.lineTo(217.897, 59.7476);
      ctx.bezierCurveTo(217.019, 65.3935, 215.446, 70.4606, 213.18, 74.9489);
      ctx.bezierCurveTo(210.914, 79.4169, 208.055, 83.2147, 204.604, 86.3423);
      ctx.bezierCurveTo(201.174, 89.4699, 197.203, 91.8663, 192.691, 93.5317);
      ctx.bezierCurveTo(188.199, 95.1767, 183.268, 95.9992, 177.898, 95.9992);
      ctx.bezierCurveTo(173.794, 95.9992, 169.894, 95.5016, 166.198, 94.5065);
      ctx.bezierCurveTo(162.523, 93.5317, 159.134, 92.1202, 156.03, 90.2721);
      ctx.bezierCurveTo(152.947, 88.4239, 150.16, 86.1696, 147.669, 83.5092);
      ctx.bezierCurveTo(145.198, 80.8284, 143.095, 77.8125, 141.36, 74.4615);
      ctx.bezierCurveTo(139.624, 71.0902, 138.297, 67.4041, 137.378, 63.4032);
      ctx.bezierCurveTo(136.459, 59.4023, 136, 55.1374, 136, 50.6085);
      ctx.bezierCurveTo(136, 46.0796, 136.459, 41.8147, 137.378, 37.8138);
      ctx.bezierCurveTo(138.297, 33.8129, 139.624, 30.137, 141.36, 26.786);
      ctx.bezierCurveTo(143.095, 23.4147, 145.198, 20.3988, 147.669, 17.7383);
      ctx.bezierCurveTo(150.16, 15.0575, 152.947, 12.793, 156.03, 10.9449);
      ctx.bezierCurveTo(159.134, 9.0968, 162.523, 7.68532, 166.198, 6.71049);
      ctx.bezierCurveTo(169.894, 5.71535, 173.794, 5.21777, 177.898, 5.21777);
      ctx.bezierCurveTo(183.268, 5.21777, 188.199, 6.05044, 192.691, 7.71579);
      ctx.bezierCurveTo(197.203, 9.36082, 201.174, 11.7471, 204.604, 14.8747);
      ctx.bezierCurveTo(208.055, 18.0023, 210.914, 21.8103, 213.18, 26.2986);
      ctx.bezierCurveTo(215.446, 30.7666, 217.019, 35.8235, 217.897, 41.4694);
      ctx.lineTo(201.817, 41.4694);
      ctx.bezierCurveTo(201.164, 37.8341, 200.153, 34.6456, 198.785, 31.9039);
      ctx.bezierCurveTo(197.438, 29.1418, 195.763, 26.8368, 193.762, 24.9886);
      ctx.bezierCurveTo(191.761, 23.1405, 189.434, 21.7493, 186.78, 20.8151);
      ctx.bezierCurveTo(184.146, 19.8809, 181.195, 19.4138, 177.928, 19.4138);
      ctx.bezierCurveTo(175.233, 19.4138, 172.722, 19.7286, 170.394, 20.3582);
      ctx.bezierCurveTo(168.066, 20.9674, 165.943, 21.8813, 164.024, 23.0999);
      ctx.bezierCurveTo(162.125, 24.3184, 160.44, 25.8213, 158.97, 27.6085);
      ctx.bezierCurveTo(157.5, 29.3754, 156.255, 31.4164, 155.234, 33.7317);
      ctx.bezierCurveTo(154.233, 36.0469, 153.468, 38.616, 152.937, 41.439);
      ctx.bezierCurveTo(152.426, 44.2619, 152.171, 47.3184, 152.171, 50.6085);
      ctx.closePath();
      ctx.fill();
    });

    // Letter l (index 4)
    drawAnimated(4, 234, 50, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(241.956, 4);
      ctx.lineTo(241.956, 94.1722);
      ctx.lineTo(226.581, 94.1722);
      ctx.lineTo(226.581, 4);
      ctx.lineTo(241.956, 4);
      ctx.closePath();
      ctx.fill();
    });

    // Letter u (index 5)
    drawAnimated(5, 281, 60, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(297.258, 62.7947);
      ctx.lineTo(297.258, 27);
      ctx.lineTo(312.632, 27);
      ctx.lineTo(312.632, 94.1722);
      ctx.lineTo(297.258, 94.1722);
      ctx.lineTo(297.258, 74.0358);
      ctx.lineTo(297.349, 73.9748);
      ctx.bezierCurveTo(296.594, 77.468, 295.491, 80.5854, 294.042, 83.3272);
      ctx.bezierCurveTo(292.592, 86.0486, 290.826, 88.3536, 288.743, 90.2424);
      ctx.bezierCurveTo(286.661, 92.1108, 284.282, 93.5325, 281.607, 94.5073);
      ctx.bezierCurveTo(278.932, 95.5024, 276.023, 96, 272.878, 96);
      ctx.bezierCurveTo(269.122, 96, 265.783, 95.3196, 262.863, 93.9589);
      ctx.bezierCurveTo(259.944, 92.5779, 257.483, 90.5775, 255.482, 87.9576);
      ctx.bezierCurveTo(253.502, 85.3377, 251.981, 82.1188, 250.919, 78.3007);
      ctx.bezierCurveTo(249.878, 74.4826, 249.357, 70.1466, 249.357, 65.2927);
      ctx.lineTo(249.357, 27);
      ctx.lineTo(264.732, 27);
      ctx.lineTo(264.732, 63.7695);
      ctx.bezierCurveTo(264.732, 66.8971, 265.038, 69.6287, 265.65, 71.9642);
      ctx.bezierCurveTo(266.283, 74.2795, 267.233, 76.219, 268.499, 77.7828);
      ctx.bezierCurveTo(269.785, 79.3466, 271.378, 80.5245, 273.277, 81.3166);
      ctx.bezierCurveTo(275.175, 82.0883, 277.401, 82.4742, 279.953, 82.4742);
      ctx.bezierCurveTo(281.791, 82.4742, 283.486, 82.2812, 285.037, 81.8954);
      ctx.bezierCurveTo(286.589, 81.4892, 288.008, 80.9104, 289.295, 80.1589);
      ctx.bezierCurveTo(290.581, 79.4075, 291.714, 78.4733, 292.694, 77.3563);
      ctx.bezierCurveTo(293.695, 76.2393, 294.532, 74.9497, 295.206, 73.4874);
      ctx.bezierCurveTo(295.879, 72.0252, 296.39, 70.4004, 296.737, 68.6132);
      ctx.bezierCurveTo(297.084, 66.826, 297.258, 64.8865, 297.258, 62.7947);
      ctx.closePath();
      ctx.fill();
    });

    // Letter e (index 6)
    drawAnimated(6, 352, 60, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(333.909, 61.3007);
      ctx.bezierCurveTo(333.909, 64.672, 334.348, 67.7082, 335.226, 70.4093);
      ctx.bezierCurveTo(336.124, 73.0901, 337.4, 75.3749, 339.054, 77.2636);
      ctx.bezierCurveTo(340.708, 79.1524, 342.709, 80.6045, 345.057, 81.6199);
      ctx.bezierCurveTo(347.426, 82.615, 350.08, 83.1126, 353.02, 83.1126);
      ctx.bezierCurveTo(355.021, 83.1126, 356.869, 82.8791, 358.564, 82.412);
      ctx.bezierCurveTo(360.258, 81.9245, 361.79, 81.2036, 363.158, 80.249);
      ctx.bezierCurveTo(364.526, 79.2742, 365.74, 78.076, 366.802, 76.6543);
      ctx.bezierCurveTo(367.639, 75.5175, 368.375, 74.2417, 369.009, 72.827);
      ctx.lineTo(384.025, 72.827);
      ctx.bezierCurveTo(383.125, 76.1574, 381.815, 79.1696, 380.094, 81.8636);
      ctx.bezierCurveTo(378.195, 84.8693, 375.878, 87.4283, 373.142, 89.5404);
      ctx.bezierCurveTo(370.426, 91.6323, 367.333, 93.2265, 363.862, 94.3232);
      ctx.bezierCurveTo(360.391, 95.4402, 356.644, 95.9987, 352.622, 95.9987);
      ctx.bezierCurveTo(347.579, 95.9987, 342.995, 95.1457, 338.87, 93.4398);
      ctx.bezierCurveTo(334.746, 91.7338, 331.203, 89.3272, 328.243, 86.2199);
      ctx.bezierCurveTo(325.282, 83.1126, 322.995, 79.3758, 321.382, 75.0093);
      ctx.bezierCurveTo(319.769, 70.6429, 318.963, 65.8093, 318.963, 60.5086);
      ctx.bezierCurveTo(318.963, 55.2283, 319.759, 50.4252, 321.352, 46.0994);
      ctx.bezierCurveTo(322.965, 41.7532, 325.231, 38.0265, 328.151, 34.9192);
      ctx.bezierCurveTo(331.071, 31.812, 334.572, 29.4155, 338.656, 27.7298);
      ctx.bezierCurveTo(342.74, 26.0239, 347.262, 25.1709, 352.224, 25.1709);
      ctx.bezierCurveTo(357.145, 25.1709, 361.596, 26.0036, 365.577, 27.6689);
      ctx.bezierCurveTo(369.559, 29.3343, 372.958, 31.7003, 375.776, 34.7669);
      ctx.bezierCurveTo(378.614, 37.8133, 380.799, 41.5095, 382.33, 45.8557);
      ctx.bezierCurveTo(383.861, 50.1815, 384.627, 55.015, 384.627, 60.3563);
      ctx.bezierCurveTo(384.627, 61.1484, 384.607, 61.9404, 384.566, 62.7325);
      ctx.bezierCurveTo(384.545, 63.5245, 384.484, 64.3572, 384.382, 65.2305);
      ctx.lineTo(329.529, 65.2305);
      ctx.lineTo(329.529, 54.2636);
      ctx.lineTo(376.633, 54.2636);
      ctx.lineTo(369.651, 65.0782);
      ctx.bezierCurveTo(369.712, 64.3471, 369.753, 63.6058, 369.773, 62.8543);
      ctx.bezierCurveTo(369.814, 62.0826, 369.834, 61.3312, 369.834, 60.6);
      ctx.bezierCurveTo(369.834, 56.9241, 369.446, 53.6848, 368.67, 50.8822);
      ctx.bezierCurveTo(367.915, 48.0592, 366.792, 45.6932, 365.302, 43.7841);
      ctx.bezierCurveTo(363.831, 41.8548, 362.004, 40.4027, 359.819, 39.4279);
      ctx.bezierCurveTo(357.655, 38.4327, 355.154, 37.9351, 352.316, 37.9351);
      ctx.bezierCurveTo(349.437, 37.9351, 346.864, 38.4327, 344.598, 39.4279);
      ctx.bezierCurveTo(342.331, 40.423, 340.402, 41.8751, 338.809, 43.7841);
      ctx.bezierCurveTo(337.237, 45.6729, 336.022, 47.978, 335.165, 50.6994);
      ctx.bezierCurveTo(334.327, 53.4208, 333.909, 56.4875, 333.909, 59.8994);
      ctx.lineTo(333.909, 61.3007);
      ctx.closePath();
      ctx.fill();
    });

    // Letter s (index 7)
    drawAnimated(7, 419, 60, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(419.337, 25.1709);
      ctx.bezierCurveTo(424.115, 25.1709, 428.372, 25.6989, 432.109, 26.755);
      ctx.bezierCurveTo(435.845, 27.8111, 439, 29.3241, 441.572, 31.2941);
      ctx.bezierCurveTo(444.145, 33.2641, 446.095, 35.6605, 447.422, 38.4835);
      ctx.bezierCurveTo(448.77, 41.2861, 449.444, 44.434, 449.444, 47.9272);
      ctx.lineTo(434.345, 47.9272);
      ctx.bezierCurveTo(434.345, 46.2822, 434.028, 44.7996, 433.395, 43.4795);
      ctx.bezierCurveTo(432.762, 42.1594, 431.813, 41.0323, 430.547, 40.0981);
      ctx.bezierCurveTo(429.301, 39.1638, 427.75, 38.4429, 425.892, 37.9351);
      ctx.bezierCurveTo(424.054, 37.4274, 421.93, 37.1735, 419.521, 37.1735);
      ctx.bezierCurveTo(417.398, 37.1735, 415.448, 37.3766, 413.671, 37.7828);
      ctx.bezierCurveTo(411.895, 38.1687, 410.374, 38.7272, 409.108, 39.4583);
      ctx.bezierCurveTo(407.842, 40.1894, 406.862, 41.0627, 406.168, 42.0782);
      ctx.bezierCurveTo(405.474, 43.0936, 405.126, 44.2208, 405.126, 45.4596);
      ctx.bezierCurveTo(405.126, 46.4345, 405.32, 47.2875, 405.708, 48.0186);
      ctx.bezierCurveTo(406.117, 48.7294, 406.668, 49.359, 407.362, 49.9073);
      ctx.bezierCurveTo(408.077, 50.4557, 408.914, 50.9228, 409.874, 51.3086);
      ctx.bezierCurveTo(410.833, 51.6945, 411.864, 52.0398, 412.967, 52.3444);
      ctx.bezierCurveTo(414.09, 52.6287, 415.264, 52.8724, 416.489, 53.0755);
      ctx.bezierCurveTo(417.735, 53.2786, 418.98, 53.4919, 420.225, 53.7153);
      ctx.lineTo(424.728, 54.4464);
      ctx.bezierCurveTo(426.586, 54.751, 428.536, 55.0963, 430.577, 55.4822);
      ctx.bezierCurveTo(432.64, 55.868, 434.661, 56.3758, 436.642, 57.0053);
      ctx.bezierCurveTo(438.643, 57.6146, 440.552, 58.3965, 442.369, 59.351);
      ctx.bezierCurveTo(444.206, 60.2852, 445.809, 61.4632, 447.177, 62.8848);
      ctx.bezierCurveTo(448.566, 64.3064, 449.668, 66.0124, 450.485, 68.0027);
      ctx.bezierCurveTo(451.322, 69.993, 451.741, 72.3285, 451.741, 75.0093);
      ctx.bezierCurveTo(451.741, 78.3603, 451.057, 81.3356, 449.689, 83.9351);
      ctx.bezierCurveTo(448.341, 86.5347, 446.35, 88.7281, 443.716, 90.5153);
      ctx.bezierCurveTo(441.103, 92.3025, 437.867, 93.6632, 434.008, 94.5974);
      ctx.bezierCurveTo(430.149, 95.5316, 425.708, 95.9987, 420.685, 95.9987);
      ctx.bezierCurveTo(415.437, 95.9987, 410.823, 95.4808, 406.842, 94.4451);
      ctx.bezierCurveTo(402.86, 93.4296, 399.532, 91.9369, 396.857, 89.9669);
      ctx.bezierCurveTo(394.203, 87.9766, 392.192, 85.5395, 390.824, 82.6557);
      ctx.bezierCurveTo(389.476, 79.7718, 388.802, 76.4512, 388.802, 72.6941);
      ctx.lineTo(403.901, 72.6941);
      ctx.bezierCurveTo(403.901, 74.5016, 404.238, 76.106, 404.912, 77.5073);
      ctx.bezierCurveTo(405.586, 78.9086, 406.617, 80.0866, 408.005, 81.0411);
      ctx.bezierCurveTo(409.394, 81.9956, 411.129, 82.7166, 413.212, 83.204);
      ctx.bezierCurveTo(415.315, 83.6914, 417.775, 83.9351, 420.593, 83.9351);
      ctx.bezierCurveTo(423.125, 83.9351, 425.381, 83.7422, 427.362, 83.3563);
      ctx.bezierCurveTo(429.342, 82.9705, 431.016, 82.412, 432.384, 81.6808);
      ctx.bezierCurveTo(433.773, 80.9294, 434.824, 80.0256, 435.539, 78.9696);
      ctx.bezierCurveTo(436.274, 77.8932, 436.642, 76.6746, 436.642, 75.3139);
      ctx.bezierCurveTo(436.642, 74.1969, 436.427, 73.2323, 435.998, 72.4199);
      ctx.bezierCurveTo(435.59, 71.6075, 435.018, 70.8967, 434.283, 70.2875);
      ctx.bezierCurveTo(433.548, 69.6782, 432.67, 69.1501, 431.649, 68.7033);
      ctx.bezierCurveTo(430.628, 68.2565, 429.505, 67.8707, 428.28, 67.5457);
      ctx.bezierCurveTo(427.055, 67.2005, 425.749, 66.906, 424.36, 66.6623);
      ctx.bezierCurveTo(422.992, 66.3983, 421.583, 66.1342, 420.134, 65.8702);
      ctx.lineTo(415.601, 65.0782);
      ctx.bezierCurveTo(413.927, 64.7939, 412.13, 64.4689, 410.21, 64.1033);
      ctx.bezierCurveTo(408.291, 63.7378, 406.382, 63.2605, 404.483, 62.6716);
      ctx.bezierCurveTo(402.584, 62.0623, 400.767, 61.3109, 399.032, 60.4173);
      ctx.bezierCurveTo(397.296, 59.5033, 395.755, 58.3864, 394.407, 57.0663);
      ctx.bezierCurveTo(393.08, 55.7259, 392.018, 54.1418, 391.222, 52.3139);
      ctx.bezierCurveTo(390.425, 50.4658, 390.027, 48.2826, 390.027, 45.7643);
      ctx.bezierCurveTo(390.027, 42.6164, 390.701, 39.7731, 392.049, 37.2345);
      ctx.bezierCurveTo(393.396, 34.6958, 395.326, 32.5329, 397.837, 30.7457);
      ctx.bezierCurveTo(400.369, 28.9585, 403.442, 27.5877, 407.056, 26.6332);
      ctx.bezierCurveTo(410.69, 25.6583, 414.784, 25.1709, 419.337, 25.1709);
      ctx.closePath();
      ctx.fill();
    });

    // Letter o (index 8)
    drawAnimated(8, 490, 60, () => {
      ctx.fillStyle = textColor;
      ctx.beginPath();
      ctx.moveTo(456.743, 60.5696);
      ctx.bezierCurveTo(456.743, 57.0155, 457.111, 53.6747, 457.846, 50.5471);
      ctx.bezierCurveTo(458.581, 47.4195, 459.632, 44.5457, 461, 41.9259);
      ctx.bezierCurveTo(462.389, 39.2857, 464.073, 36.9298, 466.054, 34.8583);
      ctx.bezierCurveTo(468.034, 32.7868, 470.27, 31.0402, 472.761, 29.6186);
      ctx.bezierCurveTo(475.252, 28.1766, 477.978, 27.08, 480.938, 26.3285);
      ctx.bezierCurveTo(483.899, 25.5568, 487.043, 25.1709, 490.372, 25.1709);
      ctx.bezierCurveTo(493.7, 25.1709, 496.844, 25.5568, 499.805, 26.3285);
      ctx.bezierCurveTo(502.765, 27.08, 505.491, 28.1766, 507.982, 29.6186);
      ctx.bezierCurveTo(510.473, 31.0402, 512.709, 32.7868, 514.689, 34.8583);
      ctx.bezierCurveTo(516.67, 36.9298, 518.344, 39.2857, 519.712, 41.9259);
      ctx.bezierCurveTo(521.101, 44.5457, 522.162, 47.4195, 522.897, 50.5471);
      ctx.bezierCurveTo(523.632, 53.6747, 524, 57.0155, 524, 60.5696);
      ctx.bezierCurveTo(524, 64.1237, 523.632, 67.4746, 522.897, 70.6225);
      ctx.bezierCurveTo(522.162, 73.7501, 521.101, 76.6239, 519.712, 79.2437);
      ctx.bezierCurveTo(518.344, 81.8636, 516.66, 84.2093, 514.659, 86.2808);
      ctx.bezierCurveTo(512.678, 88.3524, 510.442, 90.1091, 507.951, 91.551);
      ctx.bezierCurveTo(505.481, 92.993, 502.765, 94.0897, 499.805, 94.8411);
      ctx.bezierCurveTo(496.865, 95.6128, 493.72, 95.9987, 490.372, 95.9987);
      ctx.bezierCurveTo(487.043, 95.9987, 483.899, 95.6128, 480.938, 94.8411);
      ctx.bezierCurveTo(477.978, 94.0897, 475.252, 92.993, 472.761, 91.551);
      ctx.bezierCurveTo(470.291, 90.1091, 468.055, 88.3524, 466.054, 86.2808);
      ctx.bezierCurveTo(464.073, 84.2093, 462.389, 81.8636, 461, 79.2437);
      ctx.bezierCurveTo(459.632, 76.6239, 458.581, 73.7501, 457.846, 70.6225);
      ctx.bezierCurveTo(457.111, 67.4746, 456.743, 64.1237, 456.743, 60.5696);
      ctx.closePath();
      ctx.moveTo(472.179, 60.5696);
      ctx.bezierCurveTo(472.179, 64.0018, 472.588, 67.0786, 473.404, 69.8);
      ctx.bezierCurveTo(474.241, 72.5011, 475.446, 74.7961, 477.018, 76.6848);
      ctx.bezierCurveTo(478.59, 78.5532, 480.499, 79.985, 482.745, 80.9802);
      ctx.bezierCurveTo(485.012, 81.9753, 487.564, 82.4729, 490.402, 82.4729);
      ctx.bezierCurveTo(493.24, 82.4729, 495.782, 81.9855, 498.028, 81.0106);
      ctx.bezierCurveTo(500.274, 80.0155, 502.173, 78.5735, 503.725, 76.6848);
      ctx.bezierCurveTo(505.297, 74.7961, 506.492, 72.5011, 507.308, 69.8);
      ctx.bezierCurveTo(508.145, 67.0786, 508.564, 64.0018, 508.564, 60.5696);
      ctx.bezierCurveTo(508.564, 57.1373, 508.145, 54.0707, 507.308, 51.3696);
      ctx.bezierCurveTo(506.492, 48.6482, 505.297, 46.3532, 503.725, 44.4848);
      ctx.bezierCurveTo(502.173, 42.5961, 500.274, 41.1643, 498.028, 40.1894);
      ctx.bezierCurveTo(495.782, 39.1943, 493.24, 38.6967, 490.402, 38.6967);
      ctx.bezierCurveTo(487.564, 38.6967, 485.012, 39.1943, 482.745, 40.1894);
      ctx.bezierCurveTo(480.499, 41.1643, 478.59, 42.5961, 477.018, 44.4848);
      ctx.bezierCurveTo(475.446, 46.3532, 474.241, 48.6482, 473.404, 51.3696);
      ctx.bezierCurveTo(472.588, 54.0707, 472.179, 57.1373, 472.179, 60.5696);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  },
};

export default animation;
