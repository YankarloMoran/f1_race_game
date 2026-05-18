import * as THREE from 'three';

export class WeatherSystem {
  constructor(scene) {
    this.scene = scene;
    this.rainParticles = [];
    this.isRaining = false;
    this.rainIntensity = 0;
    this.transitionSpeed = 0.15;
    this.wetness = 0; // 0-1 affects grip

    // Rain geometry pool
    this.rainGeo = new THREE.BoxGeometry(0.03, 0.6, 0.03);
    this.rainMat = new THREE.MeshBasicMaterial({
      color: 0xaaccee,
      transparent: true,
      opacity: 0.35
    });

    // Spray from car wheels
    this.sprayGeo = new THREE.SphereGeometry(0.15, 3, 3);
    this.sprayMat = new THREE.MeshBasicMaterial({
      color: 0xbbddff,
      transparent: true,
      opacity: 0.2
    });
    this.sprayParticles = [];

    // Rain drop pool (pre-allocate for performance)
    this.maxDrops = 300;
    this.drops = [];
    for (let i = 0; i < this.maxDrops; i++) {
      const drop = new THREE.Mesh(this.rainGeo, this.rainMat);
      drop.visible = false;
      this.scene.add(drop);
      this.drops.push({
        mesh: drop,
        velocity: 0,
        active: false
      });
    }

    // Dark overlay for rainy atmosphere
    this.darkOverlay = null;
    this.originalFogColor = null;
  }

  startRain() {
    this.isRaining = true;
  }

  stopRain() {
    this.isRaining = false;
  }

  toggleRain() {
    this.isRaining = !this.isRaining;
  }

  getGripMultiplier() {
    // Wet track reduces grip by up to 35%
    return 1.0 - (this.wetness * 0.35);
  }

  update(dt, carPosition) {
    // Smooth transition
    const target = this.isRaining ? 1.0 : 0.0;
    this.rainIntensity += (target - this.rainIntensity) * this.transitionSpeed * dt;
    this.wetness += (target * 0.8 - this.wetness) * 0.05 * dt;

    // Update fog for atmosphere
    if (this.scene.fog) {
      const fogNear = THREE.MathUtils.lerp(200, 80, this.rainIntensity);
      const fogFar = THREE.MathUtils.lerp(850, 400, this.rainIntensity);
      this.scene.fog.near = fogNear;
      this.scene.fog.far = fogFar;

      const gray = THREE.MathUtils.lerp(0.53, 0.35, this.rainIntensity);
      this.scene.fog.color.setRGB(gray, gray, gray + 0.05);
    }

    // Spawn rain drops around the car
    if (this.rainIntensity > 0.1 && carPosition) {
      const spawnCount = Math.floor(this.rainIntensity * 8);
      for (let i = 0; i < spawnCount; i++) {
        this._spawnDrop(carPosition);
      }
    }

    // Update active drops
    for (const d of this.drops) {
      if (!d.active) continue;
      d.mesh.position.y -= d.velocity * dt;
      if (d.mesh.position.y < 0) {
        d.active = false;
        d.mesh.visible = false;
      }
    }

    // Update spray particles
    for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
      const s = this.sprayParticles[i];
      s.life -= dt * 3;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        this.sprayParticles.splice(i, 1);
        continue;
      }
      s.mesh.position.add(s.velocity.clone().multiplyScalar(dt));
      s.mesh.material.opacity = s.life * 0.2;
      s.mesh.scale.setScalar(1 + (1 - s.life) * 1.5);
    }
  }

  _spawnDrop(carPos) {
    // Find an inactive drop
    for (const d of this.drops) {
      if (d.active) continue;
      d.active = true;
      d.mesh.visible = true;
      d.mesh.position.set(
        carPos.x + (Math.random() - 0.5) * 80,
        40 + Math.random() * 20,
        carPos.z + (Math.random() - 0.5) * 80
      );
      d.velocity = 30 + Math.random() * 15;
      return;
    }
  }

  emitSpray(position, speed, angle) {
    if (this.wetness < 0.2 || Math.abs(speed) < 10) return;
    if (Math.random() > 0.3) return;
    if (this.sprayParticles.length > 40) return;

    const mat = this.sprayMat.clone();
    const mesh = new THREE.Mesh(this.sprayGeo, mat);
    mesh.position.copy(position);
    mesh.position.y = 0.2;
    mesh.position.x -= Math.sin(angle) * 2;
    mesh.position.z -= Math.cos(angle) * 2;

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 4 - Math.sin(angle) * 3,
      Math.random() * 3 + 1,
      (Math.random() - 0.5) * 4 - Math.cos(angle) * 3
    );

    this.sprayParticles.push({ mesh, velocity, life: 1.0 });
    this.scene.add(mesh);
  }
}
