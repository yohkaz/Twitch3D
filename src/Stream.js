import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { SceneUtils } from 'three/examples/jsm/utils/SceneUtils.js';

export { Stream, GridMode, AlignedMode };

// Twitch access token
const access_token = 'eixd0u5vf0qrc9jji71pcuaolvza0b';

const GridMode = 0;
const AlignedMode = 1;
let displayMode = AlignedMode;

class Stream {
    constructor(channelName) {
        this.channelName = channelName;
        this.initialized = false;
        this.state = 'online';
    }

    async init() {
        const res = await this._retrieveChannelData();
        if (!res) {
            return false;
        }

        this._createDomObject();
        this._createInvisiblePlane();
        this._createReflectionImagePlane();
        await this._createTextObject();
        this._createStateObject();
        this.initialized = true;
        return res;
    }

    _createDomObject() {
        const containerId = 'container-' + this.channelName;
        const div = document.createElement('div');
        div.id = containerId;

        const options = {
            width: '100%',
            height: '100%',

            channel: this.channelName,
            layout: 'video',
        };
        const player = new Twitch.Embed(div, options);
        player.addEventListener(Twitch.Player.OFFLINE, (d) => { this.setState('offline'); });
        player.addEventListener(Twitch.Player.ENDED, (d) => { this.setState('offline'); });
        player.addEventListener(Twitch.Player.ONLINE, (d) => { this.setState('online'); });
        player.addEventListener(Twitch.Player.PLAY, (d) => { this.removeBlur(); });
        player.addEventListener(Twitch.Player.PAUSE, (d) => { });
        this.domObject = new CSS3DObject(div);
        this.domObject.name = this.channelName + '-domObject';
    }

    _createInvisiblePlane() {
        var material = new THREE.MeshStandardMaterial({
            color: 0x000000,
            opacity: 0.1,
            //transparent: true,
            //color: new THREE.Color('black'),
            //blending: THREE.NoBlending,
            //side: THREE.DoubleSide,
            //emissive: 0xFFFFFF,
            //emissiveIntensity: 0.2,

        });
        var geometry = new THREE.PlaneGeometry();
        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.copy(this.domObject.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.invisiblePlane = mesh;
        this.invisiblePlane.name = this.channelName + '-invisiblePlane';
    }

    _createReflectionImagePlane() {
        const texture = new THREE.TextureLoader().load(this.channelData['profile_image_url']);
        const correction = (9 / 16);
        texture.repeat.set(1, correction);
        texture.offset.set(0, correction / 2);

        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            //color: 0xFFFFFF,
            //opacity: 1.0,
            //emissive: 0x3e85f7,
            //emissive: 0xffffff,
            //emissiveIntensity: 0.01,
            //map: textureLoader.load(this.channelData['offline_image_url']),
            //transparent: true,
            //opacity: 1.0,
            map: texture,
        });
        var geometry = new THREE.PlaneGeometry();
        var mesh = new THREE.Mesh(geometry, material);
        this.reflectionImagePlane = mesh;
        this.reflectionImagePlane.name = this.channelName + '-reflectionImagePlane';
    }

    async _createTextObject() {
        const loader = new THREE.FontLoader();
        const font = await loader.loadAsync('../node_modules/three/examples/fonts/helvetiker_regular.typeface.json');

        //const color = 0x006699;
        //const color = 0xffc8a1;
        const color = 0x5e4032;

        const matLite = new THREE.MeshStandardMaterial({
            color: 0x000000,
            //transparent: true,
            //opacity: 0.5,
            //emissive: 0xffdddd,
            emissive: 0xffdddd,
            emissiveIntensity: 0.30, // Offline
        });

        const message = this.channelData['display_name'];
        const shapes = font.generateShapes(message, 1);
        const geometry = new THREE.ShapeBufferGeometry(shapes);
        geometry.computeBoundingBox();
        const xMid = - 0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        geometry.translate(xMid, 0, 0);
        geometry.translate(0, 0, -10);
        this.textObject = new THREE.Mesh(geometry, matLite);
        this.textObject.name = this.channelName + '-textObject';
    }

    _createStateObject() {
        //const color = 0xff0000;
        const color = 0xb5654a;
        const intensity = 10.0; // Offline
        this.stateLight = new THREE.PointLight(color, intensity, 600);
        this.stateLight.name = this.channelName + '-stateLight';
        this.stateLightHelper = new THREE.PointLightHelper(this.stateLight);

        const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
        geometry.translate(0, 0, -0.5);
        const material = new THREE.MeshStandardMaterial({
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.9,
            //side: THREE.DoubleSide,

            color: 0x030303,
            //color: 0xffffff,
            //emissive: 0xff0000,
            //emissiveIntensity: 0.1,
        });

        const material2 = new THREE.MeshStandardMaterial({
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0.7,

            color: 0x030303,
            //emissive: 0xff0000,
            emissive: 0xb5654a,
            emissiveIntensity: 0.1, // Offline
            //emissiveIntensity: 0.8, // Online
        });
        //material.color.multiplyScalar(intensity);
        //this.stateBox = new THREE.Mesh(geometry, material);
        this.stateBox = new SceneUtils.createMultiMaterialObject(geometry, [material, material2]);
        this.stateBox.name = this.channelName + '-stateBox';
        //this.stateBox.castShadow = true;
    }

    async _retrieveChannelData() {
        const headers = new Headers();
        headers.append('Authorization', 'Bearer ' + access_token);
        headers.append('Client-Id', 'zc97nf39i650oyyz2prcdv7eonszix');
        const url = 'https://api.twitch.tv/helix/users?login=' + this.channelName;
        const response = await fetch(url, { method: 'GET', mode: 'cors', headers: headers });
        const json = await response.json();
        if (json.data.length == 0) {
            return false;
        }

        this.channelData = json.data[0];
        return true;
    }

    getObjects() {
        //return [this.domObject, this.invisiblePlane, this.reflectionImagePlane, this.textObject];
        return [this.domObject, this.invisiblePlane, this.reflectionImagePlane, this.textObject, this.stateBox, this.stateLight];
        //return [this.domObject, this.invisiblePlane, this.reflectionImagePlane, this.textObject, this.stateBox, this.stateLight, this.stateLightHelper];
    }

    update(index, focusIndex, streamByLine = -1) {
        if (this.initialized == false) {
            return;
        }

        this.updateResolution(streamByLine);
        this.updatePosition(index, focusIndex, streamByLine);
    }

    updateResolution(streamByLine) {
        var divider = 1;
        if (displayMode == GridMode) {
            divider = streamByLine;
        }

        // Update Dom Object resolution
        const diff = (window.innerWidth / window.innerHeight) - (16 / 9);
        if (diff > 0) {
            const desiredWidth = ((window.innerHeight * 16) / (9));
            this.domObject.element.style.width = (((desiredWidth * 100) / window.innerWidth) / divider).toString() + '%';
            this.domObject.element.style.height = (100 / divider).toString() + '%';
        } else {
            const desiredHeight = ((window.innerWidth * 9) / (16));
            this.domObject.element.style.height = (((desiredHeight * 100) / window.innerHeight) / divider).toString() + '%';
            this.domObject.element.style.width = (100 / divider).toString() + '%';
        }

        // Update Invisible Plane resolution
        const width = window.innerWidth * parseFloat(this.domObject.element.style.width) / 100;
        const height = window.innerHeight * parseFloat(this.domObject.element.style.height) / 100;
        this.invisiblePlane.scale.x = width - 1;
        this.invisiblePlane.scale.y = height - 1;

        // Update Reflection Image Plane resolution
        this.reflectionImagePlane.scale.x = width;
        this.reflectionImagePlane.scale.y = height;
        this.updateReflectionImage(this.state);

        // Update text size
        this.textObject.scale.x = height / 20;
        this.textObject.scale.y = height / 20;
        this.textObject.geometry.computeBoundingBox();

        this.stateBox.scale.x = (this.textObject.scale.x) * (this.channelName.length);
        this.stateBox.scale.y = (this.textObject.scale.y) * (1.8);
        this.stateBox.scale.z = this.stateBox.scale.y;
        this.stateLight.distance = this.stateBox.scale.x / 2;
    }

    updatePosition(index, focusIndex, streamByLine) {
        if (displayMode == GridMode) {
            const lineIndex = index % streamByLine;
            // Shift in X axis
            const shiftX = (parseFloat(this.domObject.element.style.width) * window.innerWidth) / (100);
            const mostLeft = - (shiftX * ((streamByLine - 1) / 2.0));
            const positionX = mostLeft + shiftX * (lineIndex);
            this.domObject.position.x = positionX;
            this.invisiblePlane.position.x = positionX;

            // Shift in Y axis
            const shiftY = (parseFloat(this.domObject.element.style.height) * window.innerHeight) / (100);
            if (index != 0) {
                const lineNumber = Math.floor(index / streamByLine);
                const positionY = - (lineNumber * shiftY);
                this.domObject.position.y = positionY;
                this.invisiblePlane.position.y = positionY;
            }
        } else if (displayMode == AlignedMode) {
            // Shift in X axis
            const shiftX = ((parseFloat(this.domObject.element.style.width) * window.innerWidth) / (100))
                + (window.innerWidth / 6);
            const actualIndex = index - focusIndex;
            const positionX = shiftX * actualIndex;
            this.domObject.position.x = positionX;
            this.invisiblePlane.position.x = positionX;
            this.invisiblePlane.position.z = -1;
            this.reflectionImagePlane.position.x = positionX;
            this.textObject.position.x = positionX;
            this.stateBox.position.x = positionX;
            this.stateLight.position.x = positionX;

            // Shift in Y axis
            const domObjectHeight = (parseFloat(this.domObject.element.style.height) * window.innerHeight) / 100;
            const shiftY = - domObjectHeight;
            const positionY = - shiftY / 2;
            this.domObject.position.y = positionY;
            this.invisiblePlane.position.y = positionY;
            this.reflectionImagePlane.position.y = positionY - (this.reflectionImagePlane.scale.y + domObjectHeight) / 2;
            this.textObject.position.y = positionY + (this.textObject.scale.y + domObjectHeight) / 2;
            this.stateBox.position.y = this.textObject.position.y + (this.stateBox.scale.y / 4);
            this.stateLight.position.y = this.stateBox.position.y;
            this.stateLight.position.z = this.stateBox.scale.z * (-0.5);
        }
    }

    updateReflectionImage(previousState) {
        if (this.state == 'offline' && previousState == 'online') {
            // Reflect the offline image
            if (!this.channelData['offline_image_url']) {
                return;
            }
            this.reflectionImagePlane.rotation.x = THREE.MathUtils.degToRad(180.);
            this.reflectionImagePlane.material.map = new THREE.TextureLoader().load(this.channelData['offline_image_url']);
            this.reflectionImagePlane.material.map.repeat.set(1, 1);
            this.reflectionImagePlane.material.map.offset.set(0, 0);
            this.reflectionImagePlane.material.needUpdate = true;
        } else if (this.state == 'online' && previousState == 'offline') {
            // Reflect the channel profile picture
            this.reflectionImagePlane.rotation.x = 0;
            this.reflectionImagePlane.material.map = new THREE.TextureLoader().load(this.channelData['profile_image_url']);
            const correction = (9 / 16);
            this.reflectionImagePlane.material.map.repeat.set(1, correction);
            this.reflectionImagePlane.material.map.offset.set(0, correction / 2);
            this.reflectionImagePlane.material.needUpdate = true;
        }
    }

    updateStateObject() {
        if (this.state == 'online') {
            this.stateLight.intensity = 35.0;
            const frontSideMaterial = this.stateBox.children[1].material;
            frontSideMaterial.emissiveIntensity = 0.8;
            this.textObject.material.emissiveIntensity = 0.90;
        } else {
            this.stateLight.intensity = 10.0;
            const frontSideMaterial = this.stateBox.children[1].material;
            frontSideMaterial.emissiveIntensity = 0.1;
            this.textObject.material.emissiveIntensity = 0.30;
        }
    }

    setState(state) {
        const previousState = this.state;
        this.state = state;
        this.updateReflectionImage(previousState);
        this.updateStateObject();
    }

    blur() {
        const containerId = 'container-' + this.channelName;
        //document.getElementById(containerId).classList.add('b-w');
        //document.getElementById(containerId).classList.add('blurred');
    }

    removeBlur() {
        const containerId = 'container-' + this.channelName;
        document.getElementById(containerId).classList.remove('b-w');
        document.getElementById(containerId).classList.remove('blurred');
    }

    static setDisplayMode(mode) {
        displayMode = mode;
    }
}
