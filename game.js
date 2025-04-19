// ==================== GAME CLASS ====================
class RacingGame {
    constructor() {
        // Core Three.js elements
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Game state
        this.speed = 0;
        this.maxSpeed = 220;
        this.acceleration = 0;
        this.steeringAngle = 0;
        this.maxSteering = 0.03;
        this.gear = 'N';
        this.lap = 1;
        this.totalLaps = 3;
        this.raceTime = 0;
        this.lastTime = 0;
        
        // Control states
        this.steeringValue = 0;
        this.throttleActive = false;
        this.brakeActive = false;
        
        // Game objects
        this.car = null;
        this.road = null;
        this.opponents = [];
        
        // Initialize the game
        this.init();
    }

    init() {
        this.setupRenderer();
        this.setupLights();
        this.createProceduralAssets();
        this.createTrack();
        this.createCar();
        this.createOpponents();
        this.setupControls();
        this.setupEventListeners();
        
        // Start game loop
        this.animate();
    }

    setupRenderer() {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }

    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(100, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        this.scene.add(sunLight);
        
        // Fog
        this.scene.fog = new THREE.FogExp2(0xcccccc, 0.002);
    }

    createProceduralAssets() {
        // Road texture
        this.roadTexture = this.createProceduralRoadTexture();
        
        // Grass texture
        this.grassTexture = this.createProceduralGrassTexture();
        
        // Car paint material
        this.carPaintMaterial = this.createCarPaintMaterial();
    }

    createProceduralRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Asphalt base
        ctx.fillStyle = '#333344';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add noise for texture
        const noiseImage = ctx.createImageData(canvas.width, canvas.height);
        for (let i = 0; i < noiseImage.data.length; i += 4) {
            const value = Math.random() * 50;
            noiseImage.data[i] = 40 + value;
            noiseImage.data[i+1] = 40 + value;
            noiseImage.data[i+2] = 50 + value;
            noiseImage.data[i+3] = 255;
        }
        ctx.putImageData(noiseImage, 0, 0);
        
        // Road markings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 20;
        ctx.setLineDash([100, 50]);
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 0);
        ctx.lineTo(canvas.width/2, canvas.height);
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 2);
        return texture;
    }

    createProceduralGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Base green color
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add grass blades
        ctx.strokeStyle = '#3a6b32';
        ctx.lineWidth = 2;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const height = 5 + Math.random() * 10;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 5, y - height);
            ctx.stroke();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(20, 20);
        return texture;
    }

    createCarPaintMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Base color with gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1565c0');
        gradient.addColorStop(1, '#0d47a1');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add metallic flakes
        ctx.fillStyle = 'rgba(200, 220, 255, 0.3)';
        for (let i = 0; i < 500; i++) {
            const size = Math.random() * 3 + 1;
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                size, size
            );
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.7,
            roughness: 0.3
        });
    }

    createTrack() {
        // Road
        const roadGeometry = new THREE.PlaneGeometry(200, 20);
        const roadMaterial = new THREE.MeshStandardMaterial({ 
            map: this.roadTexture,
            roughness: 0.8,
            metalness: 0.2
        });
        this.road = new THREE.Mesh(roadGeometry, roadMaterial);
        this.road.rotation.x = -Math.PI / 2;
        this.road.receiveShadow = true;
        this.scene.add(this.road);
        
        // Grass
        const grassGeometry = new THREE.PlaneGeometry(200, 100);
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            map: this.grassTexture,
            roughness: 1.0
        });
        
        const leftGrass = new THREE.Mesh(grassGeometry, grassMaterial);
        leftGrass.rotation.x = -Math.PI / 2;
        leftGrass.position.set(0, 0, -20);
        this.scene.add(leftGrass);
        
        const rightGrass = new THREE.Mesh(grassGeometry, grassMaterial);
        rightGrass.rotation.x = -Math.PI / 2;
        rightGrass.position.set(0, 0, 20);
        this.scene.add(rightGrass);
        
        // Barriers
        const barrierGeometry = new THREE.BoxGeometry(200, 0.5, 0.5);
        const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        leftBarrier.position.set(0, 0.25, -10);
        this.scene.add(leftBarrier);
        
        const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        rightBarrier.position.set(0, 0.25, 10);
        this.scene.add(rightBarrier);
    }

    createCar() {
        // Car body
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
        const body = new THREE.Mesh(bodyGeometry, this.carPaintMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        
        // Cabin
        const cabinGeometry = new THREE.BoxGeometry(1.8, 0.6, 1.8);
        const cabinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xbbdefb,
            metalness: 0.3,
            roughness: 0.5
        });
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabin.position.y = 1.1;
        cabin.castShadow = true;
        
        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        const flWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        flWheel.rotation.z = Math.PI / 2;
        flWheel.position.set(-1.2, 0.4, 1.2);
        
        const frWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        frWheel.rotation.z = Math.PI / 2;
        frWheel.position.set(1.2, 0.4, 1.2);
        
        const rlWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rlWheel.rotation.z = Math.PI / 2;
        rlWheel.position.set(-1.2, 0.4, -1.2);
        
        const rrWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        rrWheel.rotation.z = Math.PI / 2;
        rrWheel.position.set(1.2, 0.4, -1.2);
        
        // Create car group
        this.car = new THREE.Group();
        this.car.add(body);
        this.car.add(cabin);
        this.car.add(flWheel);
        this.car.add(frWheel);
        this.car.add(rlWheel);
        this.car.add(rrWheel);
        
        this.scene.add(this.car);
    }

    createOpponents() {
        for (let i = 0; i < 3; i++) {
            const opponent = this.createOpponentCar(0xff0000 + i * 0x5555);
            opponent.position.z = -20 - (i * 15);
            opponent.position.x = (Math.random() - 0.5) * 4;
            this.scene.add(opponent);
            this.opponents.push({
                model: opponent,
                speed: 60 + (i * 10),
                lane: Math.floor(Math.random() * 3) - 1
            });
        }
    }

    createOpponentCar(color) {
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: color,
            metalness: 0.5,
            roughness: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        
        const car = new THREE.Group();
        car.add(body);
        return car;
    }

    setupControls() {
        const steeringWheel = document.getElementById('steering-wheel');
        const throttlePedal = document.getElementById('throttle-pedal');
        const brakePedal = document.getElementById('brake-pedal');
        
        // Steering touch controls
        steeringWheel.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.steeringTouchId = touch.identifier;
            this.steeringStartX = touch.clientX;
            e.preventDefault();
        });
        
        steeringWheel.addEventListener('touchmove', (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.steeringTouchId) {
                    const deltaX = e.touches[i].clientX - this.steeringStartX;
                    this.steeringValue = Math.min(1, Math.max(-1, deltaX / 100));
                    steeringWheel.style.transform = `rotate(${this.steeringValue * 90}deg)`;
                    e.preventDefault();
                    break;
                }
            }
        });
        
        steeringWheel.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.steeringTouchId) {
                    this.steeringTouchId = null;
                    this.steeringValue = 0;
                    steeringWheel.style.transform = 'rotate(0deg)';
                    break;
                }
            }
        });
        
        // Pedal controls
        throttlePedal.addEventListener('touchstart', () => {
            this.throttleActive = true;
            this.brakeActive = false;
            throttlePedal.style.background = 'rgba(0, 200, 0, 0.7)';
        });
        
        brakePedal.addEventListener('touchstart', () => {
            this.brakeActive = true;
            this.throttleActive = false;
            brakePedal.style.background = 'rgba(200, 0, 0, 0.7)';
        });
        
        document.addEventListener('touchend', () => {
            this.throttleActive = false;
            this.brakeActive = false;
            throttlePedal.style.background = 'rgba(0, 0, 0, 0.5)';
            brakePedal.style.background = 'rgba(0, 0, 0, 0.5)';
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updatePhysics(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        
        // Acceleration
        if (this.throttleActive) {
            this.acceleration = 5.0;
            if (this.speed < 0) this.acceleration *= 2; // Faster when reversing
        } else if (this.brakeActive) {
            this.acceleration = -10.0;
            if (this.speed < 0) this.acceleration *= 0.5; // Slower when reversing
        } else {
            // Natural deceleration
            this.acceleration = -Math.sign(this.speed) * 2.0;
            if (Math.abs(this.speed) < 1) {
                this.speed = 0;
                this.acceleration = 0;
            }
        }
        
        // Apply acceleration
        this.speed += this.acceleration * deltaSeconds;
        this.speed = Math.max(-20, Math.min(this.maxSpeed, this.speed));
        
        // Update gear
        if (this.speed > 5) this.gear = 'D';
        else if (this.speed < -5) this.gear = 'R';
        else this.gear = 'N';
        
        // Steering
        const steeringFactor = Math.min(1, Math.abs(this.speed) / 50);
        this.steeringAngle = this.steeringValue * this.maxSteering * steeringFactor;
        
        // Car rotation based on steering
        this.car.rotation.y = -this.steeringAngle * 2;
        
        // Move car forward
        const forwardVector = new THREE.Vector3(0, 0, 1);
        forwardVector.applyQuaternion(this.car.quaternion);
        this.car.position.add(forwardVector.multiplyScalar(this.speed * deltaSeconds));
        
        // Move camera with car
        this.camera.position.copy(this.car.position);
        this.camera.position.z -= 5;
        this.camera.position.y += 2;
        this.camera.lookAt(this.car.position);
        
        // Update HUD
        this.updateHUD();
    }

    updateOpponents(deltaTime) {
        const deltaSeconds = deltaTime / 1000;
        
        this.opponents.forEach(opponent => {
            // Simple AI movement
            const targetX = opponent.lane * 3;
            opponent.model.position.x += (targetX - opponent.model.position.x) * 0.05;
            
            // Move forward
            opponent.model.position.z += opponent.speed * deltaSeconds;
            
            // Wrap around track
            if (opponent.model.position.z > 100) {
                opponent.model.position.z -= 200;
                opponent.lane = Math.floor(Math.random() * 3) - 1;
            }
        });
    }

    checkCollisions() {
        // Simple boundary check
        if (this.car.position.x < -8 || this.car.position.x > 8) {
            // Hit barrier - slow down
            this.speed *= 0.7;
            this.car.position.x = Math.max(-8, Math.min(8, this.car.position.x));
        }
        
        // Opponent collision check
        this.opponents.forEach(opponent => {
            const distance = this.car.position.distanceTo(opponent.model.position);
            if (distance < 3) {
                // Collision with opponent
                this.speed *= 0.8;
                opponent.model.position.z -= 5; // Bump opponent back
            }
        });
    }

    updateHUD() {
        document.getElementById('speed').textContent = Math.abs(Math.round(this.speed));
        document.getElementById('gear').textContent = this.gear;
        
        // Update lap time
        this.raceTime += 0.016; // Roughly 60fps
        const minutes = Math.floor(this.raceTime / 60);
        const seconds = Math.floor(this.raceTime % 60);
        const milliseconds = Math.floor((this.raceTime % 1) * 100);
        document.getElementById('lap-time').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate delta time for smooth physics
        const now = performance.now();
        const deltaTime = now - (this.lastTime || now);
        this.lastTime = now;
        
        // Update game systems
        this.updatePhysics(deltaTime);
        this.updateOpponents(deltaTime);
        this.checkCollisions();
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game when loaded
window.addEventListener('load', () => {
    new RacingGame();
});
