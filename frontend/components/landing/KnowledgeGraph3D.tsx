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
  Line, BufferAttribute,
} from 'three';

export default function KnowledgeGraph3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
    const nodes: { base: Vector3; mesh: Mesh }[] = [];
    const nodeGeo = new SphereGeometry(0.06, 16, 16);

    concepts.forEach((_, i) => {
      const phi   = Math.acos(-1 + (2 * i) / concepts.length);
      const theta = Math.sqrt(concepts.length * Math.PI) * phi;
      const pos   = new Vector3(
        2.2 * Math.cos(theta) * Math.sin(phi),
        2.2 * Math.sin(theta) * Math.sin(phi),
        2.2 * Math.cos(phi),
      );

      const shade   = 0.3 + (i / concepts.length) * 0.4;
      const nodeMat = new MeshBasicMaterial({ color: new Color(shade, shade, shade) });
      const mesh    = new Mesh(nodeGeo, nodeMat);
      mesh.position.copy(pos);
      scene.add(mesh);

      nodes.push({ base: pos, mesh });
    });

    // ── Edges ────────────────────────────────────────────────────────
    const edgeMat = new LineBasicMaterial({ color: 0xcccccc, opacity: 0.35, transparent: true });
    const edges: { geo: BufferGeometry; aIndex: number; bIndex: number }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].base.distanceTo(nodes[j].base) < 2.8) {
          const geo = new BufferGeometry();
          const positions = new Float32Array(6);
          geo.setAttribute('position', new BufferAttribute(positions, 3));
          const line = new Line(geo, edgeMat);
          scene.add(line);
          edges.push({ geo, aIndex: i, bIndex: j });
        }
      }
    }

    // ── Animation ────────────────────────────────────────────────────
    let raf: number;
    let angle = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      angle += 0.003;

       // subtle wave motion on nodes along their radial direction
       const t = performance.now() * 0.001;
       nodes.forEach((node, idx) => {
         const dir = node.base.clone().normalize();
         const amp = 0.18;
         const offset = Math.sin(t * 0.8 + idx * 0.7) * amp;
         node.mesh.position.copy(node.base).addScaledVector(dir, offset);
       });

       // update edge geometry positions to follow moving nodes
       edges.forEach(({ geo, aIndex, bIndex }) => {
         const posAttr = geo.getAttribute('position') as BufferAttribute;
         const a = nodes[aIndex].mesh.position;
         const b = nodes[bIndex].mesh.position;
         posAttr.setXYZ(0, a.x, a.y, a.z);
         posAttr.setXYZ(1, b.x, b.y, b.z);
         posAttr.needsUpdate = true;
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
