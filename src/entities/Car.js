import * as THREE from 'three';

export class Car {
  constructor(scene) {
    this.scene = scene;
    
    this.speed = 0;
    this.baseMaxSpeed = 80;
    this.maxSpeed = 80; 
    this.acceleration = 45;
    this.angle = 0;
    this.steerAngle = 0;
    
    this.velocity = new THREE.Vector3();
    this.isDrifting = false;
    this.isOnGrass = false;
    this.isOnCurb = false;
    this.drsActive = false;
    this.drsAvailable = false;
    this.inPitZone = false;
    this.damage = 0;
    
    // Neumáticos F1
    this.tyreCompound = 'S';
    this.tyreWear = 0.0;
    this.tyreStripeMaterial = new THREE.MeshBasicMaterial({ color: 0xe63946, side: THREE.DoubleSide });

    // Advanced physics
    this.ersEnergy = 100; // ERS battery 0-100
    this.ersMaxEnergy = 100;
    this.wheelsLocked = false;
    this.brakeGlow = 0; // Brake disc glow intensity 0-1
    this.currentPitch = 0; // Body pitch for accel/brake
    this.currentRoll = 0; // Body roll for cornering
    this.lateralG = 0;
    this.longitudinalG = 0;
    this.prevSpeed = 0;
    this.weatherGrip = 1.0; // Set externally by WeatherSystem

    this.wheels = [];
    this.frontLeftPivot = null;
    this.frontRightPivot = null;
    this.rearWing = null;
    this.frontWing = null;
    this.exhaustGlow = null;
    this.rearSafetyLight = null;
    this.bodyGroup = null; // For pitch/roll
    this.brakeLights = [];

    this.buildMesh();
    this.mesh.position.set(0, 0.5, 70);
    this.angle = 0;
  }

  buildMesh() {
    this.mesh = new THREE.Group();
    this.bodyGroup = new THREE.Group(); // Wrapper for pitch/roll dynamics
    this.mesh.add(this.bodyGroup);

    // Materiales Premium F1
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.8, roughness: 0.1 }); // Rojo F1 Brillante
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.15 }); // Carbono negro aerodinámico
    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 }); // Goma de llantas
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }); // Rines plateados
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0xffb703, metalness: 0.5, roughness: 0.2 }); // Casco amarillo brillante del piloto
    const wishboneMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.8, roughness: 0.4 }); // Brazos suspensión
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0 }); // Fuego escape

    // 1. Chasis Principal (Monocasco)
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 3.8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0.35, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    this.bodyGroup.add(body);

    // 2. Pontones Laterales (Sidepods)
    const leftPodGeo = new THREE.BoxGeometry(0.3, 0.35, 1.8);
    const leftPod = new THREE.Mesh(leftPodGeo, blackMat);
    leftPod.position.set(0.65, 0.3, -0.2);
    leftPod.castShadow = true;
    this.bodyGroup.add(leftPod);

    const rightPodGeo = new THREE.BoxGeometry(0.3, 0.35, 1.8);
    const rightPod = new THREE.Mesh(rightPodGeo, blackMat);
    rightPod.position.set(-0.65, 0.3, -0.2);
    rightPod.castShadow = true;
    this.bodyGroup.add(rightPod);

    // 3. Nariz Tapered (Cono delantero)
    const noseGeo = new THREE.ConeGeometry(0.5, 1.2, 4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1, 0.6, 1.5);
    nose.position.set(0, 0.25, 2.2);
    nose.castShadow = true;
    this.bodyGroup.add(nose);

    // 4. Alerón Delantero (Front Wing)
    const frontWingGeo = new THREE.BoxGeometry(2.4, 0.08, 0.45);
    this.frontWing = new THREE.Mesh(frontWingGeo, blackMat);
    this.frontWing.position.set(0, 0.1, 2.8);
    this.frontWing.castShadow = true;
    this.bodyGroup.add(this.frontWing);

    // 5. Alerón Trasero (Rear Wing) con soporte (Pivotable para DRS!)
    this.rearWingAssembly = new THREE.Group();
    this.rearWingAssembly.position.set(0, 1.0, -1.8);

    const rearWingGeo = new THREE.BoxGeometry(2.2, 0.08, 0.7);
    this.rearWing = new THREE.Mesh(rearWingGeo, bodyMat);
    this.rearWing.position.set(0, 0.1, 0); // Desplazamiento respecto al pivote
    this.rearWing.castShadow = true;
    this.rearWingAssembly.add(this.rearWing);
    this.bodyGroup.add(this.rearWingAssembly);

    const supportGeo = new THREE.BoxGeometry(0.1, 0.8, 0.4);
    const supportLeft = new THREE.Mesh(supportGeo, blackMat);
    supportLeft.position.set(0.4, 0.4, -1.8);
    supportLeft.castShadow = true;
    this.bodyGroup.add(supportLeft);

    const supportRight = new THREE.Mesh(supportGeo, blackMat);
    supportRight.position.set(-0.4, 0.4, -1.8);
    supportRight.castShadow = true;
    this.bodyGroup.add(supportRight);

    // 6. Habitáculo y Casco del Piloto
    const cockpitGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8);
    const cockpit = new THREE.Mesh(cockpitGeo, blackMat);
    cockpit.position.set(0, 0.56, 0.2);
    this.bodyGroup.add(cockpit);

    const helmetGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 0.75, 0.1);
    helmet.castShadow = true;
    this.bodyGroup.add(helmet);

    // Visera del casco reflectante
    const visorGeo = new THREE.BoxGeometry(0.24, 0.08, 0.1);
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.77, 0.28);
    this.bodyGroup.add(visor);

    // ==========================================
    // 🛠️ ACTUALIZACIÓN PREMIM: HALO DE PROTECCIÓN F1
    // ==========================================
    // Soporte central delantero del halo
    const centralPillarGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
    const centralPillar = new THREE.Mesh(centralPillarGeo, wishboneMat);
    centralPillar.position.set(0, 0.75, 0.5);
    this.bodyGroup.add(centralPillar);

    // Estructura semicircular superior
    const haloRingGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 16);
    const haloRing = new THREE.Mesh(haloRingGeo, wishboneMat);
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(0, 0.9, 0.2);
    this.bodyGroup.add(haloRing);

    // ==========================================
    // 🛠️ ACTUALIZACIÓN PREMIUM: BRAZOS DE SUSPENSIÓN (WISHBONES)
    // ==========================================
    const wishboneGeo = new THREE.BoxGeometry(0.75, 0.03, 0.08);

    // Suspensión Delantera
    const wishFrontLeft = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishFrontLeft.position.set(0.48, 0.3, 1.3);
    wishFrontLeft.rotation.z = -Math.PI / 18;
    this.bodyGroup.add(wishFrontLeft);

    const wishFrontRight = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishFrontRight.position.set(-0.48, 0.3, 1.3);
    wishFrontRight.rotation.z = Math.PI / 18;
    this.bodyGroup.add(wishFrontRight);

    // Suspensión Trasera
    const wishRearLeft = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishRearLeft.position.set(0.55, 0.32, -1.2);
    wishRearLeft.rotation.z = -Math.PI / 18;
    this.bodyGroup.add(wishRearLeft);

    const wishRearRight = new THREE.Mesh(wishboneGeo, wishboneMat);
    wishRearRight.position.set(-0.55, 0.32, -1.2);
    wishRearRight.rotation.z = Math.PI / 18;
    this.bodyGroup.add(wishRearRight);

    // ==========================================
    // 🛠️ ACTUALIZACIÓN PREMIUM: ESCAPE TRASERO Y GLOW DE FUEGO
    // ==========================================
    const exhaustGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.55);
    const exhaust = new THREE.Mesh(exhaustGeo, blackMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0.35, -1.9);
    this.bodyGroup.add(exhaust);

    // Cono de fuego procedural al acelerar
    const fireGeo = new THREE.ConeGeometry(0.14, 0.65, 6);
    this.exhaustGlow = new THREE.Mesh(fireGeo, fireMat);
    this.exhaustGlow.rotation.x = -Math.PI / 2;
    this.exhaustGlow.position.set(0, 0.35, -2.4);
    this.bodyGroup.add(this.exhaustGlow);

    // 7. Cámara de Inducción
    const tCamGeo = new THREE.BoxGeometry(0.2, 0.3, 0.4);
    const tCam = new THREE.Mesh(tCamGeo, blackMat);
    tCam.position.set(0, 1.05, -0.4);
    tCam.castShadow = true;
    this.bodyGroup.add(tCam);

    // F1 Airbox T-Cam Pod (Cámara F1 física sobre la inducción)
    const camPodGeo = new THREE.BoxGeometry(0.12, 0.06, 0.22);
    const camPodMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.1 }); // Amarillo fluorescente
    const camPod = new THREE.Mesh(camPodGeo, camPodMat);
    camPod.position.set(0, 1.22, -0.4);
    this.bodyGroup.add(camPod);

    // Luz LED Trasera de Lluvia
    const safetyLightGeo = new THREE.BoxGeometry(0.18, 0.18, 0.08);
    const safetyLightMat = new THREE.MeshBasicMaterial({ color: 0x330000 });
    this.rearSafetyLight = new THREE.Mesh(safetyLightGeo, safetyLightMat);
    this.rearSafetyLight.position.set(0, 0.2, -1.9);
    this.bodyGroup.add(this.rearSafetyLight);

    // === DETAIL ADDITIONS ===
    // Floor plate (visible from low cameras)
    const floorGeo = new THREE.BoxGeometry(1.6, 0.04, 4.2);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0.05, 0);
    this.bodyGroup.add(floor);

    // Diffuser (angled under rear)
    const diffGeo = new THREE.BoxGeometry(1.4, 0.25, 0.6);
    const diff = new THREE.Mesh(diffGeo, blackMat);
    diff.position.set(0, 0.12, -2.1);
    diff.rotation.x = -0.35;
    this.bodyGroup.add(diff);

    // Side mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.12, 0.1, 0.08);
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 });
    const mirrorL = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorL.position.set(0.72, 0.55, 0.6);
    this.bodyGroup.add(mirrorL);
    const mirrorR = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirrorR.position.set(-0.72, 0.55, 0.6);
    this.bodyGroup.add(mirrorR);

    // Barge boards (small aero deflectors)
    const bargeGeo = new THREE.BoxGeometry(0.04, 0.3, 0.5);
    const bargeL = new THREE.Mesh(bargeGeo, blackMat);
    bargeL.position.set(0.5, 0.3, 0.9);
    bargeL.rotation.y = 0.15;
    this.bodyGroup.add(bargeL);
    const bargeR = new THREE.Mesh(bargeGeo, blackMat);
    bargeR.position.set(-0.5, 0.3, 0.9);
    bargeR.rotation.y = -0.15;
    this.bodyGroup.add(bargeR);

    // Radio antenna
    const antennaGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.5);
    const antenna = new THREE.Mesh(antennaGeo, blackMat);
    antenna.position.set(0.08, 1.35, -0.4);
    this.bodyGroup.add(antenna);

    // 8. Crear Ruedas
    const createWheel = (x, y, z, isFront, isLeft) => {
      const wheelGroup = new THREE.Group();
      
      const width = isFront ? 0.6 : 0.8;
      const radius = isFront ? 0.55 : 0.6;
      const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 12);
      const tyre = new THREE.Mesh(wheelGeo, tyreMat);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wheelGroup.add(tyre);

      const rimGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 8);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);
      
      const spokeGeo = new THREE.BoxGeometry(radius * 0.9, 0.05, radius * 0.9);
      const spoke = new THREE.Mesh(spokeGeo, blackMat);
      spoke.position.x = width / 2 + 0.02;
      wheelGroup.add(spoke);

      // Banda de neumático Pirelli F1 tridimensional
      const ringGeo = new THREE.RingGeometry(radius * 0.62, radius * 0.82, 12);
      const stripe = new THREE.Mesh(ringGeo, this.tyreStripeMaterial);
      stripe.rotation.y = Math.PI / 2;
      const outerSign = isLeft ? 1 : -1;
      stripe.position.x = outerSign * (width / 2 + 0.005);
      wheelGroup.add(stripe);

      wheelGroup.position.set(x, y, z);
      return wheelGroup;
    };

    // Ruedas Traseras
    this.rearLeft = createWheel(0.95, 0.3, -1.2, false, true);
    this.rearRight = createWheel(-0.95, 0.3, -1.2, false, false);
    this.mesh.add(this.rearLeft);
    this.mesh.add(this.rearRight);
    this.wheels.push(this.rearLeft, this.rearRight);

    // Ruedas Delanteras
    this.frontLeftPivot = new THREE.Group();
    this.frontLeftPivot.position.set(0.85, 0.28, 1.3);
    this.frontLeft = createWheel(0, 0, 0, true, true);
    this.frontLeftPivot.add(this.frontLeft);
    this.mesh.add(this.frontLeftPivot);
    this.wheels.push(this.frontLeft);

    this.frontRightPivot = new THREE.Group();
    this.frontRightPivot.position.set(-0.85, 0.28, 1.3);
    this.frontRight = createWheel(0, 0, 0, true, false);
    this.frontRightPivot.add(this.frontRight);
    this.mesh.add(this.frontRightPivot);
    this.wheels.push(this.frontRight);

    this.scene.add(this.mesh);
  }

  update(dt, input, track) {
    // 1. Obtener estado en la pista
    const trackStatus = track.getTrackStatus(this.mesh.position);
    this.isOnGrass = trackStatus.isOnGrass;
    this.isOnCurb = trackStatus.isOnCurb;
    this.progressT = trackStatus.t;
    this.inPitZone = trackStatus.inPitZone;

    // 2. Modificaciones físicas y penalización por DAÑOS y NEUMÁTICOS
    let damageFactorSpeed = 1.0;
    let damageFactorGrip = 1.0;
    let damageFactorAccel = 1.0;

    if (this.damage > 45) {
      // Pérdida aerodinámica severa por ala rota
      damageFactorSpeed = 0.65;
      damageFactorAccel = 0.55;
      damageFactorGrip = 0.5;
      
      // Vibrar y desviar alerón delantero roto (Visual de Daño)
      this.frontWing.position.y = 0.05 + Math.sin(Date.now() * 0.06) * 0.04;
      this.frontWing.rotation.z = 0.14 + Math.sin(Date.now() * 0.08) * 0.05;
      this.frontWing.rotation.x = 0.08;
    } else {
      this.frontWing.position.set(0, 0.1, 2.8);
      this.frontWing.rotation.set(0, 0, 0);
    }

    // 🏎️ FÍSICA Y DEGRADACIÓN DE NEUMÁTICOS F1
    let wearRate = 0.0;
    let compoundGrip = 1.0;

    if (this.tyreCompound === 'S') {
      wearRate = 1.35; // Desgaste rápido (Soft)
      compoundGrip = 1.08; // Máximo agarre inicial
    } else if (this.tyreCompound === 'M') {
      wearRate = 0.75; // Desgaste balanceado (Medium)
      compoundGrip = 1.00;
    } else if (this.tyreCompound === 'H') {
      wearRate = 0.38; // Desgaste lento (Hard)
      compoundGrip = 0.92;
    }

    // El desgaste aumenta con la aceleración, velocidad y masivamente al derrapar
    const accelFactor = input.keys.forward ? 1.0 : 0.3;
    const speedFactor = Math.abs(this.speed) / this.maxSpeed;
    const driftFactor = this.isDrifting ? 4.8 : 1.0;

    if (Math.abs(this.speed) > 1 && this.damage < 100) {
      this.tyreWear += wearRate * accelFactor * speedFactor * driftFactor * dt;
      if (this.tyreWear > 100) this.tyreWear = 100;
    }

    // Caída exponencial de grip según el desgaste (al llegar a 100% de desgaste, el agarre disminuye un 35%)
    const wearPenalty = (this.tyreWear / 100) * 0.35;
    const currentTyreGrip = compoundGrip * (1.0 - wearPenalty);

    // 3. Lógica de DRS (Drag Reduction System)
    // El DRS no está disponible bajo el Pit Limiter, ni en el pasto, ni con daño aerodinámico severo
    this.drsAvailable = !this.isOnGrass && !this.inPitZone && this.damage <= 45 && Math.abs(this.speed) > 35;
    
    if (input.keys.drs && this.drsAvailable) {
      this.drsActive = true;
      this.maxSpeed = 105 * damageFactorSpeed; // Mayor velocidad máxima con DRS
      this.rearWing.rotation.x = -Math.PI / 8; // Abrir flap
    } else {
      this.drsActive = false;
      this.maxSpeed = this.baseMaxSpeed * damageFactorSpeed;
      this.rearWing.rotation.x = 0; // Cerrar flap
    }

    // 4. Lógica de Pit Limiter automático (con asistencia de frenado)
    if (this.inPitZone) {
      this.maxSpeed = 13.8; // Capped estricto a 50 km/h (13.8 u/s)
      this.drsActive = false;
      if (this.speed > 13.8) {
        this.speed -= 35.0 * dt; // Asistencia de frenado para entrar suave
        if (this.speed < 13.8) this.speed = 13.8;
      }
    }

    // Downforce model: grip increases with speed squared
    const normSpd = Math.abs(this.speed) / this.baseMaxSpeed;
    const downforceGrip = 1.0 + normSpd * normSpd * 0.25;

    // Accel multipliers & Grip (includes downforce + weather)
    let accelMultiplier = 1.0 * damageFactorAccel * (0.85 + 0.15 * currentTyreGrip) * this.weatherGrip;
    let turnGrip = 1.8 * damageFactorGrip * currentTyreGrip * downforceGrip * this.weatherGrip;

    if (this.isOnGrass) {
      // 🌿 Pasto: velocidad limitada y sin agarre
      this.maxSpeed = 26; 
      accelMultiplier = 0.4 * damageFactorAccel;
      turnGrip = 0.7 * damageFactorGrip * currentTyreGrip;
      this.drsActive = false;
    } else if (this.isOnCurb) {
      // 🏁 Curbs: vibración física
      const shakeVal = Math.sin(Date.now() * 0.08) * 0.08;
      this.mesh.position.y = 0.5 + shakeVal;
      turnGrip = 1.5 * damageFactorGrip * currentTyreGrip;
    } else {
      this.mesh.position.y = 0.5;
    }

    // Parpadeo de Luz LED Trasera de Lluvia / Pit Limiter
    if (this.rearSafetyLight) {
      const blinkRate = (this.inPitZone || input.keys.brake) ? 120 : 350;
      const isLit = Math.floor(Date.now() / blinkRate) % 2 === 0;
      this.rearSafetyLight.material.color.setHex(isLit ? 0xe63946 : 0x220000);
    }

    // 5. Aceleración y Frenado
    if (input.keys.forward) {
      this.speed += this.acceleration * accelMultiplier * dt;
      
      // Mostrar llamarada en escape al acelerar a fondo a alta velocidad
      if (Math.abs(this.speed) > 30 && this.exhaustGlow) {
        this.exhaustGlow.material.opacity = 0.8 + Math.random() * 0.2;
        this.exhaustGlow.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.4, 1 + Math.random() * 0.3);
      } else if (this.exhaustGlow) {
        this.exhaustGlow.material.opacity = 0;
      }
    } else {
      if (this.exhaustGlow) this.exhaustGlow.material.opacity = 0;
      
      if (input.keys.backward) {
        this.speed -= this.acceleration * 0.8 * dt;
      } else {
        // Resistencia al aire
        this.speed *= Math.pow(0.975, dt * 60);
      }
    }
    
    if (input.keys.brake) {
      this.speed *= Math.pow(0.88, dt * 60);
      // Wheel lockup: if braking hard at high speed with worn tyres
      this.wheelsLocked = Math.abs(this.speed) > 25 && currentTyreGrip < 0.85;
      // ERS regen under braking
      if (this.ersEnergy < this.ersMaxEnergy) {
        this.ersEnergy = Math.min(this.ersMaxEnergy, this.ersEnergy + 15 * dt);
      }
    } else {
      this.wheelsLocked = false;
    }

    // ERS boost when accelerating
    if (input.keys.forward && this.ersEnergy > 0 && Math.abs(this.speed) > 15 && !this.inPitZone) {
      this.speed += 8 * dt; // Extra ERS power
      this.ersEnergy -= 12 * dt;
      if (this.ersEnergy < 0) this.ersEnergy = 0;
    }

    // Limitar velocidad final según daños y limiter
    this.speed = Math.max(-20, Math.min(this.speed, this.maxSpeed));

    // Si el chasis está a 100% de daños, el coche se apaga por completo (DNF)
    if (this.damage >= 100) {
      this.speed = 0;
      if (this.exhaustGlow) this.exhaustGlow.material.opacity = 0;
    }

    // 6. Dirección con amortiguación
    let targetSteer = 0;
    if (input.keys.left) {
      targetSteer = turnGrip;
    } else if (input.keys.right) {
      targetSteer = -turnGrip;
    }

    this.steerAngle += (targetSteer - this.steerAngle) * 12 * dt;

    if (Math.abs(this.speed) > 1 && this.damage < 100) {
        this.angle += this.steerAngle * dt * (this.speed > 0 ? 1 : -1) * (0.3 + 0.7 * (1.0 - Math.abs(this.speed)/this.maxSpeed));
    }

    const forwardVector = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));

    // 7. Físicas de Derrape (Drift)
    const driftThreshold = this.isOnGrass ? 0.45 : 0.6;
    this.isDrifting = (this.damage < 100 && Math.abs(this.steerAngle) > 0.8 && Math.abs(this.speed) > this.maxSpeed * driftThreshold);

    if (this.isDrifting) {
       this.speed *= Math.pow(this.isOnGrass ? 0.96 : 0.99, dt * 60);
    }

    this.velocity.copy(forwardVector).multiplyScalar(this.speed);

    // Mover el auto
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
    this.mesh.rotation.y = this.angle;

    // 8. Animaciones de Llantas
    const maxVisualSteer = 0.5;
    const visualSteerRatio = this.steerAngle / (this.isOnGrass ? 0.7 : 1.8);
    this.frontLeftPivot.rotation.y = visualSteerRatio * maxVisualSteer;
    this.frontRightPivot.rotation.y = visualSteerRatio * maxVisualSteer;

    const wheelCircumference = 2 * Math.PI * 0.6;
    const rotationIncrement = this.wheelsLocked ? 0 : (this.speed * dt) / wheelCircumference * (2 * Math.PI);
    this.wheels.forEach(w => {
      w.children.forEach(mesh => {
        mesh.rotation.x += rotationIncrement;
      });
    });

    // 9. Body dynamics: pitch and roll
    this.longitudinalG = (this.speed - this.prevSpeed) / (dt + 0.001);
    this.lateralG = this.steerAngle * Math.abs(this.speed) * 0.01;
    this.prevSpeed = this.speed;

    // Pitch: nose dives on braking, squats on acceleration
    const targetPitch = -this.longitudinalG * 0.0004;
    this.currentPitch += (Math.max(-0.06, Math.min(0.06, targetPitch)) - this.currentPitch) * 5 * dt;
    this.bodyGroup.rotation.x = this.currentPitch;

    // Roll: lean in corners
    const targetRoll = -this.lateralG * 0.015;
    this.currentRoll += (Math.max(-0.05, Math.min(0.05, targetRoll)) - this.currentRoll) * 5 * dt;
    this.bodyGroup.rotation.z = this.currentRoll;
  }

  changeTyre(compound) {
    this.tyreCompound = compound;
    this.tyreWear = 0.0;
    
    let bandColor = 0xe63946; // Soft - Rojo
    if (compound === 'M') bandColor = 0xffb703; // Medium - Amarillo
    if (compound === 'H') bandColor = 0xffffff; // Hard - Blanco
    
    this.tyreStripeMaterial.color.setHex(bandColor);
  }

  getCameraView(mode) {
    let relativeOffset, relativeLookat;
    
    switch(mode) {
      case 1: // T-Cam
        relativeOffset = new THREE.Vector3(0, 1.25, -1.2);
        relativeLookat = new THREE.Vector3(0, 0.6, 12.0);
        break;
      case 2: // Cabina (Cockpit)
        relativeOffset = new THREE.Vector3(0, 0.84, 0.1);
        relativeLookat = new THREE.Vector3(0, 0.76, 12.0);
        break;
      case 3: // Alerón (Nose)
        relativeOffset = new THREE.Vector3(0, 0.38, 2.6);
        relativeLookat = new THREE.Vector3(0, 0.38, 12.0);
        break;
      case 0: // Seguimiento (Standard Follow)
      default:
        relativeOffset = new THREE.Vector3(0, 2.5, -7.5);
        relativeLookat = new THREE.Vector3(0, 0.5, 8.0);
        break;
    }
    
    const offset = relativeOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle).add(this.mesh.position);
    const lookat = relativeLookat.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.angle).add(this.mesh.position);
    
    return { offset, lookat };
  }
}
