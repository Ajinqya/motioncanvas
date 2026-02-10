import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

interface LogoHubParams {
  scale: number;
  backgroundColor: string;
  lineColor: string;
  speed: number;
}

const LOGO_SVGS: Record<string, string> = {
  L0: 'test',
};

const LOGO_POSITIONS_INITIAL: Record<string, { x: number; y: number }> = {
  L0: { x: 0, y: 0 },
};

const LOGO_TIMELINE: Array<[string, number, number]> = [
  ['L0', 200, 600],
];

const svgImages: Map<string, HTMLImageElement> = new Map();

const animation: AnimationDefinition<LogoHubParams> = {
  id: 'test',
  name: 'Test',
  fps: 60,
  durationMs: 1000,
  width: 1280,
  height: 720,
  background: '#f5f3f0',
  params: {
    defaults: {},
    schema: {},
  },
  render() {},
};

export default animation;
