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
  Line,
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
    const nodePositions: Vector3[] = [];
    const nodeGeo = new SphereGeometry(0.06, 16, 16);

    concepts.forEach((_, i) => {
      const phi   = Math.acos(-1 + (2 * i) / concepts.length);
      const theta = Math.sqrt(concepts.length * Math.PI) * phi;
      const pos   = new Vector3(
        2.2 * Math.cos(theta) * Math.sin(phi),
        2.2 * Math.sin(theta) * Math.sin(phi),
        2.2 * Math.cos(phi),
      );
      nodePositions.push(pos);

      const shade   = 0.3 + (i / concepts.length) * 0.4;
      const nodeMat = new MeshBasicMaterial({ color: new Color(shade, shade, shade) });
      const mesh    = new Mesh(nodeGeo, nodeMat);
      mesh.position.copy(pos);
      scene.add(mesh);
    });

    // ── Edges ────────────────────────────────────────────────────────
    const edgeMat = new LineBasicMaterial({ color: 0xcccccc, opacity: 0.35, transparent: true });
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 2.8) {
          const geo = new BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]]);
          scene.add(new Line(geo, edgeMat));
        }
      }
    }

    // ── Animation ────────────────────────────────────────────────────
    let raf: number;
    let angle = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      angle += 0.003;
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
