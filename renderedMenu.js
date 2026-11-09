import * as THREE from 'three';

document.addEventListener("DOMContentLoaded", init);

//global rendering objects

var scene;
var camera;
var renderer;
var pyramid;

function init(){

    // boilerplate
    // 1. Create a scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 2. Create the pyramid using ConeGeometry (radius, height, radialSegments)
    // const geometry = new THREE.ConeGeometry(1, 2, 4); 
    // const material = new THREE.MeshStandardMaterial({ color: 0x00cc00, roughness: 0.4 });
    // pyramid = new THREE.Mesh(geometry, material);
    // scene.add(pyramid);

    //create tetrahedron
    let tetraGeometry;
    let material; 

    //create fractal vertices
    const nodes = createFractalPositions(6);
    const mesh = new THREE.InstancedMesh(tetraGeometry, material, nodes.length);
    

    // Add a light so MeshStandardMaterial is visible
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    camera.position.z = 5;

    animate();

}

function createFractalPositions(depth, size = 2){
    //base pyramid vertices
    let sideLength = 1;
    let verts = [
        new THREE.Vector3(0, 0, 1), //top vertex
        new THREE.Vector3(sideLength/2, sideLength/2, 0),
        new THREE.Vector3(-sideLength/2, sideLength/2, 0),
        new THREE.Vector3(-sideLength/2, sideLength/2, 0),
        new THREE.Vector3(sideLength/2, -sideLength/2, 0),
    ].map(v => v.multiplyScalar(size / 2));

    //each node = { origin offset, scale}
    //fractal loop; for each depth, turn each vertex into a set of 5 more (for the pyramid recursion)
    let nodes = [{ pos: new THREE.Vector3(), scale: 1}];
    for(let d = 0; d < depth; d++){
        const next = [];
        for(const n of nodes){
            for(const v of verts){
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

// render loop
function animate() {
    requestAnimationFrame(animate);
    pyramid.rotation.y += 0.01;
    renderer.render(scene, camera);
}

