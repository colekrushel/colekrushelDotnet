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
    const geometry = new THREE.ConeGeometry(1, 2, 4); 
    const material = new THREE.MeshStandardMaterial({ color: 0x00cc00, roughness: 0.4 });
    pyramid = new THREE.Mesh(geometry, material);
    scene.add(pyramid);

    // Add a light so MeshStandardMaterial is visible
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    camera.position.z = 5;

    animate();

}

// render loop
function animate() {
    requestAnimationFrame(animate);
    pyramid.rotation.y += 0.01;
    renderer.render(scene, camera);
}

