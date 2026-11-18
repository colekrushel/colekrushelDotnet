import * as THREE from 'three';
import fragmentShader from './shaders/highlightNearMouseFragment.glsl?raw';
import vertexShader from './shaders/highlightNearMouseVertex.glsl?raw';

document.addEventListener("DOMContentLoaded", init);

//global rendering objects

var scene, camera, renderer, fractal;

//square base pyramid definition
const H = Math.SQRT2;            // height chosen so all 8 edges have length 2
const A = new THREE.Vector3(-1, -H / 2, -1);
const B = new THREE.Vector3( 1, -H / 2, -1);
const C = new THREE.Vector3( 1, -H / 2,  1);
const D = new THREE.Vector3(-1, -H / 2,  1);
const P = new THREE.Vector3( 0,  H / 2,  0);   // apex
const PYRAMID_VERTS = [A, B, C, D, P];

//face views; used for rotating between sides of the fractal
const FACES = {
    front: [D, C, P],   // +z
    right: [C, B, P],   // +x
    back:  [B, A, P],   // -z
    left:  [A, D, P],   // -x
};

var currentFace = FACES.front;

//uniforms for shaders
const uniforms = {
    uMouse: {value: new THREE.Vector2(0.5, 0.5)},
    uResolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight)},
    uBaseColor: {value: new THREE.Color(0x4f4f4f)},
    uColorNear: {value: new THREE.Color(0x4d4dff)},
    uRadius: {value: 0.2},        //fraction of screen height
    uDepthPower: {value: 1.0},     //higher = deeper pyramids lose the highlight faster
    //set by updateDepthUniforms() whenever the camera face changes
    uFaceNormal: {value: new THREE.Vector3()},
    uFacePlane: {value: 0},
    uDepthSpan: {value: 1}
};

//shaders
const cursorHighlightMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms, //default vertex shader
    vertexShader,
    fragmentShader
});

//events
window.addEventListener('pointermove', (e) => {
    uniforms.uMouse.value.set(
        e.clientX / window.innerWidth,
        1.0 - e.clientY / window.innerHeight
    );
});

//returns {position, target, up} for a camera looking at a face
function faceView(face, margin = 1.1){
    //calc normal vector of face
    const [v0, v1, apex] = face;
    const baseMid = v0.clone().add(v1).multiplyScalar(0.5);
    const up = apex.clone().sub(baseMid);
    const height = up.length();
    up.normalize();
    const width = v0.distanceTo(v1);
    const normal = v1.clone().sub(v0).cross(apex.clone().sub(v0)).normalize();

    //camera target should be the center of the triangle's bounding box
    const target = baseMid.clone().addScaledVector(up, height / 2); 

    //FOV math (how far back to place the camera along the normal)
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(
        (height / 2) / tanHalf,
        (width / 2) / (tanHalf * camera.aspect)
    ) * margin;

    return {position: target.clone().addScaledVector(normal, dist), target, up, normal};
}

//update shader with the normal and plane of the side of the fractal facing the camera
//assuming mesh isnt rotated
function updateDepthUniforms(view){
    const plane = view.target.dot(view.normal); //target lies in face's plane
    let span = 0;
    for(const v of PYRAMID_VERTS){
        span = Math.max(span, plane - v.dot(view.normal));
    }
    uniforms.uFaceNormal.value.copy(view.normal);
    uniforms.uFacePlane.value = plane;
    uniforms.uDepthSpan.value = span;
}

//point the camera at a face; call this (not applyView) when the face or aspect changes
function setFace(face){
    currentFace = face;
    const view = faceView(face);
    applyView(view);
    updateDepthUniforms(view);
}

function applyView(view) {
    camera.up.copy(view.up);
    camera.position.copy(view.position);
    camera.lookAt(view.target);
}

function createPyramidGeometry(){
    const tris = [
        A, B, C,   A, C, D,   // base (faces down)
        D, C, P,              // +z side
        C, B, P,              // +x side
        B, A, P,              // -z side
        A, D, P,              // -x side
    ];
    const positions = new Float32Array(tris.length * 3);
    tris.forEach((v, i) => v.toArray(positions, i * 3));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals(); //non indexed = flat per face normals
    return geo;
}

//each child is parent scaled by 0.5 about one of the parent's vertices
//childPos = parentPos + vertex * parentScale * 0.5
function createFractalPositions(depth){
    //fractal loop; for each depth, turn each vertex into a set of 5 more (for the pyramid recursion)
    let nodes = [{ pos: new THREE.Vector3(), scale: 1}];
    for(let d = 0; d < depth; d++){
        const next = [];
        for(const n of nodes){
            for(const v of PYRAMID_VERTS){
                next.push({
                    pos: n.pos.clone().addScaledVector(v, n.scale * 0.5),
                    scale: n.scale * 0.5,
                });
            }
        }
        nodes = next;
    }
    return nodes;
}

function init(){

    //init scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
    setFace(currentFace);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lit material 
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,          // multiplied by per-instance colour below
        roughness: 0.6,
        metalness: 0.1,
    });

    //create fractal vertices
    const nodes = createFractalPositions(4);
    fractal = new THREE.InstancedMesh(createPyramidGeometry(), cursorHighlightMaterial, nodes.length);
    fractal.frustumCulled = false; //dont mis cull instanced meshes

    //set properties
    const m = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    //const color = new THREE.Color().setRGB(0.1, 0.1, 0.1);
    nodes.forEach((n, i) => {
        scale.setScalar(n.scale);
        m.compose(n.pos, rotation, scale);
        fractal.setMatrixAt(i, m);

        //simple vertical gradient for structure
        //const t = THREE.MathUtils.clamp(n.pos.y / H + 0.5, 0, 1);
        //color.setHSL(0.08 + t * 0.12, 0.85, 0.45 + t * 0.15);
        //fractal.setColorAt(i, color);
    });
    fractal.instanceMatrix.needsUpdate = true;
    //fractal.instanceColor.needsUpdate = true;
    scene.add(fractal);
    

    //const cameraLight = new THREE.PointLight(0xffffff, 5, 5, 1); //color, intensity, distance, decay
    //camera.add(cameraLight);
    //scene.add(new THREE.AmbientLight(0x404040, 5));

    //scene.add(camera);
    
    window.addEventListener('resize', onResize);
    animate();

}

function onResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    setFace(currentFace); //perspective is based on aspect so update
}


// render loop
function animate() {
    requestAnimationFrame(animate);
    //fractal.rotation.y += 0.003; //temp rot for test
    renderer.render(scene, camera);
}

