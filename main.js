import Nebula, { SpriteRenderer } from 'three-nebula'
import json from './fire.json'
import modelos from './Modelos_glb/modelos.glb'
import { Sky } from 'three/examples/jsm/objects/Sky.js';

let camera, scene, renderer, controls, stats, fireLight;

const objects = [];

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

let hour = 12;
let sky, sun;

const cameraFloorDistance = 1.3;
const cameraColisionDistance = 0.2;
const cameraMass = 10;
let velocityScalar = 40;
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

    stats = new Stats()
    document.body.appendChild( stats.domElement )

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.01, 1000 );
    camera.position.y = cameraFloorDistance;
    camera.position.x = 0;
    camera.position.z = 0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x001844 );
    scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

    
    sky = new Sky();
	sky.scale.setScalar( 450000 );
	scene.add( sky );

    const hemisphereLight = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
    hemisphereLight.position.set( 0.5, 1, 0.75 );
    scene.add( hemisphereLight );

    const ambientLight = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( ambientLight );

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );  
    directionalLight.position.set( 0, (hour>4&&hour<20)?1:-1, (hour>12)?12-(hour/2):12-hour);
    directionalLight.position.multiplyScalar( 30 );
    directionalLight.castShadow = true;
    scene.add( directionalLight );
    directionalLight.shadow.mapSize.width = 2048;
	directionalLight.shadow.mapSize.height = 2048;
    directionalLight.intensity = (hour>4&&hour<20)?1:0;
    const d = 50;
    directionalLight.shadow.camera.left = - d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = - d;
    directionalLight.shadow.camera.far = 3500;
    directionalLight.shadow.bias = - 0.0001;

    const dirLightHelper = new THREE.DirectionalLightHelper( directionalLight, 10 );
    scene.add( dirLightHelper );


    
    const directionalLightMoon = new THREE.DirectionalLight( 0x506886, 1 );  
    directionalLightMoon.position.set( 0, (hour>4&&hour<20)?-1:1, (hour>12)?12-hour:12-(hour/2));
    directionalLightMoon.position.multiplyScalar( 30 );
    directionalLightMoon.castShadow = true;
    scene.add( directionalLightMoon );
    directionalLightMoon.shadow.mapSize.width = 2048;
	directionalLightMoon.shadow.mapSize.height = 2048;
    directionalLightMoon.intensity = (hour>4&&hour<20)?0:1;
    directionalLightMoon.shadow.camera.left = - d;
    directionalLightMoon.shadow.camera.right = d;
    directionalLightMoon.shadow.camera.top = d;
    directionalLightMoon.shadow.camera.bottom = - d;
    directionalLightMoon.shadow.camera.far = 3500;
    directionalLightMoon.shadow.bias = - 0.0001;

    const dirLightHelperMoon = new THREE.DirectionalLightHelper( directionalLightMoon, 10 );
    scene.add( dirLightHelperMoon );

    fireLight = new THREE.PointLight( 0xFFB900, 1, 100 );
    scene.add( fireLight );

    controls = new THREE.PointerLockControls( camera, document.body );

    const blocker = document.getElementById( 'blocker' );
    const instructions = document.getElementById( 'instructions' );

    instructions.addEventListener( 'click', function () {
        controls.lock();
    } );

    controls.addEventListener( 'lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    } );

    controls.addEventListener( 'unlock', function () {

        blocker.style.display = 'block';
        instructions.style.display = '';

    } );

    scene.add( controls.getObject() );

    const onKeyDown = function ( event ) {

        switch ( event.code ) {

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
                if ( canJump === true ) velocity.y += velocityScalar/2;
                canJump = false;
                break;

        }
        if(event.shiftKey) velocityScalar = 80;

    };

    const onKeyUp = function ( event ) {

        switch ( event.code ) {

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
        if(!event.shiftKey) velocityScalar = 40;

    };

    document.addEventListener( 'keydown', onKeyDown );
    document.addEventListener( 'keyup', onKeyUp );

    var carregador = new THREE.GLTFLoader()
    carregador.load(
        modelos,
        function ( gltf ) {
       scene.add( gltf.scene )
       gltf.scene.children.forEach( function(child) { 
           child.castShadow = true;
           child.receiveShadow = true;
           objects.push(child)
        })
        }
    )

    renderer = new THREE.WebGLRenderer( { antialias: true , powerPreference: "high-performance"} );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;

    document.body.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize );
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function cameraColision( raycaster, axis){
    // verifica as interseções com os objetos
    raycaster.ray.origin.copy( controls.getObject().position );

    const intersections = raycaster.intersectObjects( objects, true );

    if( intersections.length > 0 ){

        velocity[axis] = 0;
        return intersections;

    }else{

        return false;

    }
}

function animate(nebula, app) {

    requestAnimationFrame(() => animate(nebula, app))
    nebula.update();

    const time = performance.now();

    if ( controls.isLocked === true ) {

        const delta = ( time - prevTime ) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        velocity.y -= 9.8 * cameraMass * delta;

        direction.z = Number( moveForward ) - Number( moveBackward );
        direction.x = Number( moveRight ) - Number( moveLeft );
        direction.normalize(); // this ensures consistent movements in all directions

        if ( moveForward || moveBackward ) velocity.z -= direction.z * velocityScalar * delta;
        if ( moveLeft || moveRight ) velocity.x -= direction.x * velocityScalar * delta;


        const cameraDirection = new THREE.Vector3();
		controls.getDirection(cameraDirection)

        const distanceX = - velocity.x * delta;
        const distanceY = - velocity.z * delta;

        /*A direção mais próxima da colisão é a que deve ser verificada primeiro no raycaster
            Se estiver a andar para a frente ou tras deve ser primeiro o z, se tiver a andar para os lado deve ser primeiro o x
            No caso de ser diagonal, deve ser o que tiver mais próximo (não temos como detetar)
        
            A verificação de um espaço apertado no eixo do z ( quando a distancia para cima e para baixo que nós queremos é uperior ao espaço que existe até à colisão ) também tem de ser verificado nos outros eixos
            */
        const raycasterForward = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( cameraDirection.x, 0, cameraDirection.z ), 0, distanceY + cameraColisionDistance );
        const intersectionsForward = cameraColision( raycasterForward, 'z' )
        if( intersectionsForward) {
            controls.moveForward(intersectionsForward[0].distance - cameraColisionDistance);
        }

        const raycasterBackward = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( -cameraDirection.x, 0, -cameraDirection.z ), 0, - distanceY + cameraColisionDistance );
        const intersectionsBackward  = cameraColision( raycasterBackward, 'z' );
        if( intersectionsBackward) {
            controls.moveForward(-intersectionsBackward[0].distance + cameraColisionDistance);
        }

        if(!intersectionsForward && !intersectionsBackward){
            controls.moveForward(distanceY);
        }

        const raycasterLeft = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( cameraDirection.z, 0, -cameraDirection.x ), 0, - distanceX + cameraColisionDistance );
        const intersectionsLeft = cameraColision( raycasterLeft, 'x' )
        if( intersectionsLeft) {
            controls.moveRight(-intersectionsLeft[0].distance + cameraColisionDistance);
        }

        const raycasterRight = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( -cameraDirection.z, 0, cameraDirection.x ), 0, distanceX + cameraColisionDistance );
        const intersectionsRight = cameraColision( raycasterRight, 'x' )
        if( intersectionsRight) {
            controls.moveRight(intersectionsRight[0].distance - cameraColisionDistance);
        }

        if(!intersectionsRight && ! intersectionsLeft){
            controls.moveRight(distanceX);
        }
          
        if( velocity.y < 0 ){
            const raycasterDown = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, ( - velocity.y * delta ) + cameraFloorDistance);
            const intersectionsDown = cameraColision( raycasterDown, 'y');
            if(intersectionsDown){
                const raycasterUP2 = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, 1, 0 ), 0, cameraColisionDistance + cameraFloorDistance - intersectionsDown[0].distance);
                if(cameraColision(raycasterUP2, 'y')){
                    controls.moveRight(- distanceX);
                    controls.moveForward(- distanceY);
                }else{
                    if(intersectionsDown[0].distance > cameraFloorDistance - 0.4){
                    controls.getObject().position.y = intersectionsDown[0].point.y + cameraFloorDistance;
                    velocity.y = 0;
                    canJump = true;
                    }else{
                        controls.moveRight(- distanceX);
                        controls.moveForward(- distanceY);
                    }
                }
            }
        }else if ( velocity.y > 0 ){
            const raycasterUp = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, 1, 0 ), 0, ( velocity.y * delta ) + cameraColisionDistance);
            if (cameraColision( raycasterUp, 'y' )){
                velocity.y = 0;
            }
        } 
        
        controls.getObject().position.y += ( velocity.y * delta ); // new behavior
    }

    prevTime = time;

    nebula.update();

    stats.update();

    renderer.render( scene, camera );

}