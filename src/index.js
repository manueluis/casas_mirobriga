import * as THREE from 'three'
import Nebula, { SpriteRenderer } from 'three-nebula'
import json from '../fire.json'
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Vector2 } from 'three';
import { Vector3 } from 'three';
import { TextureLoader } from 'three';

let camera, scene, renderer, controls, fireLight, skyGeo, stars;

const objects = [];

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let hemisphereLight;
let ambientLight;
let directionalLight;

let intersetado;
let effectController;
let cloudMaterial, clouds = [];
let objectsHotspot = [];
let walls = [];

let hotSpotMap = new Map();

let sky, sun;

const cameraFloorDistance = 1.3;
const cameraColisionDistance = 0.2;
const cameraMass = 10;
let velocityScalar = 40;
let cloudTicker = 0;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

initControllers()
init();

Nebula.fromJSONAsync(json, THREE).then(loaded => {
    const app = { camera, scene, renderer };
    const nebulaRenderer = new SpriteRenderer(app.scene, THREE);
    const nebula = loaded.addRenderer(nebulaRenderer);

    animate(nebula, app);
});

function init() {
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 6000 + effectController.hour * 5);
    camera.position.y = cameraFloorDistance + 50;
    camera.position.x = 0;
    camera.position.z = 0;

    scene = new THREE.Scene();
    initRenderer()
    initLights();
    initStars();
    initClouds();
    initSky();
    loadTabernae();
    loadGLB('../Modelos_glb/terreno.glb', 0, -42.747, 0, 0);
    loadGLB('../Modelos_glb/A.glb', -189.96, 5.0232, -47.563, -184);
    loadGLB('../Modelos_glb/B.glb', -194.04, 5.7165, -73.686, 70.9);
    loadGLBQuaternion('../Modelos_glb/Termas.glb', 5.0909, -4.9488, 44.97, new THREE.Quaternion(0.338, -0.621, 0.621, 0.338));
    generateWalls();
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

    /*var points = [
    
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

    console.log(plane)*/

    generateHotSpot(0, -1, 20, 90, 'Teste')
}

function updateHours(){
    const date = new Date();
    effectController.hour = date.getHours() + date.getMinutes()/60;
}

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);
}

function skyUpdate(){
    const uniforms = sky.material.uniforms;

    const dia = effectController.hour>=6 && effectController.hour<18;
    const manha = effectController.hour<12;
    const nascerSol = effectController.hour>=5 && effectController.hour<6
    const porSol = effectController.hour>=18 && effectController.hour<19
    
    const auxRepeatValue = (Math.round(effectController.hour/12))*12;
    const auxTrigValue = Math.PI*(effectController.hour-auxRepeatValue)/(dia ? 12 : 10);
    const auxTurbValue = Math.exp(-Math.pow(4*(effectController.hour + ((effectController.hour>=18 || (effectController.hour>=6 && manha)) ? 6 : -6) - auxRepeatValue), 2));

    const phi = THREE.MathUtils.degToRad(90 - ((nascerSol||porSol) ? 0 : (Math.cos(auxTrigValue)*70))) //elevation
    const theta = THREE.MathUtils.degToRad(nascerSol ? 90 : (porSol ? 270 : (Math.sin(auxTrigValue)*90)+180)) //azimuth
    sun.setFromSphericalCoords(1, phi, theta);
    
    uniforms['sunPosition'].value.copy(sun);
    uniforms['turbidity'].value = dia ? auxTurbValue * 1 + 2 : auxTurbValue * 2.95 + 0.05;
    uniforms['rayleigh'].value = (Math.exp(-Math.pow(4*effectController.hour - (manha ? 25.3 : 70.7), 6)) * 3.5 + 0.5);
    uniforms['mieCoefficient'].value = (Math.exp(-Math.pow(1.4*effectController.hour - (manha ? 7.6 : 26), 8)) * 0.4 + 0.1);
    uniforms['mieDirectionalG'].value = (-Math.exp(-Math.pow(1.1*effectController.hour - (manha ? 6 : 20.4), 20)) * 0.899 + 0.999);
    renderer.toneMappingExposure = (Math.exp(-Math.pow(((effectController.hour-12)/6.5),24))* 0.96 + 0.04);
    
    ambientLight.intensity = 1;
    directionalLight.intensity = 1;
    hemisphereLight.intensity = 1;

    changeStars();
    changeClouds();
}

function initControllers(){
    const gui = new GUI();
    effectController = {
        hour: 0,
        autoUpdate: true
    };

    updateHours()

    let ambienteFolder = gui.addFolder('Ambiente')

    ambienteFolder.add(effectController, 'hour', 0, 24, 0.01).name("Hora do dia").listen().onChange(function(){
        effectController.autoUpdate = false;
        skyUpdate()
    });

    ambienteFolder.add(effectController, 'autoUpdate').name("Hora automática").listen().onChange(function(){
        if(effectController.autoUpdate){
            updateHours();
        }
    })
}

//Ceu
function initSky() {
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    sun = new THREE.Vector3();
    skyUpdate()
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

function loadTabernae() {
    let posx = 61.272; let posy = 2.8953; let posz = -24.455; let rot = 31;

    loadGLBwMap('../Modelos_glb/Tabernae.glb', posx, posy, posz, rot,"../images/colorMapTabernae.1001.png");
    loadGLBwMap('../Modelos_glb/Escada.glb', posx - 7.2992, posy + 0.22, posz - 4.4689, rot, "../images/colorMapBiombo.1001.png");
    loadGLBwMap('../Modelos_glb/Escada.glb', posx - 0.51904, posy + 0.22, posz - 8.5429, rot, "../images/colorMapBiombo.1001.png");
    loadBancada(posx-4.784, posy+0.1987, posz-1.265, rot);
    loadBiombo(posx-5.2333, posy, posz-2.7702, rot+90);
    loadGLB('../Modelos_glb/Dolium.glb', posx-5.3469, posy+0.1987, posz-3.0012, rot);
    loadGLB('../Modelos_glb/Dolium.glb', posx-4.9777, posy+0.1987, posz-3.2212, rot);
    loadGLB('../Modelos_glb/Dolium.glb', posx-4.6088, posy+0.1987, posz-3.4502, rot);
    loadGLB('../Modelos_glb/Portas.glb', posx-1.6803, posy+0.99639, posz+1.3712, rot);
    loadGLB('../Modelos_glb/Portas.glb', posx+2.3694, posy+0.99639, posz-1.0621, rot);
    loadTelhas();
    loadRipaseBarrotes();
}

function loadBancada(posx, posy, posz, rotation) {
    var rot = rotation * (Math.PI / 180);

    var points = [
        //Topo
        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 1.0013, 0.525),
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        
        new THREE.Vector3(1.025, 0.94875, 0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),
        
        new THREE.Vector3(1.025, 1.0013, 0.525),
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        new THREE.Vector3(1.025, 0.94875, 0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),
        
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),
        
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),

        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 1.0013, 0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),
        new THREE.Vector3(1.025, 0.94875, 0.525),

        //Base
        new THREE.Vector3(0.975, 0, -0.475),
        new THREE.Vector3(0.975, 0, 0.475),
        new THREE.Vector3(-0.975, 0, -0.475),
        new THREE.Vector3(-0.975, 0, 0.475),

        new THREE.Vector3(-0.975, 0.95, 0.475),
        new THREE.Vector3(-0.975, 0.95, -0.475),
        new THREE.Vector3(0.975, 0.95, 0.475),
        new THREE.Vector3(0.975, 0.95, -0.475),

        new THREE.Vector3(0.975, 0.95, 0.475),
        new THREE.Vector3(-0.975, 0.95, 0.475),
        new THREE.Vector3(0.975, 0, 0.475),
        new THREE.Vector3(-0.975, 0, 0.475),

        new THREE.Vector3(-0.975, 0.95, -0.475),
        new THREE.Vector3(0.975, 0.95, -0.475),
        new THREE.Vector3(-0.975, 0, -0.475),
        new THREE.Vector3(0.975, 0, -0.475),

        new THREE.Vector3(0.975, 0.95, -0.475),
        new THREE.Vector3(0.975, 0.95, 0.475),
        new THREE.Vector3(0.975, 0, -0.475),
        new THREE.Vector3(0.975, 0, 0.475),

        new THREE.Vector3(-0.975, 0.95, 0.475),
        new THREE.Vector3(-0.975, 0.95, -0.475),
        new THREE.Vector3(-0.975, 0, 0.475),
        new THREE.Vector3(-0.975, 0, -0.475),
    ];

    var geometry = new THREE.BufferGeometry().setFromPoints(points);
        
    var indices = [];

    //Topo
    indices.push(0, 1, 3);
    indices.push(3, 2, 0);
    indices.push(4, 5, 7);
    indices.push(7, 6, 4);
    indices.push(8, 9, 11);
    indices.push(11, 10, 8);
    indices.push(12, 13, 15);
    indices.push(15, 14, 12);
    indices.push(16, 17, 19);
    indices.push(19, 18, 16);
    indices.push(20, 21, 23);
    indices.push(23, 22, 20);
    //Base
    indices.push(24, 25, 27);
    indices.push(27, 26, 24);
    indices.push(28, 29, 31);
    indices.push(31, 30, 28);
    indices.push(32, 33, 35);
    indices.push(35, 34, 32);
    indices.push(36, 37, 39);
    indices.push(39, 38, 36);
    indices.push(40, 41, 43);
    indices.push(43, 42, 40);
    indices.push(44, 45, 47);
    indices.push(47, 46, 44);
     
    geometry.setIndex( indices );
    
    //Topo
    geometry.addGroup(0, 6, 0);
    geometry.addGroup(6, 6, 0);
    geometry.addGroup(12, 6, 0);
    geometry.addGroup(18, 6, 0);
    geometry.addGroup(24, 6, 0);
    geometry.addGroup(30, 6, 0);

    //Base
    geometry.addGroup(36, 6, 1);
    geometry.addGroup(42, 6, 1);
    geometry.addGroup(48, 6, 1);
    geometry.addGroup(54, 6, 1);
    geometry.addGroup(60, 6, 1);
    geometry.addGroup(66, 6, 1);
    
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
    1.0, 0.0,

    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0
    ];
    let uvs = new Float32Array(quad_uvs);
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    
    geometry.computeVertexNormals();
    
    let mat1 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/colorMapBancada.1001.png")});
    mat1.normalMap = new THREE.TextureLoader().load("../images/normalMapBancada.1001.png");

    let mat2 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/colorMapBancada.1012.png")});
    mat2.normalMap = new THREE.TextureLoader().load("../images/normalMapBancada.1012.png");

    var materials = [
        mat1,
        mat2
    ];
        
    var plane = new THREE.Mesh(geometry, materials);
    plane.rotation.set(0, rot, 0);
    plane.position.set(posx, posy, posz)
    scene.add(plane);
    objects.push(plane);
}

function loadBiombo(posx, posy, posz, rotation) {
    let centerY = 0.8;
    let rot = rotation * (Math.PI / 180);

    var points = [
        //Parede
        new THREE.Vector3(-0.015, centerY+0.8, 1.35),
        new THREE.Vector3(-0.015, centerY+0.8, -1.35),
        new THREE.Vector3(-0.015, centerY-0.8, 1.35),
        new THREE.Vector3(-0.015, centerY-0.8, -1.35),
        
        new THREE.Vector3(0.015, centerY+0.8, 1.35),
        new THREE.Vector3(0.015, centerY+0.8, -1.35),
        new THREE.Vector3(-0.015, centerY+0.8, 1.35),
        new THREE.Vector3(-0.015, centerY+0.8, -1.35),
        
        new THREE.Vector3(-0.015, centerY-0.8, 1.35),
        new THREE.Vector3(-0.015, centerY-0.8, -1.35),
        new THREE.Vector3(0.015, centerY-0.8, 1.35),
        new THREE.Vector3(0.015, centerY-0.8, -1.35),
        
        new THREE.Vector3(0.015, centerY+0.8, -1.35),
        new THREE.Vector3(0.015, centerY+0.8, 1.35),
        new THREE.Vector3(0.015, centerY-0.8, -1.35),
        new THREE.Vector3(0.015, centerY-0.8, 1.35),
        
        new THREE.Vector3(0.015, centerY+0.8, 1.35),
        new THREE.Vector3(-0.015, centerY+0.8, 1.35),
        new THREE.Vector3(0.015, centerY-0.8, 1.35),
        new THREE.Vector3(-0.015, centerY-0.8, 1.35),

        new THREE.Vector3(-0.015, centerY+0.8, -1.35),
        new THREE.Vector3(0.015, centerY+0.8, -1.35),
        new THREE.Vector3(-0.015, centerY-0.8, -1.35),
        new THREE.Vector3(0.015, centerY-0.8, -1.35),

        //Apoio 1
        new THREE.Vector3(-0.015, centerY+0.8, 1.385),
        new THREE.Vector3(-0.085, centerY+0.8, 1.385),
        new THREE.Vector3(-0.015, centerY-0.8, 1.385),
        new THREE.Vector3(-0.085, centerY-0.8, 1.385),

        new THREE.Vector3(-0.015, centerY+0.8, 1.315),
        new THREE.Vector3(-0.085, centerY+0.8, 1.315),
        new THREE.Vector3(-0.015, centerY+0.8, 1.385),
        new THREE.Vector3(-0.085, centerY+0.8, 1.385),

        new THREE.Vector3(-0.085, centerY+0.8, 1.315),
        new THREE.Vector3(-0.015, centerY+0.8, 1.315),
        new THREE.Vector3(-0.085, centerY-0.8, 1.315),
        new THREE.Vector3(-0.015, centerY-0.8, 1.315),

        new THREE.Vector3(-0.085, centerY-0.8, 1.315),
        new THREE.Vector3(-0.015, centerY-0.8, 1.315),
        new THREE.Vector3(-0.085, centerY-0.8, 1.385),
        new THREE.Vector3(-0.015, centerY-0.8, 1.385),

        new THREE.Vector3(-0.085, centerY+0.8, 1.385),
        new THREE.Vector3(-0.085, centerY+0.8, 1.315),
        new THREE.Vector3(-0.085, centerY-0.8, 1.385),
        new THREE.Vector3(-0.085, centerY-0.8, 1.315),

        new THREE.Vector3(-0.015, centerY+0.8, 1.315),
        new THREE.Vector3(-0.015, centerY+0.8, 1.385),
        new THREE.Vector3(-0.015, centerY-0.8, 1.315),
        new THREE.Vector3(-0.015, centerY-0.8, 1.385),

        //Apoio 2
        new THREE.Vector3(-0.085, centerY+0.8, -1.385),
        new THREE.Vector3(-0.015, centerY+0.8, -1.385),
        new THREE.Vector3(-0.085, centerY-0.8, -1.385),
        new THREE.Vector3(-0.015, centerY-0.8, -1.385),

        new THREE.Vector3(-0.085, centerY+0.8, -1.315),
        new THREE.Vector3(-0.015, centerY+0.8, -1.315),
        new THREE.Vector3(-0.085, centerY+0.8, -1.385),
        new THREE.Vector3(-0.015, centerY+0.8, -1.385),

        new THREE.Vector3(-0.015, centerY+0.8, -1.315),
        new THREE.Vector3(-0.085, centerY+0.8, -1.315),
        new THREE.Vector3(-0.015, centerY-0.8, -1.315),
        new THREE.Vector3(-0.085, centerY-0.8, -1.315),

        new THREE.Vector3(-0.015, centerY-0.8, -1.315),
        new THREE.Vector3(-0.085, centerY-0.8, -1.315),
        new THREE.Vector3(-0.015, centerY-0.8, -1.385),
        new THREE.Vector3(-0.085, centerY-0.8, -1.385),

        new THREE.Vector3(-0.085, centerY+0.8, -1.315),
        new THREE.Vector3(-0.085, centerY+0.8, -1.385),
        new THREE.Vector3(-0.085, centerY-0.8, -1.315),
        new THREE.Vector3(-0.085, centerY-0.8, -1.385),

        new THREE.Vector3(-0.015, centerY+0.8, -1.385),
        new THREE.Vector3(-0.015, centerY+0.8, -1.315),
        new THREE.Vector3(-0.015, centerY-0.8, -1.385),
        new THREE.Vector3(-0.015, centerY-0.8, -1.315),
    ];
        
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
        
    var indices = [];
    
    //Parede
    indices.push(0, 1, 3);
    indices.push(3, 2, 0);
    indices.push(4, 5, 7);
    indices.push(7, 6, 4);
    indices.push(8, 9, 11);
    indices.push(11, 10, 8);
    indices.push(12, 13, 15);
    indices.push(15, 14, 12);
    indices.push(16, 17, 19);
    indices.push(19, 18, 16);
    indices.push(20, 21, 23);
    indices.push(23, 22, 20);
    //Apoio 1
    indices.push(24, 25, 27);
    indices.push(27, 26, 24);
    indices.push(28, 29, 31);
    indices.push(31, 30, 28);
    indices.push(32, 33, 35);
    indices.push(35, 34, 32);
    indices.push(36, 37, 39);
    indices.push(39, 38, 36);
    indices.push(40, 41, 43);
    indices.push(43, 42, 40);
    indices.push(44, 45, 47);
    indices.push(47, 46, 44);
    //Apoio 2
    indices.push(48, 49, 51);
    indices.push(51, 50, 48);
    indices.push(52, 53, 55);
    indices.push(55, 54, 52);
    indices.push(56, 57, 59);
    indices.push(59, 58, 56);
    indices.push(60, 61, 63);
    indices.push(63, 62, 60);
    indices.push(64, 65, 67);
    indices.push(67, 66, 64);
    indices.push(68, 69, 71);
    indices.push(71, 70, 68);
     
    geometry.setIndex( indices );
    
    //Parede
    geometry.addGroup(0, 6, 0);
    geometry.addGroup(6, 6, 0);
    geometry.addGroup(12, 6, 0);
    geometry.addGroup(18, 6, 0);
    geometry.addGroup(24, 6, 0);
    geometry.addGroup(30, 6, 0);

    //Apoio 1
    geometry.addGroup(36, 6, 0);
    geometry.addGroup(42, 6, 0);
    geometry.addGroup(48, 6, 0);
    geometry.addGroup(54, 6, 0);
    geometry.addGroup(60, 6, 0);
    geometry.addGroup(66, 6, 0);

    //Apoio 2
    geometry.addGroup(72, 6, 0);
    geometry.addGroup(78, 6, 0);
    geometry.addGroup(84, 6, 0);
    geometry.addGroup(90, 6, 0);
    geometry.addGroup(96, 6, 0);
    geometry.addGroup(102, 6, 0);
    
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
        new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/colorMapBiombo.1001.png"), normalMap: new THREE.TextureLoader().load("../images/normalMapBiombo.1001.png")}),
    ];
        
    var plane = new THREE.Mesh(geometry, materials);
    plane.rotation.set(0, rot, 0);
    plane.position.set(posx, posy, posz)
    scene.add(plane);
    objects.push(plane)
}

function loadTelhas() {
    let posx = 56.9;
    let posy = 4.913;
    let posz = -21.65
    let rotX = 9.54 * (Math.PI / 180);
    let rotY = 31 * (Math.PI / 180);

    console.log("A carregar telhas nas coordenadas (" + posx + "," + posy + "," + posz + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        "../Modelos_glb/Telhas.glb",
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.position.set(posx, posy, posz)
                child.rotateY(rotY);
                child.rotateX(rotX);
                console.log(child)
                for (var i = 0; i != 35; i++) {
                    for (var j = 0; j != 38; j++) {
                        let clone = child.clone();
                        var movement = new Vector3(i * 0.297, (j * 0.36) * 0.0005, -j * 0.36).applyQuaternion(child.quaternion);
                        clone.quaternion.copy(child.quaternion);
                        clone.position.copy(child.position).add(movement);
                        scene.add(clone);
                        objects.push(clone);
                    }
                }
            })
        }
    )
    console.log("Modelo carregado...")
}

function loadRipaseBarrotes() {
    let posx = 61.272;
    let posy = 2.8953;
    let posz = -24.455;
    let rotY = 31 * (Math.PI / 180);
    let rotX = 10.5 * (Math.PI / 180);

    console.log("A carregar ripas e barrotes nas coordenadas (" + posx + "," + posy + "," + posz + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        "../Modelos_glb/RB.glb",
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.material.map = new TextureLoader().load("../images/colorMapBiombo.1001.png");
                if (child.name == "RB1") {
                    child.position.set(posx, posy, posz);
                    child.rotateY(rotY);
                    for (var i = 0; i != 15; i++) {
                        let clone = child.clone();
                        var movement = new Vector3(i * 0.6, 0, 0).applyQuaternion(child.quaternion);
                        clone.quaternion.copy(child.quaternion);
                        clone.position.copy(child.position).add(movement);
                        scene.add(clone);
                    }
                    console.log(child);
                } else if (child.name == "RB2") {
                    child.position.set(posx, posy, posz);
                    child.rotateY(rotY);
                    for (var i = 0; i != 34; i++) {
                        let clone = child.clone();
                        var movement = new Vector3(0, -i * 0.0607, i * 0.362).applyQuaternion(child.quaternion);
                        clone.quaternion.copy(child.quaternion);
                        clone.position.copy(child.position).add(movement);
                        scene.add(clone);
                    }
                    console.log(child);
                } else if (child.name == "RB3") {
                    child.position.set(posx, posy, posz);
                    child.rotateY(rotY);
                    for (var i = 0; i != 8; i++) {
                        let clone = child.clone();
                        var movement = new Vector3(0, -i * 0.258, i * 1.5).applyQuaternion(child.quaternion);
                        clone.quaternion.copy(child.quaternion);
                        clone.position.copy(child.position).add(movement);
                        scene.add(clone);
                    }
                    console.log(child);
                }
            })
        }
    )
    console.log("Modelo carregado...")
}

function loadGLB(modelo, x, y, z, rotationY) {
    var rotY = rotationY * (Math.PI / 180);

    console.log("A carregar '" + modelo + "' nas coordenadas (" + x + "," + y + "," + z + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        modelo,
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.position.set(x, y, z)
                child.rotateY(rotY);
                objects.push(child)
                console.log(child)
            })
        }
    )
    console.log("Modelo carregado...")
}

function loadGLBwMap(modelo, x, y, z, rotationY, map) {
    var rotY = rotationY * (Math.PI / 180);

    console.log("A carregar '" + modelo + "' nas coordenadas (" + x + "," + y + "," + z + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        modelo,
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.position.set(x, y, z)
                child.rotateY(rotY);
                child.material.map = new TextureLoader().load(map);
                objects.push(child)
                console.log(child)
            })
        }
    )
    console.log("Modelo carregado...")
}

function loadGLBQuaternion(modelo, x, y, z, quaternion) {
    console.log("A carregar '" + modelo + "' nas coordenadas (" + x + "," + y + "," + z + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        modelo,
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                child.position.set(x, y, z)
                child.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                objects.push(child)
                console.log(child)
            })
        }
    )

    console.log("Modelo carregado...")
}

function initClouds() {
    const loader = new THREE.TextureLoader();

    loader.crossOrigin = '';

    loader.load(
        '../images/cloud.png',
        function onLoad(texture) {
            const cloudGeometry = new THREE.CircleBufferGeometry((Math.random() * 600) + 450, (Math.random() * 600) + 450);// pk é que tem o random????

            cloudMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
                opacity: (effectController.hour < 12) ? effectController.hour / 12 : 24 / effectController.hour
            });

            for (let p = 0, l = 50; p < l; p++) {
                let cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

                cloud.rotateX(Math.PI / 2);

                cloud.position.set(
                    (Math.random() * 6000) - 3000,
                    400 + Math.random() * 200,
                    (Math.random() * 6000) - 3000
                );

                cloud.scale.set((Math.random()*0.4)+0.8, 1, (Math.random()*0.4)+0.8)

                cloud.rotation.z = Math.random() * 360;
                scene.add(cloud);
                clouds.push(cloud);
            }
        }
    );
}

function changeClouds() {
    clouds.forEach(cloud => cloud.material.opacity = (0.7 * Math.exp(-Math.pow((effectController.hour - 12) / 5.5, 10)) + 0.05));
}

function initStars() {
    let geometry = new THREE.BufferGeometry();
    let material = new THREE.PointsMaterial( { size: 2, sizeAttenuation: false, transparent: true } );
    material.color.set( new THREE.Color(255, 205, 60))

    let verticesNTyped = []
    let vertice = new THREE.Vector3();
    for (let i = 0; i < 600; i++) {
        vertice.setFromSpherical(new THREE.Spherical(4000 + Math.random()*1000, (Math.random() > 0.5) ? (-(Math.PI / 2) * (Math.sqrt(Math.random()) - 1) + Math.PI * 3 / 2) : (-(Math.PI / 2) * (-Math.sqrt(Math.random()) - 1) + Math.PI * 3 / 2), Math.PI * Math.random()))
        verticesNTyped.push(vertice.x);
        verticesNTyped.push(vertice.y);
        verticesNTyped.push(vertice.z);
    }
    let vertices = new Float32Array(verticesNTyped)

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))

    stars = new THREE.Points(geometry, material);

    console.log(stars)
    scene.add(stars);
}

function changeStars() {
        stars.material.opacity = Math.min(Math.pow((effectController.hour-12)/6.5, 20), 1)
}

function generateWalls() {
    let geometrySide = new THREE.BoxGeometry(1, 200, 200);
    let geometrySide2 = new THREE.BoxGeometry(410, 200, 1)
    let material = new THREE.MeshBasicMaterial( {visible: false} )

    let wall1 = new THREE.Mesh(geometrySide, material);
    let wall2 = new THREE.Mesh(geometrySide, material);
    let wall3 = new THREE.Mesh(geometrySide2, material);
    let wall4 = new THREE.Mesh(geometrySide2, material);
    
    wall1.position.set(205, 0, 0);
    wall2.position.set(-205, 0, 0);
    wall3.position.set(0, 0, 100);
    wall4.position.set(0, 0, -100)

    scene.add(wall1);
    scene.add(wall2);
    scene.add(wall3);
    scene.add(wall4);
    objects.push(wall1);
    objects.push(wall2);
    objects.push(wall3);
    objects.push(wall4);
    walls.push(wall1);
    walls.push(wall2);
    walls.push(wall3);
    walls.push(wall4);
}

//Hotspots
function generateHotSpot(positionx, positiony, positionz, rotation, text) {
    var rot = rotation * (Math.PI / 180);

    var hotspot = document.createElement('canvas');
    var g = hotspot.getContext('2d');
    hotspot.width = 100;
    hotspot.height = 100;
    g.font = 'Bold 20px Arial';

    g.fillStyle = 'white';
    g.fillText(text, 0, 20);
    g.strokeStyle = 'black';
    g.strokeText(text, 0, 20);

    var texture = new THREE.Texture(hotspot);
    texture.needsUpdate = true;

    var geometry = new THREE.PlaneGeometry(100, 100);
    var material = new THREE.MeshPhongMaterial({ map: texture });

    var meshText = new THREE.Mesh(geometry, material)

    meshText.position.set(positionx, positiony, positionz); //mesh.receiveShadow = true;
    meshText.rotateY(rot);

    scene.add(meshText);

    positionx += 0.1;

    texture = new THREE.TextureLoader().load('../images/info.png');
    material = new THREE.MeshBasicMaterial({
        map: texture
    });
    geometry = new THREE.CircleGeometry(0.8, 32);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(positionx, positiony, positionz);

    mesh.rotateY(rot);
    scene.add(mesh);
    objectsHotspot.push(mesh);

    hotSpotMap.set(mesh, meshText);
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
    if (hotspotIntersection.length > 0) {
        if (hotspotIntersection[0].distance <= 10) {
            intersetado = hotSpotMap.get(hotspotIntersection[0].object);
            if(!intersetado.visible) {
                intersetado.visible = true;
            } else {
                intersetado.visible = false;
            }
        } else {
            if (intersetado != null) {
                intersetado.visible = false;
                intersetado = null;
            }
        }
    } else {
        if (intersetado != null) {
            intersetado.visible = false;
            intersetado = null;
        }
    }
}

function cameraColision(raycaster, axis) {
    wallCollision(raycaster);

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

function wallCollision(raycaster) {
    // verifica as interseções com os objetos
    raycaster.ray.origin.copy(controls.getObject().position);

    const intersections = raycaster.intersectObjects(walls, true);

    if (intersections.length > 0) {

        var x = document.getElementById("snackbar");

        x.className = "show";

        setTimeout(function() { x.className = x.className.replace("show", ""); }, 3000);

    } else {

        return false;

    }
}

function doCloudTick() {
    clouds.forEach(function (cloud) {
        if (cloud.position.x < 3000) {
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
        if (hotSpotMap.get(object).visible && controls.getObject().position.distanceTo(hotSpotMap.get(object).position) > 10) {
            hotSpotMap.get(object).visible = false;
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
    if (cloudTicker == 1) {
        doCloudTick()
        cloudTicker = 0;
    }

    if(effectController.autoUpdate){
        updateHours()
        skyUpdate()
    }

    if (controls.getObject().position.y < -80) {
        controls.getObject().position.setY(20);
    }

    prevTime = time;

    renderer.render(scene, camera);
}