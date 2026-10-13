// The live half of the field: the shader itself. Loaded on demand by Field.jsx so three.js stays out of the main bundle.
import { Shader, MeshGradient } from 'shaders/react';

export default function FieldLive({ live, setLive, setGone, stops, count, speed, drift, swirl, smoothness, seed }) {
  return (
    <Shader
      disableTelemetry
      className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${live ? 'opacity-100' : 'opacity-0'}`}
      onReady={() => setLive(true)}
      onUnavailable={() => setGone(true)}
    >
      <MeshGradient stops={stops} colorSpace="oklab" count={count} smoothness={smoothness} variation={0.25} swirl={swirl} drift={drift} speed={speed} seed={seed} />
    </Shader>
  );
}
