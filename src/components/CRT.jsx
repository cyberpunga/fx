// CRTShader.js
import * as THREE from "three";
import React, { useMemo, forwardRef } from "react";
import { Uniform, Vector2 } from "three";
import { Effect } from "postprocessing";

// Fragment Shader Code
// CRTShader.js

const fragmentShader = `
uniform vec2 resolution;
uniform float hardScan;
uniform float hardPix;
uniform vec2 warp;
uniform float maskDark;
uniform float maskLight;

vec3 ToLinear(vec3 c);
vec3 ToSrgb(vec3 c);

// sRGB to Linear conversion
float ToLinear1(float c) {
  return (c <= 0.04045) ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}
vec3 ToLinear(vec3 c) {
  return vec3(ToLinear1(c.r), ToLinear1(c.g), ToLinear1(c.b));
}

// Linear to sRGB conversion
float ToSrgb1(float c) {
  return (c < 0.0031308) ? c * 12.92 : 1.055 * pow(c, 0.41666) - 0.055;
}
vec3 ToSrgb(vec3 c) {
  return vec3(ToSrgb1(c.r), ToSrgb1(c.g), ToSrgb1(c.b));
}

// Fetches the nearest sample and converts to linear color space
vec3 Fetch(vec2 pos, vec2 off, vec2 res) {
  pos = floor(pos * res + off) / res;
  if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5)
    return vec3(0.0, 0.0, 0.0);
  return ToLinear(texture2D(inputBuffer, pos.xy, -16.0).rgb);
}

// Calculates the distance to the nearest texel
vec2 Dist(vec2 pos, vec2 res) {
  pos = pos * res;
  return -((pos - floor(pos)) - vec2(0.5));
}

// 1D Gaussian function
float Gaus(float pos, float scale) {
  return exp2(scale * pos * pos);
}

// 3-tap Gaussian filter along horizontal line
vec3 Horz3(vec2 pos, float off, vec2 res) {
  vec3 b = Fetch(pos, vec2(-1.0, off), res);
  vec3 c = Fetch(pos, vec2(0.0, off), res);
  vec3 d = Fetch(pos, vec2(1.0, off), res);
  float dst = Dist(pos, res).x;
  float scale = hardPix;
  float wb = Gaus(dst - 1.0, scale);
  float wc = Gaus(dst + 0.0, scale);
  float wd = Gaus(dst + 1.0, scale);
  return (b * wb + c * wc + d * wd) / (wb + wc + wd);
}

// 5-tap Gaussian filter along horizontal line
vec3 Horz5(vec2 pos, float off, vec2 res) {
  vec3 a = Fetch(pos, vec2(-2.0, off), res);
  vec3 b = Fetch(pos, vec2(-1.0, off), res);
  vec3 c = Fetch(pos, vec2(0.0, off), res);
  vec3 d = Fetch(pos, vec2(1.0, off), res);
  vec3 e = Fetch(pos, vec2(2.0, off), res);
  float dst = Dist(pos, res).x;
  float scale = hardPix;
  float wa = Gaus(dst - 2.0, scale);
  float wb = Gaus(dst - 1.0, scale);
  float wc = Gaus(dst + 0.0, scale);
  float wd = Gaus(dst + 1.0, scale);
  float we = Gaus(dst + 2.0, scale);
  return (a * wa + b * wb + c * wc + d * wd + e * we) / (wa + wb + wc + wd + we);
}

// Calculates the scanline weight
float Scan(vec2 pos, float off, vec2 res) {
  float dst = Dist(pos, res).y;
  return Gaus(dst + off, hardScan);
}

// Combines samples from neighboring lines
vec3 Tri(vec2 pos, vec2 res) {
  vec3 a = Horz3(pos, -1.0, res);
  vec3 b = Horz5(pos, 0.0, res);
  vec3 c = Horz3(pos, 1.0, res);
  float wa = Scan(pos, -1.0, res);
  float wb = Scan(pos, 0.0, res);
  float wc = Scan(pos, 1.0, res);
  return a * wa + b * wb + c * wc;
}

// Applies distortion to simulate CRT curvature
vec2 WarpFunc(vec2 pos) {
  pos = pos * 2.0 - 1.0;
  pos *= vec2(1.0 + (pos.y * pos.y) * warp.x, 1.0 + (pos.x * pos.x) * warp.y);
  return pos * 0.5 + 0.5;
}

// Creates a shadow mask effect
vec3 Mask(vec2 pos) {
  pos.x += pos.y * 3.0;
  vec3 mask = vec3(maskDark, maskDark, maskDark);
  pos.x = fract(pos.x / 6.0);
  if (pos.x < 0.333) mask.r = maskLight;
  else if (pos.x < 0.666) mask.g = maskLight;
  else mask.b = maskLight;
  return mask;
}

// Main shader function
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Calculate res inside the function
  vec2 res = resolution.xy / 6.0;

  vec2 fragCoord = uv * resolution;

  vec2 pos = WarpFunc(fragCoord.xy / resolution.xy);

  vec3 color = Tri(pos, res) * Mask(fragCoord.xy);

  outputColor.rgb = ToSrgb(color);
  outputColor.a = 1.0;
}
`;

// Custom Effect Class
class CRTShaderEffect extends Effect {
  constructor({
    hardScan = -8.0,
    hardPix = -3.0,
    warp = new THREE.Vector2(1.0 / 32.0, 1.0 / 24.0),
    maskDark = 0.5,
    maskLight = 1.5,
  } = {}) {
    super("CRTShaderEffect", fragmentShader, {
      uniforms: new Map([
        ["hardScan", new Uniform(hardScan)],
        ["hardPix", new Uniform(hardPix)],
        ["warp", new Uniform(warp)],
        ["maskDark", new Uniform(maskDark)],
        ["maskLight", new Uniform(maskLight)],
        ["resolution", new Uniform(new THREE.Vector2())],
      ]),
    });
  }

  update(renderer, inputBuffer, deltaTime) {
    // Update the resolution uniform with the current renderer size
    const { width, height } = renderer.getSize(new THREE.Vector2());
    this.uniforms.get("resolution").value.set(width, height);
  }
}

// React Component
export const CRTShader = forwardRef((props, ref) => {
  const effect = useMemo(() => new CRTShaderEffect(props), [props]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
