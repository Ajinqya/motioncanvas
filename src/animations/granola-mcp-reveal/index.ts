import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * Granola MCP Reveal Animation
 * Logo and text reveal with slide-up animation
 */

interface GranolaMcpRevealParams {
  // Layout
  scale: number;
  
  // Position
  offsetX: number;
  offsetY: number;
  logoTextSpacing: number;
  textBaselineOffset: number;
  wordSpacing: number;
  
  // Movement distances
  slideUpDistance: number;
  logoMoveAmount: number;
  wordSlideAmount: number;
  
  // Colors
  backgroundColor: string;
  logoColor: string;
  textColor: string;
  
  // Animation
  speed: number;
}

// Easing functions
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Helper to draw the Granola logo using SVG paths
function drawGranolaLogo(ctx: CanvasRenderingContext2D, color: string, scale: number = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  
  // Main spiral path
  ctx.beginPath();
  ctx.moveTo(15.0685, 31.9176);
  ctx.bezierCurveTo(18.3692, 31.9176, 21.8285, 31.1864, 23.2219, 30.1724);
  ctx.bezierCurveTo(24.1117, 29.5378, 24.5532, 29.5999, 25.3464, 28.8411);
  ctx.bezierCurveTo(25.5672, 28.6204, 25.6637, 28.5549, 25.7258, 28.4928);
  ctx.bezierCurveTo(28.7402, 26.0164, 30.4854, 22.8124, 30.4854, 18.6564);
  ctx.bezierCurveTo(30.4854, 11.8964, 25.6948, 7.29547, 18.8417, 7.29547);
  ctx.bezierCurveTo(12.8129, 7.29547, 8.21198, 11.1342, 8.21198, 16.0524);
  ctx.bezierCurveTo(8.21198, 20.5257, 11.7023, 23.7298, 16.6826, 23.7298);
  ctx.bezierCurveTo(16.9689, 23.7298, 17.0965, 23.5711, 17.4138, 23.5711);
  ctx.bezierCurveTo(18.621, 23.5711, 19.6039, 23.2228, 20.2385, 22.5571);
  ctx.bezierCurveTo(20.5558, 22.2088, 21.1594, 21.5086, 21.2215, 21.4776);
  ctx.bezierCurveTo(21.5077, 21.2224, 21.5698, 20.843, 21.6354, 20.6843);
  ctx.bezierCurveTo(21.6974, 20.5257, 21.825, 20.4291, 21.8906, 20.2084);
  ctx.bezierCurveTo(21.9527, 19.9532, 21.8595, 19.6359, 21.8595, 19.353);
  ctx.bezierCurveTo(21.8595, 18.846, 22.0803, 18.3391, 22.0803, 17.8631);
  ctx.bezierCurveTo(22.0803, 16.5318, 20.4937, 15.197, 19.0659, 15.197);
  ctx.bezierCurveTo(18.9072, 15.197, 18.9072, 15.0694, 18.8107, 15.0694);
  ctx.bezierCurveTo(18.7141, 15.0694, 18.621, 15.166, 18.5244, 15.166);
  ctx.bezierCurveTo(18.4278, 15.166, 18.3037, 15.0074, 18.176, 15.0074);
  ctx.bezierCurveTo(18.0484, 15.0074, 17.9863, 15.135, 17.7967, 15.135);
  ctx.bezierCurveTo(17.3828, 15.135, 17.3517, 15.197, 17.0344, 15.197);
  ctx.bezierCurveTo(16.9379, 15.197, 16.7792, 15.2281, 16.7171, 15.2591);
  ctx.bezierCurveTo(16.5895, 15.3212, 16.5895, 15.4178, 16.4619, 15.4178);
  ctx.bezierCurveTo(16.2918, 15.4178, 16.2067, 15.45, 16.2067, 15.5143);
  ctx.bezierCurveTo(16.2067, 15.8627, 16.2377, 15.8006, 16.0791, 15.8006);
  ctx.bezierCurveTo(15.9089, 15.8006, 15.8032, 15.811, 15.7618, 15.8317);
  ctx.bezierCurveTo(15.6342, 15.8937, 15.7307, 16.0524, 15.6031, 16.149);
  ctx.bezierCurveTo(15.4755, 16.211, 15.4445, 16.3076, 15.4134, 16.4973);
  ctx.bezierCurveTo(15.3824, 16.687, 15.1927, 16.7525, 15.1927, 16.9422);
  ctx.bezierCurveTo(15.1927, 17.0388, 15.2237, 17.1009, 15.2237, 17.163);
  ctx.bezierCurveTo(15.2237, 17.3526, 14.8443, 17.2906, 14.8443, 17.4803);
  ctx.bezierCurveTo(14.8443, 17.6079, 14.9409, 17.701, 14.9409, 17.8286);
  ctx.bezierCurveTo(14.9409, 17.9252, 14.8788, 17.9873, 14.8788, 18.0838);
  ctx.bezierCurveTo(14.8788, 18.1804, 14.9409, 18.2425, 14.9409, 18.3046);
  ctx.bezierCurveTo(14.9409, 18.4632, 14.7202, 18.4943, 14.7202, 18.6219);
  ctx.bezierCurveTo(14.7202, 18.7495, 14.8478, 18.8426, 14.8478, 18.9392);
  ctx.bezierCurveTo(14.8478, 19.0013, 14.7512, 19.0357, 14.7512, 19.1289);
  ctx.bezierCurveTo(14.7512, 19.222, 14.7202, 19.0668, 14.9099, 19.3496);
  ctx.bezierCurveTo(15.0375, 19.5393, 15.0375, 19.6359, 14.9099, 19.7945);
  ctx.bezierCurveTo(14.7823, 19.9532, 14.5305, 20.0497, 14.2132, 20.0497);
  ctx.bezierCurveTo(12.8819, 20.0497, 12.7232, 18.6839, 11.9921, 18.4632);
  ctx.bezierCurveTo(11.7713, 18.4011, 11.7368, 18.3666, 11.7368, 18.2735);
  ctx.bezierCurveTo(11.7368, 18.1804, 11.7368, 18.2114, 11.8644, 18.0838);
  ctx.bezierCurveTo(11.992, 17.9562, 12.0231, 17.8631, 12.0231, 17.7665);
  ctx.bezierCurveTo(12.0231, 17.67, 12.0231, 17.6389, 11.961, 17.5768);
  ctx.bezierCurveTo(11.7058, 17.163, 11.5816, 16.656, 11.5816, 16.0869);
  ctx.bezierCurveTo(11.5816, 13.1691, 15.1341, 10.7237, 18.5002, 10.7237);
  ctx.bezierCurveTo(19.5142, 10.7237, 19.3556, 10.979, 19.9592, 10.979);
  ctx.bezierCurveTo(20.1178, 10.979, 20.0557, 10.979, 20.2765, 10.9479);
  ctx.bezierCurveTo(20.849, 10.8513, 21.894, 11.0755, 22.7183, 11.486);
  ctx.bezierCurveTo(25.0015, 12.6276, 26.4949, 15.3247, 26.4949, 18.4667);
  ctx.bezierCurveTo(26.4949, 23.8298, 21.7354, 27.7306, 15.3893, 27.7306);
  ctx.bezierCurveTo(11.93, 27.7306, 9.55018, 26.6511, 7.20144, 24.0195);
  ctx.bezierCurveTo(6.94621, 23.7332, 7.32905, 24.0816, 6.91517, 23.3538);
  ctx.bezierCurveTo(6.40818, 22.464, 6.47026, 23.0365, 6.47026, 23.0365);
  ctx.bezierCurveTo(6.3116, 22.8468, 6.02534, 22.3054, 5.86669, 22.1157);
  ctx.bezierCurveTo(5.677, 21.8949, 5.42177, 21.926, 5.32865, 21.7984);
  ctx.bezierCurveTo(5.20104, 21.6397, 5.39073, 21.3534, 5.32865, 21.1948);
  ctx.bezierCurveTo(5.26657, 20.9396, 4.72508, 20.5602, 4.663, 20.3705);
  ctx.bezierCurveTo(4.60092, 20.1808, 4.37674, 18.9737, 4.37674, 18.7529);
  ctx.bezierCurveTo(4.37674, 18.4977, 4.56643, 18.4667, 4.56643, 18.308);
  ctx.bezierCurveTo(4.56643, 18.0873, 4.28016, 18.0217, 4.12151, 17.7044);
  ctx.bezierCurveTo(3.96286, 17.3871, 3.86629, 16.656, 3.86629, 15.8627);
  ctx.bezierCurveTo(3.86629, 15.4488, 3.86629, 15.2902, 3.9939, 14.3383);
  ctx.bezierCurveTo(4.02494, 14.0209, 4.5009, 14.0209, 4.5009, 13.6726);
  ctx.bezierCurveTo(4.5009, 13.545, 4.43882, 13.3863, 4.43882, 13.2932);
  ctx.bezierCurveTo(4.43882, 13.1656, 4.43882, 13.1346, 4.46986, 13.038);
  ctx.bezierCurveTo(5.80116, 7.45412, 11.7679, 3.29812, 18.4002, 3.29812);
  ctx.bezierCurveTo(20.6834, 3.29812, 22.4286, 3.71199, 25.1257, 4.8536);
  ctx.bezierCurveTo(26.0155, 5.23299, 27.3158, 4.56734, 27.3158, 3.87064);
  ctx.bezierCurveTo(27.3779, 3.64991, 27.2537, 3.58438, 27.2192, 3.45677);
  ctx.bezierCurveTo(27.1882, 3.32916, 27.0606, 3.17051, 26.933, 3.13946);
  ctx.bezierCurveTo(26.8709, 3.10842, 26.8364, 3.01185, 26.7743, 2.91873);
  ctx.bezierCurveTo(26.6777, 2.76008, 26.5846, 2.698, 26.3294, 2.63247);
  ctx.bezierCurveTo(26.2018, 2.60143, 26.1397, 2.57039, 26.0742, 2.50485);
  ctx.bezierCurveTo(25.9776, 2.37724, 25.9155, 2.31516, 25.7879, 2.24963);
  ctx.bezierCurveTo(25.6603, 2.18755, 25.5672, 2.24963, 25.5016, 2.21859);
  ctx.bezierCurveTo(25.4396, 2.18755, 25.4051, 2.12202, 25.343, 2.09098);
  ctx.bezierCurveTo(25.3119, 2.05994, 25.2464, 2.05994, 25.1533, 2.05994);
  ctx.bezierCurveTo(21.9527, 0.345803, 19.8591, 0.09058, 17.0689, 0.09058);
  ctx.bezierCurveTo(11.0401, 0.09058, 5.64595, 2.69455, 2.31425, 7.22994);
  ctx.bezierCurveTo(2.02799, 7.60932, 2.18664, 8.24393, 1.77622, 8.62677);
  ctx.bezierCurveTo(0.982955, 9.35795, 0, 13.3553, 0, 15.8937);
  ctx.bezierCurveTo(0, 18.0183, 0.506998, 20.843, 1.17265, 22.3985);
  ctx.bezierCurveTo(2.47291, 25.4439, 1.90383, 24.1747, 2.09352, 24.461);
  ctx.bezierCurveTo(2.47291, 25.0645, 2.79021, 25.1266, 2.94886, 25.3163);
  ctx.bezierCurveTo(2.94886, 25.3163, 3.04544, 25.506, 3.04544, 25.6957);
  ctx.bezierCurveTo(3.04544, 25.8233, 3.04544, 25.8543, 3.07648, 25.9164);
  ctx.bezierCurveTo(3.17305, 26.1061, 3.61451, 26.4234, 3.74213, 26.551);
  ctx.bezierCurveTo(4.02839, 26.8373, 4.24912, 27.4409, 4.72508, 27.9168);
  ctx.bezierCurveTo(5.45626, 28.648, 6.5013, 29.2171, 9.833, 30.7726);
  ctx.bezierCurveTo(11.0056, 31.3106, 10.34, 31.0278, 10.4676, 31.0588);
  ctx.bezierCurveTo(10.7539, 31.1554, 11.1333, 31.1554, 11.3574, 31.3141);
  ctx.bezierCurveTo(11.4851, 31.4106, 11.3264, 31.3761, 11.6747, 31.3761);
  ctx.bezierCurveTo(11.7368, 31.3761, 11.7368, 31.4072, 11.8024, 31.4382);
  ctx.bezierCurveTo(11.8644, 31.4693, 11.93, 31.5658, 12.0231, 31.5658);
  ctx.bezierCurveTo(12.0852, 31.5658, 12.1197, 31.5037, 12.2128, 31.5348);
  ctx.bezierCurveTo(12.3059, 31.5658, 12.5301, 31.7245, 12.7198, 31.8211);
  ctx.bezierCurveTo(12.8784, 31.9176, 12.9095, 31.9176, 12.975, 31.8521);
  ctx.bezierCurveTo(13.1647, 31.7245, 13.2923, 31.8831, 13.482, 31.8831);
  ctx.bezierCurveTo(13.5441, 31.8831, 13.6407, 31.8521, 13.8303, 31.8521);
  ctx.bezierCurveTo(14.0856, 31.8521, 14.0856, 31.9142, 15.0685, 31.9142);
  ctx.closePath();
  ctx.fill();
  
  // "granola" text path
  ctx.beginPath();
  ctx.moveTo(138.987, 22.0217);
  ctx.bezierCurveTo(137.4, 22.0217, 136.162, 21.2582, 136.162, 19.859);
  ctx.bezierCurveTo(136.162, 18.7155, 136.893, 17.9209, 138.763, 17.3785);
  ctx.bezierCurveTo(139.587, 17.1228, 141.302, 16.7428, 142.223, 16.5528);
  ctx.bezierCurveTo(142.602, 16.456, 142.826, 16.615, 142.826, 16.9328);
  ctx.lineTo(142.826, 18.8088);
  ctx.bezierCurveTo(142.826, 21.0958, 140.953, 22.0183, 138.987, 22.0183);
  ctx.moveTo(137.939, 25.9636);
  ctx.bezierCurveTo(139.684, 25.9636, 141.367, 25.4558, 142.254, 24.789);
  ctx.bezierCurveTo(142.474, 24.6301, 142.571, 24.599, 142.699, 24.599);
  ctx.bezierCurveTo(142.888, 24.599, 143.016, 24.6957, 143.143, 25.0136);
  ctx.bezierCurveTo(143.302, 25.3625, 143.399, 25.4903, 143.778, 25.4903);
  ctx.lineTo(147.365, 25.4903);
  ctx.bezierCurveTo(147.745, 25.4903, 148, 25.2347, 148, 24.8547);
  ctx.bezierCurveTo(148, 24.409, 147.81, 23.4866, 147.81, 22.0908);
  ctx.lineTo(147.81, 13.0634);
  ctx.bezierCurveTo(147.81, 8.19905, 144.892, 6.16763, 140.036, 6.16763);
  ctx.bezierCurveTo(135.783, 6.16763, 131.975, 8.2336, 131.595, 11.6331);
  ctx.bezierCurveTo(131.564, 11.9821, 131.816, 12.2066, 132.168, 12.2066);
  ctx.lineTo(136.104, 12.2066);
  ctx.bezierCurveTo(136.642, 12.2066, 136.835, 12.0477, 137.025, 11.5709);
  ctx.bezierCurveTo(137.404, 10.6174, 138.325, 10.1717, 139.912, 10.1717);
  ctx.bezierCurveTo(141.912, 10.1717, 142.768, 11.0631, 142.768, 11.9821);
  ctx.bezierCurveTo(142.768, 12.6177, 142.45, 13.0323, 141.56, 13.3156);
  ctx.bezierCurveTo(140.705, 13.6024, 139.529, 13.7924, 138.132, 14.0135);
  ctx.bezierCurveTo(134.196, 14.5524, 131.023, 16.1106, 131.023, 19.9903);
  ctx.bezierCurveTo(131.023, 23.3898, 133.817, 25.9671, 137.942, 25.9671);
  ctx.moveTo(128.991, 25.4869);
  ctx.lineTo(125.28, 25.4869);
  ctx.bezierCurveTo(124.9, 25.4869, 124.645, 25.2312, 124.645, 24.8512);
  ctx.lineTo(124.645, 0.695223);
  ctx.bezierCurveTo(124.645, 0.315195, 124.9, 0.0595398, 125.28, 0.0595398);
  ctx.lineTo(128.991, 0.0595398);
  ctx.bezierCurveTo(129.371, 0.0595398, 129.626, 0.315195, 129.626, 0.695223);
  ctx.lineTo(129.626, 24.8512);
  ctx.bezierCurveTo(129.626, 25.2312, 129.371, 25.4869, 128.991, 25.4869);
  ctx.closePath();
  ctx.moveTo(113.504, 21.8939);
  ctx.bezierCurveTo(110.838, 21.8939, 108.965, 19.6379, 108.965, 16.1105);
  ctx.bezierCurveTo(108.965, 12.5832, 110.838, 10.3583, 113.504, 10.3583);
  ctx.bezierCurveTo(116.17, 10.3583, 118.043, 12.6143, 118.043, 16.1105);
  ctx.bezierCurveTo(118.043, 19.6068, 116.17, 21.8939, 113.504, 21.8939);
  ctx.closePath();
  ctx.moveTo(113.504, 26.0915);
  ctx.bezierCurveTo(119.564, 26.0915, 123.245, 21.545, 123.245, 16.2384);
  ctx.bezierCurveTo(123.245, 10.9318, 119.564, 6.16418, 113.504, 6.16418);
  ctx.bezierCurveTo(107.444, 6.16418, 103.764, 10.994, 103.764, 16.2384);
  ctx.bezierCurveTo(103.764, 21.4828, 107.444, 26.0915, 113.504, 26.0915);
  ctx.closePath();
  ctx.moveTo(86.4997, 25.4869);
  ctx.lineTo(90.211, 25.4869);
  ctx.bezierCurveTo(90.5905, 25.4869, 90.8457, 25.2312, 90.8457, 24.8512);
  ctx.lineTo(90.8457, 14.4902);
  ctx.bezierCurveTo(90.8457, 12.0753, 92.1771, 10.5483, 94.3363, 10.5483);
  ctx.bezierCurveTo(96.2714, 10.5483, 97.382, 11.6608, 97.382, 13.6646);
  ctx.lineTo(97.382, 24.8512);
  ctx.bezierCurveTo(97.382, 25.2312, 97.6373, 25.4869, 98.0167, 25.4869);
  ctx.lineTo(101.728, 25.4869);
  ctx.bezierCurveTo(102.108, 25.4869, 102.363, 25.2312, 102.363, 24.8512);
  ctx.lineTo(102.363, 14.1068);
  ctx.bezierCurveTo(102.363, 8.76564, 100.269, 6.16072, 95.9195, 6.16072);
  ctx.bezierCurveTo(93.919, 6.16072, 92.4289, 6.8275, 91.539, 7.43209);
  ctx.bezierCurveTo(91.2527, 7.6221, 91.1596, 7.68774, 91.032, 7.68774);
  ctx.bezierCurveTo(90.8112, 7.68774, 90.7146, 7.55992, 90.556, 7.24207);
  ctx.bezierCurveTo(90.3973, 6.89314, 90.2697, 6.76531, 89.8592, 6.76531);
  ctx.lineTo(86.4962, 6.76531);
  ctx.bezierCurveTo(86.1168, 6.76531, 85.8616, 7.02097, 85.8616, 7.40099);
  ctx.lineTo(85.8616, 24.8512);
  ctx.bezierCurveTo(85.8616, 25.2312, 86.1168, 25.4869, 86.4962, 25.4869);
  ctx.closePath();
  ctx.moveTo(75.331, 22.0217);
  ctx.bezierCurveTo(73.7444, 22.0217, 72.5061, 21.2582, 72.5061, 19.859);
  ctx.bezierCurveTo(72.5061, 18.7155, 73.2373, 17.9209, 75.1068, 17.3785);
  ctx.bezierCurveTo(75.9312, 17.1228, 77.6455, 16.7428, 78.5664, 16.5528);
  ctx.bezierCurveTo(78.9458, 16.456, 79.17, 16.615, 79.17, 16.9328);
  ctx.lineTo(79.17, 18.8088);
  ctx.bezierCurveTo(79.17, 21.0958, 77.2971, 22.0183, 75.331, 22.0183);
  ctx.moveTo(74.2825, 25.9636);
  ctx.bezierCurveTo(76.0278, 25.9636, 77.711, 25.4558, 78.5975, 24.789);
  ctx.bezierCurveTo(78.8182, 24.6301, 78.9148, 24.599, 79.0424, 24.599);
  ctx.bezierCurveTo(79.2321, 24.599, 79.3597, 24.6957, 79.4874, 25.0136);
  ctx.bezierCurveTo(79.646, 25.3625, 79.7426, 25.4903, 80.122, 25.4903);
  ctx.lineTo(83.7092, 25.4903);
  ctx.bezierCurveTo(84.0886, 25.4903, 84.3439, 25.2347, 84.3439, 24.8547);
  ctx.bezierCurveTo(84.3439, 24.409, 84.1542, 23.4866, 84.1542, 22.0908);
  ctx.lineTo(84.1542, 13.0634);
  ctx.bezierCurveTo(84.1542, 8.19905, 81.2361, 6.16763, 76.3796, 6.16763);
  ctx.bezierCurveTo(72.1267, 6.16763, 68.3187, 8.2336, 67.9393, 11.6331);
  ctx.bezierCurveTo(67.9083, 11.9821, 68.1601, 12.2066, 68.5119, 12.2066);
  ctx.lineTo(72.4475, 12.2066);
  ctx.bezierCurveTo(72.9856, 12.2066, 73.1787, 12.0477, 73.3684, 11.5709);
  ctx.bezierCurveTo(73.7478, 10.6174, 74.6688, 10.1717, 76.2554, 10.1717);
  ctx.bezierCurveTo(78.256, 10.1717, 79.1114, 11.0631, 79.1114, 11.9821);
  ctx.bezierCurveTo(79.1114, 12.6177, 78.7941, 13.0323, 77.9042, 13.3156);
  ctx.bezierCurveTo(77.0488, 13.6024, 75.8726, 13.7924, 74.4756, 14.0135);
  ctx.bezierCurveTo(70.54, 14.5524, 67.3667, 16.1106, 67.3667, 19.9903);
  ctx.bezierCurveTo(67.3667, 23.3898, 70.1606, 25.9671, 74.2859, 25.9671);
  ctx.moveTo(61.7169, 7.43209);
  ctx.bezierCurveTo(61.3996, 7.6532, 61.303, 7.71884, 61.1443, 7.71884);
  ctx.bezierCurveTo(60.9236, 7.71884, 60.7959, 7.59101, 60.6373, 7.24207);
  ctx.bezierCurveTo(60.4786, 6.89314, 60.351, 6.76531, 59.9405, 6.76531);
  ctx.lineTo(56.5775, 6.76531);
  ctx.bezierCurveTo(56.1981, 6.76531, 55.9429, 7.02097, 55.9429, 7.40099);
  ctx.lineTo(55.9429, 24.8512);
  ctx.bezierCurveTo(55.9429, 25.2312, 56.1981, 25.4869, 56.5775, 25.4869);
  ctx.lineTo(60.2889, 25.4869);
  ctx.bezierCurveTo(60.6683, 25.4869, 60.9236, 25.2312, 60.9236, 24.8512);
  ctx.lineTo(60.9236, 15.0603);
  ctx.bezierCurveTo(60.9236, 12.6454, 61.9721, 11.3084, 64.3521, 11.3084);
  ctx.lineTo(66.4768, 11.3084);
  ctx.bezierCurveTo(66.8252, 11.3084, 67.0494, 11.0873, 67.0494, 10.7349);
  ctx.lineTo(67.0494, 7.0486);
  ctx.bezierCurveTo(67.0494, 6.57184, 66.7942, 6.38183, 65.5593, 6.38183);
  ctx.bezierCurveTo(64.2279, 6.38183, 62.6413, 6.7964, 61.7203, 7.43209);
  ctx.moveTo(44.995, 20.6571);
  ctx.bezierCurveTo(42.4563, 20.6571, 40.68, 18.6222, 40.68, 15.4127);
  ctx.bezierCurveTo(40.68, 12.2032, 42.4563, 10.1994, 44.995, 10.1994);
  ctx.bezierCurveTo(47.5336, 10.1994, 49.31, 12.2343, 49.31, 15.4127);
  ctx.bezierCurveTo(49.31, 18.5911, 47.5026, 20.6571, 44.995, 20.6571);
  ctx.closePath();
  ctx.moveTo(44.8363, 31.9405);
  ctx.bezierCurveTo(51.1829, 31.9405, 54.2941, 28.5064, 54.2941, 22.343);
  ctx.lineTo(54.2941, 7.40099);
  ctx.bezierCurveTo(54.2941, 7.02097, 54.0389, 6.76531, 53.6595, 6.76531);
  ctx.lineTo(50.1688, 6.76531);
  ctx.bezierCurveTo(49.7549, 6.76531, 49.6307, 6.89314, 49.4721, 7.24207);
  ctx.bezierCurveTo(49.3134, 7.55992, 49.2168, 7.68774, 48.9961, 7.68774);
  ctx.bezierCurveTo(48.8685, 7.68774, 48.7753, 7.62556, 48.4235, 7.43209);
  ctx.bezierCurveTo(46.8369, 6.5753, 45.4399, 6.28855, 43.9188, 6.28855);
  ctx.bezierCurveTo(38.5242, 6.28855, 35.4785, 10.4205, 35.4785, 15.5371);
  ctx.bezierCurveTo(35.4785, 20.6536, 38.5242, 24.7856, 43.9188, 24.7856);
  ctx.bezierCurveTo(45.7262, 24.7856, 47.5991, 24.022, 48.4235, 23.3864);
  ctx.bezierCurveTo(48.6132, 23.2585, 48.7098, 23.2274, 48.8029, 23.2274);
  ctx.bezierCurveTo(48.9926, 23.2274, 49.1203, 23.3553, 49.1203, 23.642);
  ctx.bezierCurveTo(49.1203, 26.4404, 47.5957, 28.1229, 44.8984, 28.1229);
  ctx.bezierCurveTo(43.2152, 28.1229, 42.3287, 27.5494, 41.8527, 26.8204);
  ctx.bezierCurveTo(41.5975, 26.4404, 41.4733, 26.2815, 40.9628, 26.2815);
  ctx.lineTo(37.2825, 26.2815);
  ctx.bezierCurveTo(36.9341, 26.2815, 36.7099, 26.5026, 36.7099, 26.855);
  ctx.bezierCurveTo(36.7099, 29.0177, 39.152, 31.9405, 44.8329, 31.9405);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

const animation: AnimationDefinition<GranolaMcpRevealParams> = {
  id: 'granola-mcp-reveal',
  name: 'Granola MCP Reveal',
  fps: 60,
  durationMs: 5000,
  width: 1920,    // 16:9 aspect ratio
  height: 1080,
  background: '#BBC951',

  params: {
    defaults: {
      scale: 0.7,
      offsetX: 0,
      offsetY: -25,
      logoTextSpacing: 40,
      textBaselineOffset: 35,
      wordSpacing: 30,
      slideUpDistance: 0.15,
      logoMoveAmount: 0,
      wordSlideAmount: 50,
      backgroundColor: '#BBC951',
      logoColor: '#292929',
      textColor: '#292929',
      speed: 2.2,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Position', {
        offsetX: number({ value: -259, min: -400, max: 0, step: 5, label: 'Block Center X (state 1)' }),
        offsetY: number({ value: 10, min: -50, max: 80, step: 5, label: 'Offset Y' }),
        logoTextSpacing: number({ value: 40, min: 0, max: 120, step: 5, label: 'Logo ↔ Text Spacing' }),
        textBaselineOffset: number({ value: 0, min: -30, max: 30, step: 2, label: 'Text Y (align with logo)' }),
        wordSpacing: number({ value: 180, min: 80, max: 300, step: 10, label: 'Word Spacing' }),
      }),
      ...folder('Movement', {
        slideUpDistance: number({ value: 0.3, min: 0.1, max: 0.8, step: 0.05, label: 'Slide Up Distance' }),
        logoMoveAmount: number({ value: 109, min: 0, max: 200, step: 5, label: 'Logo Move Left' }),
        wordSlideAmount: number({ value: 50, min: 0, max: 150, step: 5, label: 'Word Reveal Slide' }),
      }),
      ...folder('Colors', {
        backgroundColor: color({ value: '#BBC951', label: 'Background' }),
        logoColor: color({ value: '#292929', label: 'Logo Color' }),
        textColor: color({ value: '#292929', label: 'Text Color' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params }) {
    const {
      scale,
      offsetX,
      offsetY,
      logoTextSpacing,
      textBaselineOffset,
      wordSpacing,
      slideUpDistance,
      logoMoveAmount,
      wordSlideAmount,
      backgroundColor,
      logoColor,
      textColor,
      speed,
    } = params;
    
    // Apply speed to progress
    const adjustedProgress = Math.min(1, progress * speed);
    
    // Animation phases:
    // 0.0 - 0.15: Background fade in
    // 0.15 - 0.35: Slide up from bottom
    // 0.35 - 0.55: Logo moves to left
    // 0.55 - 1.0: Words appear one by one
    
    // Phase 1: Background fade in (0-0.15)
    const bgFadeProgress = Math.min(1, adjustedProgress / 0.15);
    const bgOpacity = easeOutCubic(bgFadeProgress);
    
    // Clear canvas with fade-in
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    
    if (adjustedProgress < 0.05) return; // Wait for bg fade to start
    
    // Phase 2: Slide up (0.15-0.35)
    const slideProgress = Math.max(0, Math.min(1, (adjustedProgress - 0.15) / 0.2));
    const slideOffset = (1 - easeOutCubic(slideProgress)) * height * slideUpDistance;
    
    // Phase 3: Logo moves to left (0.35-0.55)
    const logoMoveProgress = Math.max(0, Math.min(1, (adjustedProgress - 0.35) / 0.2));
    const easedLogoMove = easeInOutCubic(logoMoveProgress);
    
    // Overall opacity for slide up phase
    const overallOpacity = Math.min(1, slideProgress * 2);
    
    // Layout constants - logo is 148px wide in SVG, scaled 3.5x = 518px
    const LOGO_WIDTH = 148 * 3.5;
    
    ctx.save();
    ctx.globalAlpha = overallOpacity;
    
    // Center and apply scale - exact positions from SVG: state 1 center (701,550), state 2 (592,550)
    ctx.translate(width / 2, height / 2);
    ctx.translate(offsetX - logoMoveAmount * easedLogoMove, offsetY);  // Block: state 1 (701,550) → state 2 (592,550)
    ctx.scale(scale, scale);
    
    // Apply slide up offset
    ctx.translate(0, slideOffset);
    
    ctx.font = '120px Georgia, serif';
    
    // Measure text widths for proper centering (reference: block centered horizontally)
    const theNotesWidth = ctx.measureText('the notes.').width;
    const wordWidths = ['now', 'with', 'MCP'].map((w) => ctx.measureText(w).width);
    const wordsFullWidth = wordWidths[0] + wordSpacing + wordWidths[1] + wordSpacing + wordWidths[2];
    
    // State 1: "granola the notes." - total block width
    const totalW1 = LOGO_WIDTH + logoTextSpacing + theNotesWidth;
    const startX1 = -totalW1 / 2;
    
    // State 2: "granola" + gap (from logo move) + "now with MCP"
    const totalW2 = LOGO_WIDTH + logoMoveAmount + logoTextSpacing + wordsFullWidth;
    const startX2 = -totalW2 / 2;
    
    // Draw granola logo - animates from state 1 to state 2 position (moves left within block)
    const logoX = startX1 + (startX2 - startX1) * easedLogoMove;
    ctx.save();
    ctx.translate(logoX, -16);
    drawGranolaLogo(ctx, logoColor, 3.5);
    ctx.restore();
    
    // Draw "the notes." text (for first state) - fades in during slide (slightly staggered), fades out during logo move
    if (logoMoveProgress < 1) {
      const theNotesFadeIn = easeOutCubic(Math.min(1, Math.max(0, (slideProgress - 0.2) / 0.6)));
      const theNotesFadeOut = 1 - logoMoveProgress;
      const theNotesOpacity = theNotesFadeIn * theNotesFadeOut;
      ctx.save();
      ctx.globalAlpha = theNotesOpacity;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('the notes.', startX1 + LOGO_WIDTH + logoTextSpacing, textBaselineOffset);
      ctx.restore();
    }
    
    // Phase 4: "now with MCP" appears word by word (0.55-1.0)
    const wordsStartProgress = Math.max(0, (adjustedProgress - 0.55) / 0.45);
    
    if (wordsStartProgress > 0) {
      const words = ['now', 'with', 'MCP'];
      let wordX = startX2 + LOGO_WIDTH + logoMoveAmount + logoTextSpacing;
      
      words.forEach((word, index) => {
        const wordDelay = index * 0.25;
        const wordProgress = Math.max(0, Math.min(1, (wordsStartProgress - wordDelay) / 0.3));
        
        if (wordProgress > 0) {
          const wordSlideOffset = (1 - easeOutCubic(wordProgress)) * wordSlideAmount;
          const wordOpacity = easeOutCubic(wordProgress);
          
          ctx.save();
          ctx.globalAlpha = wordOpacity;
          ctx.translate(0, wordSlideOffset);
          
          ctx.font = '120px Georgia, serif';
          ctx.fillStyle = textColor;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(word, wordX, textBaselineOffset);
          
          ctx.restore();
        }
        
        // Advance position for next word (word width + spacing)
        const w = ctx.measureText(word).width;
        wordX += w + wordSpacing;
      });
    }
    
    ctx.restore();
  },
};

export default animation;
