import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import * as STREAM from './Stream.js'

export { addStream, removeStream, nextStream, prevStream, halfNextStream, halfPrevStream };

let scene, camera, controls, renderer, cssRenderer, composer;
let streamObjects = [];
let streamSpotLight;
let fixedWidth, fixedHeight;
let floorObject;
let backgroundObject;

const params = {
    streamByLine: 2,
    focusIndex: 0,
    halfShift: false,
    fov: 45,
};

init();
animate();

// Multi twitch viewing scene
async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(params.fov, window.innerWidth / window.innerHeight, 0.1, 6000);
    const dist = (window.outerHeight) / (2 * Math.tan(params.fov / 2));
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 2000, 0);

    // WebGLRenderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Append div
    document.getElementById('webgl').appendChild(renderer.domElement);

    // CSS3DRenderer
    cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = 0;
    // Append div
    document.getElementById('css').appendChild(cssRenderer.domElement);

    controls = new OrbitControls(camera, cssRenderer.domElement);
    window.addEventListener('resize', resizeRendererToDisplaySize, false);

    {
        // Spot light
        const spotLight = new THREE.SpotLight(0xffebc9);
        spotLight.intensity = 4.0;
        const maxRes = Math.max(window.innerHeight, window.innerWidth);
        spotLight.position.set(0, maxRes / 2, dist / 2);
        spotLight.target.position.set(0, 0, 0);
        spotLight.penumbra = 0.4;
        spotLight.angle = Math.PI / 3.8;
        streamSpotLight = spotLight;
        scene.add(streamSpotLight);
        //const helper = new THREE.SpotLightHelper(streamSpotLight);
        //scene.add(helper);
    }

    {
        // Background
        const geometry = new THREE.SphereBufferGeometry(1, 60, 60);
        const texture = new THREE.TextureLoader().load('./ressources/noisy-texture-200x200-o4-d15-c-050201-t0.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(30, 30);
        const material = new THREE.MeshStandardMaterial({
            side: THREE.BackSide,
            map: texture,
        });
        const mesh = new THREE.Mesh(geometry, material);
        backgroundObject = mesh;
        scene.add(backgroundObject);

        const spotLight = new THREE.SpotLight(0xFFFFFF);
        spotLight.intensity = 2.5;
        const posZ = -10;
        spotLight.position.set(0, 150, posZ);
        spotLight.target.position.set(0, 210, 2 * posZ);
        scene.add(spotLight.target);
        spotLight.penumbra = 0.5;
        spotLight.decay = 2.;
        spotLight.angle = Math.PI / 2;
        scene.add(spotLight);
        //const helper = new THREE.SpotLightHelper(spotLight);
        //scene.add(helper);
    }

    {
        // Floor plane

        // Load texture
        const texture = new THREE.TextureLoader().load('./ressources/noisy-texture-200x200-o4-d15-c-050201-t0.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        const baseMat = new THREE.MeshStandardMaterial({
            map: texture, roughness: 0.5, metalness: 0.3, opacity: 0.92, transparent: true,
        });

        // Create object
        const planeGeometry = new THREE.PlaneBufferGeometry();
        floorObject = new THREE.Mesh(planeGeometry, baseMat);
        floorObject.rotation.x = THREE.MathUtils.degToRad(-90.);
        scene.add(floorObject);
    }

    {
        STREAM.Stream.setDisplayMode(STREAM.AlignedMode);
    }

    update();
}

function animate() {
    controls.update();
    renderer.render(scene, camera);
    cssRenderer.render(scene, camera);

    requestAnimationFrame(animate);
};

async function addStream(channelName) {
    if (!channelName) {
        return;
    }

    for (const stream of streamObjects) {
        if (stream.channelName === channelName) {
            return;
        }
    }

    const stream = new STREAM.Stream(channelName);
    const index = streamObjects.length;
    const res = await stream.init();
    if (!res) {
        return;
    }

    streamObjects.push(stream);
    for (const obj of stream.getObjects()) {
        scene.add(obj);
    }
    stream.update(index, params.focusIndex, params.streamByLine);
    updateStreamSpotLight();
}

function update() {
    const diff = (window.innerWidth / window.innerHeight) - (16 / 9);
    if (diff > 0) {
        fixedWidth = ((window.innerHeight * 16) / (9));
        fixedHeight = window.innerHeight;
    } else {
        fixedHeight = ((window.innerWidth * 9) / (16));
        fixedWidth = window.innerWidth;
    }

    updateStreams();
    updateCamera();
    updateFloorPlane();
    updateStreamSpotLight();
    updateBackground();
}

function updateStreams() {
    for (var i = 0; i < streamObjects.length; i++) {
        streamObjects[i].update(i, params.focusIndex, params.streamByLine);
    }
}

function updateFloorPlane() {
    const maxRes = Math.max(window.innerHeight, window.innerWidth);
    floorObject.scale.set(maxRes * 5, maxRes * 6);
    floorObject.material.map.repeat.set(maxRes / 50, maxRes / 50)
    floorObject.position.set(0, 0, 0);
}

function updateBackground() {
    const maxRes = Math.max(window.innerHeight, window.innerWidth);
    backgroundObject.scale.x = window.innerWidth * 2;
    backgroundObject.scale.y = window.innerWidth * 2;
    backgroundObject.scale.z = window.innerWidth * 2;
    backgroundObject.material.map.repeat.set(maxRes / 60, maxRes / 60);
}

function updateStreamSpotLight() {
    if (streamObjects.length == 0) {
        streamSpotLight.intensity = 0.;
    } else {
        streamSpotLight.intensity = 4.0;

    }

    const dist = (window.outerHeight) / (2 * Math.tan(params.fov / 2));
    streamSpotLight.position.set(0, fixedHeight * 1.5, dist / 2);
    streamSpotLight.target.position.set(0, 0, 0);
    streamSpotLight.distance = fixedHeight * 6;
}

function updateCamera() {
    const dist = (window.outerHeight) / (2 * Math.tan(params.fov / 2));
    const target = fixedHeight / 2;
    camera.position.set(0, target, dist * 1.5);
    camera.lookAt(0, target, 0);
    controls.target.set(0, target, 0);
    camera.far = window.innerWidth * 4;
    camera.updateProjectionMatrix();
}

function resizeRendererToDisplaySize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const dist = (window.outerHeight) / (2 * Math.tan(params.fov / 2));

    cssRenderer.setSize(width, height);
    renderer.setSize(width, height);
    update();
}

function nextStream() {
    if (params.focusIndex < streamObjects.length - 1) {
        params.focusIndex += 1;
        updateStreams();
    }
}

function prevStream() {
    if (params.focusIndex > 0) {
        params.focusIndex -= 1;
        updateStreams();
    }
}

function halfNextStream() {
    if (params.focusIndex < streamObjects.length - 1) {
        params.focusIndex += 0.5;
        params.halfShift = !params.halfShift;
        updateStreams();
    }
}

function halfPrevStream() {
    if (params.focusIndex > 0) {
        params.focusIndex -= 0.5;
        params.halfShift = !params.halfShift;
        updateStreams();
    }
}

function removeStream() {
    if (streamObjects.length == 0 || params.halfShift) {
        return;
    }

    // Remove objects from scene
    for (const obj of streamObjects[params.focusIndex].getObjects()) {
        var selectedObject = scene.getObjectByName(obj.name);
        scene.remove(selectedObject);
    }

    // Remove stream from array
    streamObjects.splice(params.focusIndex, 1);
    params.focusIndex = Math.max(params.focusIndex - 1, 0);
    updateStreams();
}