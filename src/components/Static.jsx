import { Uniform } from "three";
import { Effect, EffectAttribute } from "postprocessing";
import React, { useMemo, forwardRef } from "react";

export const Static = forwardRef((props, ref) => {
  const effect = useMemo(() => new StaticEffectImpl(props), [props]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});

class StaticEffectImpl extends Effect {
  constructor({ amount = 0.5, size = 4.0 } = {}) {
    super("StaticEffect", fragmentShader, {
      uniforms: new Map([
        ["time", new Uniform(0)],
        ["amount", new Uniform(amount)],
        ["size", new Uniform(size)],
      ]),
      attributes: EffectAttribute.CONVOLUTION,
    });

    this.time = 0;
  }

  update(renderer, inputBuffer, deltaTime) {
    this.time += deltaTime;
    this.uniforms.get("time").value = this.time;
  }
}

const fragmentShader = `
uniform float time;
uniform float amount;
uniform float size;


float rand(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 p = uv;
  vec4 color = texture2D(inputBuffer, p);
  float xs = floor(gl_FragCoord.x / size);
  float ys = floor(gl_FragCoord.y / size);
  vec4 snow = vec4(rand(vec2(xs * time, ys * time)) * amount);

  // Additive blending
  outputColor = color + snow;
}
`;
