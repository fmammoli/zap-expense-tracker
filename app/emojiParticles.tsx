"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Sprite, SpriteMaterial } from "three";
import * as THREE from "three";

type Particle = {
  sprite: Sprite;
  velocity: THREE.Vector3;
  radius: number;
};

function EmojiParticles({ num = 50 }) {
  const groupRef = useRef<THREE.Group>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!groupRef.current) return;

    const emojis = ["🐊", "💸"]; // choose emojis

    const newParticles: Particle[] = Array.from({ length: num }, () => {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.font = "48px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 32, 32);
      const texture = new THREE.CanvasTexture(canvas);

      const material = new SpriteMaterial({ map: texture });
      const sprite = new Sprite(material);

      // random initial position
      sprite.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      sprite.scale.set(1, 1, 1);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );

      return { sprite, velocity, radius: 0.5 };
    });

    newParticles.forEach((p) => groupRef.current!.add(p.sprite));
    setParticles(newParticles);
  }, [num]);

  useFrame(() => {
    const bounds = 5; // cubic bounds: -5 → 5

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // move
      p.sprite.position.add(p.velocity);

      // bounce off walls
      ["x", "y", "z"].forEach((axis) => {
        if (
          //@ts-expect-error indexing
          p.sprite.position[axis] < -bounds ||
          //@ts-expect-error indexing
          p.sprite.position[axis] > bounds
        ) {
          //@ts-expect-error indexing
          p.velocity[axis] *= -1;
        }
      });

      // simple collisions
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dist = p.sprite.position.distanceTo(q.sprite.position);
        if (dist < p.radius + q.radius) {
          // swap velocities
          const temp = p.velocity.clone();
          p.velocity.copy(q.velocity);
          q.velocity.copy(temp);

          // push apart slightly
          const overlap = p.radius + q.radius - dist;
          const dir = p.sprite.position
            .clone()
            .sub(q.sprite.position)
            .normalize();
          p.sprite.position.add(dir.clone().multiplyScalar(overlap / 2));
          q.sprite.position.sub(dir.clone().multiplyScalar(overlap / 2));
        }
      }
    }
  });

  return <group ref={groupRef}></group>;
}

export default EmojiParticles;
