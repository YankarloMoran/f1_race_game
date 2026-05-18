import * as THREE from 'three';
import { TRACKS } from './TrackData.js';

export class Track {
  constructor(scene, trackId = 'monza') {
    this.scene = scene;
    this.trackId = trackId;
    this.trackData = TRACKS[trackId] || TRACKS.monza;
    this.trackWidth = this.trackData.width;
    
    // Build CatmullRomCurve3 from track data points
    const pts = this.trackData.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    this.curve = new THREE.CatmullRomCurve3(pts, true);

    this.buildTrackGeometry();
    this.buildBorderLines();
    this.buildCurbs();
    this.buildStartGrid();
    this.buildPitLane();
    this.buildDecorations();
    this.buildGrandstands();
    this.buildGravelTraps();
    this.buildPitGarages();
    this.buildBrakingBoards();
    this.buildTireBarriers();
  }

  buildTrackGeometry() {
    const tubularSegments = 350;
    const radialSegments = 2; // Plano
    const geometry = new THREE.TubeGeometry(this.curve, tubularSegments, this.trackWidth / 2, radialSegments, true);
    
    // Aplanar la pista para evitar deformaciones
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        positions.setY(i, 0.015);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
      color: 0x222222, // Asfalto gris oscuro premium
      roughness: 0.82,
      metalness: 0.1
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }

  buildBorderLines() {
    const points = this.curve.getSpacedPoints(350);
    const leftLinePoints = [];
    const rightLinePoints = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const tangent = this.curve.getTangentAt(i / points.length);
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      leftLinePoints.push(p.clone().add(right.clone().multiplyScalar(this.trackWidth / 2 - 0.2)));
      rightLinePoints.push(p.clone().add(right.clone().multiplyScalar(-this.trackWidth / 2 + 0.2)));
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    
    leftLinePoints.push(leftLinePoints[0]);
    rightLinePoints.push(rightLinePoints[0]);

    const leftGeo = new THREE.BufferGeometry().setFromPoints(leftLinePoints);
    const rightGeo = new THREE.BufferGeometry().setFromPoints(rightLinePoints);

    const leftLine = new THREE.Line(leftGeo, lineMat);
    const rightLine = new THREE.Line(rightGeo, lineMat);
    
    leftLine.position.y = 0.02;
    rightLine.position.y = 0.02;

    this.scene.add(leftLine);
    this.scene.add(rightLine);
  }

  buildCurbs() {
    const points = this.curve.getSpacedPoints(350);
    const materialRed = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
    const materialWhite = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 });
    const curbGeo = new THREE.BoxGeometry(2.5, 0.15, 1.2);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const tangent = this.curve.getTangentAt(i / points.length);
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const prevTangent = this.curve.getTangentAt(((i - 1 + points.length) % points.length) / points.length);
      const angleDifference = tangent.angleTo(prevTangent);
      
      if (angleDifference > 0.012) {
        const mat = (i % 2 === 0) ? materialRed : materialWhite;
        const curb = new THREE.Mesh(curbGeo, mat);
        const cross = new THREE.Vector3().crossVectors(tangent, prevTangent);
        const directionFactor = cross.y > 0 ? 1 : -1;

        curb.position.copy(p).add(right.clone().multiplyScalar(directionFactor * (this.trackWidth / 2 + 0.5)));
        curb.lookAt(p.clone().add(tangent));
        curb.castShadow = true;
        curb.receiveShadow = true;
        this.scene.add(curb);
      }
    }
  }

  buildStartGrid() {
    // Línea de salida/meta cuadriculada
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    const size = 32;
    for (let y = 0; y < 128; y += size) {
      for (let x = 0; x < 128; x += size) {
        ctx.fillStyle = ((x + y) / size) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(x, y, size, size);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(this.trackWidth - 0.5, 3.5);
    const material = new THREE.MeshStandardMaterial({ 
      map: texture, 
      roughness: 0.8 
    });

    const startLine = new THREE.Mesh(geometry, material);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(0, 0.03, 80); // Ubicada en la recta de salida X = 0, Z = 80
    this.scene.add(startLine);

    // Pórtico de meta elevado sobre la recta
    const gantryGroup = new THREE.Group();
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    
    // Columnas laterales
    const colGeo = new THREE.CylinderGeometry(0.2, 0.2, 8);
    const leftCol = new THREE.Mesh(colGeo, beamMat);
    leftCol.position.set(this.trackWidth / 2 + 1.5, 4, 80);
    leftCol.castShadow = true;
    
    const rightCol = new THREE.Mesh(colGeo, beamMat);
    rightCol.position.set(-this.trackWidth / 2 - 1.5, 4, 80);
    rightCol.castShadow = true;

    gantryGroup.add(leftCol, rightCol);

    // Travesaño superior
    const barGeo = new THREE.BoxGeometry(this.trackWidth + 4, 0.8, 0.8);
    const bar = new THREE.Mesh(barGeo, beamMat);
    bar.position.set(0, 8, 80);
    bar.castShadow = true;
    gantryGroup.add(bar);

    // Panel digital de patrocinio
    const panelGeo = new THREE.BoxGeometry(10, 1.8, 0.2);
    const panelCanvas = document.createElement('canvas');
    panelCanvas.width = 512;
    panelCanvas.height = 128;
    const pctx = panelCanvas.getContext('2d');
    pctx.fillStyle = '#050c18';
    pctx.fillRect(0, 0, 512, 128);
    pctx.strokeStyle = '#e63946';
    pctx.lineWidth = 8;
    pctx.strokeRect(0, 0, 512, 128);
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 44px Orbitron, sans-serif';
    pctx.textAlign = 'center';
    pctx.fillText('MONZA GP', 256, 75);

    const panelTex = new THREE.CanvasTexture(panelCanvas);
    const panelMat = new THREE.MeshStandardMaterial({ map: panelTex });
    const digitalPanel = new THREE.Mesh(panelGeo, panelMat);
    digitalPanel.position.set(0, 8, 80.45);
    gantryGroup.add(digitalPanel);

    this.scene.add(gantryGroup);
  }

  buildPitLane() {
    // 1. Pavimento de los Pits (asfalto más claro a la izquierda)
    // Corre paralelo a la recta principal a X = -18 de Z = -30 a Z = 160
    const pitRoadGeo = new THREE.BoxGeometry(8, 0.1, 220);
    const pitRoadMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a3d40, // Asfalto gris medio
      roughness: 0.85
    });
    const pitRoad = new THREE.Mesh(pitRoadGeo, pitRoadMat);
    pitRoad.position.set(-18, 0, 65);
    pitRoad.receiveShadow = true;
    this.scene.add(pitRoad);

    // 2. Línea divisoria amarilla
    const yellowLineGeo = new THREE.PlaneGeometry(0.3, 220);
    const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xffb703 });
    const line = new THREE.Mesh(yellowLineGeo, yellowLineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(-13.8, 0.05, 65);
    this.scene.add(line);

    // 3. Muro divisorio de hormigón (Pit Wall)
    // Deja entradas libres en los extremos: va de Z = -10 a Z = 150
    const pitWallGeo = new THREE.BoxGeometry(0.8, 1.2, 160);
    const pitWallMat = new THREE.MeshStandardMaterial({ 
      color: 0xb0b7bd,
      roughness: 0.9 
    });
    const pitWall = new THREE.Mesh(pitWallGeo, pitWallMat);
    pitWall.position.set(-13, 0.6, 70);
    pitWall.castShadow = true;
    pitWall.receiveShadow = true;
    this.scene.add(pitWall);

    // Valla protectora metálica sobre el muro
    const fenceGeo = new THREE.BoxGeometry(0.1, 0.9, 160);
    const fenceMat = new THREE.MeshStandardMaterial({ 
      color: 0x475569, 
      wireframe: true 
    });
    const fence = new THREE.Mesh(fenceGeo, fenceMat);
    fence.position.set(-13, 1.65, 70);
    this.scene.add(fence);

    // 4. El Cajón de Pits del Jugador (Pit Box)
    // Ubicado en X = -18, Z = 80 (alineado a meta para reparaciones rápidas)
    const pitBoxGeo = new THREE.PlaneGeometry(5, 10);
    const pitBoxCanvas = document.createElement('canvas');
    pitBoxCanvas.width = 128;
    pitBoxCanvas.height = 256;
    const pctx = pitBoxCanvas.getContext('2d');
    pctx.fillStyle = 'rgba(230, 57, 70, 0.3)'; 
    pctx.fillRect(0, 0, 128, 256);
    pctx.strokeStyle = '#ffb703'; 
    pctx.lineWidth = 14;
    pctx.strokeRect(0, 0, 128, 256);
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 24px Orbitron, Arial';
    pctx.textAlign = 'center';
    pctx.fillText('PIT BOX', 64, 128);
    
    const pitBoxTex = new THREE.CanvasTexture(pitBoxCanvas);
    const pitBoxMat = new THREE.MeshStandardMaterial({ 
      map: pitBoxTex,
      transparent: true,
      depthWrite: false
    });
    
    const pitBox = new THREE.Mesh(pitBoxGeo, pitBoxMat);
    pitBox.rotation.x = -Math.PI / 2;
    pitBox.position.set(-18, 0.06, 80);
    this.scene.add(pitBox);

    // Estructura de metal del pit gantry por encima del Pit Box
    const gantryGroup = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 4.5);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
    
    const pillar1 = new THREE.Mesh(beamGeo, beamMat);
    pillar1.position.set(-21, 2.25, 80);
    pillar1.castShadow = true;
    gantryGroup.add(pillar1);

    const crossBeamGeo = new THREE.BoxGeometry(6, 0.15, 0.15);
    const crossBeam = new THREE.Mesh(crossBeamGeo, beamMat);
    crossBeam.position.set(-18, 4.5, 80);
    crossBeam.castShadow = true;
    gantryGroup.add(crossBeam);

    // Manguera de aire colgante
    const hoseGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5);
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0xe63946 });
    const hose = new THREE.Mesh(hoseGeo, hoseMat);
    hose.position.set(-16, 3.25, 80);
    gantryGroup.add(hose);

    this.scene.add(gantryGroup);
  }

  buildGrandstands() {
    // Espectacular tribuna para espectadores a la derecha de la recta principal (X = 20)
    const grandstand = new THREE.Group();
    grandstand.position.set(22, 0, 70);

    const baseGeo = new THREE.BoxGeometry(8, 4.5, 140);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 2.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    grandstand.add(base);

    // Asientos y escalones tribuna
    const stepGeo = new THREE.BoxGeometry(8, 0.4, 140);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0xe63946 }); // Asientos rojos F1
    for (let i = 0; i < 7; i++) {
      const step = new THREE.Mesh(stepGeo, seatMat);
      step.position.set(-2 + i * 0.8, 4.5 + i * 0.5, 0);
      step.castShadow = true;
      grandstand.add(step);
    }

    // Techo inclinado protector
    const roofGeo = new THREE.BoxGeometry(10, 0.15, 142);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(1.5, 8.5, 0);
    roof.rotation.z = Math.PI / 16; // Inclinación
    roof.castShadow = true;
    grandstand.add(roof);

    // Soporte del techo
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.5);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    for (let z = -65; z <= 65; z += 32) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-2, 6.5, z);
      pole.castShadow = true;
      grandstand.add(pole);
    }

    this.scene.add(grandstand);
  }

  buildGravelTraps() {
    // Escapatorias de grava para alta seguridad en curvas
    const trapMat = new THREE.MeshStandardMaterial({
      color: 0xdfb48c, // Arena / grava naranja
      roughness: 0.95
    });

    const createTrap = (x, z, width, depth) => {
      const trapGeo = new THREE.PlaneGeometry(width, depth);
      const trap = new THREE.Mesh(trapGeo, trapMat);
      trap.rotation.x = -Math.PI / 2;
      trap.position.set(x, 0.012, z);
      trap.receiveShadow = true;
      this.scene.add(trap);
    };

    // 1. Escapatoria externa de Variante del Rettifilo
    createTrap(10, 270, 24, 18);

    // 2. Escapatoria externa de Curva Grande
    createTrap(140, 360, 40, 30);

    // 3. Escapatoria externa de Lesmos
    createTrap(225, 30, 25, 35);

    // 4. Escapatoria de la legendaria Parabolica (Externa)
    createTrap(-190, 80, 28, 45);
  }

  buildDecorations() {
    const points = this.curve.getSpacedPoints(65);
    
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 2.2, 5);
    const leavesGeo = new THREE.ConeGeometry(2.2, 4.5, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x1b4314, roughness: 0.85 }); // Verde profundo Monza

    const boardGeo = new THREE.BoxGeometry(6.5, 3.2, 0.3);
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.2);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b });

    const canvasAd = document.createElement('canvas');
    canvasAd.width = 256;
    canvasAd.height = 128;
    const ctxAd = canvasAd.getContext('2d');
    ctxAd.fillStyle = '#ffb703';
    ctxAd.fillRect(0, 0, 256, 128);
    ctxAd.fillStyle = '#0f172a';
    ctxAd.font = 'bold 36px Orbitron, sans-serif';
    ctxAd.textAlign = 'center';
    ctxAd.fillText('MONZA GP', 128, 75);
    const adTexture = new THREE.CanvasTexture(canvasAd);
    const adFrontMat = new THREE.MeshStandardMaterial({ map: adTexture });

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const tangent = this.curve.getTangentAt(i / points.length);
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const side = (i % 2 === 0) ? 1 : -1;
      const distance = this.trackWidth / 2 + 6.5 + Math.random() * 4;

      // No pintar decoraciones sobre el Pit Lane o la Tribuna principal
      if (p.x < 30 && p.x > -30 && p.z > -70 && p.z < 210) {
        continue;
      }

      if (i % 3 === 0) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.1;
        trunk.castShadow = true;
        tree.add(trunk);

        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 3.8;
        leaves.castShadow = true;
        tree.add(leaves);

        tree.position.copy(p).add(right.clone().multiplyScalar(side * distance));
        this.scene.add(tree);
      } else if (i % 9 === 0) {
        const adBoard = new THREE.Group();
        const postLeft = new THREE.Mesh(postGeo, postMat);
        postLeft.position.set(-2.2, 1.6, 0);
        postLeft.castShadow = true;
        adBoard.add(postLeft);

        const postRight = new THREE.Mesh(postGeo, postMat);
        postRight.position.set(2.2, 1.6, 0);
        postRight.castShadow = true;
        adBoard.add(postRight);

        const materials = [
            boardMat, boardMat, boardMat, boardMat,
            adFrontMat, boardMat
        ];
        const screen = new THREE.Mesh(boardGeo, materials);
        screen.position.y = 3.2;
        screen.castShadow = true;
        adBoard.add(screen);

        adBoard.position.copy(p).add(right.clone().multiplyScalar(side * (this.trackWidth / 2 + 5)));
        adBoard.lookAt(p);
        this.scene.add(adBoard);
      }
    }
  }

  getTrackStatus(position) {
    let minT = 0;
    let minDist = Infinity;
    const resolution = 350;
    
    for(let i = 0; i <= resolution; i++) {
        const t = i / resolution;
        const pt = this.curve.getPointAt(t);
        const dist = position.distanceTo(pt);
        if(dist < minDist) {
            minDist = dist;
            minT = t;
        }
    }
    
    const halfWidth = this.trackWidth / 2;
    
    // DETECCION ULTRA-EXACTA DEL PIT LANE REUBICADO
    // El Pit Lane está a la izquierda de la recta principal (X <= -13.5)
    // Evita activar el limitador en la recta principal (X > -13.5)
    const inPitZone = position.x <= -13.5 && position.x >= -24.0 && position.z >= -35 && position.z <= 165;

    let isOnTrack = minDist <= halfWidth;
    let isOnCurb = !isOnTrack && minDist <= halfWidth + 1.8;
    let isOnGrass = minDist > halfWidth + 1.8;

    if (inPitZone) {
      isOnTrack = true;
      isOnCurb = false;
      isOnGrass = false;
    }

    return {
      minDist,
      t: minT,
      isOnTrack,
      isOnCurb,
      isOnGrass,
      inPitZone
    };
  }

  buildPitGarages() {
    // 5 Estructuras de Boxes / Garajes a la izquierda de la calle de boxes (X = -24)
    const garageGroup = new THREE.Group();
    const teamNames = ['RED BULL', 'MERCEDES', 'FERRARI', 'MCLAREN', 'ASTON MARTIN'];
    const teamColors = [0xd62828, 0x00a896, 0xc1121f, 0xff7b00, 0x1b4332];

    for (let i = 0; i < 5; i++) {
      const zPos = 20 + i * 24;
      const garage = new THREE.Group();
      garage.position.set(-24.5, 0, zPos);

      // Edificio principal
      const wallGeo = new THREE.BoxGeometry(6, 4, 18);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }); // Hormigón gris oscuro
      const building = new THREE.Mesh(wallGeo, wallMat);
      building.position.set(0, 2, 0);
      building.castShadow = true;
      building.receiveShadow = true;
      garage.add(building);

      // Puerta del garaje (metálica)
      const doorGeo = new THREE.BoxGeometry(0.1, 3.2, 14);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.4 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(2.96, 1.6, 0);
      garage.add(door);

      // Cartel luminoso del equipo en el techo
      const signGeo = new THREE.BoxGeometry(1.2, 0.8, 14);
      const canvasSign = document.createElement('canvas');
      canvasSign.width = 256;
      canvasSign.height = 64;
      const sctx = canvasSign.getContext('2d');
      sctx.fillStyle = '#0f172a';
      sctx.fillRect(0, 0, 256, 64);
      sctx.strokeStyle = '#ffffff';
      sctx.lineWidth = 4;
      sctx.strokeRect(2, 2, 252, 60);
      sctx.fillStyle = '#ffffff';
      sctx.font = 'bold 24px Orbitron, Arial';
      sctx.textAlign = 'center';
      sctx.fillText(teamNames[i], 128, 40);

      const signTex = new THREE.CanvasTexture(canvasSign);
      const signMat = new THREE.MeshStandardMaterial({ 
        map: signTex, 
        emissive: teamColors[i],
        emissiveIntensity: 0.4
      });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(2.8, 4.4, 0);
      sign.rotation.y = Math.PI / 2;
      garage.add(sign);

      garageGroup.add(garage);
    }
    this.scene.add(garageGroup);
  }

  buildBrakingBoards() {
    const boardGroup = new THREE.Group();
    const createBoard = (x, z, label, sideAngle) => {
      const board = new THREE.Group();
      board.position.set(x, 0, z);

      // Poste de soporte
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.9;
      post.castShadow = true;
      board.add(post);

      // Panel del cartel (Blanco con texto negro)
      const panelGeo = new THREE.BoxGeometry(1.6, 0.9, 0.15);
      const canvasB = document.createElement('canvas');
      canvasB.width = 128;
      canvasB.height = 64;
      const bctx = canvasB.getContext('2d');
      bctx.fillStyle = '#ffffff';
      bctx.fillRect(0, 0, 128, 64);
      bctx.strokeStyle = '#000000';
      bctx.lineWidth = 6;
      bctx.strokeRect(3, 3, 122, 58);
      bctx.fillStyle = '#000000';
      bctx.font = 'bold 36px Orbitron, sans-serif';
      bctx.textAlign = 'center';
      bctx.fillText(label, 64, 46);

      const bTex = new THREE.CanvasTexture(canvasB);
      const bMat = new THREE.MeshStandardMaterial({ map: bTex });
      const panel = new THREE.Mesh(panelGeo, bMat);
      panel.position.y = 1.35;
      panel.rotation.y = sideAngle;
      panel.castShadow = true;
      board.add(panel);

      boardGroup.add(board);
    };

    // 1. Rettifilo (X = 10, Z = 150-185)
    createBoard(10, 150, '150', Math.PI);
    createBoard(10, 168, '100', Math.PI);
    createBoard(10, 185, '50', Math.PI);

    // 2. Roggia (X = 160, Z = 205-180)
    createBoard(158, 205, '150', 0);
    createBoard(158, 192, '100', 0);
    createBoard(158, 180, '50', 0);

    // 3. Ascari (X = -20, Z = -115 to -135)
    createBoard(18, -115, '150', Math.PI / 4);
    createBoard(10, -125, '100', Math.PI / 4);
    createBoard(2, -135, '50', Math.PI / 4);

    // 4. Parabolica (X = -150 to -170, Z = 10-40)
    createBoard(-138, 10, '150', -Math.PI / 2);
    createBoard(-148, 25, '100', -Math.PI / 2);
    createBoard(-158, 40, '50', -Math.PI / 2);

    this.scene.add(boardGroup);
  }

  buildTireBarriers() {
    // Escolleras de neumáticos tricolores (Rojo, Blanco, Azul) apilados en las escapatorias críticas
    const tireGroup = new THREE.Group();
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.45, 8);
    const matR = new THREE.MeshStandardMaterial({ color: 0xc1121f, roughness: 0.95 }); // Rojo
    const matW = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }); // Blanco
    const matB = new THREE.MeshStandardMaterial({ color: 0x003049, roughness: 0.95 }); // Azul

    const createStack = (x, z, count = 3) => {
      const stack = new THREE.Group();
      stack.position.set(x, 0, z);
      const mats = [matR, matW, matB];
      
      for (let h = 0; h < count; h++) {
        const tire = new THREE.Mesh(tireGeo, mats[h % 3]);
        tire.position.y = 0.225 + h * 0.45;
        tire.castShadow = true;
        tire.receiveShadow = true;
        stack.add(tire);
      }
      return stack;
    };

    // Colocar conjuntos de barreras en las zonas de escape
    const placeBarrierWall = (startX, startZ, endX, endZ, density = 5) => {
      const start = new THREE.Vector3(startX, 0, startZ);
      const end = new THREE.Vector3(endX, 0, endZ);
      const dist = start.distanceTo(end);
      const step = dist / density;
      
      for (let i = 0; i <= density; i++) {
        const t = i / density;
        const pos = new THREE.Vector3().lerpVectors(start, end, t);
        // Pequeño desplazamiento aleatorio para realismo
        const stack1 = createStack(pos.x, pos.z);
        const stack2 = createStack(pos.x + 0.4, pos.z + 0.4);
        tireGroup.add(stack1);
        tireGroup.add(stack2);
      }
    };

    // 1. Rettifilo chicane (escape de frente)
    placeBarrierWall(16, 268, 22, 276, 4);

    // 2. Roggia chicane (exterior)
    placeBarrierWall(148, 142, 154, 134, 4);

    // 3. Lesmo 1 (escape exterior)
    placeBarrierWall(222, 45, 218, 30, 4);

    // 4. Parabolica (zona exterior lejana)
    placeBarrierWall(-196, 75, -196, 115, 6);

    this.scene.add(tireGroup);
  }
}
