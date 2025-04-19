// Game variables
let scene, camera, renderer, car, road, obstacles = [];
let score = 0;
let speed = 0;
let maxSpeed = 120;
let acceleration = 0.2;
let deceleration = 0.3;
let isBraking = false;

// Touch control variables
let joystickLeftActive = false;
let joystickRightActive = false;
let joystickLeftValue = { x: 0, y: 0 };
let joystickRightValue = { x: 0, y: 0 };

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4fc3f7);
    scene.fog = new THREE.Fog(0x4fc3f7, 10, 100);

    // Create camera (adjusted for mobile)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Create renderer (optimized for mobile)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.touchAction = 'none';
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Create game elements
    createRoad();
    createCar();
    createObstacles();
    
    // Set up controls
    setupTouchControls();
    window.addEventListener('resize', onWindowResize);
    
    // Start game loop
    animate();
}

// Create the road
function createRoad() {
    const roadGeometry = new THREE.PlaneGeometry(100, 10);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2e7d32,
        side: THREE.DoubleSide
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    scene.add(road);
    
    // Add road markings
    for (let i = -50; i < 50; i += 5) {
        const lineGeometry = new THREE.PlaneGeometry(0.5, 0.1);
        const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xe0f7fa });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, i);
        scene.add(line);
    }
}

// Create the player's car
function createCar() {
    const carGeometry = new THREE.BoxGeometry(1.5, 0.8, 3);
    const carMaterial = new THREE.MeshStandardMaterial({ color: 0x1565c0 });
    car = new THREE.Mesh(carGeometry, carMaterial);
    car.position.y = 0.5;
    scene.add(car);
    
    // Add car details
    const cabinGeometry = new THREE.BoxGeometry(1.3, 0.5, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xbbdefb });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = 0.9;
    car.add(cabin);
}

// Create obstacles
function createObstacles() {
    const obstacleColors = [0xff5722, 0xff9800, 0x9c27b0];
    
    for (let i = 0; i < 20; i++) {
        const size = Math.random() * 1 + 0.5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({ 
            color: obstacleColors[Math.floor(Math.random() * obstacleColors.length)]
        });
        const obstacle = new THREE.Mesh(geometry, material);
        
        // Position obstacles randomly on the road
        obstacle.position.set(
            (Math.random() - 0.5) * 8,
            size / 2,
            -30 - Math.random() * 70
        );
        
        scene.add(obstacle);
        obstacles.push(obstacle);
    }
}

// Update score display
function updateScore() {
    document.getElementById('score-display').textContent = `Score: ${score}`;
}

// Update speed display
function updateSpeed() {
    document.getElementById('speed-display').textContent = `Speed: ${Math.round(speed)} km/h`;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set up touch controls
function setupTouchControls() {
    const joystickLeft = document.getElementById('joystick-left');
    const joystickRight = document.getElementById('joystick-right');
    const brakeBtn = document.getElementById('brake-btn');
    const joystickLeftInner = joystickLeft.querySelector('.joystick-inner');
    const joystickRightInner = joystickRight.querySelector('.joystick-inner');

    // Left Joystick (Steering)
    joystickLeft.addEventListener('touchstart', (e) => {
        joystickLeftActive = true;
        e.preventDefault();
    });

    joystickLeft.addEventListener('touchmove', (e) => {
        if (!joystickLeftActive) return;
        const touch = e.touches[0];
        const rect = joystickLeft.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let x = (touch.clientX - centerX) / (rect.width / 2);
        let y = (touch.clientY - centerY) / (rect.height / 2);
        
        // Limit to joystick bounds
        const length = Math.sqrt(x * x + y * y);
        if (length > 1) {
            x /= length;
            y /= length;
        }
        
        joystickLeftValue = { x, y };
        joystickLeftInner.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
        e.preventDefault();
    });

    joystickLeft.addEventListener('touchend', () => {
        joystickLeftActive = false;
        joystickLeftValue = { x: 0, y: 0 };
        joystickLeftInner.style.transform = 'translate(0, 0)';
    });

    // Right Joystick (Acceleration/Braking)
    joystickRight.addEventListener('touchstart', (e) => {
        joystickRightActive = true;
        e.preventDefault();
    });

    joystickRight.addEventListener('touchmove', (e) => {
        if (!joystickRightActive) return;
        const touch = e.touches[0];
        const rect = joystickRight.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        
        let y = (touch.clientY - centerY) / (rect.height / 2);
        y = Math.max(-1, Math.min(1, y)); // Clamp between -1 and 1
        
        joystickRightValue = { x: 0, y };
        joystickRightInner.style.transform = `translate(0, ${y * 20}px)`;
        e.preventDefault();
    });

    joystickRight.addEventListener('touchend', () => {
        joystickRightActive = false;
        joystickRightValue = { x: 0, y: 0 };
        joystickRightInner.style.transform = 'translate(0, 0)';
    });

    // Brake Button
    brakeBtn.addEventListener('touchstart', () => {
        isBraking = true;
    });

    brakeBtn.addEventListener('touchend', () => {
        isBraking = false;
    });
}

// Handle player input
function handleInput() {
    // Acceleration (Right Joystick Down)
    if (joystickRightValue.y < -0.3 && speed < maxSpeed) {
        speed -= joystickRightValue.y * acceleration;
    }
    
    // Braking
    if (isBraking && speed > 0) {
        speed -= deceleration * 2;
        if (speed < 0) speed = 0;
    } else if (speed > 0) {
        speed -= deceleration * 0.2; // Natural deceleration
    }
    
    // Steering (Left Joystick X-Axis)
    if (joystickLeftValue.x !== 0 && car.position.x > -3.5 && car.position.x < 3.5) {
        car.position.x += joystickLeftValue.x * 0.1 * (speed / maxSpeed);
    }
}

// Check for collisions
function checkCollisions() {
    obstacles.forEach(obstacle => {
        if (Math.abs(car.position.x - obstacle.position.x) < 1 && 
            Math.abs(car.position.z - obstacle.position.z) < 2) {
            // Collision detected
            speed *= 0.5;
            obstacle.position.z -= 100;
            score = Math.max(0, score - 5);
            updateScore();
        }
        
        // Move obstacle toward player
        obstacle.position.z += speed * 0.02;
        
        // Reset obstacle when it passes the player
        if (obstacle.position.z > 10) {
            obstacle.position.z = -50 - Math.random() * 50;
            obstacle.position.x = (Math.random() - 0.5) * 8;
            score += 1;
            updateScore();
        }
    });
}

// Main game loop
function animate() {
    requestAnimationFrame(animate);
    
    handleInput();
    checkCollisions();
    updateSpeed();
    
    // Move camera with car
    camera.position.z = car.position.z + 10;
    camera.position.x = car.position.x;
    
    renderer.render(scene, camera);
}

// Start the game
init();
