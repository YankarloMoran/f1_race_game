import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.decals = [];

    // Shared geometries
    this.smallGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    this.tinyGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.smokeGeo = new THREE.SphereGeometry(0.3, 4, 4);
    this.skidGeo = new THREE.PlaneGeometry(1.4, 0.5);
    this.confettiGeo = new THREE.PlaneGeometry(0.3, 0.15);

    // Materials
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.titaniumSparkMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.35 });
    this.grassMat = new THREE.MeshBasicMaterial({ color: 0x38b000 });
    this.skidMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false });

    // Confetti colors
    this.confettiColors = [0xe63946, 0xffb703, 0x00b4d8, 0x2ecc71, 0xffffff, 0xff7b00];

    window.addEventListener('carCollision', (e) => this.emitSparks(e.detail.position));
  }

  emitSparks(position) {
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(this.smallGeo, this.sparkMat);
      mesh.position.copy(position);
      mesh.position.x += (Math.random() - 0.5) * 1.5;
      mesh.position.z += (Math.random() - 0.5) * 1.5;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        Math.random() * 9 + 4,
        (Math.random() - 0.5) * 16
      );
      this.particles.push({ mesh, velocity, life: 1.0, type: 'spark' });
      this.scene.add(mesh);
    }
  }

  emitTitaniumSparks(position, speed) {
    // Floor scraping sparks — bright white/yellow, small, fast
    if (Math.random() > 0.4) return;
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(this.tinyGeo, this.titaniumSparkMat);
      mesh.position.copy(position);
      mesh.position.y = 0.08;
      mesh.position.x += (Math.random() - 0.5) * 0.8;
      mesh.position.z += (Math.random() - 0.5) * 0.8;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 8
      );
      this.particles.push({ mesh, velocity, life: 0.5, type: 'titanium' });
      this.scene.add(mesh);
    }
  }

  emitSmoke(position, carAngle) {
    if (Math.random() > 0.35) return;
    const mesh = new THREE.Mesh(this.smokeGeo, this.smokeMat.clone());
    mesh.position.copy(position);
    mesh.position.x -= Math.sin(carAngle) * 2.2;
    mesh.position.z -= Math.cos(carAngle) * 2.2;
    mesh.position.y = 0.3;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2.5 + 1.5,
      (Math.random() - 0.5) * 2
    );
    this.particles.push({ mesh, velocity, life: 1.0, type: 'smoke', mat: mesh.material });
    this.scene.add(mesh);
  }

  emitGrass(position, carAngle) {
    if (Math.random() > 0.2) return;
    const mesh = new THREE.Mesh(this.smallGeo, this.grassMat);
    mesh.position.copy(position);
    mesh.position.x -= Math.sin(carAngle) * 2.0;
    mesh.position.z -= Math.cos(carAngle) * 2.0;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 6 - Math.sin(carAngle) * 5,
      Math.random() * 6 + 3,
      (Math.random() - 0.5) * 6 - Math.cos(carAngle) * 5
    );
    this.particles.push({ mesh, velocity, life: 1.0, type: 'grass' });
    this.scene.add(mesh);
  }

  emitSkidmark(position, carAngle) {
    if (Math.random() > 0.55) return;
    const mat = this.skidMat.clone();
    const skid = new THREE.Mesh(this.skidGeo, mat);
    skid.rotation.x = -Math.PI / 2;
    skid.rotation.z = carAngle;
    skid.position.copy(position);
    skid.position.y = 0.022;
    this.scene.add(skid);
    this.decals.push({ mesh: skid, material: mat, life: 1.0 });

    if (this.decals.length > 100) {
      const old = this.decals.shift();
      this.scene.remove(old.mesh);
      old.material.dispose();
    }
  }

  emitConfetti(position) {
    for (let i = 0; i < 80; i++) {
      const colorHex = this.confettiColors[Math.floor(Math.random() * this.confettiColors.length)];
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(this.confettiGeo, mat);
      mesh.position.copy(position);
      mesh.position.y += 8;
      mesh.position.x += (Math.random() - 0.5) * 10;
      mesh.position.z += (Math.random() - 0.5) * 10;
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 12
      );
      this.particles.push({ mesh, velocity, life: 3.0, type: 'confetti', mat, spin: Math.random() * 5 });
      this.scene.add(mesh);
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const fadeRate = p.type === 'confetti' ? 0.7 : (p.type === 'titanium' ? 4.0 : 2.2);
      p.life -= dt * fadeRate;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        if (p.mat) p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));

      if (p.type === 'spark' || p.type === 'titanium') {
        p.velocity.y -= 28 * dt;
        p.mesh.scale.setScalar(p.life);
      } else if (p.type === 'smoke') {
        p.velocity.y *= 0.98;
        p.mesh.scale.setScalar(1.0 + (1.0 - p.life) * 2.0);
        p.mat.opacity = p.life * 0.3;
      } else if (p.type === 'grass') {
        p.velocity.y -= 22 * dt;
        p.mesh.scale.setScalar(p.life);
      } else if (p.type === 'confetti') {
        p.velocity.y -= 4 * dt;
        p.velocity.x *= 0.995;
        p.velocity.z *= 0.995;
        p.mesh.rotation.x += p.spin * dt;
        p.mesh.rotation.z += p.spin * 0.7 * dt;
        p.mat.opacity = Math.min(1, p.life);
      }
    }

    // Fade skidmarks
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.life -= dt * 0.06;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.material.dispose();
        this.decals.splice(i, 1);
      } else {
        d.material.opacity = d.life * 0.45;
      }
    }
  }
}
