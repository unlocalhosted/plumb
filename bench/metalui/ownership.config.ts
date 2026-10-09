import config from './plumb.config.ts';

export default {
  ...config,
  components: {
    from: 'package:@unlocalhosted/metalui',
    contracts: {
      // indicator.tsx's className API explicitly delegates material and shape.
      SlidingIndicator: { allow: ['paint', 'radius', 'elevation'] },
      // COMPOSITION.md: these Parts draw material/radius; hosts own content/layout.
      // surface.tsx explicitly says it draws material and radius and nothing else.
      // Foreground ink belongs to content. Surface has no focus of its own
      // (surface.agent.md); its interactive host supplies the focus outline.
      Surface: { allow: ['padding', 'type', 'color', 'outline', 'outline-color'] },
      Well: { allow: ['padding', 'type', 'color'] },
      GlassFace: { allow: ['type', 'color'] },
      // glass-face.agent.md: bezel padding remains recipe-owned. Screen fill is
      // caller-owned under the glare; content padding stays with the host.
      'GlassFace.Screen': { allow: ['padding', 'background', 'background-color', 'background-image'] },
    },
  },
};
