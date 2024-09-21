import * as THREE from "three";
import {
  Canvas,
  // useFrame
} from "@react-three/fiber";
import {
  // Bloom,
  // DepthOfField,
  // Noise,
  // Vignette,
  // HueSaturation,
  // TiltShift,
  DotScreen,
  EffectComposer,
  Scanline,
  ChromaticAberration,
  Glitch,
} from "@react-three/postprocessing";
import { useEffect, useRef, useState } from "react";
import { BlendFunction } from "postprocessing";
import { BadTV } from "./components/BadTV";
import { Static } from "./components/Static";
import { CRTShader } from "./components/CRT";
import { useControls, folder } from "leva";

export default function App() {
  const [mediaStream, setMediaStream] = useState(null);
  const [videoElement, setVideoElement] = useState(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    let stream;
    const getMediaStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 1280, height: 720, facingMode: "user" },
        });
        setMediaStream(stream);
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };
    getMediaStream();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (mediaStream) {
      const videoElement = document.createElement("video");
      videoElement.srcObject = mediaStream;
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.play();
      setVideoElement(videoElement);
    }
  }, [mediaStream]);

  useEffect(() => {
    if (mediaStream && videoElement) {
      const listener = new THREE.AudioListener();
      listener.gain.disconnect();
      const audio = new THREE.Audio(listener);
      const context = listener.context;
      const source = context.createMediaStreamSource(mediaStream);
      audio.setNodeSource(source);
      analyserRef.current = new THREE.AudioAnalyser(audio, 32);
    }
  }, [mediaStream, videoElement]);

  return (
    <Canvas>
      <mesh>
        <planeGeometry args={[16, 9]} />
        {videoElement ? (
          <meshStandardMaterial emissive={0xffffffff} side={THREE.DoubleSide}>
            <videoTexture attach="map" args={[videoElement]} />
            <videoTexture attach="emissiveMap" args={[videoElement]} />
          </meshStandardMaterial>
        ) : (
          <meshNormalMaterial />
        )}
      </mesh>
      <Effects />
    </Canvas>
  );
}

function Effects() {
  const badTVRef = useRef();

  // useFrame(() => {
  //   if (analyser.current) {
  //     const data = analyser.current.getAverageFrequency();
  //     // Use data to modify effect parameters
  //     // For example, adjust distortion based on audio frequency
  //     if (badTVRef?.current) {
  //       badTVRef.current.uniforms.get("distortion").value = data * 0.1;
  //     }
  //   }
  // });

  const controls = useControls({
    "Bad TV": folder({
      enableBadTV: { label: "Enable", value: true },
      distortion: { value: 3.0, min: 0, max: 10, step: 0.1 },
      distortion2: { value: 0, min: 0, max: 10, step: 0.1 },
      speed: { value: 10, min: 0, max: 20, step: 0.1 },
      rollSpeed: { value: 0, min: -10, max: 10, step: 0.01 },
    }),
    Static: folder({
      enableStatic: { label: "Enable", value: true },
      amount: { value: 0.5, min: 0, max: 1, step: 0.01 },
      size: { value: 1, min: 0.1, max: 10, step: 0.1 },
    }),
    CRTShader: folder({
      enableCRT: { label: "Enable", value: true },
      hardScan: { value: -16.0, min: -32, max: -1, step: 0.1 },
      hardPix: { value: -3.0, min: -6, max: -1, step: 0.1 },
      warp: {
        value: { x: 1.0 / 32.0, y: 1.0 / 24.0 },
        x: { min: 0, max: 0.1, step: 0.001 },
        y: { min: 0, max: 0.1, step: 0.001 },
      },
      maskDark: { value: 0.5, min: 0, max: 1, step: 0.01 },
      maskLight: { value: 1.5, min: 1, max: 2, step: 0.01 },
    }),
    Scanline: folder({
      enableScanline: { label: "Enable", value: true },
      density: { value: 0.1, min: 0, max: 5, step: 0.1 },
    }),
    "Chromatic Aberration": folder({
      enableChromaticAberration: { label: "Enable", value: true },
      offset: {
        value: [0.4, 0],
        min: -5,
        max: 5,
        step: 0.01,
      },
    }),
    "Dot Screen": folder({
      enableDotScreen: { label: "Enable", value: true },
      angle: { value: Math.PI * 0.5, min: 0, max: Math.PI * 2, step: 0.01 },
      scale: { value: 800, min: 1, max: 1000, step: 1 },
    }),
    Glitch: folder({
      enableGlitch: { label: "Enable", value: true },
      delay: {
        value: [1, 5],
        min: 0,
        max: 20,
        step: 0.1,
      },
      duration: {
        value: [0.1, 1.0],
        min: 0,
        max: 10,
        step: 0.1,
      },
    }),
  });

  return (
    <EffectComposer>
      {/* <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} /> */}
      {/* <TiltShift blur={0.7} center={[0.5, 0.5]} step={0.01} decay={0.5} /> */}
      {/* <Noise opacity={0.2} /> */}
      {/* <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} /> */}
      {/* <Vignette offset={0.1} darkness={1.1} /> */}
      {/* <HueSaturation hue={0.5} saturation={0.5} /> */}
      {controls.enableDotScreen && (
        <DotScreen blendFunction={BlendFunction.COLOR_BURN} angle={controls.angle} scale={controls.scale} />
      )}
      {controls.enableStatic && <Static amount={controls.amount} size={controls.size} opacity={1} />}
      {controls.enableCRT && (
        <CRTShader
          hardScan={controls.hardScan}
          hardPix={controls.hardPix}
          warp={new THREE.Vector2(controls.warp.x, controls.warp.y)}
          maskDark={controls.maskDark}
          maskLight={controls.maskLight}
        />
      )}
      {controls.enableScanline && <Scanline density={controls.density} />}
      {controls.enableGlitch && <Glitch delay={controls.delay} duration={controls.duration} active />}
      {controls.enableChromaticAberration && <ChromaticAberration offset={controls.offset} />}
      {controls.enableBadTV && (
        <BadTV
          ref={badTVRef}
          distortion={controls.distortion}
          distortion2={controls.distortion2}
          speed={controls.speed}
          rollSpeed={controls.rollSpeed}
        />
      )}
    </EffectComposer>
  );
}
