import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.clouds = [];

    this.createSkybox();
    this.createLighting();
    this.createTerrain();
    this.createMountains();
    this.createClouds();
    this.createFlags();
  }

  createSkybox() {
    // Procedural gradient sky using a large inverted sphere
    const skyGeo = new THREE.SphereGeometry(900, 32, 15);
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');

    // Sky gradient: deep blue top -> light blue -> warm horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.15, '#1a3a5c');
    grad.addColorStop(0.35, '#4a90c4');
    grad.addColorStop(0.55, '#87CEEB');
    grad.addColorStop(0.75, '#b8dce8');
    grad.addColorStop(0.90, '#ffe4c4');
    grad.addColorStop(1.0, '#ffd4a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);

    // Remove the flat background color, let skybox handle it
    this.scene.background = null;
    this.scene.fog = new THREE.Fog(0x87CEEB, 200, 850);
  }

  createLighting() {
    // Warm ambient for Italian sunlight
    const ambient = new THREE.AmbientLight(0xdbe9f9, 0.65);
    this.scene.add(ambient);

    // Hemisphere light for sky/ground bounce
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x387a56, 0.4);
    this.scene.add(hemi);

    // Sun directional with high quality shadows
    const sun = new THREE.DirectionalLight(0xfffaee, 2.5);
    sun.position.set(120, 200, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 500;
    const d = 180;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0004;
    this.scene.add(sun);

    // Subtle fill light from opposite side
    const fill = new THREE.DirectionalLight(0xc4d4e4, 0.3);
    fill.position.set(-100, 80, -60);
    this.scene.add(fill);
  }

  createTerrain() {
    // Main grass
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x387a56,
      roughness: 0.95,
      metalness: 0.02
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Striped mowing pattern
    const stripeW = 16;
    const stripeGeo = new THREE.PlaneGeometry(2000, stripeW);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x285c3f,
      roughness: 0.95,
      metalness: 0.02
    });
    for (let z = -1000; z < 1000; z += stripeW * 2) {
      const s = new THREE.Mesh(stripeGeo, stripeMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(0, 0.002, z);
      s.receiveShadow = true;
      this.scene.add(s);
    }

    // Wild patches far from track
    const detailGeo = new THREE.PlaneGeometry(18, 18);
    const detailMat = new THREE.MeshStandardMaterial({ color: 0x1e462f, roughness: 0.95 });
    for (let i = 0; i < 50; i++) {
      const patch = new THREE.Mesh(detailGeo, detailMat);
      const angle = Math.random() * Math.PI * 2;
      const radius = 350 + Math.random() * 350;
      patch.position.set(Math.cos(angle) * radius, 0.003, Math.sin(angle) * radius);
      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = Math.random() * Math.PI;
      patch.receiveShadow = true;
      this.scene.add(patch);
    }
  }

  createMountains() {
    // Varied mountain types for depth
    const mountainMat1 = new THREE.MeshStandardMaterial({ color: 0x4a5759, roughness: 0.9 });
    const mountainMat2 = new THREE.MeshStandardMaterial({ color: 0x5c6b6e, roughness: 0.85 });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.7 });

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 620 + Math.random() * 100;
      const scaleY = 1.2 + Math.random() * 1.8;

      const mGeo = new THREE.ConeGeometry(50, 100, 5 + Math.floor(Math.random() * 3));
      const m = new THREE.Mesh(mGeo, i % 3 === 0 ? mountainMat2 : mountainMat1);
      m.position.set(Math.cos(angle) * radius, 35 * scaleY, Math.sin(angle) * radius);
      m.scale.set(3 + Math.random() * 2.5, scaleY, 3 + Math.random() * 2.5);
      m.receiveShadow = true;
      this.scene.add(m);

      // Snow cap on taller mountains
      if (scaleY > 2.0) {
        const capGeo = new THREE.ConeGeometry(18, 20, 5);
        const cap = new THREE.Mesh(capGeo, snowCapMat);
        cap.position.copy(m.position);
        cap.position.y = 35 * scaleY * 2 + 30;
        cap.scale.set(m.scale.x * 0.4, scaleY * 0.3, m.scale.z * 0.4);
        this.scene.add(cap);
      }
    }
  }

  createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      flatShading: true
    });

    for (let c = 0; c < 18; c++) {
      const group = new THREE.Group();
      const num = 4 + Math.floor(Math.random() * 5);
      for (let s = 0; s < num; s++) {
        const r = 5 + Math.random() * 7;
        const geo = new THREE.SphereGeometry(r, 6, 5);
        const sphere = new THREE.Mesh(geo, cloudMat);
        sphere.position.set(
          (s - num / 2) * 5.5 + (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 4
        );
        group.add(sphere);
      }
      const angle = Math.random() * Math.PI * 2;
      const radius = 100 + Math.random() * 300;
      group.position.set(Math.cos(angle) * radius, 85 + Math.random() * 35, Math.sin(angle) * radius);
      this.scene.add(group);
      this.clouds.push(group);
    }
  }

  createFlags() {
    // F1 flags along the track perimeter
    const flagColors = [0xe63946, 0xffffff, 0x1e293b, 0xffb703, 0x00b4d8];
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const flagGeo = new THREE.PlaneGeometry(1.8, 1.0);

    // Place flags at intervals along a circle around the track center
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const radius = 260 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 3, z);
      pole.castShadow = true;
      this.scene.add(pole);

      const flagMat = new THREE.MeshBasicMaterial({
        color: flagColors[i % flagColors.length],
        side: THREE.DoubleSide
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(x + 0.9, 5.5, z);
      flag.rotation.y = angle;
      this.scene.add(flag);
    }
  }
}
