import * as THREE from 'three'
import Nebula, { SpriteRenderer } from 'three-nebula'
import json from '../fire.json'
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Quaternion, Vector2 } from 'three';
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

let lucerna;

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
    loadLucerna();
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

    generateHotSpot(61.272, 4, -24, 31, 'Este edificio era composto por duas Tabernae e um armazém. Não existem evidências de portas do armazém para o exterior, por isso supomos que existiam dois acessos pelas Tabernae através de escadas.')
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
    
    ambientLight.intensity = 0.7;
    directionalLight.intensity = 0.7;
    hemisphereLight.intensity = 0.7;

    changeStars();
    changeClouds();
}

function initControllers(){
    const gui = new GUI();
    effectController = {
        hour: 0,
        autoUpdate: true,
        showLucerna: false
    };

    updateHours()

    let ambienteFolder = gui.addFolder('Ambiente')
    let settingsFolder = gui.addFolder('Definições')

    ambienteFolder.add(effectController, 'hour', 0, 24, 0.01).name("Hora do dia").listen().onChange(function(){
        effectController.autoUpdate = false;
        skyUpdate()
    });

    ambienteFolder.add(effectController, 'autoUpdate').name("Hora automática").listen().onChange(function(){
        if(effectController.autoUpdate){
            updateHours();
        }
    })

    settingsFolder.add(effectController, 'showLucerna').name("Ver Lucerna");
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

    loadTabernaeTex(posx, posy, posz, rot);
    //loadGlbScene('../Modelos_glb/Escada.glb', posx - 7.2992, posy + 0.22, posz - 4.4689, rot);
    //loadGlbScene('../Modelos_glb/Escada.glb', posx - 0.51904, posy + 0.22, posz - 8.5429, rot);
    loadBancada(posx-4.784, posy+0.1987, posz-1.265, rot);
    loadBiombo(posx-5.2333, posy, posz-2.7702, rot+90);
    loadGLB('../Modelos_glb/Dolium.glb', posx-5.3469, posy+0.1987, posz-3.0012, rot);
    loadGLB('../Modelos_glb/Dolium.glb', posx-4.9777, posy+0.1987, posz-3.2212, rot);
    loadGLB('../Modelos_glb/Dolium.glb', posx-4.6088, posy+0.1987, posz-3.4502, rot);
    //loadGlbScene('../Modelos_glb/Moinho.glb', posx+0.47438, posy+0.73, posz - 4.37, 30)
    loadTelhas();
    loadRipaseBarrotes();
}

function loadLucerna() {
    console.log("A carregar lucerna...")
    var carregador = new GLTFLoader()
    carregador.load(
        '../Modelos_glb/lucerna.glb',
        function (gltf) {
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
                lucerna = child;
            })
        }
    )
    console.log("Modelo carregado...")
}

function loadBancada(posx, posy, posz, rotation) {
    var rot = rotation * (Math.PI / 180);

    var points = [
        //Topo
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 1.0013, 0.525),
        
        new THREE.Vector3(1.025, 0.94875, 0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),
        
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),
        new THREE.Vector3(1.025, 1.0013, 0.525),
        new THREE.Vector3(1.025, 0.94875, 0.525),
        
        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),
        
        new THREE.Vector3(-1.025, 1.0013, -0.525),
        new THREE.Vector3(-1.025, 0.94875, -0.525),
        new THREE.Vector3(-1.025, 1.0013, 0.525),
        new THREE.Vector3(-1.025, 0.94875, 0.525),

        new THREE.Vector3(1.025, 1.0013, 0.525),
        new THREE.Vector3(1.025, 0.94875, 0.525),
        new THREE.Vector3(1.025, 1.0013, -0.525),
        new THREE.Vector3(1.025, 0.94875, -0.525),

        //Base Parte 1
        new THREE.Vector3(0.9, 0.95, 0.475),
        new THREE.Vector3(0.05, 0.95, 0.475),
        new THREE.Vector3(0.9, 0, 0.475),
        new THREE.Vector3(0.05, 0, 0.475),

        new THREE.Vector3(0.05, 0.95, 0.475),
        new THREE.Vector3(0.05, 0.95, 0.5),
        new THREE.Vector3(0.05, 0, 0.475),
        new THREE.Vector3(0.05, 0, 0.5),

        new THREE.Vector3(0.05, 0.95, 0.5),
        new THREE.Vector3(-0.042857, 0.95, 0.5),
        new THREE.Vector3(0.05, 0, 0.5),
        new THREE.Vector3(-0.042857, 0, 0.5),

        new THREE.Vector3(-0.042857, 0.95, 0.5),
        new THREE.Vector3(-0.042857, 0.95, 0.475),
        new THREE.Vector3(-0.042857, 0, 0.5),
        new THREE.Vector3(-0.042857, 0, 0.475),

        new THREE.Vector3(-0.042857, 0.95, 0.475),
        new THREE.Vector3(-0.9, 0.95, 0.475),
        new THREE.Vector3(-0.042857, 0, 0.475),
        new THREE.Vector3(-0.9, 0, 0.475),

        new THREE.Vector3(-0.9, 0.95, 0.475),
        new THREE.Vector3(-0.9, 0.95, 0.5),
        new THREE.Vector3(-0.9, 0, 0.475),
        new THREE.Vector3(-0.9, 0, 0.5),

        //Base Parte 2
        new THREE.Vector3(-0.9, 0.95, 0.5),
        new THREE.Vector3(-1.0, 0.95, 0.5),
        new THREE.Vector3(-0.9, 0, 0.5),
        new THREE.Vector3(-1.0, 0, 0.5),

        new THREE.Vector3(-1.0, 0.95, 0.5),
        new THREE.Vector3(-1.0, 0.95, 0.4),
        new THREE.Vector3(-1.0, 0, 0.5),
        new THREE.Vector3(-1.0, 0, 0.4),

        new THREE.Vector3(-1.0, 0.95, 0.4),
        new THREE.Vector3(-0.975, 0.95, 0.4),
        new THREE.Vector3(-1.0, 0, 0.4),
        new THREE.Vector3(-0.975, 0, 0.4),

        new THREE.Vector3(-0.975, 0.95, 0.4),
        new THREE.Vector3(-0.975, 0.95, -0.4),
        new THREE.Vector3(-0.975, 0, 0.4),
        new THREE.Vector3(-0.975, 0, -0.4),

        new THREE.Vector3(-0.975, 0.95, -0.4),
        new THREE.Vector3(-1, 0.95, -0.4),
        new THREE.Vector3(-0.975, 0, -0.4),
        new THREE.Vector3(-1, 0, -0.4),

        new THREE.Vector3(-1, 0.95, -0.4),
        new THREE.Vector3(-1, 0.95, -0.5),
        new THREE.Vector3(-1, 0, -0.4),
        new THREE.Vector3(-1, 0, -0.5),

        //Base Parte 3
        new THREE.Vector3(-1, 0.95, -0.5),
        new THREE.Vector3(-0.9, 0.95, -0.5),
        new THREE.Vector3(-1, 0, -0.5),
        new THREE.Vector3(-0.9, 0, -0.5),

        new THREE.Vector3(-0.9, 0.95, -0.5),
        new THREE.Vector3(-0.9, 0.95, -0.475),
        new THREE.Vector3(-0.9, 0, -0.5),
        new THREE.Vector3(-0.9, 0, -0.475),

        new THREE.Vector3(-0.9, 0.95, -0.475),
        new THREE.Vector3(-0.042857, 0.95, -0.475),
        new THREE.Vector3(-0.9, 0, -0.475),
        new THREE.Vector3(-0.042857, 0, -0.475),

        new THREE.Vector3(-0.042857, 0.95, -0.475),
        new THREE.Vector3(-0.042857, 0.95, -0.5),
        new THREE.Vector3(-0.042857, 0, -0.475),
        new THREE.Vector3(-0.042857, 0, -0.5),

        new THREE.Vector3(-0.042857, 0.95, -0.5),
        new THREE.Vector3(0.05, 0.95, -0.5),
        new THREE.Vector3(-0.042857, 0, -0.5),
        new THREE.Vector3(0.05, 0, -0.5),
        
        new THREE.Vector3(0.05, 0.95, -0.5),
        new THREE.Vector3(0.05, 0.95, -0.475),
        new THREE.Vector3(0.05, 0, -0.5),
        new THREE.Vector3(0.05, 0, -0.475),
        
        //Base Parte 4
        new THREE.Vector3(0.05, 0.95, -0.475),
        new THREE.Vector3(0.9, 0.95, -0.475),
        new THREE.Vector3(0.05, 0, -0.475),
        new THREE.Vector3(0.9, 0, -0.475),

        new THREE.Vector3(0.9, 0.95, -0.475),
        new THREE.Vector3(0.9, 0.95, -0.5),
        new THREE.Vector3(0.9, 0, -0.475),
        new THREE.Vector3(0.9, 0, -0.5),

        new THREE.Vector3(0.9, 0.95, -0.5),
        new THREE.Vector3(1.0, 0.95, -0.5),
        new THREE.Vector3(0.9, 0, -0.5),
        new THREE.Vector3(1.0, 0, -0.5),

        new THREE.Vector3(1.0, 0.95, -0.5),
        new THREE.Vector3(1.0, 0.95, -0.4),
        new THREE.Vector3(1.0, 0, -0.5),
        new THREE.Vector3(1.0, 0, -0.4),

        new THREE.Vector3(1.0, 0.95, -0.4),
        new THREE.Vector3(0.975, 0.95, -0.4),
        new THREE.Vector3(1.0, 0, -0.4),
        new THREE.Vector3(0.975, 0, -0.4),

        new THREE.Vector3(0.975, 0.95, -0.4),
        new THREE.Vector3(0.975, 0.95, 0.4),
        new THREE.Vector3(0.975, 0, -0.4),
        new THREE.Vector3(0.975, 0, 0.4),

        //Base Parte 5
        new THREE.Vector3(0.975, 0.95, 0.4),
        new THREE.Vector3(1.0, 0.95, 0.4),
        new THREE.Vector3(0.975, 0, 0.4),
        new THREE.Vector3(1.0, 0, 0.4),

        new THREE.Vector3(1.0, 0.95, 0.4),
        new THREE.Vector3(1.0, 0.95, 0.5),
        new THREE.Vector3(1.0, 0, 0.4),
        new THREE.Vector3(1.0, 0, 0.5),

        new THREE.Vector3(1.0, 0.95, 0.5),
        new THREE.Vector3(0.9, 0.95, 0.5),
        new THREE.Vector3(1.0, 0, 0.5),
        new THREE.Vector3(0.9, 0, 0.5),

        new THREE.Vector3(0.9, 0.95, 0.5),
        new THREE.Vector3(0.9, 0.95, 0.475),
        new THREE.Vector3(0.9, 0, 0.5),
        new THREE.Vector3(0.9, 0, 0.475),
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
    //Base Parte 1
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

    //Base Parte 2
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

    //Base Parte 3
    indices.push(72, 73, 75);
    indices.push(75, 74, 72);
    indices.push(76, 77, 79);
    indices.push(79, 78, 76);
    indices.push(80, 81, 83);
    indices.push(83, 82, 80);
    indices.push(84, 85, 87);
    indices.push(87, 86, 84);
    indices.push(88, 89, 91);
    indices.push(91, 90, 88);
    indices.push(92, 93, 95);
    indices.push(95, 94, 92);
    
    //Base Parte 4
    indices.push(96, 97, 99);
    indices.push(99, 98, 96);
    indices.push(100, 101, 103);
    indices.push(103, 102, 100);
    indices.push(104, 105, 107);
    indices.push(107, 106, 104);
    indices.push(108, 109, 111);
    indices.push(111, 110, 108);
    indices.push(112, 113, 115);
    indices.push(115, 114, 112);
    indices.push(116, 117, 119);
    indices.push(119, 118, 116);

    //Base Parte 5
    indices.push(120, 121, 123);
    indices.push(123, 122, 120);
    indices.push(124, 125, 127);
    indices.push(127, 126, 124);
    indices.push(128, 129, 131);
    indices.push(131, 130, 128);
    indices.push(132, 133, 135);
    indices.push(135, 134, 132);
     
    geometry.setIndex( indices );
    
    //Topo
    geometry.addGroup(0, 6, 0);
    geometry.addGroup(6, 6, 0);
    geometry.addGroup(12, 6, 1);
    geometry.addGroup(18, 6, 1);
    geometry.addGroup(24, 6, 2);
    geometry.addGroup(30, 6, 2);

    //Base Parte 1
    geometry.addGroup(36, 6, 3);
    geometry.addGroup(42, 6, 1);
    geometry.addGroup(48, 6, 2);
    geometry.addGroup(54, 6, 2);
    geometry.addGroup(60, 6, 3);
    geometry.addGroup(66, 6, 3);

    //Base Parte 2
    geometry.addGroup(72, 6, 3);
    geometry.addGroup(78, 6, 2);
    geometry.addGroup(84, 6, 2);
    geometry.addGroup(90, 6, 1);
    geometry.addGroup(96, 6, 2);
    geometry.addGroup(102, 6, 2);

    //Base Parte 3
    geometry.addGroup(108, 6, 2);
    geometry.addGroup(114, 6, 2);
    geometry.addGroup(120, 6, 1);
    geometry.addGroup(126, 6, 1);
    geometry.addGroup(132, 6, 2);
    geometry.addGroup(138, 6, 2);

    //Base Parte 4
    geometry.addGroup(144, 6, 1);
    geometry.addGroup(150, 6, 2);
    geometry.addGroup(156, 6, 3);
    geometry.addGroup(162, 6, 2);
    geometry.addGroup(168, 6, 2);
    geometry.addGroup(174, 6, 1);

    //Base Parte 5
    geometry.addGroup(180, 6, 3);
    geometry.addGroup(186, 6, 2);
    geometry.addGroup(192, 6, 3);
    geometry.addGroup(198, 6, 2);

    var quad_uvs =
    [
    //Topo
    0.0, 1.008,
    0.526, 1.008,
    0.0, 0.0,
    0.526, 0.0,

    0.0, 1.0,
    1.0, 1.0,
    0.0, 0.0,
    1.0, 0.0,

    0.939, 1.0,
    0.966, 1.0,
    0.939, 0.0,
    0.966, 0.0,
    
    0.974, 1.0,
    1.0, 1.0,
    0.974, 0.0,
    1.0, 0.0,
    
    0.802, 0.942,
    0.828, 0.942,
    0.802, 0.426,
    0.828, 0.426,

    0.836, 0.942,
    0.863, 0.942,
    0.836, 0.426,
    0.863, 0.426,

    //Base Parte 1
    0.0, 0.483,
    0.426, 0.483,
    0.0, 0.016,
    0.426, 0.016,

    0.919, 0.934,
    0.932, 0.934,
    0.919, 0.467,
    0.932, 0.467,

    0.748, 0.942,
    0.794, 0.942,
    0.748, 0.475,
    0.794, 0.475,

    0.952, 0.893,
    0.965, 0.893,
    0.952, 0.426,
    0.965, 0.426,

    0.631, 0.483,
    1.0, 0.483,
    0.631, 0.016,
    1.0, 0.016,

    0.552, 0.959,
    0.565, 0.959,
    0.552, 0.491,
    0.565, 0.491,

    //Base Parte 2
    0.492, 0.483,
    0.542, 0.483,
    0.492, 0.016,
    0.542, 0.016,

    0.635, 0.942,
    0.685, 0.942,
    0.635, 0.475,
    0.685, 0.475,

    0.932, 0.893,
    0.944, 0.893,
    0.932, 0.426,
    0.944, 0.426,

    0.477, 0.934,
    0.764, 0.934,
    0.477, 0.467,
    0.764, 0.467,

    0.751, 0.467,
    0.764, 0.467,
    0.751, 0.0,
    0.764, 0.0,

    0.635, 0.467,
    0.685, 0.467,
    0.635, 0.0,
    0.685, 0.0,

    //Base Parte 3
    0.577, 0.467,
    0.627, 0.467,
    0.577, 0.0,
    0.627, 0.0,

    0.772, 0.467,
    0.784, 0.467,
    0.772, 0.0,
    0.784, 0.0,
    
    0.068, 0.459,
    0.498, 0.459,
    0.068, 0.0,
    0.498, 0.0,

    0.886, 0.934,
    0.898, 0.934,
    0.886, 0.467,
    0.898, 0.467,

    0.693, 0.942,
    0.740, 0.942,
    0.693, 0.475,
    0.740, 0.475,

    0.911, 0.893,
    0.924, 0.893,
    0.911, 0.426,
    0.924, 0.426,

    //Base Parte 4
    0.506, 0.459,
    0.932, 0.459,
    0.506, 0.0,
    0.932, 0.0,

    0.973, 0.893,
    0.985, 0.893,
    0.973, 0.426,
    0.985, 0.426,

    0.573, 0.483,
    0.623, 0.483,
    0.573, 0.016,
    0.623, 0.016,

    0.693, 0.467,
    0.743, 0.467,
    0.693, 0.0,
    0.743, 0.0,

    0.891, 0.893,
    0.903, 0.893,
    0.891, 0.426,
    0.903, 0.426,

    0.068, 0.934,
    0.469, 0.934,
    0.068, 0.467,
    0.469, 0.467,

    //Base Parte 5
    0.552, 0.483,
    0.565, 0.483,
    0.552, 0.016,
    0.565, 0.016,

    0.577, 0.942,
    0.627, 0.942,
    0.577, 0.475,
    0.627, 0.475,

    0.434, 0.483,
    0.484, 0.483,
    0.434, 0.016,
    0.484, 0.016,

    0.870, 0.893,
    0.883, 0.893,
    0.870, 0.426,
    0.883, 0.426,
    ];
    let uvs = new Float32Array(quad_uvs);
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    
    geometry.computeVertexNormals();
    
    let mat1 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Bancada/ColorMapBancada.1001.png")});
    mat1.normalMap = new THREE.TextureLoader().load("../images/Bancada/normalMapBancada.1001.png");
    mat1.bumpMap = new THREE.TextureLoader().load("../images/Bancada/roughnessMapBancada.1001.png");

    let mat2 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Bancada/ColorMapBancada.1012.png")});
    mat2.normalMap = new THREE.TextureLoader().load("../images/Bancada/normalMapBancada.1012.png");
    mat2.bumpMap = new THREE.TextureLoader().load("../images/Bancada/roughnessMapBancada.1012.png");

    let mat3 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Bancada/ColorMapBancada.1002.png")});
    mat3.normalMap = new THREE.TextureLoader().load("../images/Bancada/normalMapBancada.1002.png");
    mat3.bumpMap = new THREE.TextureLoader().load("../images/Bancada/roughnessMapBancada.1002.png");

    let mat4 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Bancada/ColorMapBancada.1011.png")});
    mat4.normalMap = new THREE.TextureLoader().load("../images/Bancada/normalMapBancada.1011.png");
    mat4.bumpMap = new THREE.TextureLoader().load("../images/Bancada/roughnessMapBancada.1011.png");


    var materials = [
        mat1,
        mat2,
        mat3,
        mat4
    ];
        
    var plane = new THREE.Mesh(geometry, materials);
    plane.rotation.set(0, rot, 0);
    plane.position.set(posx, posy, posz)
    scene.add(plane);
    objects.push(plane);
}

function loadBiombo(posx, posy, posz, rotation) {
    let rot = rotation * (Math.PI / 180);

    var points = [
        //Parede
        new THREE.Vector3(0.02, 0, -1.35),
        new THREE.Vector3(0.02, 1.6, -1.35),
        new THREE.Vector3(0.02, 0, 1.35),
        new THREE.Vector3(0.02, 1.6, 1.35),

        new THREE.Vector3(-0.01, 0, -1.35),
        new THREE.Vector3(-0.01, 1.6, -1.35),
        new THREE.Vector3(0.02, 0, -1.35),
        new THREE.Vector3(0.02, 1.6, -1.35),

        new THREE.Vector3(-0.01, 0, 1.35),
        new THREE.Vector3(-0.01, 1.6, 1.35),
        new THREE.Vector3(-0.01, 0, -1.35),
        new THREE.Vector3(-0.01, 1.6, -1.35),

        new THREE.Vector3(0.02, 0, 1.35),
        new THREE.Vector3(0.02, 1.6, 1.35),
        new THREE.Vector3(-0.01, 0, 1.35),
        new THREE.Vector3(-0.01, 1.6, 1.35),

        new THREE.Vector3(0.02, 1.6, -1.35),
        new THREE.Vector3(-0.01, 1.6, -1.35),
        new THREE.Vector3(0.02, 1.6, 1.35),
        new THREE.Vector3(-0.01, 1.6, 1.35),

        new THREE.Vector3(-0.01, 0.0, -1.35),
        new THREE.Vector3(0.02, 0.0, -1.35),
        new THREE.Vector3(-0.01, 0.0, 1.35),
        new THREE.Vector3(0.02, 0.0, 1.35),

        //Apoio 1
        new THREE.Vector3(-0.01, 1.6, 1.315),
        new THREE.Vector3(-0.01, 1.6, 1.385),
        new THREE.Vector3(-0.01, 0, 1.315),
        new THREE.Vector3(-0.01, 0, 1.385),

        new THREE.Vector3(-0.08, 1.6, 1.315),
        new THREE.Vector3(-0.01, 1.6, 1.315),
        new THREE.Vector3(-0.08, 0, 1.315),
        new THREE.Vector3(-0.01, 0, 1.315),

        new THREE.Vector3(-0.08, 1.6, 1.385),
        new THREE.Vector3(-0.08, 1.6, 1.315),
        new THREE.Vector3(-0.08, 0, 1.385),
        new THREE.Vector3(-0.08, 0, 1.315),

        new THREE.Vector3(-0.01, 1.6, 1.385),
        new THREE.Vector3(-0.08, 1.6, 1.385),
        new THREE.Vector3(-0.01, 0, 1.385),
        new THREE.Vector3(-0.08, 0, 1.385),

        new THREE.Vector3(-0.01, 0.0, 1.315),
        new THREE.Vector3(-0.01, 0.0, 1.385),
        new THREE.Vector3(-0.08, 0.0, 1.315),
        new THREE.Vector3(-0.08, 0.0, 1.385),

        //Apoio 2
        new THREE.Vector3(-0.01, 1.6, -1.385),
        new THREE.Vector3(-0.01, 1.6, -1.315),
        new THREE.Vector3(-0.01, 0, -1.385),
        new THREE.Vector3(-0.01, 0, -1.315),

        new THREE.Vector3(-0.01, 1.6, -1.315),
        new THREE.Vector3(-0.08, 1.6, -1.315),
        new THREE.Vector3(-0.01, 0, -1.315),
        new THREE.Vector3(-0.08, 0, -1.315),

        new THREE.Vector3(-0.08, 1.6, -1.315),
        new THREE.Vector3(-0.08, 1.6, -1.385),
        new THREE.Vector3(-0.08, 0, -1.315),
        new THREE.Vector3(-0.08, 0, -1.385),

        new THREE.Vector3(-0.08, 1.6, -1.385),
        new THREE.Vector3(-0.01, 1.6, -1.385),
        new THREE.Vector3(-0.08, 0, -1.385),
        new THREE.Vector3(-0.01, 0, -1.385),

        new THREE.Vector3(-0.01, 0.0, -1.385),
        new THREE.Vector3(-0.01, 0.0, -1.315),
        new THREE.Vector3(-0.08, 0.0, -1.385),
        new THREE.Vector3(-0.08, 0.0, -1.315),
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
    geometry.addGroup(6, 6, 3);
    geometry.addGroup(12, 6, 1);
    geometry.addGroup(18, 6, 1);
    geometry.addGroup(24, 6, 1);
    geometry.addGroup(30, 6, 1);

    //Apoio 1
    geometry.addGroup(36, 6, 4);
    geometry.addGroup(42, 6, 4);
    geometry.addGroup(48, 6, 4);
    geometry.addGroup(54, 6, 4);
    geometry.addGroup(60, 6, 4);
    geometry.addGroup(66, 6, 4);

    //Apoio 2
    geometry.addGroup(72, 6, 4);
    geometry.addGroup(78, 6, 4);
    geometry.addGroup(84, 6, 4);
    geometry.addGroup(90, 6, 4);
    geometry.addGroup(96, 6, 4);
    geometry.addGroup(102, 6, 4);
    
    var quad_uvs =
    [
    //Parede
    0.015, 1.0,
    0.916, 1.0,
    0.015, 0.049,
    0.916, 0.049,

    0.969, 0.882,
    0.985, 0.882,
    0.969, 0.0,
    0.985, 0.0,

    0.0, 1.0,
    0.847, 1.0,
    0.0, 0.049,
    0.847, 0.049,
    
    0.969, 0.951,
    0.985, 0.951,
    0.969, 0.049,
    0.985, 0.049,
    
    0.923, 1.0,
    0.939, 1.0,
    0.923, 0.049,
    0.939, 0.049,

    0.876, 1.0,
    0.893, 1.0,
    0.876, 0.049,
    1.893, 0.049,

    //Apoio 1
    0.057, 0.995,
    0.100, 0.995,
    0.057, 0.005,
    0.100, 0.005,

    0.005, 0.995,
    0.048, 0.995,
    0.005, 0.005,
    0.048, 0.005,

    0.162, 0.995,
    0.205, 0.995,
    0.162, 0.005,
    0.205, 0.005,

    0.110, 0.995,
    0.153, 0.995,
    0.110, 0.005,
    0.153, 0.005,
    
    0.215, 0.048,
    0.258, 0.048,
    0.215, 0.005,
    0.258, 0.005,

    0.215, 0.100,
    0.258, 0.100,
    0.215, 0.057,
    0.258, 0.057,

    //Parede 2
    0.057, 0.995,
    0.100, 0.995,
    0.057, 0.005,
    0.100, 0.005,

    0.005, 0.995,
    0.048, 0.995,
    0.005, 0.005,
    0.048, 0.005,

    0.162, 0.995,
    0.205, 0.995,
    0.162, 0.005,
    0.205, 0.005,

    0.110, 0.995,
    0.153, 0.995,
    0.110, 0.005,
    0.153, 0.005,
    
    0.215, 0.048,
    0.258, 0.048,
    0.215, 0.005,
    0.258, 0.005,

    0.215, 0.100,
    0.258, 0.100,
    0.215, 0.057,
    0.258, 0.057,
    ];
    let uvs = new Float32Array(quad_uvs);
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    
    geometry.computeVertexNormals();
    
    let mat1 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Biombo/ColorMapBiombo.1001.png")});
    mat1.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    mat1.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");

    let mat2 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Biombo/ColorMapBiombo.1002.png")});
    mat2.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1002.png");
    mat2.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1002.png");

    let mat3 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Biombo/ColorMapBiombo.1011.png")});
    mat3.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1011.png");
    mat3.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1011.png");

    let mat4 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Biombo/ColorMapBiombo.1012.png")});
    mat4.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1012.png");
    mat4.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1012.png");

    let mat5 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Biombo/ColorMapBarroteBiombo.png")});
    mat5.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBarroteBiombo.png");
    mat5.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBarroteBiombo.png");


    var materials = [
        mat1,
        mat2,
        mat3,
        mat4,
        mat5
    ];
        
    var plane = new THREE.Mesh(geometry, materials);
    plane.rotation.set(0, rot, 0);
    plane.position.set(posx, posy, posz)
    scene.add(plane);
    objects.push(plane)
}

function loadTabernaeTex(posx, posy, posz, rotation) {
    var rot = rotation * (Math.PI / 180);

    var points = [
        //Chão Esquerda
        new THREE.Vector3(-0.25, 0.2, -8.2),
        new THREE.Vector3(-2.3625, 0.2, -8.2),
        new THREE.Vector3(-0.25, 0.2, -4.964),
        new THREE.Vector3(-2.3625, 0.2, -4.964),

        new THREE.Vector3(-2.3625, 0.2, -8.2),
        new THREE.Vector3(-4.475, 0.2, -8.2),
        new THREE.Vector3(-2.3625, 0.2, -4.964),
        new THREE.Vector3(-4.475, 0.2, -4.964),

        new THREE.Vector3(-0.25, 0.2, -4.964),
        new THREE.Vector3(-2.3625, 0.2, -4.964),
        new THREE.Vector3(-0.25, 0.2, -0.952),
        new THREE.Vector3(-2.3625, 0.2, -0.952),

        new THREE.Vector3(-2.3625, 0.2, -4.964),
        new THREE.Vector3(-4.475, 0.2, -4.964),
        new THREE.Vector3(-2.3625, 0.2, -0.952),
        new THREE.Vector3(-4.475, 0.2, -0.952),

        new THREE.Vector3(-0.25, 0.2, -0.952),
        new THREE.Vector3(-2.3625, 0.2, -0.952),
        new THREE.Vector3(-0.25, 0.2, -0.3),
        new THREE.Vector3(-2.3625, 0.2, -0.3),
        
        new THREE.Vector3(-2.3625, 0.2, -0.952),
        new THREE.Vector3(-4.475, 0.2, -0.952),
        new THREE.Vector3(-2.3625, 0.2, -0.3),
        new THREE.Vector3(-4.475, 0.2, -0.3),

        //Chão Direita
        new THREE.Vector3(4.475, 0.2, -8.2),
        new THREE.Vector3(1.48, 0.2, -8.2),
        new THREE.Vector3(4.475, 0.2, -6.32),
        new THREE.Vector3(1.48, 0.2, -6.32),

        new THREE.Vector3(1.48, 0.2, -8.2),
        new THREE.Vector3(0.25, 0.2, -8.2),
        new THREE.Vector3(1.48, 0.2, -6.32),
        new THREE.Vector3(0.25, 0.2, -6.32),

        new THREE.Vector3(4.475, 0.2, -6.32),
        new THREE.Vector3(1.48, 0.2, -6.32),
        new THREE.Vector3(4.475, 0.2, -2.3),
        new THREE.Vector3(1.48, 0.2, -2.3),

        new THREE.Vector3(1.48, 0.2, -6.32),
        new THREE.Vector3(0.25, 0.2, -6.32),
        new THREE.Vector3(1.48, 0.2, -2.3),
        new THREE.Vector3(0.25, 0.2, -2.3),

        new THREE.Vector3(4.475, 0.2, -2.3),
        new THREE.Vector3(1.48, 0.2, -2.3),
        new THREE.Vector3(4.475, 0.2, -0.3),
        new THREE.Vector3(1.48, 0.2, -0.3),
        
        new THREE.Vector3(1.48, 0.2, -2.3),
        new THREE.Vector3(0.25, 0.2, -2.3),
        new THREE.Vector3(1.48, 0.2, -0.3),
        new THREE.Vector3(0.25, 0.2, -0.3),

        //Parede Interna Esquerda
        new THREE.Vector3(-0.25, 2.891, -5.0),
        new THREE.Vector3(-0.25, 3.4273, -8.2),
        new THREE.Vector3(-0.25, 2.891, -8.2),

        new THREE.Vector3(-0.25, 1.25, -7.4),
        new THREE.Vector3(-0.25, 2.891, -7.4),
        new THREE.Vector3(-0.25, 1.25, -8.2),
        new THREE.Vector3(-0.25, 2.891, -8.2),

        new THREE.Vector3(-0.25, 1.25, -7.2),
        new THREE.Vector3(-0.25, 2.891, -7.2),
        new THREE.Vector3(-0.25, 1.25, -7.4),
        new THREE.Vector3(-0.25, 2.891, -7.4),

        new THREE.Vector3(-0.25, 1.521, -5.0),
        new THREE.Vector3(-0.25, 2.891, -5.0),
        new THREE.Vector3(-0.25, 1.25, -7.2),
        new THREE.Vector3(-0.25, 2.891, -7.2),

        new THREE.Vector3(-0.25, 1.59, -4.44),
        new THREE.Vector3(-0.25, 2.797, -4.44),
        new THREE.Vector3(-0.25, 1.521, -5.0),
        new THREE.Vector3(-0.25, 2.891, -5.0),

        new THREE.Vector3(-0.25, 1.0, -7.4),
        new THREE.Vector3(-0.25, 1.25, -7.4),
        new THREE.Vector3(-0.25, 1.0, -8.2),
        new THREE.Vector3(-0.25, 1.25, -8.2),

        new THREE.Vector3(-0.25, 0.2, -7.4),
        new THREE.Vector3(-0.25, 1.0, -7.4),
        new THREE.Vector3(-0.25, 0.2, -8.2),
        new THREE.Vector3(-0.25, 1.0, -8.2),

        new THREE.Vector3(-0.25, 0.2, -7.2),
        new THREE.Vector3(-0.25, 1.0, -7.2),
        new THREE.Vector3(-0.25, 0.2, -7.4),
        new THREE.Vector3(-0.25, 1.0, -7.4),

        new THREE.Vector3(-0.25, 0.2, -4.44),
        new THREE.Vector3(-0.25, 0.68, -4.44),
        new THREE.Vector3(-0.25, 0.2, -7.2),
        new THREE.Vector3(-0.25, 1.0, -7.2),

        new THREE.Vector3(-0.25, 0.68, -4.44),
        new THREE.Vector3(-0.25, 1.59, -4.44),
        new THREE.Vector3(-0.25, 1.0, -7.2),
        new THREE.Vector3(-0.25, 1.25, -7.2),

        new THREE.Vector3(-0.25, 2.084, -0.432),
        new THREE.Vector3(-0.25, 2.123, -0.432),
        new THREE.Vector3(-0.25, 1.59, -4.44),
        new THREE.Vector3(-0.25, 2.797, -4.44),

        new THREE.Vector3(-0.25, 0.215, -0.432),
        new THREE.Vector3(-0.25, 2.084, -0.432),
        new THREE.Vector3(-0.25, 0.68, -4.44),
        new THREE.Vector3(-0.25, 1.59, -4.44),

        new THREE.Vector3(-0.25, 0.2, -0.432),
        new THREE.Vector3(-0.25, 0.215, -0.432),
        new THREE.Vector3(-0.25, 0.2, -4.44),
        new THREE.Vector3(-0.25, 0.68, -4.44),

        new THREE.Vector3(-0.25, 2.1, -0.3),
        new THREE.Vector3(-0.25, 2.12, -0.432),
        new THREE.Vector3(-0.25, 2.084, -0.432),

        new THREE.Vector3(-0.25, 0.2, -0.3),
        new THREE.Vector3(-0.25, 2.1, -0.3),
        new THREE.Vector3(-0.25, 0.2, -0.432),
        new THREE.Vector3(-0.25, 2.084, -0.432),

        //Parede Interna Direita
        new THREE.Vector3(0.25, 3.4, -8.05),
        new THREE.Vector3(0.25, 0.2, -8.05),
        new THREE.Vector3(0.25, 3.4273, -8.2),
        new THREE.Vector3(0.25, 0.2, -8.2),

        new THREE.Vector3(0.25, 3.294, -7.4),
        new THREE.Vector3(0.25, 1.25, -7.4),
        new THREE.Vector3(0.25, 3.4, -8.05),
        new THREE.Vector3(0.25, 1.25, -8.05),

        new THREE.Vector3(0.25, 1.25, -7.4),
        new THREE.Vector3(0.25, 1.0, -7.4),
        new THREE.Vector3(0.25, 1.25, -8.05),
        new THREE.Vector3(0.25, 1.0, -8.05),

        new THREE.Vector3(0.25, 1.0, -7.4),
        new THREE.Vector3(0.25, 0.2, -7.4),
        new THREE.Vector3(0.25, 1.0, -8.05),
        new THREE.Vector3(0.25, 0.2, -8.05),

        new THREE.Vector3(0.25, 3.26, -7.2),
        new THREE.Vector3(0.25, 1.25, -7.2),
        new THREE.Vector3(0.25, 3.294, -7.4),
        new THREE.Vector3(0.25, 1.25, -7.4),
        
        new THREE.Vector3(0.25, 1.0, -7.2),
        new THREE.Vector3(0.25, 0.2, -7.2),
        new THREE.Vector3(0.25, 1.0, -7.4),
        new THREE.Vector3(0.25, 0.2, -7.4),
        
        new THREE.Vector3(0.25, 2.73, -4.05),
        new THREE.Vector3(0.25, 1.64, -4.05),
        new THREE.Vector3(0.25, 3.26, -7.2),
        new THREE.Vector3(0.25, 1.25, -7.2),
        
        new THREE.Vector3(0.25, 1.64, -4.05),
        new THREE.Vector3(0.25, 0.635, -4.05),
        new THREE.Vector3(0.25, 1.25, -7.2),
        new THREE.Vector3(0.25, 1.0, -7.2),
        
        new THREE.Vector3(0.25, 0.635, -4.05),
        new THREE.Vector3(0.25, 0.2, -4.05),
        new THREE.Vector3(0.25, 1.0, -7.2),
        new THREE.Vector3(0.25, 0.2, -7.2),

        new THREE.Vector3(0.25, 2.084, -0.3),
        new THREE.Vector3(0.25, 1.64, -4.05),
        new THREE.Vector3(0.25, 2.73, -4.05),
        
        new THREE.Vector3(0.25, 2.084, -0.3),
        new THREE.Vector3(0.25, 0.2, -0.3),
        new THREE.Vector3(0.25, 1.64, -4.05),
        new THREE.Vector3(0.25, 0.635, -4.05),

        new THREE.Vector3(0.25, 0.2, -0.3),
        new THREE.Vector3(0.25, 0.2, -4.05),
        new THREE.Vector3(0.25, 0.635, -4.05),

        //Parede Traseira Esquerda
        new THREE.Vector3(-0.5, 3.4273, -8.2),
        new THREE.Vector3(-0.5, 2.891, -8.2),
        new THREE.Vector3(-0.25, 3.4273, -8.2),
        new THREE.Vector3(-0.25, 2.891, -8.2),

        new THREE.Vector3(-0.5, 2.891, -8.2),
        new THREE.Vector3(-0.5, 0.2, -8.2),
        new THREE.Vector3(-0.25, 2.891, -8.2),
        new THREE.Vector3(-0.25, 0.2, -8.2),

        new THREE.Vector3(-3.42, 3.4273, -8.2),
        new THREE.Vector3(-3.42, 2.891, -8.2),
        new THREE.Vector3(-0.5, 3.4273, -8.2),
        new THREE.Vector3(-0.5, 2.891, -8.2),

        new THREE.Vector3(-3.42, 2.891, -8.2),
        new THREE.Vector3(-3.42, 0.2, -8.2),
        new THREE.Vector3(-0.5, 2.891, -8.2),
        new THREE.Vector3(-0.5, 0.2, -8.2),

        new THREE.Vector3(-4.475, 2.25, -8.2),
        new THREE.Vector3(-4.475, 0.2, -8.2),
        new THREE.Vector3(-3.42, 2.25, -8.2),
        new THREE.Vector3(-3.42, 0.2, -8.2),

        //Parede Traseira Direita
        new THREE.Vector3(3.42, 0.2, -8.2),
        new THREE.Vector3(3.42, 3.4273, -8.2),
        new THREE.Vector3(0.25, 0.2, -8.2),
        new THREE.Vector3(0.25, 3.4273, -8.2),
        
        new THREE.Vector3(4.123, 0.2, -8.2),
        new THREE.Vector3(4.123, 2.25, -8.2),
        new THREE.Vector3(3.42, 0.2, -8.2),
        new THREE.Vector3(3.42, 2.25, -8.2),
        
        new THREE.Vector3(4.475, 0.2, -8.2),
        new THREE.Vector3(4.475, 2.25, -8.2),
        new THREE.Vector3(4.123, 0.2, -8.2),
        new THREE.Vector3(4.123, 2.25, -8.2),

        //Parede Frontal Esquerda
        new THREE.Vector3(-4.475, 0.2, -0.3),
        new THREE.Vector3(-4.475, 2.084, -0.3),
        new THREE.Vector3(-4.127, 0.2, -0.3),
        new THREE.Vector3(-4.127, 2.084, -0.3),

        new THREE.Vector3(-4.127, 0.2, -0.3),
        new THREE.Vector3(-4.127, 2.084, -0.3),
        new THREE.Vector3(-3.3125, 0.2, -0.3),
        new THREE.Vector3(-3.3125, 2.084, -0.3),

        new THREE.Vector3(-3.3125, 1.8, -0.3),
        new THREE.Vector3(-3.3125, 2.084, -0.3),
        new THREE.Vector3(-1.4125, 1.8, -0.3),
        new THREE.Vector3(-1.4125, 2.084, -0.3),

        new THREE.Vector3(-1.4125, 0.2, -0.3),
        new THREE.Vector3(-1.4125, 2.084, -0.3),
        new THREE.Vector3(-0.25, 0.2, -0.3),
        new THREE.Vector3(-0.25, 2.084, -0.3),

        //Parede Frontal Direita
        new THREE.Vector3(0.25, 0.2, -0.3),
        new THREE.Vector3(0.25, 2.084, -0.3),
        new THREE.Vector3(0.5, 0.2, -0.3),
        new THREE.Vector3(0.5, 2.084, -0.3),

        new THREE.Vector3(0.5, 0.2, -0.3),
        new THREE.Vector3(0.5, 2.084, -0.3),
        new THREE.Vector3(1.4125, 0.2, -0.3),
        new THREE.Vector3(1.4125, 2.084, -0.3),

        new THREE.Vector3(1.4125, 1.8, -0.3),
        new THREE.Vector3(1.4125, 2.084, -0.3),
        new THREE.Vector3(3.3125, 1.8, -0.3),
        new THREE.Vector3(3.3125, 2.084, -0.3),

        new THREE.Vector3(3.3125, 0.2, -0.3),
        new THREE.Vector3(3.3125, 2.084, -0.3),
        new THREE.Vector3(4.475, 0.2, -0.3),
        new THREE.Vector3(4.475, 2.084, -0.3),

        //Parede Externa Esquerda
        new THREE.Vector3(-4.475, 2.4384, -8.2),
        new THREE.Vector3(-4.475, 3.4287, -8.2),
        new THREE.Vector3(-4.475, 1.8285, -4.7634),
        new THREE.Vector3(-4.475, 2.8242, -4.6036),

        new THREE.Vector3(-4.475, 2.25, -8.2),
        new THREE.Vector3(-4.475, 2.4384, -8.2),
        new THREE.Vector3(-4.475, 1.25, -7.75),
        new THREE.Vector3(-4.475, 2.3585, -7.75),

        new THREE.Vector3(-4.475, 1.25, -7.75),
        new THREE.Vector3(-4.475, 2.3585, -7.75),
        new THREE.Vector3(-4.475, 1.25, -7.55),
        new THREE.Vector3(-4.475, 2.323, -7.55),

        new THREE.Vector3(-4.475, 0.2, -8.2),
        new THREE.Vector3(-4.475, 2.25, -8.2),
        new THREE.Vector3(-4.475, 1.0, -7.75),
        new THREE.Vector3(-4.475, 1.25, -7.75),

        new THREE.Vector3(-4.475, 0.2, -8.2),
        new THREE.Vector3(-4.475, 1.0, -7.75),
        new THREE.Vector3(-4.475, 0.2, -7.55),
        new THREE.Vector3(-4.475, 1.0, -7.55),

        new THREE.Vector3(-4.475, 0.2, -7.55),
        new THREE.Vector3(-4.475, 2.323, -7.55),
        new THREE.Vector3(-4.475, 0.2, -5.078),
        new THREE.Vector3(-4.475, 1.8285, -4.763),

        new THREE.Vector3(-4.475, 1.8285, -4.763),
        new THREE.Vector3(-4.475, 2.8242, -4.604),
        new THREE.Vector3(-4.475, 1.1268, -0.809),
        new THREE.Vector3(-4.475, 2.1597, -0.65),

        new THREE.Vector3(-4.475, 0.2, -5.077),
        new THREE.Vector3(-4.475, 1.8285, -4.763),
        new THREE.Vector3(-4.475, 0.2, -0.952),
        new THREE.Vector3(-4.475, 1.1268, -0.809),

        new THREE.Vector3(-4.475, 1.1268, -0.809),
        new THREE.Vector3(-4.475, 2.1597, -0.65),
        new THREE.Vector3(-4.475, 1.0188, -0.3),
        new THREE.Vector3(-4.475, 2.084, -0.3),

        new THREE.Vector3(-4.475, 0.2, -0.952),
        new THREE.Vector3(-4.475, 1.1268, -0.809),
        new THREE.Vector3(-4.475, 0.2, -0.3),
        new THREE.Vector3(-4.475, 1.0188, -0.3),

        //Parede Externa Direita
        new THREE.Vector3(4.475, 2.2066, -8.057),
        new THREE.Vector3(4.475, 3.1766, -7.9),
        new THREE.Vector3(4.475, 3.2265, -8.2),
        new THREE.Vector3(4.475, 2.25, -8.2),
        
        new THREE.Vector3(4.475, 3.1766, -7.9),
        new THREE.Vector3(4.475, 3.3724, -7.8653),
        new THREE.Vector3(4.475, 3.2265, -8.2),
        new THREE.Vector3(4.475, 3.4287, -8.2),
        
        new THREE.Vector3(4.475, 1.5674, -8.2),
        new THREE.Vector3(4.475, 2.2066, -8.057),
        new THREE.Vector3(4.475, 2.25, -8.2),

        new THREE.Vector3(4.475, 2.5163, -3.9449),
        new THREE.Vector3(4.475, 2.709, -3.918),
        new THREE.Vector3(4.475, 3.2265, -8.2),
        new THREE.Vector3(4.475, 3.4287, -8.2),

        new THREE.Vector3(4.475, 1.25, -4.9),
        new THREE.Vector3(4.475, 2.6757, -4.9),
        new THREE.Vector3(4.475, 2.2066, -8.057),
        new THREE.Vector3(4.475, 3.1766, -7.9),

        new THREE.Vector3(4.475, 1.25, -4.7),
        new THREE.Vector3(4.475, 2.6423, -4.7),
        new THREE.Vector3(4.475, 1.25, -4.9),
        new THREE.Vector3(4.475, 2.6757, -4.9),

        new THREE.Vector3(4.475, 1.1456, -4.118),
        new THREE.Vector3(4.475, 2.5163, -3.9449),
        new THREE.Vector3(4.475, 1.0, -4.7),
        new THREE.Vector3(4.475, 2.6423, -4.7),

        new THREE.Vector3(4.475, 1.0, -4.9),
        new THREE.Vector3(4.475, 1.25, -4.9),
        new THREE.Vector3(4.475, 1.5674, -8.2),
        new THREE.Vector3(4.475, 2.2066, -8.057),

        new THREE.Vector3(4.475, 0.2, -4.9),
        new THREE.Vector3(4.475, 1.0, -4.9),
        new THREE.Vector3(4.475, 0.2, -8.2),
        new THREE.Vector3(4.475, 1.5674, -8.2),

        new THREE.Vector3(4.475, 0.2, -4.7),
        new THREE.Vector3(4.475, 1.0, -4.7),
        new THREE.Vector3(4.475, 0.2, -4.9),
        new THREE.Vector3(4.475, 1.0, -4.9),

        new THREE.Vector3(4.475, 0.2, -4.2541),
        new THREE.Vector3(4.475, 1.1456, -4.118),
        new THREE.Vector3(4.475, 0.2, -4.7),
        new THREE.Vector3(4.475, 1.0, -4.7),

        new THREE.Vector3(4.475, 1.92, -0.3),
        new THREE.Vector3(4.475, 2.084, -0.3),
        new THREE.Vector3(4.475, 2.5163, -3.9449),
        new THREE.Vector3(4.475, 2.709, -3.918),

        new THREE.Vector3(4.475, 0.2, -0.3),
        new THREE.Vector3(4.475, 1.92, -0.3),
        new THREE.Vector3(4.475, 0.2, -4.2541),
        new THREE.Vector3(4.475, 2.5163, -3.9449),

        //Chão Armazem
        new THREE.Vector3(4.475, 2.25, -8.8),
        new THREE.Vector3(3.42, 2.25, -8.8),
        new THREE.Vector3(4.475, 2.25, -8.2),
        new THREE.Vector3(3.42, 2.25, -8.2),

        new THREE.Vector3(4.475, 2.25, -10.6),
        new THREE.Vector3(2.782, 2.25, -10.6),
        new THREE.Vector3(4.475, 2.25, -8.8),
        new THREE.Vector3(2.782, 2.25, -8.8),

        new THREE.Vector3(4.475, 2.25, -12.5),
        new THREE.Vector3(2.782, 2.25, -12.5),
        new THREE.Vector3(4.475, 2.25, -10.6),
        new THREE.Vector3(2.782, 2.25, -10.6),

        new THREE.Vector3(2.782, 2.25, -10.6),
        new THREE.Vector3(-1.234, 2.25, -10.6),
        new THREE.Vector3(2.782, 2.25, -8.8),
        new THREE.Vector3(-1.234, 2.25, -8.8),

        new THREE.Vector3(2.782, 2.25, -12.5),
        new THREE.Vector3(-1.234, 2.25, -12.5),
        new THREE.Vector3(2.782, 2.25, -10.6),
        new THREE.Vector3(-1.234, 2.25, -10.6),

        new THREE.Vector3(-1.234, 2.25, -10.6),
        new THREE.Vector3(-4.475, 2.25, -10.6),
        new THREE.Vector3(-1.234, 2.25, -8.8),
        new THREE.Vector3(-4.475, 2.25, -8.8),

        new THREE.Vector3(-1.234, 2.25, -12.5),
        new THREE.Vector3(-4.475, 2.25, -12.5),
        new THREE.Vector3(-1.234, 2.25, -10.6),
        new THREE.Vector3(-4.475, 2.25, -10.6),

        new THREE.Vector3(-3.4187, 2.25, -8.8),
        new THREE.Vector3(-4.475, 2.25, -8.8),
        new THREE.Vector3(-3.4187, 2.25, -8.2),
        new THREE.Vector3(-4.475, 2.25, -8.2),

        //Armazem Paredes Internas
        new THREE.Vector3(-3.4187, 3.4273, -8.2),
        new THREE.Vector3(-3.4187, 3.528, -8.8),
        new THREE.Vector3(-3.4187, 2.25, -8.2),
        new THREE.Vector3(-3.4187, 2.25, -8.8),
        
        new THREE.Vector3(-3.4187, 3.528, -8.8),
        new THREE.Vector3(-1.2332, 3.528, -8.8),
        new THREE.Vector3(-3.4187, 2.25, -8.8),
        new THREE.Vector3(-1.2332, 2.25, -8.8),
        
        new THREE.Vector3(-1.2332, 3.528, -8.8),
        new THREE.Vector3(2.6146, 3.528, -8.8),
        new THREE.Vector3(-1.2332, 2.25, -8.8),
        new THREE.Vector3(2.6146, 2.25, -8.8),
        
        new THREE.Vector3(2.6146, 3.528, -8.8),
        new THREE.Vector3(3.4187, 3.528, -8.8),
        new THREE.Vector3(2.6146, 2.25, -8.8),
        new THREE.Vector3(3.4187, 2.25, -8.8),

        new THREE.Vector3(3.4187, 3.528, -8.8),
        new THREE.Vector3(3.4187, 3.4273, -8.2),
        new THREE.Vector3(3.4187, 2.25, -8.8),
        new THREE.Vector3(3.4187, 2.25, -8.2),

        //Parede Externa Esquerda Armazem
        new THREE.Vector3(-4.475, 2.5325, -8.73),
        new THREE.Vector3(-4.475, 2.4384, -8.2),
        new THREE.Vector3(-4.475, 2.25, -8.8),
        new THREE.Vector3(-4.475, 2.25, -8.2),

        new THREE.Vector3(-4.475, 3.49, -8.568),
        new THREE.Vector3(-4.475, 3.429, -8.2),
        new THREE.Vector3(-4.475, 2.5325, -8.73),
        new THREE.Vector3(-4.475, 2.4384, -8.2),

        new THREE.Vector3(-4.475, 3.2, -12.5),
        new THREE.Vector3(-4.475, 2.5325, -8.73),
        new THREE.Vector3(-4.475, 2.25, -12.5),
        new THREE.Vector3(-4.475, 2.25, -8.8),

        new THREE.Vector3(-4.475, 4.15, -12.5),
        new THREE.Vector3(-4.475, 3.49, -8.568),
        new THREE.Vector3(-4.475, 3.2, -12.5),
        new THREE.Vector3(-4.475, 2.5325, -8.73),

        //Parede Externa Traseira Armazem
        new THREE.Vector3(-2.78, 4.15, -12.5),
        new THREE.Vector3(-4.475, 4.15, -12.5),
        new THREE.Vector3(-2.78, 2.25, -12.5),
        new THREE.Vector3(-4.475, 2.25, -12.5),

        new THREE.Vector3(1.234, 4.15, -12.5),
        new THREE.Vector3(-2.78, 4.15, -12.5),
        new THREE.Vector3(1.234, 2.25, -12.5),
        new THREE.Vector3(-2.78, 2.25, -12.5),

        new THREE.Vector3(4.475, 4.15, -12.5),
        new THREE.Vector3(1.234, 4.15, -12.5),
        new THREE.Vector3(4.475, 2.25, -12.5),
        new THREE.Vector3(1.234, 2.25, -12.5),

        //Parede Externa Direita Armazem
        
        new THREE.Vector3(4.475, 3.23, -8.2),
        new THREE.Vector3(4.475, 3.84, -11.857),
        new THREE.Vector3(4.475, 2.25, -8.2),
        new THREE.Vector3(4.475, 2.25, -12.111),

        new THREE.Vector3(4.475, 3.43, -8.2),
        new THREE.Vector3(4.475, 4.04, -11.821),
        new THREE.Vector3(4.475, 3.23, -8.2),
        new THREE.Vector3(4.475, 3.84, -11.857),

        new THREE.Vector3(4.475, 3.84, -11.857),
        new THREE.Vector3(4.475, 3.94, -12.5),
        new THREE.Vector3(4.475, 2.25, -12.111),
        new THREE.Vector3(4.475, 2.25, -12.5),

        new THREE.Vector3(4.475, 4.04, -11.821),
        new THREE.Vector3(4.475, 4.15, -12.5),
        new THREE.Vector3(4.475, 3.84, -11.857),
        new THREE.Vector3(4.475, 3.94, -12.5),

        //Furos Intertabernae
        new THREE.Vector3(0.25, 1.0, -7.2),
        new THREE.Vector3(0.25, 1.0, -7.4),
        new THREE.Vector3(-0.25, 1.0, -7.2),
        new THREE.Vector3(-0.25, 1.0, -7.4),
        
        new THREE.Vector3(0.25, 1.25, -7.2),
        new THREE.Vector3(0.25, 1.25, -7.4),
        new THREE.Vector3(-0.25, 1.25, -7.2),
        new THREE.Vector3(-0.25, 1.25, -7.4),
        
        new THREE.Vector3(0.25, 1.25, -7.2),
        new THREE.Vector3(0.25, 1.0, -7.2),
        new THREE.Vector3(-0.25, 1.25, -7.2),
        new THREE.Vector3(-0.25, 1.0, -7.2),

        new THREE.Vector3(0.25, 1.0, -7.4),
        new THREE.Vector3(0.25, 1.25, -7.4),
        new THREE.Vector3(-0.25, 1.0, -7.4),
        new THREE.Vector3(-0.25, 1.25, -7.4),

        new THREE.Vector3(-4.475, 1.0, -7.55),
        new THREE.Vector3(-4.475, 1.0, -7.75),
        new THREE.Vector3(-5.075, 1.0, -7.55),
        new THREE.Vector3(-5.075, 1.0, -7.75),
        
        new THREE.Vector3(-4.475, 1.25, -7.55),
        new THREE.Vector3(-4.475, 1.25, -7.75),
        new THREE.Vector3(-5.075, 1.25, -7.55),
        new THREE.Vector3(-5.075, 1.25, -7.75),
        
        new THREE.Vector3(-4.475, 1.25, -7.55),
        new THREE.Vector3(-4.475, 1.0, -7.55),
        new THREE.Vector3(-5.075, 1.25, -7.55),
        new THREE.Vector3(-5.075, 1.0, -7.55),

        new THREE.Vector3(-4.475, 1.0, -7.75),
        new THREE.Vector3(-4.475, 1.25, -7.75),
        new THREE.Vector3(-5.075, 1.0, -7.75),
        new THREE.Vector3(-5.075, 1.25, -7.75),

        new THREE.Vector3(5.075, 1.0, -4.7),
        new THREE.Vector3(5.075, 1.0, -4.9),
        new THREE.Vector3(4.475, 1.0, -4.7),
        new THREE.Vector3(4.475, 1.0, -4.9),
        
        new THREE.Vector3(5.075, 1.25, -4.9),
        new THREE.Vector3(5.075, 1.25, -4.7),
        new THREE.Vector3(4.475, 1.25, -4.9),
        new THREE.Vector3(4.475, 1.25, -4.7),
        
        new THREE.Vector3(5.075, 1.25, -4.7),
        new THREE.Vector3(5.075, 1.0, -4.7),
        new THREE.Vector3(4.475, 1.25, -4.7),
        new THREE.Vector3(4.475, 1.0, -4.7),

        new THREE.Vector3(5.075, 1.0, -4.9),
        new THREE.Vector3(5.075, 1.25, -4.9),
        new THREE.Vector3(4.475, 1.0, -4.9),
        new THREE.Vector3(4.475, 1.25, -4.9),

        //Portas
            //Direita
        new THREE.Vector3(1.4125, 0.2, 0.05),
        new THREE.Vector3(3.3125, 0.2, 0.05),
        new THREE.Vector3(1.4125, 0.2, -0.3),
        new THREE.Vector3(3.3125, 0.2, -0.3),
        
        new THREE.Vector3(2.4125, 0.2, 0.15),
        new THREE.Vector3(3.3125, 0.2, 0.15),
        new THREE.Vector3(2.4125, 0.2, 0.05),
        new THREE.Vector3(3.3125, 0.2, 0.05),
        
        new THREE.Vector3(1.4125, 0.2, 0.3),
        new THREE.Vector3(3.3125, 0.2, 0.3),
        new THREE.Vector3(1.4125, 0.2, 0.15),
        new THREE.Vector3(3.3125, 0.2, 0.15),

            //Esquerda
        new THREE.Vector3(-3.3125, 0.2, 0.05),
        new THREE.Vector3(-1.4125, 0.2, 0.05),
        new THREE.Vector3(-3.3125, 0.2, -0.3),
        new THREE.Vector3(-1.4125, 0.2, -0.3),
        
        new THREE.Vector3(-2.4125, 0.2, 0.15),
        new THREE.Vector3(-1.4125, 0.2, 0.15),
        new THREE.Vector3(-2.4125, 0.2, 0.05),
        new THREE.Vector3(-1.4125, 0.2, 0.05),
        
        new THREE.Vector3(-3.3125, 0.2, 0.3),
        new THREE.Vector3(-1.4125, 0.2, 0.3),
        new THREE.Vector3(-3.3125, 0.2, 0.15),
        new THREE.Vector3(-1.4125, 0.2, 0.15),

            //Direita Coisinha Baixo
        new THREE.Vector3(1.4125, 0.2, 0.15),
        new THREE.Vector3(2.4125, 0.2, 0.15),
        new THREE.Vector3(1.4125, 0.15, 0.15),
        new THREE.Vector3(2.4125, 0.15, 0.15),
        
        new THREE.Vector3(2.4125, 0.2, 0.15),
        new THREE.Vector3(2.4125, 0.2, 0.05),
        new THREE.Vector3(2.4125, 0.15, 0.15),
        new THREE.Vector3(2.4125, 0.15, 0.05),
        
        new THREE.Vector3(2.4125, 0.2, 0.05),
        new THREE.Vector3(1.4125, 0.2, 0.05),
        new THREE.Vector3(2.4125, 0.15, 0.05),
        new THREE.Vector3(1.4125, 0.15, 0.05),
        
        new THREE.Vector3(1.4125, 0.2, 0.05),
        new THREE.Vector3(1.4125, 0.2, 0.15),
        new THREE.Vector3(1.4125, 0.15, 0.05),
        new THREE.Vector3(1.4125, 0.15, 0.15),
        
        new THREE.Vector3(1.4125, 0.15, 0.15),
        new THREE.Vector3(2.4125, 0.15, 0.15),
        new THREE.Vector3(1.4125, 0.15, 0.05),
        new THREE.Vector3(2.4125, 0.15, 0.05),

            //Esquerda Coisinha Baixo
        new THREE.Vector3(-3.3125, 0.2, 0.15),
        new THREE.Vector3(-2.4125, 0.2, 0.15),
        new THREE.Vector3(-3.3125, 0.15, 0.15),
        new THREE.Vector3(-2.4125, 0.15, 0.15),
        
        new THREE.Vector3(-2.4125, 0.2, 0.15),
        new THREE.Vector3(-2.4125, 0.2, 0.05),
        new THREE.Vector3(-2.4125, 0.15, 0.15),
        new THREE.Vector3(-2.4125, 0.15, 0.05),
        
        new THREE.Vector3(-2.4125, 0.2, 0.05),
        new THREE.Vector3(-3.3125, 0.2, 0.05),
        new THREE.Vector3(-2.4125, 0.15, 0.05),
        new THREE.Vector3(-3.3125, 0.15, 0.05),
        
        new THREE.Vector3(-3.3125, 0.2, 0.05),
        new THREE.Vector3(-3.3125, 0.2, 0.15),
        new THREE.Vector3(-3.3125, 0.15, 0.05),
        new THREE.Vector3(-3.3125, 0.15, 0.15),
        
        new THREE.Vector3(-3.3125, 0.15, 0.15),
        new THREE.Vector3(-2.4125, 0.15, 0.15),
        new THREE.Vector3(-3.3125, 0.15, 0.05),
        new THREE.Vector3(-2.4125, 0.15, 0.05),

            //Laterais Direita
        new THREE.Vector3(1.4125, 1.8, -0.3),
        new THREE.Vector3(1.4125, 1.8, 0.3),
        new THREE.Vector3(1.4125, 0.2, -0.3),
        new THREE.Vector3(1.4125, 0.2, 0.3),

        new THREE.Vector3(3.3125, 1.8, 0.3),
        new THREE.Vector3(3.3125, 1.8, -0.3),
        new THREE.Vector3(3.3125, 0.2, 0.3),
        new THREE.Vector3(3.3125, 0.2, -0.3),

            //Laterais Esquerda
        new THREE.Vector3(-3.3125, 1.8, -0.3),
        new THREE.Vector3(-3.3125, 1.8, 0.3),
        new THREE.Vector3(-3.3125, 0.2, -0.3),
        new THREE.Vector3(-3.3125, 0.2, 0.3),

        new THREE.Vector3(-1.4125, 1.8, 0.3),
        new THREE.Vector3(-1.4125, 1.8, -0.3),
        new THREE.Vector3(-1.4125, 0.2, 0.3),
        new THREE.Vector3(-1.4125, 0.2, -0.3),
        
            //Direita Cima
        new THREE.Vector3(3.3125, 1.8, 0.05),
        new THREE.Vector3(1.4125, 1.8, 0.05),
        new THREE.Vector3(3.3125, 1.8, -0.3),
        new THREE.Vector3(1.4125, 1.8, -0.3),
        
        new THREE.Vector3(3.3125, 1.8, 0.15),
        new THREE.Vector3(2.4125, 1.8, 0.15),
        new THREE.Vector3(3.3125, 1.8, 0.05),
        new THREE.Vector3(2.4125, 1.8, 0.05),
        
        new THREE.Vector3(3.3125, 1.8, 0.3),
        new THREE.Vector3(1.4125, 1.8, 0.3),
        new THREE.Vector3(3.3125, 1.8, 0.15),
        new THREE.Vector3(1.4125, 1.8, 0.15),

            //Esquerda Cima
        new THREE.Vector3(-1.4125, 1.8, 0.05),
        new THREE.Vector3(-3.3125, 1.8, 0.05),
        new THREE.Vector3(-1.4125, 1.8, -0.3),
        new THREE.Vector3(-3.3125, 1.8, -0.3),
        
        new THREE.Vector3(-1.4125, 1.8, 0.15),
        new THREE.Vector3(-2.4125, 1.8, 0.15),
        new THREE.Vector3(-1.4125, 1.8, 0.05),
        new THREE.Vector3(-2.4125, 1.8, 0.05),
        
        new THREE.Vector3(-1.4125, 1.8, 0.3),
        new THREE.Vector3(-3.3125, 1.8, 0.3),
        new THREE.Vector3(-1.4125, 1.8, 0.15),
        new THREE.Vector3(-3.3125, 1.8, 0.15),

            //Direita Coisinha Cima
        new THREE.Vector3(2.4125, 1.8, 0.15),
        new THREE.Vector3(1.4125, 1.8, 0.15),
        new THREE.Vector3(2.4125, 1.85, 0.15),
        new THREE.Vector3(1.4125, 1.85, 0.15),
        
        new THREE.Vector3(2.4125, 1.8, 0.05),
        new THREE.Vector3(2.4125, 1.8, 0.15),
        new THREE.Vector3(2.4125, 1.85, 0.05),
        new THREE.Vector3(2.4125, 1.85, 0.15),
        
        new THREE.Vector3(1.4125, 1.8, 0.05),
        new THREE.Vector3(2.4125, 1.8, 0.05),
        new THREE.Vector3(1.4125, 1.85, 0.05),
        new THREE.Vector3(2.4125, 1.85, 0.05),
        
        new THREE.Vector3(1.4125, 1.8, 0.15),
        new THREE.Vector3(1.4125, 1.8, 0.05),
        new THREE.Vector3(1.4125, 1.85, 0.15),
        new THREE.Vector3(1.4125, 1.85, 0.05),
        
        new THREE.Vector3(2.4125, 1.85, 0.15),
        new THREE.Vector3(1.4125, 1.85, 0.15),
        new THREE.Vector3(2.4125, 1.85, 0.05),
        new THREE.Vector3(1.4125, 1.85, 0.05),

            //Esquerda Coisinha Cima
        new THREE.Vector3(-2.4125, 1.8, 0.15),
        new THREE.Vector3(-3.3125, 1.8, 0.15),
        new THREE.Vector3(-2.4125, 1.85, 0.15),
        new THREE.Vector3(-3.3125, 1.85, 0.15),
        
        new THREE.Vector3(-2.4125, 1.8, 0.05),
        new THREE.Vector3(-2.4125, 1.8, 0.15),
        new THREE.Vector3(-2.4125, 1.85, 0.05),
        new THREE.Vector3(-2.4125, 1.85, 0.15),
        
        new THREE.Vector3(-3.3125, 1.8, 0.05),
        new THREE.Vector3(-2.4125, 1.8, 0.05),
        new THREE.Vector3(-3.3125, 1.85, 0.05),
        new THREE.Vector3(-2.4125, 1.85, 0.05),
        
        new THREE.Vector3(-3.3125, 1.8, 0.15),
        new THREE.Vector3(-3.3125, 1.8, 0.05),
        new THREE.Vector3(-3.3125, 1.85, 0.15),
        new THREE.Vector3(-3.3125, 1.85, 0.05),
        
        new THREE.Vector3(-2.4125, 1.85, 0.15),
        new THREE.Vector3(-3.3125, 1.85, 0.15),
        new THREE.Vector3(-2.4125, 1.85, 0.05),
        new THREE.Vector3(-3.3125, 1.85, 0.05),

        //Exterior Frente
        new THREE.Vector3(5.075, 2, 0.3),
        new THREE.Vector3(3.3125, 2, 0.3),
        new THREE.Vector3(5.075, 0, 0.3),
        new THREE.Vector3(3.3125, 0, 0.3),
        
        new THREE.Vector3(3.3125, 2, 0.3),
        new THREE.Vector3(2.903, 2, 0.3),
        new THREE.Vector3(3.3125, 1.8, 0.3),
        new THREE.Vector3(2.903, 1.8, 0.3),
        
        new THREE.Vector3(3.3125, 0.2, 0.3),
        new THREE.Vector3(2.903, 0.2, 0.3),
        new THREE.Vector3(3.3125, 0.0, 0.3),
        new THREE.Vector3(2.903, 0.0, 0.3),
        

        new THREE.Vector3(2.903, 2.0, 0.3),
        new THREE.Vector3(1.4125, 2.0, 0.3),
        new THREE.Vector3(2.903, 1.8, 0.3),
        new THREE.Vector3(1.4125, 1.8, 0.3),
        
        new THREE.Vector3(2.903, 0.2, 0.3),
        new THREE.Vector3(1.4125, 0.2, 0.3),
        new THREE.Vector3(2.903, 0.0, 0.3),
        new THREE.Vector3(1.4125, 0.0, 0.3),
        
        new THREE.Vector3(1.4125, 2.0, 0.3),
        new THREE.Vector3(-1.116, 2.0, 0.3),
        new THREE.Vector3(1.4125, 0.0, 0.3),
        new THREE.Vector3(-1.116, 0.0, 0.3),

        
        new THREE.Vector3(-1.116, 2.0, 0.3),
        new THREE.Vector3(-1.4125, 2.0, 0.3),
        new THREE.Vector3(-1.116, 0.0, 0.3),
        new THREE.Vector3(-1.4125, 0.0, 0.3),
        
        new THREE.Vector3(-1.4125, 2.0, 0.3),
        new THREE.Vector3(-3.3125, 2.0, 0.3),
        new THREE.Vector3(-1.4125, 1.8, 0.3),
        new THREE.Vector3(-3.3125, 1.8, 0.3),
        
        new THREE.Vector3(-1.4125, 0.2, 0.3),
        new THREE.Vector3(-3.3125, 0.2, 0.3),
        new THREE.Vector3(-1.4125, 0.0, 0.3),
        new THREE.Vector3(-3.3125, 0.0, 0.3),
        
        new THREE.Vector3(-3.3125, 2.0, 0.3),
        new THREE.Vector3(-5.075, 2.0, 0.3),
        new THREE.Vector3(-3.3125, 0.0, 0.3),
        new THREE.Vector3(-5.075, 0.0, 0.3),

        //Exterior Traseira
        new THREE.Vector3(-5.075, 4.25, -13.1),
        new THREE.Vector3(-3.8486, 4.25, -13.1),
        new THREE.Vector3(-5.075, 2.25, -13.1),
        new THREE.Vector3(-3.8486, 2.25, -13.1),
        
        new THREE.Vector3(-3.8486, 4.25, -13.1),
        new THREE.Vector3(0.1671, 4.25, -13.1),
        new THREE.Vector3(-3.8486, 2.25, -13.1),
        new THREE.Vector3(0.1671, 2.25, -13.1),
        
        new THREE.Vector3(0.1671, 4.25, -13.1),
        new THREE.Vector3(4.182, 4.25, -13.1),
        new THREE.Vector3(0.1671, 2.25, -13.1),
        new THREE.Vector3(4.182, 2.25, -13.1),
        
        new THREE.Vector3(4.182, 4.25, -13.1),
        new THREE.Vector3(5.075, 4.25, -13.1),
        new THREE.Vector3(4.182, 2.25, -13.1),
        new THREE.Vector3(5.075, 2.25, -13.1),

        //Parede Externa Esquerda
        new THREE.Vector3(-5.075, 2.0, 0.3),
        new THREE.Vector3(-5.075, 2.3, -1.481),
        new THREE.Vector3(-5.075, 0.0, 0.3),
        new THREE.Vector3(-5.075, 0.0, -1.481),
        
        new THREE.Vector3(-5.075, 2.3, -1.481),
        new THREE.Vector3(-5.075, 2.6, -3.26),
        new THREE.Vector3(-5.075, 0.0, -1.481),
        new THREE.Vector3(-5.075, 0.37, -3.68),


        new THREE.Vector3(-5.075, 0.0, -1.481),
        new THREE.Vector3(-5.075, 0.37, -3.68),
        new THREE.Vector3(-5.075, 0.0, -3.76),


        new THREE.Vector3(-5.075, 3.2, -6.97),
        new THREE.Vector3(-5.075, 2.6, -3.26),
        new THREE.Vector3(-5.075, 1.25, -7.59),
        new THREE.Vector3(-5.075, 1.25, -3.51),
        
        new THREE.Vector3(-5.075, 1.25, -7.59),
        new THREE.Vector3(-5.075, 1.25, -3.51),
        new THREE.Vector3(-5.075, 1.0, -7.575),
        new THREE.Vector3(-5.075, 0.37, -3.68),


        new THREE.Vector3(-5.075, 0.37, -3.68),
        new THREE.Vector3(-5.075, 1.0, -7.575),
        new THREE.Vector3(-5.075, 0.0, -3.76),
        new THREE.Vector3(-5.075, 0.0, -7.575),
        
        new THREE.Vector3(-5.075, 1.0, -7.575),
        new THREE.Vector3(-5.075, 1.0, -7.62),
        new THREE.Vector3(-5.075, 0.0, -7.575),
        new THREE.Vector3(-5.075, 0.0, -7.79),


        new THREE.Vector3(-5.075, 1.0, -7.62),
        new THREE.Vector3(-5.075, 1.0, -7.725),
        new THREE.Vector3(-5.075, 0.0, -7.79),
        new THREE.Vector3(-5.075, 0.0, -8.8),
        
        new THREE.Vector3(-5.075, 1.06, -7.725),
        new THREE.Vector3(-5.075, 1.2435, -8.8),
        new THREE.Vector3(-5.075, 1.0, -7.725),
        new THREE.Vector3(-5.075, 0.0, -8.8),


        new THREE.Vector3(-5.075, 3.22, -6.97),
        new THREE.Vector3(-5.075, 3.35, -7.725),
        new THREE.Vector3(-5.075, 1.25, -7.59),
        new THREE.Vector3(-5.075, 1.25, -7.725),
        
        new THREE.Vector3(-5.075, 3.35, -7.725),
        new THREE.Vector3(-5.075, 3.53, -8.8),
        new THREE.Vector3(-5.075, 1.06, -7.725),
        new THREE.Vector3(-5.075, 1.24, -8.8),
        
        new THREE.Vector3(-5.075, 3.53, -8.8),
        new THREE.Vector3(-5.075, 3.93, -11.173),
        new THREE.Vector3(-5.075, 2.25, -8.8),
        new THREE.Vector3(-5.075, 2.25, -11.511),

        
        new THREE.Vector3(-5.075, 3.93, -11.173),
        new THREE.Vector3(-5.075, 4.25, -13.1),
        new THREE.Vector3(-5.075, 2.25, -11.511),
        new THREE.Vector3(-5.075, 2.25, -13.1),
    ];
        
    var geometry = new THREE.BufferGeometry().setFromPoints(points);
        
    var indices = [];
    
    //Chão Esquerda
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

    //Chão Direita
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

    //Parede Interna Esquerda
    indices.push(48, 49, 50);
    indices.push(51, 52, 54);
    indices.push(54, 53, 51);
    indices.push(55, 56, 58);
    indices.push(58, 57, 55);
    indices.push(59, 60, 62);
    indices.push(62, 61, 59);
    indices.push(63, 64, 66);
    indices.push(66, 65, 63);
    indices.push(67, 68, 70);
    indices.push(70, 69, 67);
    indices.push(71, 72, 74);
    indices.push(74, 73, 71);
    indices.push(75, 76, 78);
    indices.push(78, 77, 75);
    indices.push(79, 80, 82);
    indices.push(82, 81, 79);
    indices.push(83, 84, 86);
    indices.push(86, 85, 83);
    indices.push(87, 88, 90);
    indices.push(90, 89, 87);
    indices.push(91, 92, 94);
    indices.push(94, 93, 91);
    indices.push(95, 96, 98);
    indices.push(98, 97, 95);
    indices.push(99, 100, 101);
    indices.push(102, 103, 105);
    indices.push(105, 104, 102);

    //Parede Interna Direita
    indices.push(106, 107, 109);
    indices.push(109, 108, 106);
    indices.push(110, 111, 113);
    indices.push(113, 112, 110);
    indices.push(114, 115, 117);
    indices.push(117, 116, 114);
    indices.push(118, 119, 121);
    indices.push(121, 120, 118);
    indices.push(122, 123, 125);
    indices.push(125, 124, 122);
    indices.push(126, 127, 129);
    indices.push(129, 128, 126);
    indices.push(130, 131, 133);
    indices.push(133, 132, 130);
    indices.push(134, 135, 137);
    indices.push(137, 136, 134);
    indices.push(138, 139, 141);
    indices.push(141, 140, 138);
    indices.push(142, 143, 144);
    indices.push(145, 146, 148);
    indices.push(148, 147, 145);
    indices.push(149, 150, 151);

    //Parede Traseira Esquerda
    indices.push(152, 153, 155);
    indices.push(155, 154, 152);
    indices.push(156, 157, 159);
    indices.push(159, 158, 156);
    indices.push(160, 161, 163);
    indices.push(163, 162, 160);
    indices.push(164, 165, 167);
    indices.push(167, 166, 164);
    indices.push(168, 169, 171);
    indices.push(171, 170, 168);

    //Parede Traseira Direita
    indices.push(172, 173, 175);
    indices.push(175, 174, 172);
    indices.push(176, 177, 179);
    indices.push(179, 178, 176);
    indices.push(180, 181, 183);
    indices.push(183, 182, 180);

    //Parede Frontal Esquerda
    indices.push(184, 185, 187);
    indices.push(187, 186, 184);
    indices.push(188, 189, 191);
    indices.push(191, 190, 188);
    indices.push(192, 193, 195);
    indices.push(195, 194, 192);
    indices.push(196, 197, 199);
    indices.push(199, 198, 196);

    //Parede Frontal Direita
    indices.push(200, 201, 203);
    indices.push(203, 202, 200);
    indices.push(204, 205, 207);
    indices.push(207, 206, 204);
    indices.push(208, 209, 211);
    indices.push(211, 210, 208);
    indices.push(212, 213, 215);
    indices.push(215, 214, 212);

    //Parede Externa Esquerda
    indices.push(216, 217, 219);
    indices.push(219, 218, 216);
    indices.push(220, 221, 223);
    indices.push(223, 222, 220);
    indices.push(224, 225, 227);
    indices.push(227, 226, 224);
    indices.push(228, 229, 231);
    indices.push(231, 230, 228);
    indices.push(232, 233, 235);
    indices.push(235, 234, 232);
    indices.push(236, 237, 239);
    indices.push(239, 238, 236);
    indices.push(240, 241, 243);
    indices.push(243, 242, 240);
    indices.push(244, 245, 247);
    indices.push(247, 246, 244);
    indices.push(248, 249, 251);
    indices.push(251, 250, 248);
    indices.push(252, 253, 255);
    indices.push(255, 254, 252);

    //Parede Externa Direita
    indices.push(256, 257, 259);
    indices.push(259, 258, 256);
    indices.push(260, 261, 263);
    indices.push(263, 262, 260);
    indices.push(264, 265, 266);
    indices.push(267, 268, 270);
    indices.push(270, 269, 267);
    indices.push(271, 272, 274);
    indices.push(274, 273, 271);
    indices.push(275, 276, 278);
    indices.push(278, 277, 275);
    indices.push(279, 280, 282);
    indices.push(282, 281, 279);
    indices.push(283, 284, 286);
    indices.push(286, 285, 283);
    indices.push(287, 288, 290);
    indices.push(290, 289, 287);
    indices.push(291, 292, 294);
    indices.push(294, 293, 291);
    indices.push(295, 296, 298);
    indices.push(298, 297, 295);
    indices.push(299, 300, 302);
    indices.push(302, 301, 299);
    indices.push(303, 304, 306);
    indices.push(306, 305, 303);

    //Chão Armazem
    indices.push(307, 308, 310);
    indices.push(310, 309, 307);
    indices.push(311, 312, 314);
    indices.push(314, 313, 311);
    indices.push(315, 316, 318);
    indices.push(318, 317, 315);
    indices.push(319, 320, 322);
    indices.push(322, 321, 319);
    indices.push(323, 324, 326);
    indices.push(326, 325, 323);
    indices.push(327, 328, 330);
    indices.push(330, 329, 327);
    indices.push(331, 332, 334);
    indices.push(334, 333, 331);
    indices.push(335, 336, 338);
    indices.push(338, 337, 335);

    //Parede Armazem Interna
    indices.push(339, 340, 342);
    indices.push(342, 341, 339);
    indices.push(343, 344, 346);
    indices.push(346, 345, 343);
    indices.push(347, 348, 350);
    indices.push(350, 349, 347);
    indices.push(351, 352, 354);
    indices.push(354, 353, 351);
    indices.push(355, 356, 358);
    indices.push(358, 357, 355);
    indices.push(359, 360, 362);
    indices.push(362, 361, 359);
    indices.push(363, 364, 366);
    indices.push(366, 365, 363);
    indices.push(367, 368, 370);
    indices.push(370, 369, 367);
    indices.push(371, 372, 374);
    indices.push(374, 373, 371);
    indices.push(375, 376, 378);
    indices.push(378, 377, 375);

    //Parede Esquerda Externa Armazem
    indices.push(379, 380, 382);
    indices.push(382, 381, 379);
    indices.push(383, 384, 386);
    indices.push(386, 385, 383);
    indices.push(387, 388, 390);
    indices.push(390, 389, 387);
    indices.push(391, 392, 394);
    indices.push(394, 393, 391);

    //Parede Externa Traseira Armazem
    indices.push(395, 396, 398);
    indices.push(398, 397, 395);
    indices.push(399, 400, 402);
    indices.push(402, 401, 399);
    indices.push(403, 404, 406);
    indices.push(406, 405, 403);

    //Parede Direita Externa Armazem
    indices.push(407, 408, 410);
    indices.push(410, 409, 407);
    indices.push(411, 412, 414);
    indices.push(414, 413, 411);
    indices.push(415, 416, 418);
    indices.push(418, 417, 415);
    indices.push(419, 420, 422);
    indices.push(422, 421, 419);

    //Furos Intertabernae
    indices.push(423, 424, 426);
    indices.push(426, 425, 423);
    indices.push(427, 428, 430);
    indices.push(430, 429, 427);
    indices.push(431, 432, 434);
    indices.push(434, 433, 431);
    indices.push(435, 436, 438);
    indices.push(438, 437, 435);
    indices.push(439, 440, 442);
    indices.push(442, 441, 439);
    indices.push(443, 444, 446);
    indices.push(446, 445, 443);
    indices.push(447, 448, 450);
    indices.push(450, 449, 447);
    indices.push(451, 452, 454);
    indices.push(454, 453, 451);
    indices.push(455, 456, 458);
    indices.push(458, 457, 455);
    indices.push(459, 460, 462);
    indices.push(462, 461, 459);
    indices.push(463, 464, 466);
    indices.push(466, 465, 463);
    indices.push(467, 468, 470);
    indices.push(470, 469, 467);

    //Portas
    indices.push(471, 472, 474);
    indices.push(474, 473, 471);
    indices.push(475, 476, 478);
    indices.push(478, 477, 475);
    indices.push(479, 480, 482);
    indices.push(482, 481, 479);

    indices.push(483, 484, 486);
    indices.push(486, 485, 483);
    indices.push(487, 488, 490);
    indices.push(490, 489, 487);
    indices.push(491, 492, 494);
    indices.push(494, 493, 491);

    indices.push(495, 496, 498);
    indices.push(498, 497, 495);
    indices.push(499, 500, 502);
    indices.push(502, 501, 499);
    indices.push(503, 504, 506);
    indices.push(506, 505, 503);
    indices.push(507, 508, 510);
    indices.push(510, 509, 507);
    indices.push(511, 512, 514);
    indices.push(514, 513, 511);

    indices.push(515, 516, 518);
    indices.push(518, 517, 515);
    indices.push(519, 520, 522);
    indices.push(522, 521, 519);
    indices.push(523, 524, 526);
    indices.push(526, 525, 523);
    indices.push(527, 528, 530);
    indices.push(530, 529, 527);
    indices.push(531, 532, 534);
    indices.push(534, 533, 531);

    indices.push(535, 536, 538);
    indices.push(538, 537, 535);
    indices.push(539, 540, 542);
    indices.push(542, 541, 539);

    indices.push(543, 544, 546);
    indices.push(546, 545, 543);
    indices.push(547, 548, 550);
    indices.push(550, 549, 547);
    
    indices.push(551, 552, 554);
    indices.push(554, 553, 551);
    indices.push(555, 556, 558);
    indices.push(558, 557, 555);
    indices.push(559, 560, 562);
    indices.push(562, 561, 559);

    indices.push(563, 564, 566);
    indices.push(566, 565, 563);
    indices.push(567, 568, 570);
    indices.push(570, 569, 567);
    indices.push(571, 572, 574);
    indices.push(574, 573, 571);

    indices.push(575, 576, 578);
    indices.push(578, 577, 575);
    indices.push(579, 580, 582);
    indices.push(582, 581, 579);
    indices.push(583, 584, 586);
    indices.push(586, 585, 583);
    indices.push(587, 588, 590);
    indices.push(590, 589, 587);
    indices.push(591, 592, 594);
    indices.push(594, 593, 591);

    indices.push(595, 596, 598);
    indices.push(598, 597, 595);
    indices.push(599, 600, 602);
    indices.push(602, 601, 599);
    indices.push(603, 604, 606);
    indices.push(606, 605, 603);
    indices.push(607, 608, 610);
    indices.push(610, 609, 607);
    indices.push(611, 612, 614);
    indices.push(614, 613, 611);

    //Exterior Frente
    indices.push(615, 616, 618);
    indices.push(618, 617, 615);
    indices.push(619, 620, 622);
    indices.push(622, 621, 619);
    indices.push(623, 624, 626);
    indices.push(626, 625, 623);

    indices.push(627, 628, 630);
    indices.push(630, 629, 627);
    indices.push(631, 632, 634);
    indices.push(634, 633, 631);
    indices.push(635, 636, 638);
    indices.push(638, 637, 635);

    indices.push(639, 640, 642);
    indices.push(642, 641, 639);
    indices.push(643, 644, 646);
    indices.push(646, 645, 643);
    indices.push(647, 648, 650);
    indices.push(650, 649, 647);
    indices.push(651, 652, 654);
    indices.push(654, 653, 651);

    //Exterior Traseira
    indices.push(655, 656, 658);
    indices.push(658, 657, 655);
    indices.push(659, 660, 662);
    indices.push(662, 661, 659);
    indices.push(663, 664, 666);
    indices.push(666, 665, 663);
    indices.push(667, 668, 670);
    indices.push(670, 669, 667);

    //Exterior Esquerda
    indices.push(671, 672, 674);
    indices.push(674, 673, 671);
    indices.push(675, 676, 678);
    indices.push(678, 677, 675);

    indices.push(679, 680, 681);

    indices.push(682, 683, 685);
    indices.push(685, 684, 682);
    indices.push(686, 687, 689);
    indices.push(689, 688, 686);

    indices.push(690, 691, 693);
    indices.push(693, 692, 690);
    indices.push(694, 695, 697);
    indices.push(697, 696, 694);

    indices.push(698, 699, 701);
    indices.push(701, 700, 698);
    indices.push(702, 703, 705);
    indices.push(705, 704, 702);

    indices.push(706, 707, 709);
    indices.push(709, 708, 706);
    indices.push(710, 711, 713);
    indices.push(713, 712, 710);
    indices.push(714, 715, 717);
    indices.push(717, 716, 714);

    indices.push(718, 719, 721);
    indices.push(721, 720, 718);
     
    geometry.setIndex( indices );
    
    //Chão Esquerda
    geometry.addGroup(0, 6, 21);
    geometry.addGroup(6, 6, 22);
    geometry.addGroup(12, 6, 27);
    geometry.addGroup(18, 6, 28);
    geometry.addGroup(24, 6, 33);
    geometry.addGroup(30, 6, 34);

    //Chão Direita
    geometry.addGroup(36, 6, 32);
    geometry.addGroup(42, 6, 31);
    geometry.addGroup(48, 6, 26);
    geometry.addGroup(54, 6, 25);
    geometry.addGroup(60, 6, 20);
    geometry.addGroup(66, 6, 19);

    //Parede Interna Esquerda
    geometry.addGroup(72, 3, 6);
    geometry.addGroup(75, 6, 7);
    geometry.addGroup(81, 6, 7);
    geometry.addGroup(87, 6, 7);
    geometry.addGroup(93, 6, 7);
    geometry.addGroup(99, 6, 7);
    geometry.addGroup(105, 6, 7);
    geometry.addGroup(111, 6, 7);
    geometry.addGroup(117, 6, 7);
    geometry.addGroup(123, 6, 7);
    geometry.addGroup(129, 6, 13);
    geometry.addGroup(135, 6, 13);
    geometry.addGroup(141, 6, 13);
    geometry.addGroup(147, 3, 19);
    geometry.addGroup(150, 6, 19);

    //Parede Interna Direita
    geometry.addGroup(156, 6, 18);
    geometry.addGroup(162, 6, 12);
    geometry.addGroup(168, 6, 12);
    geometry.addGroup(174, 6, 12);
    geometry.addGroup(180, 6, 12);
    geometry.addGroup(186, 6, 12);
    geometry.addGroup(192, 6, 12);
    geometry.addGroup(198, 6, 12);
    geometry.addGroup(204, 6, 12);
    geometry.addGroup(210, 3, 6);
    geometry.addGroup(213, 6, 6);
    geometry.addGroup(219, 3, 6);

    //Parede Traseira Esquerda
    geometry.addGroup(222, 6, 6);
    geometry.addGroup(228, 6, 7);
    geometry.addGroup(234, 6, 0);
    geometry.addGroup(240, 6, 1);
    geometry.addGroup(246, 6, 1);

    //Parede Traseira Direita
    geometry.addGroup(252, 6, 18);
    geometry.addGroup(258, 6, 18);
    geometry.addGroup(264, 6, 24);

    //Parede Frontal Esquerda
    geometry.addGroup(270, 6, 25);
    geometry.addGroup(276, 6, 19);
    geometry.addGroup(282, 6, 19);
    geometry.addGroup(288, 6, 19);

    //Parede Frontal Direita
    geometry.addGroup(294, 6, 6);
    geometry.addGroup(300, 6, 0);
    geometry.addGroup(306, 6, 0);
    geometry.addGroup(312, 6, 0);

    //Parede Externa Esquerda
    geometry.addGroup(318, 6, 10);
    geometry.addGroup(324, 6, 9);
    geometry.addGroup(330, 6, 9);
    geometry.addGroup(336, 6, 9);
    geometry.addGroup(342, 6, 9);
    geometry.addGroup(348, 6, 10);
    geometry.addGroup(354, 6, 16);
    geometry.addGroup(360, 6, 15);
    geometry.addGroup(366, 6, 22);
    geometry.addGroup(372, 6, 21);

    //Parede Externa Direita
    geometry.addGroup(378, 6, 16);
    geometry.addGroup(384, 6, 17);
    geometry.addGroup(390, 3, 16);
    geometry.addGroup(393, 6, 11);
    geometry.addGroup(399, 6, 10);
    geometry.addGroup(405, 6, 10);
    geometry.addGroup(411, 6, 10);
    geometry.addGroup(417, 6, 10);
    geometry.addGroup(423, 6, 10);
    geometry.addGroup(429, 6, 10);
    geometry.addGroup(435, 6, 10);
    geometry.addGroup(441, 6, 5);
    geometry.addGroup(447, 6, 4);

    //Chão Armazem
    geometry.addGroup(453, 6, 24);
    geometry.addGroup(459, 6, 35);
    geometry.addGroup(465, 6, 34);
    geometry.addGroup(471, 6, 29);
    geometry.addGroup(477, 6, 28);
    geometry.addGroup(483, 6, 23);
    geometry.addGroup(489, 6, 22);
    geometry.addGroup(495, 6, 24);

    //Parede Interna Armazem
    geometry.addGroup(501, 6, 24);
    geometry.addGroup(507, 6, 21);
    geometry.addGroup(513, 6, 27);
    geometry.addGroup(519, 6, 33);
    geometry.addGroup(525, 6, 24);

    //Parede Esquerda Externa Armazem
    geometry.addGroup(531, 6, 9);
    geometry.addGroup(537, 6, 10);
    geometry.addGroup(543, 6, 3);
    geometry.addGroup(549, 6, 4);

    //Parede Externa Traseira Armazem
    geometry.addGroup(555, 6, 35);
    geometry.addGroup(561, 6, 29);
    geometry.addGroup(567, 6, 23);

    //Parede Direita Externa Armazem
    geometry.addGroup(573, 6, 16);
    geometry.addGroup(579, 6, 17);
    geometry.addGroup(585, 6, 22);
    geometry.addGroup(591, 6, 23);

    //Parede Direita Externa Armazem
    geometry.addGroup(597, 6, 25);
    geometry.addGroup(603, 6, 25);
    geometry.addGroup(609, 6, 25);
    geometry.addGroup(615, 6, 25);
    geometry.addGroup(621, 6, 25);
    geometry.addGroup(627, 6, 25);
    geometry.addGroup(633, 6, 25);
    geometry.addGroup(639, 6, 25);
    geometry.addGroup(645, 6, 25);
    geometry.addGroup(651, 6, 25);
    geometry.addGroup(657, 6, 25);
    geometry.addGroup(663, 6, 25);

    //Portas
    geometry.addGroup(669, 6, 26);
    geometry.addGroup(675, 6, 26);
    geometry.addGroup(681, 6, 26);

    geometry.addGroup(687, 6, 26);
    geometry.addGroup(693, 6, 26);
    geometry.addGroup(699, 6, 26);
    
    geometry.addGroup(705, 6, 24);
    geometry.addGroup(711, 6, 24);
    geometry.addGroup(717, 6, 24);
    geometry.addGroup(723, 6, 24);
    geometry.addGroup(729, 6, 24);

    geometry.addGroup(735, 6, 24);
    geometry.addGroup(741, 6, 24);
    geometry.addGroup(747, 6, 24);
    geometry.addGroup(753, 6, 24);
    geometry.addGroup(759, 6, 24);

    geometry.addGroup(765, 6, 24);
    geometry.addGroup(771, 6, 24);

    geometry.addGroup(777, 6, 24);
    geometry.addGroup(783, 6, 24);

    geometry.addGroup(789, 6, 26);
    geometry.addGroup(795, 6, 26);
    geometry.addGroup(801, 6, 26);

    geometry.addGroup(807, 6, 26);
    geometry.addGroup(813, 6, 26);
    geometry.addGroup(819, 6, 26);
    
    geometry.addGroup(825, 6, 24);
    geometry.addGroup(831, 6, 24);
    geometry.addGroup(837, 6, 24);
    geometry.addGroup(843, 6, 24);
    geometry.addGroup(849, 6, 24);

    geometry.addGroup(855, 6, 24);
    geometry.addGroup(861, 6, 24);
    geometry.addGroup(867, 6, 24);
    geometry.addGroup(873, 6, 24);
    geometry.addGroup(879, 6, 24);

    //Exterior Frente
    geometry.addGroup(885, 6, 17);
    geometry.addGroup(891, 6, 17);
    geometry.addGroup(897, 6, 17);

    geometry.addGroup(903, 6, 11);
    geometry.addGroup(909, 6, 11);
    geometry.addGroup(915, 6, 11);

    geometry.addGroup(921, 6, 5);
    geometry.addGroup(927, 6, 5);
    geometry.addGroup(933, 6, 5);
    geometry.addGroup(939, 6, 5);

    //Exterior Traseira
    geometry.addGroup(945, 6, 31);
    geometry.addGroup(951, 6, 32);
    geometry.addGroup(957, 6, 33);
    geometry.addGroup(963, 6, 34);

    //Exterior Esquerda
    geometry.addGroup(969, 6, 2);
    geometry.addGroup(975, 6, 2);
    
    geometry.addGroup(981, 3, 1);
    
    geometry.addGroup(984, 6, 8);
    geometry.addGroup(990, 6, 8);
    
    geometry.addGroup(996, 6, 7);
    geometry.addGroup(1002, 6, 7);
    
    geometry.addGroup(1008, 6, 13);
    geometry.addGroup(1014, 6, 13);
    
    geometry.addGroup(1020, 6, 14);
    geometry.addGroup(1026, 6, 14);
    geometry.addGroup(1032, 6, 14);

    geometry.addGroup(1038, 6, 20);

    var quad_uvs =
    [
        //Chão Esquerda
        0.453, 1.0,
        1.0, 1.0,
        0.453, 0.192,
        1.0, 0.192,

        0.0, 1.0,
        0.506, 1.0,
        0.0, 0.192,
        0.506, 0.192,

        0.453, 1.0,
        1.0, 1.0,
        0.453, 0.0,
        1.0, 0.0,

        0.0, 1.0,
        0.506, 1.0,
        0.0, 0.0,
        0.506, 0.0,

        0.453, 0.162,
        1.0, 0.162,
        0.453, 0.0,
        1.0, 0.0,

        0.0, 0.162,
        0.506, 0.162,
        0.0, 0.0,
        0.506, 0.0,

        //Chão Direita
        0.0, 0.469,
        0.748, 0.469,
        0.0, 0.0,
        0.748, 0.0,

        0.694, 0.469,
        1.0, 0.469,
        0.694, 0.0,
        1.0, 0.0,

        0.0, 1.0,
        0.748, 1.0,
        0.0, 0.0,
        0.748, 0.0,

        0.694, 1.0,
        1.0, 1.0,
        0.694, 0.0,
        1.0, 0.0,

        0.0, 1.0,
        0.748, 1.0,
        0.0, 0.499,
        0.748, 0.499,

        0.694, 1.0,
        1.0, 1.0,
        0.694, 0.499,
        1.0, 0.499,

        //Parede Interna Esquerda
        1.0, 0.860,
        0.868, 0.064,
        1.0, 0.064,

        0.411, 0.262,
        0.0, 0.262,
        0.411, 0.64,
        0.0, 0.64,

        0.411, 0.312,
        0.0, 0.312,
        0.411, 0.262,
        0.0, 0.262,

        0.0, 0.860,
        0.342, 0.860,
        0.0, 0.312,
        0.411, 0.312,

        0.023, 1.0,
        0.324, 1.0,
        0.0, 0.86,
        0.342, 0.86,

        0.473, 0.263,
        0.411, 0.263,
        0.473, 0.064,
        0.411, 0.064,

        0.673, 0.264,
        0.473, 0.264,
        0.673, 0.064,
        0.473, 0.064,

        0.672, 0.314,
        0.473, 0.314,
        0.672, 0.264,
        0.473, 0.264,

        0.671, 1.0,
        0.551, 1.0,
        0.671, 0.314,
        0.473, 0.314,

        0.551, 1.0,
        0.324, 1.0,
        0.473, 0.313,
        0.411, 0.313,

        0.198, 1.0,
        0.189, 1.0,
        0.324, 0.0,
        0.023, 0.0,

        0.664, 1.0,
        0.198, 1.0,
        0.551, 0.0,
        0.324, 0.0,

        0.668, 1.0,
        0.664, 1.0,
        0.668, 0.0,
        0.551, 0.0,

        0.194, 0.033,
        0.198, 0.0,
        0.189, 0.0,

        0.668, 0.034,
        0.194, 0.034,
        0.664, 0.0,
        0.198, 0.0,

        //Parede Interna Direita
        0.048, 0.0,
        0.847, 0.0,
        0.042, 0.034,
        0.847, 0.034,

        0.075, 0.835,
        0.585, 0.835,
        0.048, 1.0,
        0.585, 1.0,

        0.585, 0.835,
        0.647, 0.835,
        0.585, 1.0,
        0.647, 1.0,

        0.647, 0.835,
        0.847, 0.835,
        0.647, 1.0,
        0.847, 1.0,

        0.083, 0.785,
        0.585, 0.785,
        0.075, 0.835,
        0.585, 0.835,

        0.647, 0.785,
        0.847, 0.785,
        0.647, 0.835,
        0.847, 0.835,

        0.213, 0.0,
        0.486, 0.0,
        0.083, 0.785,
        0.585, 0.785,

        0.486, 0.0,
        0.736, 0.0,
        0.585, 0.785,
        0.647, 0.785,

        0.736, 0.0,
        0.847, 0.0,
        0.647, 0.785,
        0.847, 0.785,

        0.368, 0.065,
        0.486, 1.0,
        0.213, 1.0,

        0.368, 0.065,
        0.842, 0.065,
        0.486, 1.0,
        0.736, 1.0,

        0.844, 0.0,
        0.846, 1.0,
        0.736, 1.0,

        //Parede Traseira Esquerda
        1.0, 0.064,
        0.868, 0.064,
        1.0, 0.0,
        0.868, 0.0,

        0.673, 0.064,
        0.0, 0.064,
        0.673, 0.0,
        0.0, 0.0,

        1.0, 1.0,
        0.868, 1.0,
        1.0, 0.274,
        0.868, 0.274,

        0.673, 1.0,
        0.0, 1.0,
        0.673, 0.274,
        0.0, 0.274,

        0.673, 0.274,
        0.162, 0.274,
        0.673, 0.011,
        0.162, 0.011,

        //Parede Traseira Direita
        0.847, 0.824,
        0.042, 0.824,
        0.847, 0.034,
        0.042, 0.034,

        0.847, 1.0,
        0.336, 1.0,
        0.847, 0.824,
        0.336, 0.824,

        0.847, 0.088,
        0.336, 0.088,
        0.847, 0.0,
        0.336, 0.0,

        //Parede Frontal Esquerda
        0.666, 0.088,
        0.192, 0.088,
        0.666, 0.0,
        0.192, 0.0,

        0.666, 1.0,
        0.192, 1.0,
        0.666, 0.798,
        0.192, 0.798,

        0.268, 0.797,
        0.193, 0.797,
        0.268, 0.323,
        0.193, 0.323,

        0.666, 0.323,
        0.193, 0.323,
        0.666, 0.034,
        0.193, 0.034,

        //Parede Frontal Direita
        0.842, 0.064,
        0.368, 0.064,
        0.842, 0.0,
        0.368, 0.0,

        0.842, 1.0,
        0.368, 1.0,
        0.842, 0.774,
        0.368, 0.774,

        0.443, 0.774,
        0.368, 0.774,
        0.443, 0.301,
        0.368, 0.301,

        0.842, 0.301,
        0.368, 0.301,
        0.842, 0.011,
        0.368, 0.011,

        //Parede Externa Esquerda
        0.247, 1.0,
        0.0, 1.0,
        0.247, 0.093,
        0.0, 0.134,

        0.957, 0.143,
        1.0, 0.134,
        0.73, 0.295,
        1.0, 0.247,

        1.0, 0.247,
        0.730, 0.295,
        1.0, 0.298,
        0.738, 0.345,

        0.957, 0.143,
        0.453, 0.228,
        0.730, 0.295,
        0.668, 0.306,

        0.453, 0.228,
        0.668, 0.306,
        0.480, 0.389,
        0.676, 0.355,

        1.0, 1.0,
        0.582, 1.0,
        1.0, 0.298,
        0.480, 0.389,

        0.247, 1.0,
        0.0, 1.0,
        0.247, 0.0,
        0.0, 0.0,

        1.0, 0.0,
        0.582, 0.0,
        1.0, 1.0,
        0.751, 1.0,

        0.247, 0.092,
        0.0, 0.133,
        0.247, 0.0,
        0.0, 0.0,

        1.0, 0.133,
        0.779, 0.171,
        1.0, 0.0,
        0.751, 0.0,

        //Parede Externa Direita
        0.759, 0.0,
        1.0, 0.0,
        0.764, 0.035,
        1.0, 0.076,

        0.054, 0.085,
        0.0, 0.076,
        0.054, 0.0,
        0.0, 0.0,

        0.764, 0.035,
        0.759, 0.0,
        0.561, 0.0,

        0.054, 1.0,
        0.0, 1.0,
        0.054, 0.0,
        0.0, 0.0,

        1.0, 1.0,
        0.759, 1.0,
        1.0, 0.241,
        0.652, 0.201,

        1.0, 0.241,
        0.652, 0.201,
        1.0, 0.191,
        0.652, 0.148,

        1.0, 0.191,
        0.597, 0.137,
        1.0, 0.0,
        0.655, 0.0,

        0.759, 1.0,
        0.561, 1.0,
        0.652, 0.201,
        0.589, 0.192,

        0.561, 1.0,
        0.268, 0.95,
        0.589, 0.192,
        0.395, 0.153,

        0.589, 0.192,
        0.395, 0.153,
        0.597, 0.137,
        0.402, 0.105,

        0.597, 0.137,
        0.402, 0.105,
        0.657, 0.0,
        0.419, 0.0,

        0.054, 1.0,
        0.0, 1.0,
        0.054, 0.086,
        0.0, 0.078,

        1.0, 1.0,
        0.419, 1.0,
        1.0, 0.078,
        0.576, 0.011,

        //Chão Armazem
        0.707, 0.690,
        0.557, 0.690,
        0.707, 0.427,
        0.557, 0.427,

        0.0, 0.424,
        0.0, 0.0,
        0.450, 0.424,
        0.450, 0.0,

        1.0, 0.424,
        0.528, 0.424,
        1.0, 0.0,
        0.528, 0.0,

        0.45, 1.0,
        0.45, 0.0,
        0.0, 1.0,
        0.0, 0.0,

        1.0, 1.0,
        1.0, 0.0,
        0.528, 1.0,
        0.528, 0.0,

        0.45, 1.0,
        0.45, 0.192,
        0.0, 1.0,
        0.0, 0.192,

        1.0, 1.0,
        1.0, 0.192,
        0.528, 1.0,
        0.528, 0.192,

        0.534, 0.373,
        0.384, 0.373,
        0.534, 0.109,
        0.384, 0.109,

        //Parede Interna Armazem
        0.535, 0.666,
        0.385, 0.691,
        0.535, 0.373,
        0.385, 0.373,

        0.429, 1.0,
        0.429, 0.477,
        0.111, 1.0,
        0.111, 0.477,

        0.431, 1.0,
        0.431, 0.0,
        0.111, 1.0,
        0.111, 0.0,

        0.431, 0.182,
        0.431, 0.0,
        0.111, 0.182,
        0.111, 0.0,

        0.556, 0.109,
        0.706, 0.133,
        0.556, 0.427,
        0.706, 0.427,

        //Parede Externa Esquerda Armazem
        1.0, 0.0,
        1.0, 0.134,
        0.933, 0.0,
        0.957, 0.143,

        0.247, 0.0,
        0.247, 0.093,
        0.0, 0.0,
        0.0, 0.134,

        1.0, 0.051,
        1.0, 1.0,
        0.779, 0.086,
        0.933, 1.0,

        0.247, 0.011,
        0.247, 1.0,
        0.0, 0.051,
        0.0, 1.0,

        //Parede Externa Traseira Armazem
        0.945, 0.0,
        0.945, 0.424,
        0.472, 0.0,
        0.472, 0.424,

        0.945, 0.0,
        0.945, 1.0,
        0.472, 0.0,
        0.472, 1.0,

        0.945, 0.192,
        0.945, 1.0,
        0.472, 0.192,
        0.472, 1.0,

        //Parede Externa Direita Armazem
        1.0, 0.076,
        1.0, 1.0,
        0.764, 0.035,
        0.601, 1.0,

        0.054, 0.085,
        0.054, 1.0,
        0.0, 0.076,
        0.0, 1.0,

        1.0, 0.0,
        1.0, 0.159,
        0.601, 0.0,
        0.586, 0.092,

        0.054, 0.0,
        0.054, 0.168,
        0.0, 0.0,
        0.0, 0.159,

        //Furos Intertabernae
        0.343, 0.171,
        0.343, 0.221,
        0.219, 0.171,
        0.219, 0.221,

        0.343, 0.283,
        0.343, 0.333,
        0.219, 0.283,
        0.219, 0.333,

        0.343, 0.109,
        0.343, 0.171,
        0.219, 0.109,
        0.219, 0.171,

        0.343, 0.221,
        0.343, 0.283,
        0.219, 0.221,
        0.219, 0.283,

        0.343, 0.171,
        0.343, 0.221,
        0.219, 0.171,
        0.219, 0.221,

        0.343, 0.283,
        0.343, 0.333,
        0.219, 0.283,
        0.219, 0.333,

        0.343, 0.109,
        0.343, 0.171,
        0.219, 0.109,
        0.219, 0.171,

        0.343, 0.221,
        0.343, 0.283,
        0.219, 0.221,
        0.219, 0.283,

        0.343, 0.171,
        0.343, 0.221,
        0.219, 0.171,
        0.219, 0.221,

        0.343, 0.283,
        0.343, 0.333,
        0.219, 0.283,
        0.219, 0.333,

        0.343, 0.109,
        0.343, 0.171,
        0.219, 0.109,
        0.219, 0.171,

        0.343, 0.221,
        0.343, 0.283,
        0.219, 0.221,
        0.219, 0.283,

        //Portas
        0.833, 0.823,
        0.833, 0.350,
        0.920, 0.823,
        0.920, 0.350,

        0.808, 0.574,
        0.808, 0.350,
        0.833, 0.574,
        0.833, 0.350,

        0.771, 0.823,
        0.771, 0.350,
        0.808, 0.823,
        0.808, 0.350,
        
        0.833, 0.823,
        0.833, 0.350,
        0.920, 0.823,
        0.920, 0.350,

        0.808, 0.574,
        0.808, 0.350,
        0.833, 0.574,
        0.833, 0.350,

        0.771, 0.823,
        0.771, 0.350,
        0.808, 0.823,
        0.808, 0.350,

        0.238, 0.371,
        0.238, 0.121,
        0.251, 0.371,
        0.251, 0.121,

        0.251, 0.109,
        0.276, 0.109,
        0.251, 0.121,
        0.276, 0.121,

        0.288, 0.121,
        0.288, 0.371,
        0.276, 0.121,
        0.276, 0.371,

        0.276, 0.383,
        0.251, 0.383,
        0.276, 0.371,
        0.251, 0.371,

        0.251, 0.371,
        0.251, 0.121,
        0.276, 0.371,
        0.276, 0.121,

        0.238, 0.371,
        0.238, 0.121,
        0.251, 0.371,
        0.251, 0.121,

        0.251, 0.109,
        0.276, 0.109,
        0.251, 0.121,
        0.276, 0.121,

        0.288, 0.121,
        0.288, 0.371,
        0.276, 0.121,
        0.276, 0.371,

        0.276, 0.383,
        0.251, 0.383,
        0.276, 0.371,
        0.251, 0.371,

        0.251, 0.371,
        0.251, 0.121,
        0.276, 0.371,
        0.276, 0.121,

        0.363, 0.782,
        0.213, 0.782,
        0.363, 0.383,
        0.213, 0.383,

        0.363, 0.782,
        0.213, 0.782,
        0.363, 0.383,
        0.213, 0.383,

        0.363, 0.782,
        0.213, 0.782,
        0.363, 0.383,
        0.213, 0.383,

        0.363, 0.782,
        0.213, 0.782,
        0.363, 0.383,
        0.213, 0.383,

        0.833, 0.823,
        0.833, 0.350,
        0.920, 0.823,
        0.920, 0.350,

        0.808, 0.574,
        0.808, 0.350,
        0.833, 0.574,
        0.833, 0.350,

        0.771, 0.823,
        0.771, 0.350,
        0.808, 0.823,
        0.808, 0.350,
        
        0.833, 0.823,
        0.833, 0.350,
        0.920, 0.823,
        0.920, 0.350,

        0.808, 0.574,
        0.808, 0.350,
        0.833, 0.574,
        0.833, 0.350,

        0.771, 0.823,
        0.771, 0.350,
        0.808, 0.823,
        0.808, 0.350,
        
        0.238, 0.371,
        0.238, 0.121,
        0.251, 0.371,
        0.251, 0.121,

        0.251, 0.109,
        0.276, 0.109,
        0.251, 0.121,
        0.276, 0.121,

        0.288, 0.121,
        0.288, 0.371,
        0.276, 0.121,
        0.276, 0.371,

        0.276, 0.383,
        0.251, 0.383,
        0.276, 0.371,
        0.251, 0.371,

        0.251, 0.371,
        0.251, 0.121,
        0.276, 0.371,
        0.276, 0.121,

        0.238, 0.371,
        0.238, 0.121,
        0.251, 0.371,
        0.251, 0.121,

        0.251, 0.109,
        0.276, 0.109,
        0.251, 0.121,
        0.276, 0.121,

        0.288, 0.121,
        0.288, 0.371,
        0.276, 0.121,
        0.276, 0.371,

        0.276, 0.383,
        0.251, 0.383,
        0.276, 0.371,
        0.251, 0.371,

        0.251, 0.371,
        0.251, 0.121,
        0.276, 0.371,
        0.276, 0.121,

        //Exterior Frente
        0.574, 0.103,
        0.574, 0.542,
        0.075, 0.103,
        0.075, 0.542,

        0.125, 0.0,
        0.125, 0.103,
        0.075, 0.0,
        0.075, 0.103,

        0.574, 0.0,
        0.574, 0.103,
        0.524, 0.0,
        0.524, 0.103,


        0.125, 1.0,
        0.125, 0.629,
        0.075, 1.0,
        0.075, 0.629,

        0.574, 1.0,
        0.574, 0.629,
        0.524, 1.0,
        0.524, 0.629,

        0.574, 0.629,
        0.574, 0.0,
        0.075, 0.629,
        0.075, 0.0,


        0.574, 0.926,
        0.574, 1.0,
        0.075, 0.926,
        0.075, 1.0,

        0.125, 0.451,
        0.125, 0.926,
        0.075, 0.451,
        0.075, 0.926,

        0.574, 0.451,
        0.574, 0.926,
        0.524, 0.451,
        0.524, 0.926,

        0.574, 0.011,
        0.574, 0.451,
        0.075, 0.011,
        0.075, 0.451,

        //Parede Externa Traseira
        1.0, 0.989,
        0.694, 0.989,
        1.0, 0.491,
        0.694, 0.491,

        1.0, 0.989,
        0.0, 0.989,
        1.0, 0.491,
        0.0, 0.491,

        1.0, 0.989,
        0.0, 0.989,
        1.0, 0.491,
        0.0, 0.491,

        0.225, 0.989,
        0.0, 0.989,
        0.225, 0.491,
        0.0, 0.491,

        //Parede Externa Esquerda
        0.562, 0.093,
        0.562, 0.547,
        0.070, 0.011,
        0.0, 0.430,

        0.562, 0.547,
        0.562, 1.0,
        0.0, 0.430,
        0.0, 1.0,


        1.0, 0.430,
        1.0, 0.0,
        0.904, 0.0,


        0.562, 0.0,
        0.562, 1.0,
        0.222, 0.0,
        0.052, 1.0,

        0.222, 0.0,
        0.052, 1.0,
        0.0, 0.0,
        0.0, 0.990,
        

        1.0, 0.0,
        0.991, 0.988,
        0.904, 0.0,
        0.745, 0.946,

        0.991, 0.988,
        0.989, 1.0,
        0.745, 0.946,
        0.736, 1.0,
        

        0.989, 0.0,
        0.985, 0.025,
        0.736, 0.0,
        0.694, 0.248,

        1.0, 0.028,
        1.0, 0.3,
        0.985, 0.025,
        0.694, 0.248,
        

        0.562, 0.0,
        0.562, 0.179,
        0.052, 0.0,
        0.046, 0.036,

        0.562, 0.179,
        0.562, 0.435,
        0.0, 0.028,
        0.0, 0.3,

        0.562, 0.435,
        0.562, 1.0,
        0.248, 0.341,
        0.137, 1.0,
        

        0.562, 0.0,
        0.562, 0.478,
        0.137, 0.0,
        0.070, 0.399,
    ];
    let uvs = new Float32Array(quad_uvs);
    geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2 ) );
    
    geometry.computeVertexNormals();
    //0 - 1001
    let mat1 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1001.png")});
    //mat1.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat1.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //1 - 1002
    let mat2 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1002.png")});
    //mat2.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat2.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //2 - 1003
    let mat3 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1003.png")});
    //mat3.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat3.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //3 - 1004
    let mat4 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1004.png")});
    //mat4.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat4.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //4 - 1005
    let mat5 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1005.png")});
    //mat5.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat5.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //5 - 1006
    let mat6 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1006.png")});
    //mat6.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat6.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //6 - 1011
    let mat7 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1011.png")});
    //mat7.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat7.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //7 - 1012
    let mat8 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1012.png")});
    //mat8.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat8.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //8 - 1013
    let mat9 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1013.png")});
    //mat9.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat9.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //9 - 1014
    let mat10 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1014.png")});
    //mat10.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat10.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //10 - 1015
    let mat11 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1015.png")});
    //mat11.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat11.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //11 - 1016
    let mat12 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1016.png")});
    //mat12.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat12.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //12 - 1021
    let mat13 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1021.png")});
    //mat13.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat13.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //13 - 1022
    let mat14 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1022.png")});
    //mat14.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat14.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //14 - 1023
    let mat15 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1023.png")});
    //mat15.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat15.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //15 - 1024
    let mat16 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1024.png")});
    //mat16.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat16.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //16 - 1025
    let mat17 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1025.png")});
    //mat17.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat17.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //17 - 1026
    let mat18 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1026.png")});
    //mat18.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat18.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //18 - 1031
    let mat19 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1031.png")});
    //mat19.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat19.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //19 - 1032
    let mat20 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1032.png")});
    //mat20.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat20.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //20 - 1033
    let mat21 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1033.png")});
    //mat21.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat21.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //21 - 1034
    let mat22 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1034.png")});
    //mat22.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat22.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //22 - 1035
    let mat23 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1035.png")});
    //mat23.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat23.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //23 - 1036
    let mat24 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1036.png")});
    //mat24.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat24.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //24 - 1041
    let mat25 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1041.png")});
    //mat25.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat25.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //25 - 1042
    let mat26 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1042.png")});
    //mat26.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat26.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //26 - 1043
    let mat27 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1043.png")});
    //mat27.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat27.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //27 - 1044
    let mat28 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1044.png")});
    //mat28.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat28.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //28 - 1045
    let mat29 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1045.png")});
    //mat29.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat29.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //29 - 1046
    let mat30 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1046.png")});
    //mat30.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat30.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //30 - 1051
    let mat31 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1051.png")});
    //mat31.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat31.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //31 - 1052
    let mat32 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1052.png")});
    //mat32.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat32.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //32 - 1053
    let mat33 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1053.png")});
    //mat33.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat33.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //33 - 1054
    let mat34 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1054.png")});
    //mat34.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat34.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //34 - 1055
    let mat35 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1055.png")});
    //mat35.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat35.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");
    //35- 1056
    let mat36 = new THREE.MeshPhongMaterial({map: new THREE.TextureLoader().load("../images/Tabernae/ColorMapTabernae.1056.png")});
    //mat36.normalMap = new THREE.TextureLoader().load("../images/Biombo/normalMapBiombo.1001.png");
    //mat36.bumpMap = new THREE.TextureLoader().load("../images/Biombo/roughnessMapBiombo.1001.png");

    var materials = [
        mat1,
        mat2,
        mat3,
        mat4,
        mat5,
        mat6,
        mat7,
        mat8,
        mat9,
        mat10,
        mat11,
        mat12,
        mat13,
        mat14,
        mat15,
        mat16,
        mat17,
        mat18,
        mat19,
        mat20,
        mat21,
        mat22,
        mat23,
        mat24,
        mat25,
        mat26,
        mat27,
        mat28,
        mat29,
        mat30,
        mat31,
        mat32,
        mat33,
        mat34,
        mat35,
        mat36
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

function loadGlbScene(modelo, x, y, z, rotationY) {
    var rotY = rotationY * (Math.PI / 180);

    console.log("A carregar '" + modelo + "' nas coordenadas (" + x + "," + y + "," + z + ").")
    var carregador = new GLTFLoader()
    carregador.load(
        modelo,
        function (gltf) {
            gltf.scene.position.set(x, y, z)
            gltf.scene.rotateY(rotY);
            scene.add(gltf.scene)
            gltf.scene.children.forEach(function (child) {
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
    hotspot.width = 800;
    hotspot.height = 300;
    g.font = '20px Arial';

    g.fillStyle = 'white';
    g.fillText(text, 0, 100);
    g.strokeStyle = 'white';
    g.strokeText(text, 0, 100);

    var texture = new THREE.Texture(hotspot);
    texture.needsUpdate = true;

    var geometry = new THREE.PlaneGeometry(1, 1);
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
    var raycasterHotspot = new THREE.Raycaster();
    raycasterHotspot.setFromCamera(new Vector2(0, 0), camera);

    const hotspotIntersection = raycasterHotspot.intersectObjects(objectsHotspot);
    if (hotspotIntersection.length > 0) {
        if (hotspotIntersection[0].distance <= 10) {
            intersetado = hotSpotMap.get(hotspotIntersection[0].object);
            if(!intersetado.visible) {
                intersetado.visible = true;
                hotspotIntersection[0].object.visible = false;

            } else {
                intersetado.visible = false;
                hotspotIntersection[0].object.visible = true;
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

function lucernaFollow(nebula) {
    let pos = controls.getObject().position;
    let quat = controls.getObject().quaternion;

    if (effectController.showLucerna) {
        lucerna.visible = true;

        var movement = new Vector3(0.1, -0.08, -0.15).applyQuaternion(quat);
        lucerna.quaternion.copy(quat);
        lucerna.position.copy(pos).add(movement);

        movement = new Vector3(0.09, -0.06, -0.2).applyQuaternion(quat);
        nebula.emitters.forEach(function(emitter) {
            emitter.position.copy(pos).add(movement);
            emitter.rotation.set(0, 0, 0)
        }); 
    } else {
        lucerna.visible = false;
        nebula.emitters.forEach(function(emitter) {
            emitter.position.set(6000, 0, 0);
        }); 
    }
    fireLight.position.set(pos.x, pos.y, pos.z);
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

    fireLight.intensity = (Math.random()*0.2)+0.7

    if(effectController.autoUpdate){
        updateHours()
        skyUpdate()
    }

    if (controls.getObject().position.y < -80) {
        controls.getObject().position.setY(20);
    }

    lucernaFollow(nebula);

    prevTime = time;

    renderer.render(scene, camera);
}