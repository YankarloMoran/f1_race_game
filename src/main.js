import * as THREE from 'three';
import { Renderer } from './core/Renderer.js';
import { Environment } from './world/Environment.js';
import { Track } from './world/Track.js';
import { TRACKS } from './world/TrackData.js';
import { Car } from './entities/Car.js';
import { AICar } from './entities/AICar.js';
import { InputManager } from './core/InputManager.js';
import { ParticleSystem } from './effects/ParticleSystem.js';
import { WeatherSystem } from './effects/WeatherSystem.js';
import { AudioManager } from './core/AudioManager.js';

class Game {
  constructor() {
    this.renderer = new Renderer();
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.particleSystem = new ParticleSystem(this.renderer.scene);
    this.weather = new WeatherSystem(this.renderer.scene);
    this.isPaused = false;
    
    this.trackId = window.__selectedTrack || 'monza';
    this.trackConfig = TRACKS[this.trackId] || TRACKS.monza;
    
    this.environment = new Environment(this.renderer.scene);
    this.track = new Track(this.renderer.scene, this.trackId);
    this.car = new Car(this.renderer.scene);
    this.car.mesh.position.set(0, 0.5, this.trackConfig.startZ);

    // Grid de partida F1 (5 competidores)
    const bz = this.trackConfig.aiBreakZones;
    const sz = this.trackConfig.startZ;
    this.aiCars = [
      new AICar(this.renderer.scene, 0xffb703, 56, 3.2, new THREE.Vector3(3.2, 0.35, sz - 20), this.track, bz),
      new AICar(this.renderer.scene, 0x00b4d8, 54, -3.2, new THREE.Vector3(-3.2, 0.35, sz - 40), this.track, bz),
      new AICar(this.renderer.scene, 0xc1121f, 52, 3.2, new THREE.Vector3(3.2, 0.35, sz - 60), this.track, bz),
      new AICar(this.renderer.scene, 0xff7b00, 50, -3.2, new THREE.Vector3(-3.2, 0.35, sz - 80), this.track, bz),
      new AICar(this.renderer.scene, 0x1b4332, 48, 3.2, new THREE.Vector3(3.2, 0.35, sz - 100), this.track, bz)
    ];

    // Inicializar vueltas de carrera
    this.playerLaps = 0;
    this.playerLastT = 0.0;
    this.aiCars.forEach(ai => {
      ai.laps = 0;
      ai.lastT = ai.t;
    });

    this.lapTime = 0;
    this.bestLapTime = Infinity;
    this._winConfettiDone = false;

    // Lógicas de Estado F1
    this.isPrestartLocked = true;
    this.startTimer = 0.0;
    this.lastBeepIndex = -1;
    this.goSignalTimer = 0.0;
    
    this.isPitStopping = false;
    this.pitStopTimer = 0.0;
    this.lastWrenchBeep = 0.0;

    // Update page title with track name
    document.title = `F1 3D - ${this.trackConfig.name}`;

    // 📸 MODOS DE CÁMARA PREMIUM DE F1
    this.cameraMode = 0;
    
    // Auto-generate TV camera points from track curve
    this.tvCameraPoints = [];
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const pt = this.track.curve.getPointAt(t);
      this.tvCameraPoints.push(new THREE.Vector3(pt.x + 5, 6.5 + Math.random() * 2, pt.z + 5));
    }

    // Escuchar atajos de teclado premium (Cámaras y Neumáticos)
    window.addEventListener('keydown', (e) => {
      // 1. Cambio de Neumáticos en Pits (Teclas 1, 2, 3)
      if (this.car.inPitZone) {
        if (e.key === '1') {
          this.car.changeTyre('S');
          this.audio.playBeepSound(true);
          const currentText = document.getElementById('pit-current-tyre');
          if (currentText) currentText.innerText = 'COMPUESTO ACTUAL: SOFT (Rojo)';
        } else if (e.key === '2') {
          this.car.changeTyre('M');
          this.audio.playBeepSound(true);
          const currentText = document.getElementById('pit-current-tyre');
          if (currentText) currentText.innerText = 'COMPUESTO ACTUAL: MEDIUM (Amarillo)';
        } else if (e.key === '3') {
          this.car.changeTyre('H');
          this.audio.playBeepSound(true);
          const currentText = document.getElementById('pit-current-tyre');
          if (currentText) currentText.innerText = 'COMPUESTO ACTUAL: HARD (Blanco)';
        }
      }

      // 2. Alternar Cámaras con la tecla C
      if (e.code === 'KeyC') {
        this.cameraMode = (this.cameraMode + 1) % 5;
        this.audio.playBeepSound(true);
        this.showCameraToast();
      }
    });

    // Configurar cámara inicial
    this.renderer.camera.position.set(0, 5, -10);

    // Elementos de la interfaz (HUD)
    this.speedElement = document.getElementById('speed-value');
    this.rpmFill = document.getElementById('rpm-fill');
    this.rpmBar = document.getElementById('rpm-bar');
    this.lapElement = document.getElementById('lap-value');
    this.bestLapElement = document.getElementById('best-lap-value');
    // Tabla de posiciones dinámica (Leaderboard)
    this.drsContainer = document.getElementById('drs-container');
    this.drsStatus = document.getElementById('drs-status');
    this.offTrackAlert = document.getElementById('off-track-alert');
    this.pitLimiterAlert = document.getElementById('pit-limiter-alert');
    
    this.damageValue = document.getElementById('damage-value');
    this.damageFill = document.getElementById('damage-fill');
    this.damagePanel = document.getElementById('damage-panel');

    // Inicializar el Minimapa Dinámico
    this.buildMinimap();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  buildMinimap() {
    const minimapPath = document.getElementById('minimap-track');
    if (!minimapPath) return;

    // Obtener los puntos a lo largo de la curva para dibujarlos en el SVG
    const splinePoints = this.track.curve.getSpacedPoints(120);
    let dAttr = `M ${splinePoints[0].x} ${splinePoints[0].z}`;
    for (let i = 1; i < splinePoints.length; i++) {
      dAttr += ` L ${splinePoints[i].x} ${splinePoints[i].z}`;
    }
    dAttr += ' Z';
    minimapPath.setAttribute('d', dAttr);
  }

  loop() {
    requestAnimationFrame(this.loop);
    
    const dt = Math.min(this.renderer.clock.getDelta(), 0.08);

    // Pause toggle
    if (this.input.consumeEscape()) {
      this.isPaused = !this.isPaused;
      const pauseEl = document.getElementById('pause-menu');
      if (pauseEl) pauseEl.style.display = this.isPaused ? 'flex' : 'none';
    }
    if (this.isPaused) {
      this.renderer.render();
      return;
    }

    // Rain toggle
    if (this.input.consumeRainToggle()) {
      this.weather.toggleRain();
    }
    
    // ==========================================
    // 🚦 LÓGICA DE LARGADA: SEMÁFORO DE 5 LUCES ROJAS F1
    // ==========================================
    if (this.isPrestartLocked) {
      this.startTimer += dt;
      
      // La secuencia dura 6 segundos: 5 luces rojas (1 cada segundo) + apagado en segundo 6
      const lightIndex = Math.floor(this.startTimer); // 0 a 5
      
      if (lightIndex >= 0 && lightIndex < 5) {
        if (lightIndex !== this.lastBeepIndex) {
          // Encender luz en DOM y sonar beep
          const bulb = document.getElementById(`light-${lightIndex}`);
          if (bulb) bulb.classList.add('red');
          this.audio.playBeepSound(false); // Beep de luz roja (grave)
          this.lastBeepIndex = lightIndex;
        }
      } else if (lightIndex === 5 && this.lastBeepIndex !== 5) {
        // ¡LUCES FUERA! ¡LARGADA!
        for (let i = 0; i < 5; i++) {
          const bulb = document.getElementById(`light-${i}`);
          if (bulb) bulb.classList.remove('red');
        }
        document.getElementById('go-signal').classList.add('show');
        this.audio.playBeepSound(true); // Beep agudo de LARGADA
        this.isPrestartLocked = false;
        this.lastBeepIndex = 5;
      }
      
      // Bloquear físicas de vehículos durante el semáforo (pero permitir aceleración estática/revs)
      this.car.speed = 0;
      this.car.mesh.position.set(0, 0.5, this.trackConfig.startZ);
      this.car.angle = 0;
    }

    if (!this.isPrestartLocked && this.goSignalTimer < 2.0) {
      this.goSignalTimer += dt;
      if (this.goSignalTimer >= 2.0) {
        document.getElementById('go-signal').classList.remove('show');
      }
    }

    // ==========================================
    // 🔧 LÓGICA DE BOXES (PARADA EN PITS AUTOMÁTICA)
    // ==========================================
    const isPlayerInPitBox = this.car.inPitZone && 
                             Math.abs(this.car.speed) < 0.8 && 
                             this.car.mesh.position.z >= 60 && 
                             this.car.mesh.position.z <= 100;

    if (isPlayerInPitBox && !this.isPitStopping && this.car.damage > 0) {
      // Entrar en parada en pits
      this.isPitStopping = true;
      this.pitStopTimer = 0.0;
      this.lastWrenchBeep = 0.0;
      document.getElementById('pit-stop-overlay').style.display = 'flex';
    }

    if (this.isPitStopping) {
      this.pitStopTimer += dt;
      
      // Bloquear monoplaza en la parada
      this.car.speed = 0;
      
      // Sonar ruidos de pistola neumática de pit stop cada 0.3s
      if (this.pitStopTimer - this.lastWrenchBeep > 0.28) {
        this.audio.playWrenchSound();
        this.lastWrenchBeep = this.pitStopTimer;
      }
      
      // Actualizar progreso visual de pits
      const percent = Math.min(100, (this.pitStopTimer / 3.0) * 100);
      document.getElementById('pit-progress-bar').style.width = `${percent}%`;
      
      if (this.pitStopTimer >= 3.0) {
        // Parada terminada: chasis al 100% de integridad
        this.car.damage = 0;
        this.isPitStopping = false;
        document.getElementById('pit-stop-overlay').style.display = 'none';
      }
    }

    // 1. Actualizar coche del jugador
    this.car.weatherGrip = this.weather.getGripMultiplier();
    if (this.car.damage < 100 && this.playerLaps < 3) {
      this.car.update(dt, this.input, this.track);
    }

    // ==========================================
    // 💥 DETECCIÓN Y RESOLUCIÓN DE COLISIONES CAR-TO-CAR (FISICAS ELÁSTICAS F1)
    // ==========================================
    this.aiCars.forEach((ai, idx) => {
      // 2. Actualizar coche AI competidor
      ai.update(dt, this.track, this.isPrestartLocked);
      
      // Controlar el cruce de meta de la IA usando progreso del spline
      if (ai.lastT > 0.95 && ai.t < 0.05) {
        ai.laps++;
      }
      ai.lastT = ai.t;

      // Colisión física contra el Jugador
      if (this.car.damage < 100 && this.playerLaps < 3) {
        const dist = this.car.mesh.position.distanceTo(ai.mesh.position);
        const collisionRadius = 1.9; // Bounding sphere ajustada al monoplaza
        
        if (dist < collisionRadius) {
          // Dirección de empuje (Normal)
          const normal = new THREE.Vector3().subVectors(this.car.mesh.position, ai.mesh.position).normalize();
          
          // Separación física inmediata para que no se traspasen los autos
          const overlap = collisionRadius - dist;
          this.car.mesh.position.addScaledVector(normal, overlap * 0.52);
          ai.mesh.position.addScaledVector(normal, -overlap * 0.52);
          
          // Físicas elásticas: Intercambio de velocidades y rebote brusco
          const relVelocity = this.car.speed - ai.speed;
          
          // Rebote
          this.car.speed = -this.car.speed * 0.4;
          
          // Generar daños en el monoplaza del jugador proporcional al impacto
          const speedImpact = Math.max(12, Math.abs(relVelocity));
          const damageAdded = Math.min(35, Math.floor(speedImpact * 0.7));
          this.car.damage += damageAdded;
          if (this.car.damage > 100) this.car.damage = 100;
          
          // Disparar evento de sonido y partículas
          const collisionPoint = this.car.mesh.position.clone().addScaledVector(normal, -collisionRadius * 0.5);
          const collisionEvent = new CustomEvent('carCollision', { detail: { position: collisionPoint } });
          window.dispatchEvent(collisionEvent);
        }
      }
    });

    // ==========================================
    // 🏎️ DETECCIÓN DE PANTALLA FIN DE CARRERA (DNF / GANADOR)
    // ==========================================
    if (this.car.damage >= 100) {
      document.getElementById('dnf-screen').style.display = 'flex';
      this.car.speed = 0;
    }
    if (this.playerLaps >= 3 && !this._winConfettiDone) {
      document.getElementById('win-screen').style.display = 'flex';
      this.car.speed = 0;
      this._winConfettiDone = true;
      this.particleSystem.emitConfetti(this.car.mesh.position);
    }

    // 3. Actualizar sistema de audio
    // Si estamos en luces de largada, simular neutral estática acelerada
    const isRevvingInPrestart = this.isPrestartLocked && this.input.keys.forward;
    this.audio.update(
      this.car.speed, 
      this.car.maxSpeed, 
      this.car.isDrifting, 
      this.car.isOnGrass, 
      this.car.isOnCurb,
      isRevvingInPrestart
    );

    // 4. Actualizar partículas y efectos
    this.particleSystem.update(dt);
    
    if (this.car.isOnGrass && Math.abs(this.car.speed) > 5 && this.car.damage < 100) {
      this.particleSystem.emitGrass(this.car.mesh.position, this.car.angle);
    }
    
    if (this.car.isDrifting && Math.abs(this.car.speed) > 15 && this.car.damage < 100) {
      this.particleSystem.emitSkidmark(this.car.mesh.position, this.car.angle);
      this.particleSystem.emitSmoke(this.car.mesh.position, this.car.angle);
    }

    // Chispas continuas si hay daños severos en el ala
    if (this.car.damage > 45 && Math.abs(this.car.speed) > 15 && Math.random() > 0.72) {
      this.particleSystem.emitSparks(this.car.mesh.position);
    }

    // Titanium floor sparks in fast corners
    if (Math.abs(this.car.steerAngle) > 0.5 && Math.abs(this.car.speed) > 40 && !this.car.isOnGrass) {
      this.particleSystem.emitTitaniumSparks(this.car.mesh.position, this.car.speed);
    }

    // Wheel lockup smoke
    if (this.car.wheelsLocked && Math.abs(this.car.speed) > 20) {
      this.particleSystem.emitSmoke(this.car.mesh.position, this.car.angle);
    }

    // 4b. Weather system
    this.weather.update(dt, this.car.mesh.position);
    if (this.weather.isRaining) {
      this.weather.emitSpray(this.car.mesh.position, this.car.speed, this.car.angle);
    }

    // 5. Animación de nubes
    if (this.environment.clouds) {
      this.environment.clouds.forEach(cloud => {
        cloud.position.x += dt * 1.5;
        if (cloud.position.x > 600) {
          cloud.position.x = -600;
        }
      });
    }

    // 6. Lógica de vueltas para el jugador
    if (this.car.damage < 100 && this.playerLaps < 3) {
      this.updateLapTimer(dt);
    }

    // 7. Seguimiento de cámara
    this.updateCamera();

    // 8. Actualizar HUD y Minimapa
    this.updateHUD();
    this.updateMinimap();

    this.renderer.render();
  }

  updateLapTimer(dt) {
    // Cronómetro activo sólo tras largar la carrera y no estar en DNF
    if (this.isPrestartLocked) return;
    
    this.lapTime += dt;

    // Cruzar meta por spline
    if (this.playerLastT > 0.95 && this.car.progressT < 0.05) {
      if (this.lapTime > 5) {
        this.playerLaps++;
        
        // Registrar récord
        if (this.lapTime < this.bestLapTime) {
          this.bestLapTime = this.lapTime;
          this.bestLapElement.innerText = this.formatTime(this.bestLapTime);
        }
        
        this.lapTime = 0;
        this.triggerLapFlash();
      }
    }
    this.playerLastT = this.car.progressT;
  }

  triggerLapFlash() {
    const lapContainer = document.getElementById('lap-time');
    if (!lapContainer) return;
    lapContainer.style.animation = 'none';
    lapContainer.offsetHeight; // Reflow
    lapContainer.style.animation = 'lapFlash 0.8s ease';
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  updateCamera() {
    if (this.cameraMode === 4) {
      // 🎥 CÁMARA TV CINEMÁTICA EN VIVO
      // Selecciona el poste de TV más cercano al monoplaza del jugador
      let bestCam = this.tvCameraPoints[0];
      let minDist = Infinity;
      
      this.tvCameraPoints.forEach(pt => {
        const dist = pt.distanceTo(this.car.mesh.position);
        if (dist < minDist) {
          minDist = dist;
          bestCam = pt;
        }
      });
      
      // Interpolación súper fluida al cambiar de poste de cámara
      this.renderer.camera.position.lerp(bestCam, 0.08);
      this.renderer.camera.lookAt(this.car.mesh.position);
      
      // FOV dinámico (simula zoom óptico real del teleobjetivo de transmisión de F1)
      const targetFov = 32 + Math.min(48, (minDist / 220) * 35);
      this.renderer.camera.fov += (targetFov - this.renderer.camera.fov) * 0.1;
      this.renderer.camera.updateProjectionMatrix();
    } else {
      // 🏎️ CÁMARAS ON-BOARD (Seguimiento, T-Cam, Cockpit, Nose)
      const camView = this.car.getCameraView(this.cameraMode);
      const t = this.cameraMode === 0 ? 0.12 : 0.45; // Interpolación más rígida en cabina/tcam para evitar latencia
      
      this.renderer.camera.position.lerp(camView.offset, t);
      
      if (!this.cameraTarget) this.cameraTarget = camView.lookat.clone();
      this.cameraTarget.lerp(camView.lookat, t);
      this.renderer.camera.lookAt(this.cameraTarget);
      
      // FOV Dinámico según velocidad para sensación extrema de velocidad
      const targetFov = 72 + (Math.abs(this.car.speed) / this.car.maxSpeed) * 18;
      this.renderer.camera.fov += (targetFov - this.renderer.camera.fov) * 0.08;
      this.renderer.camera.updateProjectionMatrix();
    }
  }

  showCameraToast() {
    const modes = [
      'CÁMARA: SEGUIMIENTO TRASERO',
      'CÁMARA: ON-BOARD T-CAM',
      'CÁMARA: CABINA PILOTO (COCKPIT)',
      'CÁMARA: ALERÓN DELANTERO (NOSE)',
      'CÁMARA: TV CINEMÁTICA EN VIVO'
    ];
    let toast = document.getElementById('camera-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'camera-toast';
      toast.className = 'camera-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = modes[this.cameraMode];
    toast.classList.remove('show');
    void toast.offsetWidth; // Forzar reflow para reiniciar la animación
    toast.classList.add('show');
    
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  updateHUD() {
    // 1. Velocidad
    const speedKmH = Math.abs(Math.floor(this.car.speed * 3.6));
    this.speedElement.innerText = speedKmH;

    // 2. RPM y Limitador
    const rpmPercent = (Math.abs(this.car.speed) / this.car.maxSpeed) * 100;
    this.rpmFill.style.width = `${Math.min(100, Math.max(0, rpmPercent))}%`;

    if (rpmPercent > 85) {
      this.rpmBar.classList.add('limiter');
    } else {
      this.rpmBar.classList.remove('limiter');
    }

    // 3. Daños de Integridad
    const integrityPercent = 100 - this.car.damage;
    this.damageValue.innerText = `${integrityPercent}%`;
    this.damageFill.style.width = `${integrityPercent}%`;
    
    // Cambiar color de la barra según daño
    if (integrityPercent > 60) {
      this.damageFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
      this.damagePanel.style.borderLeftColor = '#2ecc71';
      this.damageValue.style.color = '#2ecc71';
    } else if (integrityPercent > 30) {
      this.damageFill.style.background = 'linear-gradient(90deg, #f39c12, #e67e22)';
      this.damagePanel.style.borderLeftColor = '#f39c12';
      this.damageValue.style.color = '#f39c12';
    } else {
      this.damageFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
      this.damagePanel.style.borderLeftColor = '#e74c3c';
      this.damageValue.style.color = '#e74c3c';
    }

    // 4. Tiempo de vuelta
    this.lapElement.innerText = this.formatTime(this.lapTime);

    // 5. Alertas de Terreno y Pit Limiter
    if (this.car.isOnGrass) {
      this.offTrackAlert.classList.add('visible');
    } else {
      this.offTrackAlert.classList.remove('visible');
    }

    if (this.car.inPitZone) {
      this.pitLimiterAlert.classList.add('visible');
    } else {
      this.pitLimiterAlert.classList.remove('visible');
    }

    // 6. Estado de DRS
    if (this.car.drsActive) {
      this.drsContainer.className = 'drs-active';
      this.drsStatus.innerText = 'ACTIVO';
    } else if (this.car.drsAvailable) {
      this.drsContainer.className = 'drs-available';
      this.drsStatus.innerText = 'DISPONIBLE (Shift)';
    } else {
      this.drsContainer.className = '';
      this.drsStatus.innerText = 'DESACTIVADO';
    }

    // 6.1 ERS Energy
    const ersFill = document.getElementById('ers-fill');
    const ersValue = document.getElementById('ers-value');
    if (ersFill) {
      const ersPercent = Math.max(0, Math.min(100, this.car.ersEnergy));
      ersFill.style.width = `${ersPercent}%`;
      if (ersValue) ersValue.innerText = `${Math.floor(ersPercent)}%`;
    }

    // 6.2 Weather indicator
    const weatherEl = document.getElementById('weather-indicator');
    if (weatherEl) {
      if (this.weather.rainIntensity > 0.15) {
        weatherEl.classList.add('active');
      } else {
        weatherEl.classList.remove('active');
      }
    }

    // 6.5. Estado de Neumáticos (F1 Tyre Telemetry)
    const wearVal = this.car.tyreWear;
    const compound = this.car.tyreCompound;
    const compoundNames = { 'S': 'SOFT', 'M': 'MEDIUM', 'H': 'HARD' };
    const compoundColors = { 'S': '#e63946', 'M': '#ffb703', 'H': '#ffffff' };
    
    const tyreTextVal = document.getElementById('tyre-compound-val');
    if (tyreTextVal) {
      tyreTextVal.innerText = compoundNames[compound];
      tyreTextVal.style.color = compoundColors[compound];
    }
    
    const tyreWearVal = document.getElementById('tyre-wear-val');
    if (tyreWearVal) {
      tyreWearVal.innerText = `${wearVal.toFixed(1)}%`;
    }
    
    const tyreFill = document.getElementById('tyre-fill');
    if (tyreFill) {
      const remainingLife = Math.max(0, 100 - wearVal);
      tyreFill.style.width = `${remainingLife}%`;
      tyreFill.style.background = compoundColors[compound];
      
      const tyrePanel = document.getElementById('tyre-panel');
      if (tyrePanel) {
        tyrePanel.style.borderLeftColor = compoundColors[compound];
      }
    }

    // 7. Clasificación de Carrera en tiempo real (F1 Telemetry Leaderboard)
    const playerRankScore = this.playerLaps * 1000 + this.car.progressT;
    const competitors = [
      { name: 'Y. Morán (Tú)', score: playerRankScore, color: '#e63946', isPlayer: true, laps: this.playerLaps }
    ];
    const aiNames = ["M. Verstappen", "L. Hamilton", "C. Leclerc", "L. Norris", "F. Alonso"];
    const aiColors = ["#ffb703", "#00b4d8", "#c1121f", "#ff7b00", "#1b4332"];
    
    this.aiCars.forEach((ai, idx) => {
      competitors.push({ 
        name: aiNames[idx] || `AI ${idx}`, 
        score: ai.laps * 1000 + ai.t, 
        color: aiColors[idx] || '#ffffff', 
        isPlayer: false,
        laps: ai.laps
      });
    });

    competitors.sort((a, b) => b.score - a.score);

    // Actualizar encabezado de clasificación con la vuelta actual del líder
    const maxLaps = Math.max(1, Math.min(3, Math.max(...competitors.map(c => c.laps + 1))));
    const headerElement = document.getElementById('leaderboard-header');
    if (headerElement) {
      headerElement.innerText = `POSICIONES (VTA ${maxLaps}/3)`;
    }

    let rowsHTML = '';
    competitors.forEach((c, idx) => {
      const pos = idx + 1;
      const isPlayerClass = c.isPlayer ? 'player-row' : '';
      
      let gapText = '';
      if (idx === 0) {
        gapText = 'LÍDER';
      } else {
        const diff = competitors[0].score - c.score;
        if (diff >= 1.0) {
          const lapDiff = Math.floor(diff);
          gapText = `+${lapDiff} VTA`;
        } else {
          gapText = `+${(diff * 100).toFixed(1)}s`;
        }
      }

      rowsHTML += `
        <div class="leaderboard-row ${isPlayerClass}">
          <span class="leader-pos">${pos}</span>
          <span class="leader-color" style="background: ${c.color}"></span>
          <span class="leader-name">${c.name}</span>
          <span class="leader-gap">${gapText}</span>
        </div>
      `;
    });

    const rowsContainer = document.getElementById('leaderboard-rows');
    if (rowsContainer) {
      rowsContainer.innerHTML = rowsHTML;
    }
  }

  updateMinimap() {
    const playerDot = document.getElementById('player-dot');
    if (playerDot) {
      playerDot.setAttribute('cx', this.car.mesh.position.x);
      playerDot.setAttribute('cy', this.car.mesh.position.z);
    }

    this.aiCars.forEach((ai, idx) => {
      const aiDot = document.getElementById('ai-dot-' + idx);
      if (aiDot) {
        aiDot.setAttribute('cx', ai.mesh.position.x);
        aiDot.setAttribute('cy', ai.mesh.position.z);
      }
    });
  }
}

// Iniciar aplicación
window.startRace = function(trackId) {
  window.__selectedTrack = trackId || 'monza';
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  new Game();
};

window.onload = () => {
  const menu = document.getElementById('main-menu');
  if (menu) {
    menu.style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
  } else {
    new Game();
  }
};
