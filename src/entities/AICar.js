import * as THREE from 'three';

export class AICar {
  constructor(scene, color, speedBase, sidewaysOffset, startPosition, track, aiBreakZones = []) {
    this.scene = scene;
    this.color = color;
    this.speedBase = speedBase;
    this.speed = speedBase;
    this.sidewaysOffset = sidewaysOffset;
    
    this.wheels = [];
    this.curveLength = 1;
    this.laps = 0;
    this.aiBreakZones = aiBreakZones;
    
    this.buildMesh();

    const status = track.getTrackStatus(startPosition);
    this.t = status.t;
    this.mesh.position.copy(startPosition);
  }

  buildMesh() {
    this.mesh = new THREE.Group();

    // Materiales F1 AI
    const bodyMat = new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.8, roughness: 0.15 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.15 });
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 });
    const wishboneMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.4 }); // Brazos suspensión
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.2 }); // Casco blanco del AI

    // 1. Chasis Principal
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 3.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.35, 0);
    body.castShadow = true;
    this.mesh.add(body);

    // 2. Pontones
    const leftPodGeo = new THREE.BoxGeometry(0.3, 0.35, 1.8);
    const leftPod = new THREE.Mesh(leftPodGeo, blackMat);
    leftPod.position.set(0.65, 0.3, -0.2);
    leftPod.castShadow = true;
    this.mesh.add(leftPod);

    const rightPodGeo = new THREE.BoxGeometry(0.3, 0.35, 1.8);
    const rightPod = new THREE.Mesh(rightPodGeo, blackMat);
    rightPod.position.set(-0.65, 0.3, -0.2);
    rightPod.castShadow = true;
    this.mesh.add(rightPod);

    // 3. Nariz
    const noseGeo = new THREE.ConeGeometry(0.5, 1.2, 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1, 0.6, 1.5);
    nose.position.set(0, 0.25, 2.2);
    nose.castShadow = true;
    this.mesh.add(nose);

    // 4. Alerones
    const frontWingGeo = new THREE.BoxGeometry(2.4, 0.08, 0.45);
    const frontWing = new THREE.Mesh(frontWingGeo, blackMat);
    frontWing.position.set(0, 0.1, 2.8);
    frontWing.castShadow = true;
    this.mesh.add(frontWing);

    // Alerón Trasero Completo (como el del jugador)
    const rearWingAssembly = new THREE.Group();
    rearWingAssembly.position.set(0, 1.0, -1.8);
    
    const rearWingGeo = new THREE.BoxGeometry(2.2, 0.08, 0.7);
    const rearWing = new THREE.Mesh(rearWingGeo, bodyMat);
    rearWing.position.set(0, 0.1, 0);
    rearWing.castShadow = true;
    rearWingAssembly.add(rearWing);
    this.mesh.add(rearWingAssembly);

    const supportGeo = new THREE.BoxGeometry(0.1, 0.8, 0.4);
    const supportLeft = new THREE.Mesh(supportGeo, blackMat);
    supportLeft.position.set(0.4, 0.4, -1.8);
    supportLeft.castShadow = true;
    this.mesh.add(supportLeft);

    const supportRight = new THREE.Mesh(supportGeo, blackMat);
    supportRight.position.set(-0.4, 0.4, -1.8);
    supportRight.castShadow = true;
    this.mesh.add(supportRight);

    // 5. Cockpit & Casco
    const cockpitGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8);
    const cockpit = new THREE.Mesh(cockpitGeo, blackMat);
    cockpit.position.set(0, 0.56, 0.2);
    this.mesh.add(cockpit);

    const helmetGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.75, 0.1);
    helmet.castShadow = true;
    this.mesh.add(helmet);

    // Visera del casco reflectante
    const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.1);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.77, 0.28);
    this.mesh.add(visor);

    // 6. Halo Protector
    const centralPillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    const centralPillar = new THREE.Mesh(centralPillarGeo, wishboneMat);
    centralPillar.position.set(0, 0.75, 0.5);
    this.mesh.add(centralPillar);

    const haloRingGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 16);
    const haloRing = new THREE.Mesh(haloRingGeo, wishboneMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 0.9, 0.2);
    this.mesh.add(haloRing);

    // 7. Brazos de Suspensión
    const wishboneGeo = new THREE.BoxGeometry(0.75, 0.03, 0.08);

    // Delanteros
    const wishFrontLeft = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishFrontLeft.position.set(0.48, 0.3, 1.3);
    wishFrontLeft.rotation.z = -Math.PI / 18;
    this.mesh.add(wishFrontLeft);

    const wishFrontRight = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishFrontRight.position.set(-0.48, 0.3, 1.3);
    wishFrontRight.rotation.z = Math.PI / 18;
    this.mesh.add(wishFrontRight);

    // Traseros
    const wishRearLeft = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishRearLeft.position.set(0.55, 0.32, -1.2);
    wishRearLeft.rotation.z = -Math.PI / 18;
    this.mesh.add(wishRearLeft);

    const wishRearRight = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishRearRight.position.set(-0.55, 0.32, -1.2);
    wishRearRight.rotation.z = Math.PI / 18;
    this.mesh.add(wishRearRight);

    // 8. Ruedas
    const createWheel = (x, y, z, isFront) => {
      const wheelGroup = new THREE.Group();
      const width = isFront ? 0.6 : 0.8;
      const radius = isFront ? 0.55 : 0.6;
      const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 10);
      const tyre = new THREE.Mesh(wheelGeo, tyreMat);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wheelGroup.add(tyre);

      const rimGeo = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, width + 0.02, 6);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      wheelGroup.position.set(x, y, z);
      return wheelGroup;
    };

    this.rearLeft = createWheel(0.95, 0.3, -1.2, false);
    this.rearRight = createWheel(-0.95, 0.3, -1.2, false);
    this.frontLeft = createWheel(0.85, 0.28, 1.3, true);
    this.frontRight = createWheel(-0.85, 0.28, 1.3, true);

    this.mesh.add(this.rearLeft, this.rearRight, this.frontLeft, this.frontRight);
    this.wheels.push(this.rearLeft, this.rearRight, this.frontLeft, this.frontRight);

    this.scene.add(this.mesh);
  }

  getSpeedFactor() {
    // Parametrized braking from track data
    for (const zone of this.aiBreakZones) {
      if (this.t >= zone.tStart && this.t <= zone.tEnd) {
        return zone.speedFactor;
      }
    }
    return 1.0; // Full speed on straights
  }

  update(dt, track, isPrestartLocked) {
    if (this.curveLength === 1) {
      this.curveLength = track.curve.getLength();
    }

    // Si la carrera no ha largado (start lights active), su velocidad es 0
    let speed = 0;
    if (!isPrestartLocked) {
      // Ajuste fino con freno inteligente en chicanas y rectas
      const baseFactor = this.getSpeedFactor();
      speed = (this.speedBase * baseFactor) + Math.sin(this.t * Math.PI * 12) * 2;
    }
    this.speed = speed;
    
    // Mover el progreso 't' a lo largo de la curva
    this.t += (speed * dt) / this.curveLength;
    if (this.t > 1.0) {
      this.t -= 1.0;
      this.laps++;
    }
    if (this.t < 0.0) {
      this.t += 1.0;
      this.laps--;
    }

    // Obtener coordenadas de la curva principal
    const point = track.curve.getPointAt(this.t);
    const tangent = track.curve.getTangentAt(this.t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Desplazar lateralmente para que parezca que están rebasando
    const finalPosition = point.clone().add(right.multiplyScalar(this.sidewaysOffset));
    
    // La altura del coche AI sobre el asfalto
    finalPosition.y = 0.35;
    this.mesh.position.copy(finalPosition);

    // Orientar coche en dirección de la curva
    const targetLook = finalPosition.clone().add(tangent);
    this.mesh.lookAt(targetLook);

    // Hacer rotar visualmente los neumáticos del coche AI
    const wheelCircumference = 2 * Math.PI * 0.6;
    const rotationIncrement = (speed * dt) / wheelCircumference * (2 * Math.PI);
    this.wheels.forEach(w => {
      w.children.forEach(mesh => {
        mesh.rotation.x += rotationIncrement;
      });
    });
  }
}
