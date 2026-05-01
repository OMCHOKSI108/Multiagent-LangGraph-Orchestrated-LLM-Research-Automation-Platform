'use client';
import { useRef, useEffect } from 'react';

/**
 * Three.js animated knowledge graph for the MARP landing page.
 * Nodes = research concepts, edges = relationships.
 * Slow rotation, white/gray palette, alpha background.
 * Uses static import so TypeScript can properly type Three.js.
 */
import {
  Scene, PerspectiveCamera, WebGLRenderer,
  SphereGeometry, MeshBasicMaterial, Mesh,
  Color, Vector3, LineBasicMaterial, BufferGeometry,
  Line, BufferAttribute, AdditiveBlending,
} from 'three';

export default function KnowledgeGraph3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get theme colors from CSS variables
    const style = getComputedStyle(document.documentElement);
    const accentColor = new Color(style.getPropertyValue('--accent-teal').trim());
    const mutedColor = new Color(style.getPropertyValue('--border-default').trim());

    const scene    = new Scene();
    const camera   = new PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // ── Nodes ────────────────────────────────────────────────────────
    const concepts = [
      'Research', 'Analysis', 'Sources', 'Synthesis',
      'Agents', 'Knowledge', 'Report', 'Data',
      'AI', 'Citations', 'Insights', 'Discovery',
    ];
    const nodes: { base: Vector3; mesh: Mesh; glow: Mesh; baseColor: Color; phase: number }[] = [];
    const nodeGeo = new SphereGeometry(0.06, 16, 16);

    concepts.forEach((_, i) => {
      const phi   = Math.acos(-1 + (2 * i) / concepts.length);
      const theta = Math.sqrt(concepts.length * Math.PI) * phi;
      const pos   = new Vector3(
        2.2 * Math.cos(theta) * Math.sin(phi),
        2.2 * Math.sin(theta) * Math.sin(phi),
        2.2 * Math.cos(phi),
      );

      const shade     = 0.3 + (i / concepts.length) * 0.4;
      const baseColor = new Color(shade, shade, shade);
      const nodeMat   = new MeshBasicMaterial({ color: baseColor.clone() });
      const mesh    = new Mesh(nodeGeo, nodeMat);
      mesh.position.copy(pos);
      scene.add(mesh);

      // soft glow shell for "light wave" effect
      const glowMat = new MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const glowGeo = nodeGeo.clone();
      const glow = new Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      glow.scale.setScalar(1.8);
      scene.add(glow);

      nodes.push({ base: pos, mesh, glow, baseColor, phase: Math.random() * Math.PI * 2 });
    });

    // ── Edges ────────────────────────────────────────────────────────
    const edges: { geo: BufferGeometry; aIndex: number; bIndex: number; line: Line; phase: number }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].base.distanceTo(nodes[j].base) < 2.8) {
          const geo = new BufferGeometry();
          const positions = new Float32Array(6);
          geo.setAttribute('position', new BufferAttribute(positions, 3));
          const lineMat = new LineBasicMaterial({
            color: mutedColor,
            opacity: 0.2,
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
          });
          const line = new Line(geo, lineMat);
          scene.add(line);
          edges.push({ geo, aIndex: i, bIndex: j, line, phase: Math.random() * Math.PI * 2 });
        }
      }
    }

    // ── Animation ────────────────────────────────────────────────────
    let raf: number;
    let angle = 0;
    const neonEmerald = new Color(0x22c55e);
    const neonCyan = new Color(0x22d3ee);
    const animate = () => {
      raf = requestAnimationFrame(animate);
      angle += 0.003;

      // subtle wave motion on nodes along their radial direction
      const t = performance.now() * 0.001;
      nodes.forEach((node) => {
        const dir = node.base.clone().normalize();
        const amp = 0.18;
        const offset = Math.sin(t * 0.8 + node.phase) * amp;
        node.mesh.position.copy(node.base).addScaledVector(dir, offset);

        // neon green / cyan wavy highlight on solid node
        const wave = 0.5 + 0.5 * Math.sin(t * 1.2 + node.phase);
        const glowColor = node.baseColor.clone().lerp(neonEmerald, wave);
        (node.mesh.material as MeshBasicMaterial).color.copy(glowColor);

        // outer glow shell that pulses like emitted light
        const shell = node.glow;
        const shellMat = shell.material as MeshBasicMaterial;
        const shellWave = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.2 + node.phase));
        shell.position.copy(node.mesh.position);
        const scale = 1.6 + shellWave * 0.5;
        shell.scale.setScalar(scale);
        shellMat.opacity = 0.15 + shellWave * 0.45;
      });

      // update edge geometry positions and apply wavy neon color/opacity
      edges.forEach((edge) => {
        const posAttr = edge.geo.getAttribute('position') as BufferAttribute;
        const a = nodes[edge.aIndex].mesh.position;
        const b = nodes[edge.bIndex].mesh.position;
        posAttr.setXYZ(0, a.x, a.y, a.z);
        posAttr.setXYZ(1, b.x, b.y, b.z);
        posAttr.needsUpdate = true;

        const wave = 0.5 + 0.5 * Math.sin(t * 1.1 + edge.phase);
        const lineMat = edge.line.material as LineBasicMaterial;
        const color = neonEmerald.clone().lerp(neonCyan, wave);
        lineMat.color.copy(color);
        lineMat.opacity = 0.18 + 0.5 * wave;
      });

      scene.rotation.y = angle;
      scene.rotation.x = Math.sin(angle * 0.3) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────────────────
    const onResize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  );
}
