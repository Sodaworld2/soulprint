// 3D Model Viewer — Three.js with GLTFLoader, OrbitControls, dark theme
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Box, RotateCw } from 'lucide-react';

interface Props {
  modelBlob: Blob | null;
  filename: string;
}

const PointCloudViewer: React.FC<Props> = ({ modelBlob, filename }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !modelBlob) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(2, 2, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x6366f1, 0.3);
    backLight.position.set(-5, 3, -5);
    scene.add(backLight);

    // Grid floor
    const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    scene.add(grid);

    // Load model
    setLoading(true);
    setError(null);
    const url = URL.createObjectURL(modelBlob);

    const onLoad = (object: THREE.Object3D) => {
      // Center and scale
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      object.scale.setScalar(scale);
      object.position.sub(center.multiplyScalar(scale));

      scene.add(object);
      setLoading(false);
      URL.revokeObjectURL(url);
    };

    const onError = (_err: unknown) => {
      setError('Failed to load 3D model');
      setLoading(false);
      URL.revokeObjectURL(url);
    };

    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'glb' || ext === 'gltf') {
      new GLTFLoader().load(url, (gltf) => onLoad(gltf.scene), undefined, onError);
    } else if (ext === 'obj') {
      new OBJLoader().load(url, onLoad, undefined, onError);
    } else {
      setError(`Unsupported format: .${ext}`);
      setLoading(false);
    }

    // Animate
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
      container.innerHTML = '';
    };
  }, [modelBlob, filename]);

  if (!modelBlob) {
    return (
      <div className="border border-slate-700 rounded-xl p-8 text-center">
        <Box className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-sm text-slate-500">No 3D model uploaded</p>
        <p className="text-xs text-slate-600 mt-1">Upload a GLB/OBJ to view here</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-700">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <RotateCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
          <p className="text-sm text-rose-400">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height: '400px' }} />
    </div>
  );
};

export default PointCloudViewer;
