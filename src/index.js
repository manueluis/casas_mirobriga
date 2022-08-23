import * as THREE from 'three'
import Nebula, { SpriteRenderer } from 'three-nebula'
import json from '../fire.json'
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Vector2 } from 'three';

let camera, scene, renderer, controls, fireLight, particles;

const objects = [];

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let starsInited = false;
let cloudsInited = false;
let primeiroCarregamento = false;
let hemisphereLight;
let ambientLight;
let directionalLight;

let intersetado;

let cloudMaterial, clouds = [];
let objectsHotspot = [];

const d = new Date();
let hour = d.getHours();
let sky, sun;

const cameraFloorDistance = 1.3;
const cameraColisionDistance = 0.2;
const cameraMass = 10;
let velocityScalar = 40;
let cloudTicker = 0;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();

Nebula.fromJSONAsync(json, THREE).then(loaded => {
    const app = { camera, scene, renderer };
    const nebulaRenderer = new SpriteRenderer(app.scene, THREE);
    const nebula = loaded.addRenderer(nebulaRenderer);

    animate(nebula, app);
});

function init() {
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 6000 + hour * 5);
    camera.position.y = cameraFloorDistance + 10;
    camera.position.x = 0;
    camera.position.z = 0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001844);

    initLights();
    loadGLB('../Modelos_glb/modelos.glb', 0, 0, 0, 0);
    //loadGLB('../Modelos_glb/Moinho.glb', 0, -45, 0);
    loadGLB('../Modelos_glb/Tabernae.glb', 34.64, 2.55, -13.8, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Bancada.glb', 30.3652, 2.7, -14.3674, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Escada.glb', 27.588, 2.7418, -18.129, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Escada.glb', 34.449, 2.7418, -22.103, Math.PI * (1 / 6));
    //loadGLB('../Modelos_glb/Telhas.glb', 30.35, 4.58, -11.1, Math.PI * (1 / 6))
    //loadGLB('../Modelos_glb/untitled.glb', 0, 4, 0, Math.PI * (1 / 6))
    //generateWalls();
    initSky();

    controls = new PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    window.addEventListener('resize', onWindowResize);

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    });
    

    scene.add(controls.getObject());

    const onKeyDown = function (event) {

        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;

            case 'Space':
                if (canJump === true) velocity.y += velocityScalar / 2;
                canJump = false;
                break;

            case 'KeyF':
                hotspotTest();
                break;
            case 'KeyG':
                console.log(controls.getObject().position);
                break;
        }
        if (event.shiftKey) velocityScalar = 80;

    };

    const onKeyUp = function (event) {

        switch (event.code) {

            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;

            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;

            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;

            case 'ArrowRight':
            case 'KeyD':
                moveRight = false;
                break;

        }
        if (!event.shiftKey) velocityScalar = 40;

    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    var points = [
    
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 1, 1),
        new THREE.Vector3(0, 0, 1),
        
        new THREE.Vector3(1, 0, 1),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, 0),
        
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 0),
        new THREE.Vector3(0, 1, 0),
        
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 1),
        
        new THREE.Vector3(1, 1, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(0, 1, 1),

        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 1),
        new THREE.Vector3(0, 1, 1),
        new THREE.Vector3(1, 1, 1)
    ];
        
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
        
    var indices = [];
    
    //0-1
    indices.push(0, 1, 3);
    indices.push(3, 2, 0);
        
    //2-3
    indices.push(4, 5, 7);
    indices.push(7, 6, 4);
       
    //4-5
    indices.push(8, 9, 11);
    indices.push(11, 10, 8);
    
    indices.push(12, 13, 15);
    indices.push(15, 14, 12);

    indices.push(16, 17, 19);
    indices.push(19, 18, 16);

    indices.push(20, 21, 23);
    indices.push(23, 22, 20);
     
    geometry.setIndex( indices );
        
    geometry.addGroup(0, 6, 0);
    geometry.addGroup(6, 6, 1);
    geometry.addGroup(12, 6, 2);
    geometry.addGroup(18, 6, 3);
    geometry.addGroup(24, 6, 4);
    geometry.addGroup(30, 6, 3);
    
    var quad_uvs =
    [
    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,
    
    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,
    
    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0
    ];
    let uvs = new Float32Array(quad_uvs);
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    
    geometry.computeVertexNormals();
    
    var materials = [
        
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1001.png")}),
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1002.png")}),
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1003.png")}),
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1011.png")}),
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1012.png")}),
        new THREE.MeshBasicMaterial({map: new THREE.TextureLoader().load("../images/1013.png")})
    ];
        
    var plane = new THREE.Mesh(geometry, materials);
    plane.rotation.set(Math.PI, 0, 0);
    scene.add(plane);
    objects.push(plane)

    console.log(plane)

    generateHotSpot(0, -48, 20, -Math.PI / 2, '../images/teste.png')
}

//Ceu
function initSky() {
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    sun = new THREE.Vector3();

    const effectController = {
        turbidity: Math.exp(-Math.pow(hour - (hour<12) ? 6 : 18, 6)) * 0.4,
        rayleigh: Math.exp(-Math.pow(hour - (hour<12) ? 6 : 18, 6)) * 3.8 + 0.2,
        mieCoefficient: 0.2,
        mieDirectionalG: 0.999,
        elevation: (hour > 18) ? 315 - hour * 15 : -90 + hour * 15,
        azimuth: 180,
        hourEC: hour,
        exposure: Math.exp(-Math.pow(((hour-12)/5.7),20))* 0.97 + 0.03
    };

    console.log(effectController.elevation);

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    function guiChanged() {
        hour = effectController.hourEC;
        effectController.elevation = (hour > 12) ? 90 + (hour - 12) * 11.25 : -90 + hour * 15,
            uniforms['sunPosition'].value.copy(sun);

        uniforms['turbidity'].value = Math.exp(-Math.pow(hour - (hour<12) ? 6 : 18, 6)) * 0.4;
        uniforms['rayleigh'].value = Math.exp(-Math.pow(hour - (hour<12) ? 6 : 18, 6)) * 3.8 + 0.2;
        renderer.toneMappingExposure = Math.exp(-Math.pow(((hour-12)/5.7),20))* 0.97 + 0.03;

        console.log(effectController.turbidity);
        console.log(effectController.rayleigh);

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        ambientLight.intensity = (hour > 12) ? 1.2 - hour * 0.025 : 0.6 + hour * 0.025;
        directionalLight.intensity = (hour > 12) ? 1.2 - hour * 0.025 : 0.6 + hour * 0.025;
        hemisphereLight.intensity = (hour > 12) ? 1.2 - hour * 0.025 : 0.6 + hour * 0.025;
        
        sun.setFromSphericalCoords(1, phi, theta);
        uniforms['sunPosition'].value.copy(sun);

        changeStars();
        changeClouds();
    }

    const gui = new GUI();
    gui.add(effectController, 'hourEC', 0, 24, 1).onChange(guiChanged);
    guiChanged();
    console.log(sky)
}

//Luzes
function initLights() {
    hemisphereLight = new THREE.HemisphereLight(0xeeeeff, 0x777788, 0.75);
    hemisphereLight.position.set(0.5, 1, 0.75);
    scene.add(hemisphereLight);

    ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1000, 0);
    directionalLight.target = camera;
    directionalLight.position.multiplyScalar(30);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    const d = 50;
    directionalLight.shadow.camera.left = - d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = - d;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.bias = - 0.0001;

    fireLight = new THREE.PointLight(0xFFB900, 1, 100);
    scene.add(fireLight);
}

function loadGLB(modelo, x, y, z, rotation) {
    console.log("A carregar '" + modelo + "' nas coordenadas (" + x + "," + y + "," + z + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        modelo,
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.position.set(x, y, z)
                child.rotateY(rotation);
                objects.push(child)
            })
        }
    )
    if (!primeiroCarregamento) {
        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);
        primeiroCarregamento = true;
    }

    console.log("Modelo carregado...")
}

function changeClouds() {
    if ((hour <= 21 && hour >= 3) && !cloudsInited) {
        cloudsInited = true;
        const loader = new THREE.TextureLoader();

        loader.crossOrigin = '';

        loader.load(
            '../images/cloud.png',
            function onLoad(texture) {
                const cloudGeo = new THREE.CircleBufferGeometry((Math.random() * 600) + 450, (Math.random() * 600) + 450);

                cloudMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                    opacity: (hour < 12) ? hour / 12 : 24 / hour
                });

                for (let p = 0, l = 50; p < l; p++) {
                    let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);

                    cloud.rotateX(Math.PI / 2);

                    cloud.position.set(
                        (Math.random() * 6000) - 3000,
                        400 + Math.random() * 200,
                        (Math.random() * 6000) - 3000
                    );

                    cloud.rotation.z = Math.random() * 360;
                    scene.add(cloud);
                    clouds.push(cloud);
                }
            }
        );
    } else if (hour > 21 || hour < 3) {
        clouds.forEach(cloud => scene.remove(cloud));
        clouds = [];
        cloudsInited = false;
    } else {
        clouds.forEach(cloud => cloud.material.opacity = (-Math.pow(hour - 13, 2) / 49 + 1));
    }
}

function changeStars() {
    if ((hour > 19 || hour < 8) && !starsInited) {
        starsInited = true;

        let geometry = new THREE.BufferGeometry();

        let material = new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, transparent: true });
        material.color.setHex();
        material.color.set(new THREE.Color(255, 205, 60))

        let verticesNTyped = []
        let vertice = new THREE.Vector3();
        for (let i = 0; i < 1000; i++) {
            vertice.setFromSpherical(new THREE.Spherical(3000 + 5 * Math.random(), 2 * Math.PI * Math.random(), Math.PI * Math.random()))
            verticesNTyped.push(vertice.x);
            verticesNTyped.push(vertice.y);
            verticesNTyped.push(vertice.z);

        }
        let vertices = new Float32Array(verticesNTyped)

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

        particles = new THREE.Points(geometry, material);
        scene.add(particles);
    } else if (hour >= 8 && hour <= 19) {
        scene.remove(particles)
        particles = null;
        starsInited = false;
    }
}

function generateWalls() {
    let geometry = new THREE.BoxGeometry(100, 100, 100);
    let material = new THREE.MeshBasicMaterial({
    })

    let cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    objects.push(cube);
}

//Hotspots
function generateHotSpot(positionx, positiony, positionz, rotation, image) {
    var texture = new THREE.TextureLoader().load(image);
    var material = new THREE.MeshBasicMaterial({
        map: texture
    });
    var geometry = new THREE.BoxGeometry(0, 5, 10);
    var mesh = new THREE.Mesh(geometry, material);
    var s = 0.5;
    mesh.scale.set(s, s, s);
    mesh.position.set(positionx, positiony, positionz); //mesh.receiveShadow = true;

    scene.add(mesh);
    objectsHotspot.push(mesh); //Chao

    positionx += 0.1;

    texture = new THREE.TextureLoader().load('../images/info.png');
    material = new THREE.MeshBasicMaterial({
        map: texture
    });
    geometry = new THREE.CircleGeometry(0.8, 32);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(positionx, positiony, positionz);
    mesh.rotation.y = rotation;
    scene.add(mesh); //i chao
}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//Sempre que utilizador clica em F, verifica se existe um hotspot à frente da camera, mostra o hotspot se houver
function hotspotTest() {
    console.log("test")
    var raycasterHotspot = new THREE.Raycaster();
    raycasterHotspot.setFromCamera(new Vector2(0, 0), camera);

    const hotspotIntersection = raycasterHotspot.intersectObjects(objectsHotspot);
    console.log(raycasterHotspot)
    if (hotspotIntersection.length > 0) {
        console.log(hotspotIntersection[0])
        if (hotspotIntersection[0].distance <= 10) {
            console.log("a mostrar")
            intersetado = hotspotIntersection[0].object;
            intersetado.visible = true;
        } else {
            if (intersetado != null) {
                intersetado.visible = false;
                intersetado = null;
            }
        }
    } else {
        if (intersetado != null) {
            console.log("lol")
            intersetado.visible = false;
            intersetado = null;
        }
    }
}

function cameraColision(raycaster, axis) {
    // verifica as interseções com os objetos
    raycaster.ray.origin.copy(controls.getObject().position);

    const intersections = raycaster.intersectObjects(objects, true);

    if (intersections.length > 0) {

        velocity[axis] = 0;
        return intersections;

    } else {

        return false;

    }
}

function doCloudTick() {
    clouds.forEach(function(cloud) {
        if(cloud.position.x < 3000) {
            cloud.position.x += 0.2;
        } else {
            cloud.position.x = -3000
        }
    })
}

function animate(nebula, app) {
    requestAnimationFrame(() => animate(nebula, app))
    nebula.update();

    const time = performance.now();

    objectsHotspot.forEach(object => {
        if (object.visible && controls.getObject().position.distanceTo(object.position) > 10) {
            object.visible = false;
        }
    });

    if (controls.isLocked === true) {

        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * cameraMass * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // this ensures consistent movements in all directions

        if (moveForward || moveBackward) velocity.z -= direction.z * velocityScalar * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * velocityScalar * delta;


        const cameraDirection = new THREE.Vector3();
        controls.getDirection(cameraDirection)

        const distanceX = - velocity.x * delta;
        const distanceY = - velocity.z * delta;

        /*A direção mais próxima da colisão é a que deve ser verificada primeiro no raycaster
            Se estiver a andar para a frente ou tras deve ser primeiro o z, se tiver a andar para os lado deve ser primeiro o x
            No caso de ser diagonal, deve ser o que tiver mais próximo (não temos como detetar)
        
            A verificação de um espaço apertado no eixo do z ( quando a distancia para cima e para baixo que nós queremos é uperior ao espaço que existe até à colisão ) também tem de ser verificado nos outros eixos
            */
        const raycasterForward = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z), 0, distanceY + cameraColisionDistance);
        const intersectionsForward = cameraColision(raycasterForward, 'z')
        if (intersectionsForward) {
            controls.moveForward(intersectionsForward[0].distance - cameraColisionDistance);
        }

        const raycasterBackward = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(-cameraDirection.x, 0, -cameraDirection.z), 0, - distanceY + cameraColisionDistance);
        const intersectionsBackward = cameraColision(raycasterBackward, 'z');
        if (intersectionsBackward) {
            controls.moveForward(-intersectionsBackward[0].distance + cameraColisionDistance);
        }

        if (!intersectionsForward && !intersectionsBackward) {
            controls.moveForward(distanceY);
        }

        const raycasterLeft = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(cameraDirection.z, 0, -cameraDirection.x), 0, - distanceX + cameraColisionDistance);
        const intersectionsLeft = cameraColision(raycasterLeft, 'x')
        if (intersectionsLeft) {
            controls.moveRight(-intersectionsLeft[0].distance + cameraColisionDistance);
        }

        const raycasterRight = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(-cameraDirection.z, 0, cameraDirection.x), 0, distanceX + cameraColisionDistance);
        const intersectionsRight = cameraColision(raycasterRight, 'x')
        if (intersectionsRight) {
            controls.moveRight(intersectionsRight[0].distance - cameraColisionDistance);
        }

        if (!intersectionsRight && !intersectionsLeft) {
            controls.moveRight(distanceX);
        }

        if (velocity.y < 0) {
            const raycasterDown = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, (- velocity.y * delta) + cameraFloorDistance);
            const intersectionsDown = cameraColision(raycasterDown, 'y');
            if (intersectionsDown) {
                const raycasterUP2 = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, cameraColisionDistance + cameraFloorDistance - intersectionsDown[0].distance);
                if (cameraColision(raycasterUP2, 'y')) {
                    controls.moveRight(- distanceX);
                    controls.moveForward(- distanceY);
                } else {
                    if (intersectionsDown[0].distance > cameraFloorDistance - 0.6) {
                        controls.getObject().position.y = intersectionsDown[0].point.y + cameraFloorDistance;
                        velocity.y = 0;
                        canJump = true;
                    } else {
                        controls.moveRight(- distanceX);
                        controls.moveForward(- distanceY);
                    }
                }
            }
        } else if (velocity.y > 0) {
            const raycasterUp = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), 0, (velocity.y * delta) + cameraColisionDistance);
            if (cameraColision(raycasterUp, 'y')) {
                velocity.y = 0;
            }
        }

        controls.getObject().position.y += (velocity.y * delta); // new behavior
    }
    cloudTicker++;
    if(cloudTicker==1) {
        doCloudTick()
        cloudTicker=0;
    }

    prevTime = time;

    renderer.render(scene, camera);
}