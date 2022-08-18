import * as THREE from 'three'
import Nebula, { SpriteRenderer } from 'three-nebula'
import json from '../fire.json'
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { Vector2 } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { createMultiMaterialObject } from 'three/examples/jsm/utils/SceneUtils.js'

let camera, scene, renderer, controls, fireLight, particles, root, partition;

const objects = [];

//https://hofk.de/main/discourse.threejs/2018/Triangulation/Triangulation.html
////by Mapbox https://github.com/mapbox/delaunator

var EPSILON = Math.pow(2, -52);

var Delaunator = function Delaunator(coords) {
        var this$1 = this;

        var n = coords.length >> 1;
        if (n > 0 && typeof coords[0] !== 'number') { throw new Error('Expected coords to contain numbers.'); }

        this.coords = coords;

        var maxTriangles = 2 * n - 5;
        var triangles = this.triangles = new Uint32Array(maxTriangles * 3);
        var halfedges = this.halfedges = new Int32Array(maxTriangles * 3);

        this._hashSize = Math.ceil(Math.sqrt(n));
        var hullPrev = this.hullPrev = new Uint32Array(n);
        var hullNext = this.hullNext = new Uint32Array(n);
        var hullTri = this.hullTri = new Uint32Array(n);
        var hullHash = new Int32Array(this._hashSize).fill(-1);
        
        var ids = new Uint32Array(n);
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;

        for (var i = 0; i < n; i++) {
            var x = coords[2 * i];
            var y = coords[2 * i + 1];
            if (x < minX) { minX = x; }
            if (y < minY) { minY = y; }
            if (x > maxX) { maxX = x; }
            if (y > maxY) { maxY = y; }
            ids[i] = i;
        }
        var cx = (minX + maxX) / 2;
        var cy = (minY + maxY) / 2;

        var minDist = Infinity;
        var i0, i1, i2;

        for (var i$1 = 0; i$1 < n; i$1++) {
            var d = dist(cx, cy, coords[2 * i$1], coords[2 * i$1 + 1]);
            if (d < minDist) {
                i0 = i$1;
                minDist = d;
            }
        }
        var i0x = coords[2 * i0];
        var i0y = coords[2 * i0 + 1];

        minDist = Infinity;

        for (var i$2 = 0; i$2 < n; i$2++) {
            if (i$2 === i0) { continue; }
            var d$1 = dist(i0x, i0y, coords[2 * i$2], coords[2 * i$2 + 1]);
            if (d$1 < minDist && d$1 > 0) {
                i1 = i$2;
                minDist = d$1;
            }
        }
        var i1x = coords[2 * i1];
        var i1y = coords[2 * i1 + 1];

        var minRadius = Infinity;

        for (var i$3 = 0; i$3 < n; i$3++) {
            if (i$3 === i0 || i$3 === i1) { continue; }
            var r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i$3], coords[2 * i$3 + 1]);
            if (r < minRadius) {
                i2 = i$3;
                minRadius = r;
            }
        }
        var i2x = coords[2 * i2];
        var i2y = coords[2 * i2 + 1];

        if (minRadius === Infinity) {
            throw new Error('No Delaunay triangulation exists for this input.');
        }

        if (orient(i0x, i0y, i1x, i1y, i2x, i2y)) {
            var i$4 = i1;
            var x$1 = i1x;
            var y$1 = i1y;
            i1 = i2;
            i1x = i2x;
            i1y = i2y;
            i2 = i$4;
            i2x = x$1;
            i2y = y$1;
        }

        var center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
        this._cx = center.x;
        this._cy = center.y;

        var dists = new Float64Array(n);
        for (var i$5 = 0; i$5 < n; i$5++) {
            dists[i$5] = dist(coords[2 * i$5], coords[2 * i$5 + 1], center.x, center.y);
        }

        quicksort(ids, dists, 0, n - 1);

        this.hullStart = i0;
        var hullSize = 3;

        hullNext[i0] = hullPrev[i2] = i1;
        hullNext[i1] = hullPrev[i0] = i2;
        hullNext[i2] = hullPrev[i1] = i0;

        hullTri[i0] = 0;
        hullTri[i1] = 1;
        hullTri[i2] = 2;

        hullHash[this._hashKey(i0x, i0y)] = i0;
        hullHash[this._hashKey(i1x, i1y)] = i1;
        hullHash[this._hashKey(i2x, i2y)] = i2;

        this.trianglesLen = 0;
        this._addTriangle(i0, i1, i2, -1, -1, -1);

        for (var k = 0, xp = (void 0), yp = (void 0); k < ids.length; k++) {
            var i$6 = ids[k];
            var x$2 = coords[2 * i$6];
            var y$2 = coords[2 * i$6 + 1];

            if (k > 0 && Math.abs(x$2 - xp) <= EPSILON && Math.abs(y$2 - yp) <= EPSILON) { continue; }
            xp = x$2;
            yp = y$2;

            if (i$6 === i0 || i$6 === i1 || i$6 === i2) { continue; }

            var start = 0;
            for (var j = 0, key = this._hashKey(x$2, y$2); j < this._hashSize; j++) {
                start = hullHash[(key + j) % this$1._hashSize];
                if (start !== -1 && start !== hullNext[start]) { break; }
            }

            start = hullPrev[start];
            var e = start, q = (void 0);
            while (q = hullNext[e], !orient(x$2, y$2, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1])) {
                e = q;
                if (e === start) {
                    e = -1;
                    break;
                }
            }
            if (e === -1) { continue; }

            var t = this$1._addTriangle(e, i$6, hullNext[e], -1, -1, hullTri[e]);

            hullTri[i$6] = this$1._legalize(t + 2);
            hullTri[e] = t;
            hullSize++;

            var n$1 = hullNext[e];
            while (q = hullNext[n$1], orient(x$2, y$2, coords[2 * n$1], coords[2 * n$1 + 1], coords[2 * q], coords[2 * q + 1])) {
                t = this$1._addTriangle(n$1, i$6, q, hullTri[i$6], -1, hullTri[n$1]);
                hullTri[i$6] = this$1._legalize(t + 2);
                hullNext[n$1] = n$1;
                hullSize--;
                n$1 = q;
            }

            if (e === start) {
                while (q = hullPrev[e], orient(x$2, y$2, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1])) {
                    t = this$1._addTriangle(q, i$6, e, -1, hullTri[e], hullTri[q]);
                    this$1._legalize(t + 2);
                    hullTri[q] = t;
                    hullNext[e] = e;
                    hullSize--;
                    e = q;
                }
            }

            this$1.hullStart = hullPrev[i$6] = e;
            hullNext[e] = hullPrev[n$1] = i$6;
            hullNext[i$6] = n$1;

            hullHash[this$1._hashKey(x$2, y$2)] = i$6;
            hullHash[this$1._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
        }

        this.hull = new Uint32Array(hullSize);
        for (var i$7 = 0, e$1 = this.hullStart; i$7 < hullSize; i$7++) {
            this$1.hull[i$7] = e$1;
            e$1 = hullNext[e$1];
        }
        this.hullPrev = this.hullNext = this.hullTri = null;

        this.triangles = triangles.subarray(0, this.trianglesLen);
        this.halfedges = halfedges.subarray(0, this.trianglesLen);
    };

    Delaunator.from = function from (points, getX, getY) {
            if ( getX === void 0 ) getX = defaultGetX;
            if ( getY === void 0 ) getY = defaultGetY;

        var n = points.length;
        var coords = new Float64Array(n * 2);

        for (var i = 0; i < n; i++) {
            var p = points[i];
            coords[2 * i] = getX(p);
            coords[2 * i + 1] = getY(p);
        }

        return new Delaunator(coords);
    };

    Delaunator.prototype._hashKey = function _hashKey (x, y) {
        return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
    };

    Delaunator.prototype._legalize = function _legalize (a) {
            var this$1 = this;

        var ref = this;
            var triangles = ref.triangles;
            var coords = ref.coords;
            var halfedges = ref.halfedges;

        var b = halfedges[a];

        var a0 = a - a % 3;
        var b0 = b - b % 3;

        var al = a0 + (a + 1) % 3;
        var ar = a0 + (a + 2) % 3;
        var bl = b0 + (b + 2) % 3;

        if (b === -1) { return ar; }

        var p0 = triangles[ar];
        var pr = triangles[a];
        var pl = triangles[al];
        var p1 = triangles[bl];

        var illegal = inCircle(
            coords[2 * p0], coords[2 * p0 + 1],
            coords[2 * pr], coords[2 * pr + 1],
            coords[2 * pl], coords[2 * pl + 1],
            coords[2 * p1], coords[2 * p1 + 1]);

        if (illegal) {
            triangles[a] = p1;
            triangles[b] = p0;

            var hbl = halfedges[bl];

            if (hbl === -1) {
                var e = this.hullStart;
                do {
                    if (this$1.hullTri[e] === bl) {
                        this$1.hullTri[e] = a;
                        break;
                    }
                    e = this$1.hullNext[e];
                } while (e !== this.hullStart);
            }
            this._link(a, hbl);
            this._link(b, halfedges[ar]);
            this._link(ar, bl);

            var br = b0 + (b + 1) % 3;

            this._legalize(a);
            return this._legalize(br);
        }

        return ar;
    };

    Delaunator.prototype._link = function _link (a, b) {
        this.halfedges[a] = b;
        if (b !== -1) { this.halfedges[b] = a; }
    };

    Delaunator.prototype._addTriangle = function _addTriangle (i0, i1, i2, a, b, c) {
        var t = this.trianglesLen;

        this.triangles[t] = i0;
        this.triangles[t + 1] = i1;
        this.triangles[t + 2] = i2;

        this._link(t, a);
        this._link(t + 1, b);
        this._link(t + 2, c);

        this.trianglesLen += 3;

        return t;
    };

    function pseudoAngle(dx, dy) {
        var p = dx / (Math.abs(dx) + Math.abs(dy));
        return (dy > 0 ? 3 - p : 1 + p) / 4;
    }

    function dist(ax, ay, bx, by) {
        var dx = ax - bx;
        var dy = ay - by;
        return dx * dx + dy * dy;
    }

    function orient(px, py, qx, qy, rx, ry) {
        return (qy - py) * (rx - qx) - (qx - px) * (ry - qy) < 0;
    }

    function inCircle(ax, ay, bx, by, cx, cy, px, py) {
        var dx = ax - px;
        var dy = ay - py;
        var ex = bx - px;
        var ey = by - py;
        var fx = cx - px;
        var fy = cy - py;

        var ap = dx * dx + dy * dy;
        var bp = ex * ex + ey * ey;
        var cp = fx * fx + fy * fy;

        return dx * (ey * cp - bp * fy) -
               dy * (ex * cp - bp * fx) +
               ap * (ex * fy - ey * fx) < 0;
    }

    function circumradius(ax, ay, bx, by, cx, cy) {
        var dx = bx - ax;
        var dy = by - ay;
        var ex = cx - ax;
        var ey = cy - ay;

        var bl = dx * dx + dy * dy;
        var cl = ex * ex + ey * ey;
        var d = 0.5 / (dx * ey - dy * ex);

        var x = (ey * bl - dy * cl) * d;
        var y = (dx * cl - ex * bl) * d;

        return x * x + y * y;
    }

    function circumcenter(ax, ay, bx, by, cx, cy) {
        var dx = bx - ax;
        var dy = by - ay;
        var ex = cx - ax;
        var ey = cy - ay;

        var bl = dx * dx + dy * dy;
        var cl = ex * ex + ey * ey;
        var d = 0.5 / (dx * ey - dy * ex);

        var x = ax + (ey * bl - dy * cl) * d;
        var y = ay + (dx * cl - ex * bl) * d;

        return {x: x, y: y};
    }

    function quicksort(ids, dists, left, right) {
        if (right - left <= 20) {
            for (var i = left + 1; i <= right; i++) {
                var temp = ids[i];
                var tempDist = dists[temp];
                var j = i - 1;
                while (j >= left && dists[ids[j]] > tempDist) { ids[j + 1] = ids[j--]; }
                ids[j + 1] = temp;
            }
        } else {
            var median = (left + right) >> 1;
            var i$1 = left + 1;
            var j$1 = right;
            swap(ids, median, i$1);
            if (dists[ids[left]] > dists[ids[right]]) { swap(ids, left, right); }
            if (dists[ids[i$1]] > dists[ids[right]]) { swap(ids, i$1, right); }
            if (dists[ids[left]] > dists[ids[i$1]]) { swap(ids, left, i$1); }

            var temp$1 = ids[i$1];
            var tempDist$1 = dists[temp$1];
            while (true) {
                do { i$1++; } while (dists[ids[i$1]] < tempDist$1);
                do { j$1--; } while (dists[ids[j$1]] > tempDist$1);
                if (j$1 < i$1) { break; }
                swap(ids, i$1, j$1);
            }
            ids[left + 1] = ids[j$1];
            ids[j$1] = temp$1;

            if (right - i$1 + 1 >= j$1 - left) {
                quicksort(ids, dists, i$1, right);
                quicksort(ids, dists, left, j$1 - 1);
            } else {
                quicksort(ids, dists, left, j$1 - 1);
                quicksort(ids, dists, i$1, right);
            }
        }
    }

    function swap(arr, i, j) {
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    function defaultGetX(p) {
        return p[0];
    }
    function defaultGetY(p) {
        return p[1];
    }


var levels = [0x0B132B, 0x1C2541, 0x3A506B, 0x5BC0BE, 0x6FFFE9];  
var colors = [0xFFFFFF, 0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF];

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
let spheres = [];

const d = new Date();
let hour = d.getHours();
let sky, sun;

const cameraFloorDistance = 1.3;
const cameraColisionDistance = 0.2;
const cameraMass = 10;
let velocityScalar = 40;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

init();

class Node{
    
    constructor(level_, index_, centerX_, centerY_, width_, height_, resolution_){
        
        
        this.level = level_;
        this.index = index_;
        this.w = width_;
        this.h = height_;
        this.x = centerX_;
        this.y = centerY_;
        this.resolution = resolution_;
        this.lifetime = 128;
        
        this.edges = this.getEdges();
    }
    
    getEdges = function(){
        
        return [
                    new THREE.Vector3(this.x - this.w / 2, 0, this.y - this.h / 2), 
                    new THREE.Vector3(this.x + this.w / 2, 0, this.y - this.h / 2), 
                    new THREE.Vector3(this.x - this.w / 2, 0, this.y + this.h / 2), 
                    new THREE.Vector3(this.x + this.w / 2, 0, this.y + this.h / 2)
                  
               ];

    }
    
}
    
class Quadtree{
    
    constructor(root_, levels_, distance_){
        
        var this_ = this;
        this.levels = levels_;
        this.distance = distance_;
        this.root = root_;
        this.nodes = [];
        this.nodes = this.splitNode(0, this.root, false);
        this.generateLevels();
        this.last = [...this.nodes];
        this.tiles = {};
        this.debug = {};
        this.points = [];
                
    }
    
    generateLevels = function(){
        
        for(var i = 0; i < this.levels; i++){

            var tmpNodes = [];

            for(var j = 0; j < this.nodes.length; j++){

               tmpNodes.push(...this.splitNode(j, this.nodes[j], true));

            }

            this.nodes = tmpNodes;

        }
        
    }
    
    update = function(){
        
        var this_ = this;
        this.nodes = [];
        this.nodes = this.splitNode(0, this.root, false);
        this.generateLevels();
          
        this.debug = {};

        this.last = [...this.nodes];
        
    }
    
    splitNode = function(index_, parent_, check_){

     if((parent_.level < this.levels && this.sqrtDistance(parent_) < this.distance) || !check_){
   
       var lt = new Node(parent_.level + 1, { x: parent_.index.x * 2, y: parent_.index.y * 2 }, parent_.x - parent_.w / 4, parent_.y - parent_.h / 4, parent_.w / 2, parent_.h / 2, parent_.resolution / 2);
       var rt = new Node(parent_.level + 1, { x: parent_.index.x * 2, y: parent_.index.y * 2 + 1 }, parent_.x + parent_.w / 4, parent_.y - parent_.h / 4, parent_.w / 2, parent_.h / 2, parent_.resolution / 2);
       var lb = new Node(parent_.level + 1, { x: parent_.index.x * 2 + 1, y: parent_.index.y * 2 }, parent_.x - parent_.w / 4, parent_.y + parent_.h / 4, parent_.w / 2, parent_.h / 2, parent_.resolution / 2);
       var rb = new Node(parent_.level + 1, { x: parent_.index.x * 2 + 1, y: parent_.index.y * 2 + 1 }, parent_.x + parent_.w / 4, parent_.y + parent_.h / 4, parent_.w / 2, parent_.h / 2, parent_.resolution / 2);
       
       return [lt, rt, lb, rb];
     
     }
    
     return [parent_];
        
    }
    
    sqrtDistance = function(node_){
        
        var target = new Vector2(camera.position.x, camera.position.z).lerp(new THREE.Vector2(controls.x, controls.z), 1.0);
        
        var x1 = node_.x - node_.w / 2.0;
        var y1 = node_.y - node_.h / 2.0;
        var x2 = node_.x + node_.w / 2.0;
        var y2 = node_.y + node_.h / 2.0;

        var rx = (x1 + x2) / 2.0;
        var ry = (y1 + y2) / 2.0;
        var rwidth = node_.w;
        var rheight = node_.h;

        var dx = Math.max(Math.abs(target.x - rx) - rwidth / 2, 0);
        var dy = Math.max(Math.abs(target.y - ry) - rheight / 2, 0);
        return Math.sqrt(dx * dx + dy * dy);
        
    }
    
}

root = new Node(0, {x: 0, y: 0}, 0, 0, 2048, 2048, 64);
partition = new Quadtree(root, 5, 2048.0 / 16.0);

var points = [];

partition.nodes.forEach(function(node_){
    
    points.push(...node_.edges);
    
});

var geometry = new THREE.BufferGeometry().setFromPoints(points);

var indexDelaunay = Delaunator.from(points.map(v => { return [v.x, v.z]; }) );
var meshIndex = [];
for (let i = 0; i < indexDelaunay.triangles.length; i++){ meshIndex.push(indexDelaunay.triangles[i]); }

geometry.setIndex(meshIndex);
geometry.computeVertexNormals();
    
var plane = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial({ wireframe: true }));
    
scene.add(plane);


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
    initSky();
    loadGLB('../Modelos_glb/modelos.glb', 0, 0, 0, 0);
    //loadGLB('../Modelos_glb/Moinho.glb', 0, -45, 0);
    loadGLB('../Modelos_glb/Tabernae.glb', 34.64, 2.55, -13.8, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Bancada.glb', 30.3652, 2.7, -14.3674, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Escada.glb', 27.588, 2.7418, -18.129, Math.PI * (1 / 6));
    loadGLB('../Modelos_glb/Escada.glb', 34.449, 2.7418, -22.103, Math.PI * (1 / 6));
    //loadGLB('../Modelos_glb/Telhas.glb', 30.35, 4.58, -11.1, Math.PI * (1 / 6))
    //loadGLB('../Modelos_glb/untitled.glb', 0, 4, 0, Math.PI * (1 / 6))
    loadOBJ();
    //generateWalls();

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

    generateHotSpot(0, -48, 20, -Math.PI / 2, '../images/teste.png')
}

//Ceu
function initSky() {
    sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    sun = new THREE.Vector3();

    const effectController = {
        turbidity: 0.4,
        rayleigh: 0.75,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.85,
        elevation: (hour > 18) ? 315 - hour * 15 : -90 + hour * 15,
        azimuth: 180,
        hourEC: hour
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

async function loadOBJ() {
    var textureLoader = new THREE.TextureLoader();
    var map1001 = textureLoader.load("../images/1001.png");
    var map1002 = textureLoader.load("../images/1002.png");
    var map1003 = textureLoader.load("../images/1003.png");
    var map1011 = textureLoader.load("../images/1011.png");
    var map1012 = textureLoader.load("../images/1012.png");
    var map1013 = textureLoader.load("../images/1013.png");

    var material1001 = new THREE.MeshBasicMaterial({ map: map1001 });
    var material1002 = new THREE.MeshBasicMaterial({ map: map1002 });
    var material1003 = new THREE.MeshBasicMaterial({ map: map1003 });
    var material1011 = new THREE.MeshBasicMaterial({ map: map1011 });
    var material1012 = new THREE.MeshBasicMaterial({ map: map1012 });
    var material1013 = new THREE.MeshBasicMaterial({ map: map1013 });

    const materials = [material1001, material1002, material1003, material1011, material1012, material1013]

    var loader = new OBJLoader();
    loader.load("../Modelos_glb/untitled.obj", function (object) {
        object.traverse(function (node) {
            if (node.isMesh) {
                var geometry = node.geometry;
                let mesh = new createMultiMaterialObject(geometry, materials);

                mesh.position.set(20, 4, 0)

                console.log(mesh)

                scene.add(mesh)
                objects.push(mesh)
            }
        })
    });
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

        /* starsInited = true;
        for (let i = 1; i < 800; i++) {
            let geometry = new THREE.SphereGeometry(2 + Math.random() * 3, 6, 6);
            let material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(255, 205, 60)
            });
    
            let sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
            spheres.push(sphere);
            sphere.position.setFromSpherical(new THREE.Spherical(3000 + 5 * Math.random(), 2 * Math.PI * Math.random(), Math.PI * Math.random()))
        } */
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

//Mostrar
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

function animate(nebula, app) {

    partition.update(new THREE.Vector2(camera.position.x, camera.position.y));
    
    var points = [];

    partition.nodes.forEach(function(node_){

        points.push(...node_.edges);

    });


    var geometry = new THREE.BufferGeometry().setFromPoints(points);

    var indexDelaunay = Delaunator.from(points.map(v => { return [v.x, v.z]; }) );
    var meshIndex = [];
    for (let i = 0; i < indexDelaunay.triangles.length; i++){ meshIndex.push(indexDelaunay.triangles[i]); }

    geometry.setIndex(meshIndex);
    geometry.computeVertexNormals();
    
    plane.geometry = geometry;
    

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

    prevTime = time;

    renderer.render(scene, camera);
}