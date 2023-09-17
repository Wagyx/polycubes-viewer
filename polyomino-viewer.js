/*
Copyright (c) 2023 Wagyx Xygaw
Under MIT License
*/
import * as THREE from 'three';
import {
    TrackballControls
} from './js/TrackballControls.js';
import { mergeBufferGeometries } from './js/BufferGeometryUtils.js';

// MAIN

// standard global variables
let gContainer, gScene, gCamera, gRenderer, gControls, gInfoGui;
let gCurrInd = -1;
let POLYCUBES = [];
let gNumMaxCubes = 1;
let gNumMaxEdges = 1;
let gElapsedTime = 0;
const gDefaultColor = { vertex: [1.0, 0.5, 0.0], edge: [0.1, 0.1, 0.1], face: [0.99, 0.99, 0.99] };
// custom global variables
let gPolyhedronMesh, gEdgesMesh, gCubesMesh;
const gcCamZ = {
    pos: [0, 0, 20],
    up: [0, 1, 0],
    target: [0, 0, 0]
};
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const gParameters = {
    transparency: clamp(parseFloat(getURLParameter("transparency", 0.25)), 0.0, 1.0),
    edgesActive: getURLParameter("edgesActive", "true") == "true",
    facesActive: getURLParameter("facesActive", "true") == "true",
    //url: decodeURIComponent(getURLParameter("url", "")),
    backgroundColor: "#" + getURLParameter("backgroundColor", "dddddd"),
    edgeRadius: clamp(parseFloat(getURLParameter("edgeRadius", 0.02)), 0.0, 1.0),
    rotationDirection: parseStringAsVec3(getURLParameter("rotationDirection", "0,1,0")),
    rotationSpeed: parseFloat(getURLParameter("rotationSpeed", 0.0)),
    isCentered: false,
};
gParameters.rotationDirection.normalize();
const gSimpleCubeData = createSimplePlaneData();
// const gSimpleCubeEdgeMesh = createSimpleCubeEdgeGeometry(gSimpleCubeData);

const gClock = new THREE.Clock();
gClock.start();
init();
animate();

// FUNCTIONS 		
function init() {
    // SCENE
    gScene = new THREE.Scene();
    // CAMERA
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewAngle = 60;
    const near = 1;
    const far = 1000;
    gCamera = new THREE.PerspectiveCamera(viewAngle, width / height, near, far);
    gScene.add(gCamera);
    resetCamera();

    const light = new THREE.DirectionalLight(0xffffff, 0.35);
    gCamera.add(light);
    const light2 = new THREE.HemisphereLight(0xffffff, 0x000000, 0.7);
    light2.position.set(0.8, 1, 0.5);
    gScene.add(light2);

    // RENDERER
    gRenderer = new THREE.WebGLRenderer({
        antialias: true
    });
    gRenderer.setPixelRatio(window.devicePixelRatio * 2);
    gRenderer.setSize(window.innerWidth, window.innerHeight);

    gContainer = document.getElementById('ThreeJS');
    gContainer.appendChild(gRenderer.domElement);

    // CONTROLS
    gControls = new TrackballControls(gCamera, gRenderer.domElement);
    gControls.noPan = true;
    gControls.noRotate = true;
    gControls.rotateSpeed = 2.0;
    gControls.maxDistance = 50.0;
    gControls.minDistance = 5.0;

    ////////////
    // CUSTOM //
    ////////////
    gPolyhedronMesh = new THREE.Object3D();
    gScene.add(gPolyhedronMesh);

    gNumMaxCubes = 1024;
    gNumMaxEdges = 1024;
    gEdgesMesh = makeEdgesMesh(gNumMaxEdges);
    gPolyhedronMesh.add(gEdgesMesh);
    gCubesMesh = makeCubesMesh(gNumMaxCubes);
    gPolyhedronMesh.add(gCubesMesh);

    /////////
    // GUI //
    /////////
    const gui = new dat.GUI();
    const optionsFd = gui.addFolder("Options");
    // optionsFd.add(gParameters, "transparency", 0.0, 1.0, 0.01)
    //     .name("Transparency")
    //     .onChange(function (value) {
    //         gParameters.transparency = value;
    //         gCubesMesh.material.opacity = 1.0 - gParameters.transparency;
    //     });
    optionsFd.add(gParameters, "edgesActive")
        .name("Show Edges")
        .onChange(function (value) {
            gEdgesMesh.material.visible = value;
        });
    optionsFd.add(gParameters, "facesActive")
        .name("Show Faces")
        .onChange(function (value) {
            gCubesMesh.material.visible = value;
        });
    optionsFd.add(gParameters, "isCentered")
        .name("Center Model")
        .onChange(function (value) {
            const vec = new THREE.Vector3(0, 0, 0);
            //center the polycube
            if (gParameters.isCentered) {
                vec.x = -(getShape(gCurrInd)[0] - 1) / 2;
                vec.y = -(getShape(gCurrInd)[1] - 1) / 2;
                vec.z = 0;
            }
            gCubesMesh.position.set(vec.x, vec.y, vec.z);
            gEdgesMesh.position.set(vec.x, vec.y, vec.z);
        });

    gParameters.inputFileButton = "";
    optionsFd.add(gParameters, 'inputFileButton').name('<input type="file" id="fileInput">');
    optionsFd.open();

    const browsingFd = gui.addFolder("Browsing");
    gParameters["stepLog10"] = 3.0;
    gParameters["step"] = Math.round(Math.pow(10.0, gParameters.stepLog10));
    browsingFd.add(gParameters, "stepLog10", 1.0, 12.0, 0.001)
        .name("Step (log10)")
        .onChange(function (value) {
            gParameters.step = Math.round(Math.pow(10.0, gParameters.stepLog10));
        });
    gParameters["previous1"] = function () { };
    browsingFd.add(gParameters, 'previous1').name("Previous").onChange(function (value) {
        previousPoly(1);
    });
    gParameters["next1"] = function () { };
    browsingFd.add(gParameters, 'next1').name("Next").onChange(function (value) {
        nextPoly(1);
    });
    gParameters["previousStep"] = function () { };
    browsingFd.add(gParameters, 'previousStep').name("Move backward by step").onChange(function (value) {
        previousPoly(gParameters.step);
    });
    gParameters["nextStep"] = function () { };
    browsingFd.add(gParameters, 'nextStep').name("Move forward by step").onChange(function (value) {
        nextPoly(gParameters.step);
    });
    gParameters["nextRandom"] = function () { };
    browsingFd.add(gParameters, 'nextRandom').name("Random").onChange(function (value) {
        nextPoly(Math.floor(Math.random() * POLYCUBES.length));
    });
    browsingFd.open()

    const detailsFd = gui.addFolder("Information");
    gParameters.message = "";
    gInfoGui = detailsFd.add(gParameters, "message")
        .name("Data is Loading");
    detailsFd.open();


    const datasetsFolder = gui.addFolder("Datasets");
    const categoryFolders = {};
    for (let el of polyominoesDatasets) {
        const fd = el.category[0];
        if (!categoryFolders.hasOwnProperty(fd)) {
            categoryFolders[fd] = datasetsFolder.addFolder(fd);
        }

        gParameters[el.path] = function () { };
        categoryFolders[fd].add(gParameters, el.path)
            .name(el.name)
            .onChange(function (value) {
                loadPolycubesFile(el.path);
            });
    }
    datasetsFolder.open();


    const fileInputElement = document.getElementById('fileInput');
    fileInputElement.addEventListener('change', function (e) {
        const files = fileInputElement.files;
        async function processFile(file) {

            // if (/\.bin$/i.test(file.name)) {
            //     POLYCUBES = await parseBinStream(file.stream());
            //     gCurrInd = 0;
            //     updatePolyhedron(gCurrInd);
            // }
            if (/\.bits$/i.test(file.name)) {
                POLYCUBES = await parseBitArrayBuffer(await file.arrayBuffer());
                gCurrInd = 0;
                updatePolyhedron(gCurrInd);
            }
            else if (/\.bits.gz$/i.test(file.name)) {
                const decompressedStream = file.stream().pipeThrough(new DecompressionStream('gzip'));
                POLYCUBES = await parseBitsStream(decompressedStream);
                gCurrInd = 0;
                updatePolyhedron(gCurrInd);
            }
            else {
                console.log("The file extension is not correct, should be .bin")
            }
        }

        if (files) {
            Array.prototype.forEach.call(files, processFile);
        }
    });

    loadPolycubesFile("data/bits.gzip/polyominoes/polyominoes_5.bits.gz");

    gui.open();
    // EVENTS
    document.addEventListener("keydown", onDocumentKeyDown, false);
    // document.addEventListener("touchcancel", onDocumentTouchCancel, false);
    window.addEventListener('resize', onWindowResize);

} // end of function init()


function parseStringAsVec3(pString) {
    const arr = pString.split(",");
    arr.forEach(function (el, index, arr) {
        arr[index] = parseFloat(el);
    });
    const vec = new THREE.Vector3(arr[0], arr[1], arr[2]);
    return vec;
}

function makeEdgesMesh(nbMaxElements) {
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...gDefaultColor.edge),
        roughness: 0.5,
        metalness: 0.,
        visible: gParameters.edgesActive,
    });
    const geometry = createSimpleCubeEdgeGeometry(gSimpleCubeData);
    const mesh = new THREE.InstancedMesh(geometry, material, nbMaxElements);
    mesh.count = 0;
    return mesh;
}

function makeCubesMesh(nbMaxElements) {
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(...gDefaultColor.face),
        roughness: 0.5,
        metalness: 0.,
        side: THREE.DoubleSide,
        // emissive: new THREE.Color(0.2,0.2,0.2),
        transparent: true,
        opacity: 1.0, //- gParameters.transparency,
        visible: gParameters.facesActive,
    });

    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.InstancedMesh(geometry, material, nbMaxElements);
    mesh.count = 0;
    return mesh;
}

function getURLParameter(sParam, defaultVal) {
    const sPageURL = window.location.search.substring(1);
    const sURLVariables = sPageURL.split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
        const sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return defaultVal;
}

function arraySum(arr) {
    return arr.reduce((res, a) => res + a, 0);
}
function arrayAverage(arr) {
    return arraySum(arr) / arr.length;
}
function arrayProd(arr) {
    return arr.reduce((res, a) => res * a, 1);
}


function displayPolyhedron(polycubeData) {
    //MAKE CUBES
    const positions = computePos(polycubeData);
    reinstantiateCubes(positions.length);
    reinstantiateEdges(positions.length);
    {
        gCubesMesh.count = positions.length;
        gEdgesMesh.count = positions.length;
        // convert edge obj to cylinders
        for (let i = 0, l = positions.length; i < l; i++) {
            const T = new THREE.Matrix4().setPosition(positions[i]);
            gCubesMesh.setMatrixAt(i, T);
            gEdgesMesh.setMatrixAt(i, T);
        }
        gCubesMesh.instanceMatrix.needsUpdate = true;
        gEdgesMesh.instanceMatrix.needsUpdate = true;
    }

    //center the polycube
    const center = new THREE.Vector3(0, 0, 0);
    if (gParameters.isCentered) {
        center.x = (polycubeData[0] - 1) / 2;
        center.y = (polycubeData[1] - 1) / 2;
        center.z = 0;
    }
    gCubesMesh.position.set(-center.x, -center.y, -center.z);
    gEdgesMesh.position.set(-center.x, -center.y, -center.z);
}

function doDispose(obj) {
    if (obj !== null) {
        for (let i = 0, l = obj.children.length; i < l; i++) {
            doDispose(obj.children[i]);
        }
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (obj.material.map) {
                obj.material.map.dispose();
            }
            obj.material.dispose();
        }
    }
}

function quaternionFromDir(direction) {
    const quaternion = new THREE.Quaternion();
    if (direction.y > 0.999) {
        quaternion.set(0, 0, 0, 1);
    } else if (direction.y < -0.999) {
        quaternion.set(1, 0, 0, 0);
    } else {
        const axis = new THREE.Vector3();
        axis.set(direction.z, 0, -direction.x).normalize();
        const radians = Math.acos(direction.y);
        quaternion.setFromAxisAngle(axis, radians);
    }
    return quaternion;
}

function animate() {
    requestAnimationFrame(animate);
    // const delta = gClock.getDelta();
    // gElapsedTime += delta;
    // if (gParameters.rotationSpeed != 0) {
    //     gPolyhedronMesh.quaternion.setFromAxisAngle(gParameters.rotationDirection, gElapsedTime * gParameters.rotationSpeed);
    // }
    render();
    update();
}

function update() {
    gControls.update();
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    gCamera.aspect = width / height;
    gCamera.updateProjectionMatrix();
    gRenderer.setSize(width, height);
}

function render() {
    gRenderer.setClearColor(gParameters.backgroundColor);
    gRenderer.render(gScene, gCamera);
}


function updatePolyhedron(ind) {
    const obj = getBits(ind);
    displayPolyhedron(obj);
    gInfoGui.name(makeInfoHtml(obj));
}

function makeInfoHtml(data) {
    const message = [];
    message.push("<p>");
    message.push("Loaded polycubes: " + POLYCUBES.length);
    message.push("</p>");
    message.push("<p>");
    message.push("Polycube index: " + (gCurrInd + 1));
    message.push("</p>");
    message.push("<p>");
    message.push("Polycube shape: (" + data.slice(0, 2) + ")");
    message.push("</p>");
    message.push("<p>");
    message.push("Cubes in polycube: " + gCubesMesh.count);
    message.push("</p>");
    return message.join("");
}

function computePos(element) {
    const positions = [];
    const bytes = bits2bytes(element);
    for (let ibit = 0, li = bytes.length; ibit < li; ++ibit) {
        if (bytes[ibit]) {
            //const ibit = x*ny + y
            let y = ibit % element[1];
            let x = (ibit - y) / element[1];
            positions.push(new THREE.Vector3(x, y));
        }
    }
    return positions;
}

function loadPolycubesFile(url) {
    (async () => {
        POLYCUBES = await parseGzipFile(url);
        // POLYCUBES = await parseBitFile(url);
        gCurrInd = 0;
        updatePolyhedron(gCurrInd);
    })()
}

function reinstantiateEdges(numEdges) {
    if (numEdges > gNumMaxEdges) {
        gNumMaxEdges = numEdges;
        gPolyhedronMesh.remove(gEdgesMesh);
        doDispose(gEdgesMesh);
        gEdgesMesh = makeEdgesMesh(gNumMaxEdges);
        gPolyhedronMesh.add(gEdgesMesh);
    }
}

function reinstantiateCubes(numCubes) {
    if (numCubes > gNumMaxCubes) {
        gNumMaxCubes = numCubes;
        gPolyhedronMesh.remove(gCubesMesh);
        doDispose(gCubesMesh);
        gCubesMesh = makeCubesMesh(gNumMaxCubes);
        gPolyhedronMesh.add(gCubesMesh);
    }
}

function resetCamera() {
    gCamera.position.set(...gcCamZ.pos);
    gCamera.up.set(...gcCamZ.up);
    gCamera.lookAt(...gcCamZ.target);
}

function onDocumentKeyDown(event) {
    //https://www.freecodecamp.org/news/javascript-keycode-list-keypress-event-key-codes/
    const keyCode = event.which;
    if (keyCode == 53) {
        //mambo number 5
        resetCamera();
        gElapsedTime = 0;
    }
    else if (keyCode == 38) {
        //up arrow key
        previousPoly(1);
    } else if (keyCode == 40) {
        // down arrow key
        nextPoly(1);
    } else if (keyCode == 37) {
        // left arrow key
        previousPoly(gParameters.step);
    } else if (keyCode == 39) {
        // the right arrow
        nextPoly(gParameters.step);
    }
}

function positiveModulo(a, n) {
    return ((a % n) + n) % n
}

function nextPoly(nb) {
    gCurrInd = positiveModulo(gCurrInd + nb, POLYCUBES.length);
    updatePolyhedron(gCurrInd);
}
function previousPoly(nb) {
    gCurrInd = positiveModulo(gCurrInd - nb, POLYCUBES.length);
    updatePolyhedron(gCurrInd);
}

function createSimplePlaneData() {
    const cubeMesh = {
        vertices: [
            [0.5,  0.5, 0],
            [0.5,  -0.5, -0],
            [-0.5, 0.5, 0],
            [-0.5, -0.5, -0],
            ],
        faces: [
            [1, 0, 2, 3],
        ],
        edges: [],
    };

    // add misssing edges
    for (let face of cubeMesh.faces) {
        for (let j = 0, jl = face.length; j < jl; j++) {
            const i0 = face[j];
            const i1 = face[(j + 1) % jl];
            let edge;
            if (i0 > i1) {
                edge = "" + i1 + "," + i0;
            }
            else {
                edge = "" + i0 + "," + i1;
            }
            if (!cubeMesh.edges.includes(edge)) {
                cubeMesh.edges.push(edge);
            }
        }
    }
    for (let i = 0, l = cubeMesh.edges.length; i < l; ++i) {
        const edgeParts = cubeMesh.edges[i].split(',');
        cubeMesh.edges[i] = [parseInt(edgeParts[0], 10), parseInt(edgeParts[1], 10)]
    }
    return cubeMesh;
}

function createSimpleCubeEdgeGeometry(cubeData) {
    let singleGeometry;
    for (let i in cubeData.edges) {
        const edge = cubeData.edges[i]
        const point0 = new THREE.Vector3(...cubeData.vertices[edge[0]]);
        const point1 = new THREE.Vector3(...cubeData.vertices[edge[1]]);
        const direction = new THREE.Vector3().subVectors(point1, point0);
        const d = direction.length();
        let position = new THREE.Vector3().addVectors(point0, direction.multiplyScalar(0.5));
        direction.normalize();
        const scale = new THREE.Vector3(1, d, 1);
        const quaternion = quaternionFromDir(direction);
        const M = new THREE.Matrix4().compose(position, quaternion, scale);
        const edgeGeometry = new THREE.CylinderGeometry(gParameters.edgeRadius, gParameters.edgeRadius, 1, 8 * 1, 4 * 1);
        edgeGeometry.applyMatrix4(M);
        if (i > 0) {
            singleGeometry = mergeBufferGeometries([singleGeometry, edgeGeometry]);
        } else {
            singleGeometry = edgeGeometry;
        }
    }
    return singleGeometry;
}


async function readBinStream(stream) {
    let result = [];
    const reader = stream.getReader();
    while (true) {
        // The `read()` method returns a promise that
        // resolves when a value has been received.
        const { done, value } = await reader.read();
        // Result objects contain two properties:
        // `done`  - `true` if the stream has already given you all its data.
        // `value` - Some data. Always `undefined` when `done` is `true`.
        if (done) return result;
        result.push(value);
    }
}
async function parseGzipFile(filename) {
    const response = await fetch(filename);
    const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return await parseBitsStream(decompressedStream);
}

async function parseBitsStream(stream) {
    let now = performance.now();
    const result = { arrayOffset: [0], arrayIndex: [0], arrays: await readBinStream(stream), length: 0 };
    console.log("" + performance.now() - now + "ms");
    now = performance.now();

    let iArray = 0;
    let ipos = 0;
    while (iArray < result.arrays.length) {
        let diff = result.arrays[iArray].length - ipos;
        let x, y;
        x = result.arrays[iArray][ipos];
        if (diff >= 2) {
            y = result.arrays[iArray][ipos + 1];
            ipos += 2;
        }
        else if (diff == 1) {
            iArray += 1;
            y = result.arrays[iArray][0];
            ipos = 1;
        }

        const numBytes = Math.ceil(x * y / 8);
        let j = 0;
        while (j < numBytes) {
            diff = result.arrays[iArray].length - ipos;
            if ((numBytes - j) < diff) {
                ipos += (numBytes - j);
                j = numBytes;
            }
            else {
                j += diff;
                iArray += 1;
                ipos = 0;
            }
        }
        result.arrayOffset.push(ipos);
        result.arrayIndex.push(iArray);
    }
    result.arrayOffset.splice(result.arrayOffset.length - 1);
    result.arrayIndex.splice(result.arrayIndex.length - 1);
    result.arrayOffset = new Uint16Array(result.arrayOffset);
    result.arrayIndex = new Uint32Array(result.arrayIndex);
    result.length = result.arrayIndex.length;
    console.log("" + performance.now() - now + "ms");
    return result;
}


function parseBitArrayBuffer(arrayBuf) {
    const result = { arrays: [new Uint8Array(arrayBuf)], length: 0, arrayIndex: [], arrayOffset: [] };
    let iArr = 0;
    while (iArr < result.arrays[0].length) {
        result.arrayOffset.push(iArr);
        result.arrayIndex.push(0);
        const prod = result.arrays[0][iArr] * result.arrays[0][iArr + 1];
        const d = Math.ceil(prod / 8);
        iArr = iArr + d + 2;
    }
    result.length=result.arrayIndex.length;
    return result;
}

async function parseBitFile(url) {
    const response = await fetch(url);
    return parseBitArrayBuffer(await response.arrayBuffer());
}

function bits2bytes(element) {
    const prod = element[0] * element[1];
    const bytes = new Uint8Array(prod);
    const d = element.length - 2;
    for (let j = 0; j < d; ++j) {
        let value = element[j + 2];
        for (let ibit = 0; ibit < 8; ++ibit) {
            bytes[ibit + j * 8] = value & 1;
            value = value >>> 1;
        }
    }
    return bytes;
}

function getShape(gCurrInd) {
    let iArray = POLYCUBES.arrayIndex[gCurrInd];
    let ipos = POLYCUBES.arrayOffset[gCurrInd];

    let diff = POLYCUBES.arrays[iArray].length - ipos;
    let x, y;
    x = POLYCUBES.arrays[iArray][ipos];
    if (diff >= 2) {
        y = POLYCUBES.arrays[iArray][ipos + 1];
        ipos = ipos + 2;
    }
    else if (diff == 1) {
        iArray = iArray + 1;
        y = POLYCUBES.arrays[iArray][0];
        ipos = 1;
    }
    return new Uint8Array([x, y]);
}

function getBits(gCurrInd) {
    let iArray = POLYCUBES.arrayIndex[gCurrInd];
    let ipos = POLYCUBES.arrayOffset[gCurrInd];
    let diff = POLYCUBES.arrays[iArray].length - ipos;
    let x, y;
    x = POLYCUBES.arrays[iArray][ipos];
    if (diff >= 2) {
        y = POLYCUBES.arrays[iArray][ipos + 1];
        ipos = ipos + 2;
    }
    else if (diff == 1) {
        iArray = iArray + 1;
        y = POLYCUBES.arrays[iArray][0];
        ipos = 1;
    }
    const numBytes = Math.ceil(x * y / 8);
    const polycubeData = new Uint8Array(numBytes + 2);
    polycubeData[0] = x;
    polycubeData[1] = y;
    let j = 0;
    while (j < numBytes) {
        diff = POLYCUBES.arrays[iArray].length - ipos;
        if ((numBytes - j) < diff) {
            polycubeData.set(POLYCUBES.arrays[iArray].slice(ipos, ipos + numBytes - j), j + 2);
            ipos = ipos + (numBytes - j);
            j = numBytes;
        }
        else {
            polycubeData.set(POLYCUBES.arrays[iArray].slice(ipos), j + 2);
            j += diff;
            iArray = iArray + 1;
            ipos = 0;
        }
    }
    return polycubeData;
}