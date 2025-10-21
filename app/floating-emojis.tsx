"use client";

import { Canvas } from "@react-three/fiber";
import EmojiParticles from "./emojiParticles";
import { OrbitControls } from "@react-three/drei";

export default function FloatingEmojis() {
  return (
    <div className=" absolute min-h-screen w-full top-0 left-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ height: "100svh" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <EmojiParticles num={50} />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
