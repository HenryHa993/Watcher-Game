import * as THREE from 'three';
import {GLTFLoader} from 'GLTFLoader';
import {PointerLockControls} from 'PointerLockControls';

// Main components to render scene
let camera, scene, renderer, controls;

// GLTF loader
let loader;

// Eye grouping
let eyeGroup;
let eyeX;
let eyeY;
let eyeZ;

let eyeHealth = 100;

// Entity control variables
let entity;

let isWatching = false;
let wasWatching = false;
let watchTimer = 20;
let watchTime = 10;
let deathTimer = 5;
let teleportX;
let teleportY;
let teleportZ;
let teleportNum;

// Game state variables
let score = 0;
let isGameOver = false;

// Flashlight control variables
let mouseDownPrev = false;
let mouseDownNow = false;

let uvLight = false;

// Movement controller variables
let moveBackward = false;
let moveForward = false;
let moveLeft = false;
let moveRight = false;

let crouch = false;
let isUnderTable = false;

let moveSpeed = 75.0;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// Player movement range
let zUpperRange;
let zLowerRange;
let xUpperRange;
let xLowerRange;

// For raycasting
const raycaster = new THREE.Raycaster();

// Lighting
const tvSpotlight = new THREE.SpotLight(0x0353A4, 15, 0, Math.PI * 2/6);
const tvPointlight = new THREE.PointLight(0x0353A4, 15, 4.0);

// Win/Lose screens
const blocker = document.getElementById('blocker');
const win = document.getElementById('Win');
const lose = document.getElementById('Lose');

// Time elapsed, used later for delta
let prevTime = performance.now();

init();
animate();


// Random number function
function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}


// Initialise scene
function init(){
	// Camera
	camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
	camera.position.y = 2.5;


	// Scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color('black');
	scene.fog = new THREE.Fog(0x000000, 0, 50); // Black fog, renders distance objects black


	// Lighting
	// Ambient light
	const ambLight = new THREE.AmbientLight( 0xFFFFFF,0.2); // soft white light
	scene.add( ambLight );

	// Flashlight
	const flashlight = new THREE.SpotLight(0xFFFFFF, 0.75, 0, Math.PI * 1/7);
	camera.add(flashlight);
	camera.add(flashlight.target);
	flashlight.castShadow = true;
	flashlight.shadow.bias = -0.005;
	flashlight.position.y = 0;
	flashlight.target.position.z = -1;

	// TV light
	tvSpotlight.position.set(-4.59,0.67,2.6);
	tvSpotlight.target.position.x = 0;
	tvSpotlight.target.position.y = 0.7;
	tvSpotlight.target.position.z = 14;
	tvSpotlight.castShadow = true;
	scene.add(tvSpotlight);

	// const helper2 = new THREE.SpotLightHelper(tvSpotlight);
	// scene.add(helper2);

	// TV light
	tvPointlight.position.set(-4.59,0.67,2.6);
	scene.add(tvPointlight);

	// const helper3 = new THREE.PointLightHelper(tvPointlight);
	// scene.add(helper3);
	blocker.style.display = 'none';
	win.style.display = 'none';
	lose.style.display = 'none';

	// Form eye group
	eyeGroup = new THREE.Group();
	scene.add(eyeGroup);

	// Player controls
	controls = new PointerLockControls(camera, document.body);

    // TODO
	zUpperRange = 3.0;
	zLowerRange = -4.0;
	xUpperRange = 3.4;
	xLowerRange = -5.8;	

	document.body.addEventListener( 'click', function() {
		controls.lock();
	} );

	document.body.addEventListener('mousedown', function(){
		uvLight = true;
		flashlight.intensity = 3;
		flashlight.angle = Math.PI * 1/100;
		mouseDownNow = true;
	});

	document.body.addEventListener('mouseup', function(){
		uvLight = false;
		flashlight.intensity = 0.75;
		flashlight.angle = Math.PI * 1/6;
		mouseDownNow = false;
	});

	scene.add(controls.getObject());
	const onKeyDown = function(event){
		switch(event.code){
			case 'KeyW':
				moveForward = true;
				break;
							
			case 'KeyA':
				moveLeft = true;
				break;
							
			case 'KeyS':
				moveBackward = true;
				break;
							
			case 'KeyD':
				moveRight = true;
				break;
			case 'Space':
				crouch = true;
				break;
		}
	};

	const onKeyUp = function(event){
		switch(event.code){
			case 'KeyW':
				moveForward = false;
				break;
							
			case 'KeyA':
				moveLeft = false;
				break;
							
			case 'KeyS':
				moveBackward = false;
				break;
							
			case 'KeyD':
				moveRight = false;
				break;
			case 'Space':
				crouch = false;
				break;
			}
	};

	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('keyup', onKeyUp);

	// const axesHelper = new THREE.AxesHelper( 5 );
	// scene.add(axesHelper);

	// Load main scene
	loader = new GLTFLoader();
	loader.load('../Assets/lvl2.glb', function(gltf){
		gltf.scene.receiveShadow = true;
		gltf.scene.castShadow = true;
		gltf.scene.traverse(function(node){
			if (node.isMesh){
				node.castShadow = true;
				node.receiveShadow = true;
			}
		});
		scene.add(gltf.scene);
	});

	// Load eyeballs into scene
    // TODO
	eyeX = [-0.1, -5.76, -5.65, 5.23, 5.0];
	eyeY = [3.79, 0.11, 0.10, 0.27, 0.14];
	eyeZ = [3.7, -0.93, 3.71, 3.03, -0.13];

	for(let i=0; i < 5; i++){
		loader.load('../Assets/FinalEye2.glb', function(gltf){
			gltf.scene.scale.set(0.1,0.1,0.1);
			gltf.scene.position.x = eyeX[i];
			gltf.scene.position.y = eyeY[i];
			gltf.scene.position.z = eyeZ[i];
			gltf.scene.lookAt(camera.position);
			eyeGroup.add(gltf.scene);
		});
	}

	// Load entity enemy
	teleportX = [0, 6.2, 6.2, -0.71];
	teleportY = [-10, 3.0, 3.0, 3.0];
	teleportZ = [0, -2.1, 2.0, -4.61];	

	loader.load('../Assets/Gesicht_Kai.glb', function(gltf){
		gltf.scene.receiveShadow = true;
		gltf.scene.castShadow = true;
		gltf.scene.scale.set(0.1,0.1,0.1);
		gltf.scene.position.y = -10;
		entity = gltf.scene;
		scene.add(entity);
	});

	// Renderer
	renderer = new THREE.WebGLRenderer({antialias:true});
	renderer.shadowMap.enabled = true;

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	// Window resize
	window.addEventListener('resize', onWindowResize);
}

// Resize window function
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}


// Animation loop
function animate(){
	requestAnimationFrame(animate);

	// Stuff before rendering
	// delta, to produce framerate consistent behaviours
	const time = performance.now();
	const delta = (time - prevTime) / 1000;

	// Controls for movement
	if(controls.isLocked === true){

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		direction.z = Number(moveForward) - Number(moveBackward);
		direction.x = Number(moveRight) - Number(moveLeft);
		direction.normalize(); // this ensures consistent movements in all directions
		
		if ( moveForward || moveBackward ) velocity.z -= direction.z * moveSpeed * delta;
		
		if ( moveLeft || moveRight ) velocity.x -= direction.x * moveSpeed * delta;
		
		controls.moveRight( - velocity.x * delta );
		
		controls.moveForward( - velocity.z * delta );
	}

	// Crouching controls
	if(crouch){
		camera.position.y = 0.3;
		moveSpeed = 20.0;
		xUpperRange = 5.2;
	} else{
		camera.position.y = 2.5;
		moveSpeed = 75.0;
		xUpperRange = 3.4;
	}

	// Determine if player is under table
    // TODO
	if(camera.position.x > 3.6){

		isUnderTable = true;
	}
	else{
		isUnderTable = false;
	}

    console.log("isUnderTable: " + isUnderTable);

	// Player movement limits
	if(camera.position.x < xLowerRange || camera.position.x > xUpperRange){
		camera.position.x = THREE.MathUtils.clamp(camera.position.x, xLowerRange, xUpperRange);
	}
	if(camera.position.z < zLowerRange || camera.position.z > zUpperRange){
		camera.position.z = THREE.MathUtils.clamp(camera.position.z, zLowerRange, zUpperRange);
	}

	// Raycast to detect eyes
	raycaster.setFromCamera( new THREE.Vector2(), camera );
	const intersects = raycaster.intersectObjects(eyeGroup.children, true);
	
	// Burning eyes
	if(intersects.length > 0 && uvLight && mouseDownPrev){
		eyeHealth -= 25 * delta;
		// console.log(eyeHealth);
		if(eyeHealth < 0){
			eyeHealth = 100;
			score += 1;
			intersects[0].object.visible = false;
			intersects[1].object.visible = false;
		}
	}

	
	// Entity code
	if(watchTimer > 0){
		isWatching = false;
		watchTimer -= 1 * delta;
	}
	else if(watchTimer < 0){
		isWatching = true;
	}

	// Entity stare
	if(entity){
		entity.lookAt(camera.position);
	}

	// IsWatching event
	if(isWatching){
		// Change light to denote when you should be hiding
		tvPointlight.color.set(0xDE3C4B);
		tvSpotlight.color.set(0xDE3C4B);

		// Reduce watching timer
		watchTime -= 1 * delta;

		// Teleport him to a random window or the mail box -- I think that is pretty cool
		if(!wasWatching){
			teleportNum = randomIntFromInterval(1,3);
		}
		entity.position.setX(teleportX[teleportNum]);
		entity.position.setY(teleportY[teleportNum]);
		entity.position.setZ(teleportZ[teleportNum]);

		// If player is not under the table, in 5 seconds, they will die
		// Make sure to reset death timer
		if(!isUnderTable){
			deathTimer -= 1 * delta;
			if(deathTimer < 0){
				isGameOver = true;
			}
		}
		console.log("GAME OVER?: " + isGameOver);

		// Watch timer ends, reset variables
		if(watchTime < 0 && !isGameOver){
			// Reset light back to blue
			tvPointlight.color.set(0x0353A4);
			tvSpotlight.color.set(0x0353A4);

			// Reset death timer
			deathTimer = 5;

			// Reset entity position
			entity.position.setY(-10);

			// Reset watch timer
			watchTimer = 10;

			// Is watching
			watchTime = 10;
		}
	}

	// Game over
	if(isGameOver){
		controls.unlock();
		camera.lookAt(entity.position);
		// camera.zoom = 0.2;
		blocker.style.display = 'block';
		lose.style.display = '';
	}

	// Game won
	if(score > 4){
		controls.unlock();
		blocker.style.display = 'block';
		win.style.display = '';
	}

	console.log("Watch timer: " + watchTimer);
	console.log("isWatching: " + isWatching);
    // console.log("z coord: " + camera.position.z);

	prevTime = time;
	mouseDownPrev = mouseDownNow;
	wasWatching = isWatching;
	renderer.render(scene, camera);
}

// STOP HERE