import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as dat from 'lil-gui'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {DotScreenPass} from 'three/examples/jsm/postprocessing/DotScreenPass.js'
import {GlitchPass} from 'three/examples/jsm/postprocessing/GlitchPass.js'
import {RGBShiftShader} from 'three/examples/jsm/shaders/RGBShiftShader.js'
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { LinearFilter, RGBAFormat } from 'three'
import {SMAAPass} from 'three/examples/jsm/postprocessing/SMAAPass.js'
import{ UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

/**
 * Base
 */
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()
const textureLoader = new THREE.TextureLoader()

/**
 * Update all materials
 */
const updateAllMaterials = () =>
{
    scene.traverse((child) =>
    {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
        {
            child.material.envMapIntensity = 2.5
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.jpg',
    '/textures/environmentMaps/0/nx.jpg',
    '/textures/environmentMaps/0/py.jpg',
    '/textures/environmentMaps/0/ny.jpg',
    '/textures/environmentMaps/0/pz.jpg',
    '/textures/environmentMaps/0/nz.jpg'
])
environmentMap.encoding = THREE.sRGBEncoding

scene.background = environmentMap
scene.environment = environmentMap

/**
 * Models
 */
gltfLoader.load(
    '/models/DamagedHelmet/glTF/DamagedHelmet.gltf',
    (gltf) =>
    {
        gltf.scene.scale.set(2, 2, 2)
        gltf.scene.rotation.y = Math.PI * 0.5
        scene.add(gltf.scene)

        updateAllMaterials()
    }
)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(0.25, 3, - 2.25)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Update effect composer
    effectComposer.setSize(sizes.width, sizes.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 1, - 4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 1.5
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Post Processing
 */

// Render target

// The problem with the next code is that isn't supported for all the browsers
// const renderTarget = new THREE.WebGLMultisampleRenderTarget(
//     800,
//     600,
//     {
//         minFilter: THREE.LinearFilter,
//         magFilter: THREE.LinearFilter,
//         format: THREE.RGBAFormat
//     }
// )
// We will go with the regular one + a pass to solve the antialas problem
// const renderTarget = new THREE.WebGLRenderTarget(
//     800,
//     600,
//     {
//         minFilter: THREE.LinearFilter,
//         magFilter: THREE.LinearFilter,
//         format: THREE.RGBAFormat
//     }
// )

// there is a better way to check if we should do the antialas, in general we won't make the antialas thing if we have a pixel ratio over 1 because it's not really needed (unless we have extremely good performance) so we will check 

let RenderTargetClass = null

if(renderer.getPixelRatio()==1 && renderer.capabilities.isWebGL2){
    RenderTargetClass = THREE.WebGLMultisampleRenderTarget
}
else{
    RenderTargetClass = THREE.WebGLRenderTarget
}

// and now we do the renderTarget
const renderTarget = new RenderTargetClass(
    800,
    600,
    {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    }
)

// effect composer
const effectComposer = new EffectComposer(renderer, renderTarget)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.setSize(sizes.width, sizes.height)


// render pass
const renderPass = new RenderPass(scene, camera)
effectComposer.addPass(renderPass)

// dotscreen pass
const dotScreenPass = new DotScreenPass()
dotScreenPass.enabled = false
effectComposer.addPass(dotScreenPass)

gui.add(dotScreenPass, 'enabled').name('dotScreenPass')


// glitch pass
const glitchPass = new GlitchPass()
glitchPass.goWild = false
glitchPass.enabled = false
effectComposer.addPass(glitchPass)

gui.add(glitchPass, 'enabled').name('glitchPass')

// rgbshift pass
const rgbShiftPass = new ShaderPass(RGBShiftShader)
rgbShiftPass.enabled = true
effectComposer.addPass(rgbShiftPass)

gui.add(rgbShiftPass, 'enabled').name('rgbShiftPass')

// UnrealBloomPass
const unrealBloomPass = new UnrealBloomPass()
unrealBloomPass.enabled = false
unrealBloomPass.strength = 0.3
unrealBloomPass.radius = 1
unrealBloomPass.threshold = 0.6
effectComposer.addPass(unrealBloomPass)

gui.add(unrealBloomPass,'enabled').name('unrealBloomPass')
var unrealProperties= gui.addFolder('UnrealBloomPassProperties')
unrealProperties.add(unrealBloomPass,'strength').min(0).max(2).step(0.001)
unrealProperties.add(unrealBloomPass,'radius').min(0).max(2).step(0.001)
unrealProperties.add(unrealBloomPass,'threshold').min(0).max(1).step(0.001)


// Tint pass

const TintShader = {
    uniforms: 
    {
        tDiffuse: {value:null},
        uTint: {value: null}

    },
    vertexShader: `
    varying vec2 vUv;
    void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        vUv = uv;
    }
    `,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main(){
        vec4 color = texture2D(tDiffuse,vUv);
        color.rgb += uTint;
        gl_FragColor = color;
    }
    `
}

const tintPass = new ShaderPass(TintShader)
tintPass.material.uniforms.uTint.value = new THREE.Vector3()
effectComposer.addPass(tintPass) 

let TintColor = gui.addFolder('Tint Color')
TintColor.add(tintPass.material.uniforms.uTint.value,'x').min(-1).max(1).step(0.01)
TintColor.add(tintPass.material.uniforms.uTint.value,'y').min(-1).max(1).step(0.01)
TintColor.add(tintPass.material.uniforms.uTint.value,'z').min(-1).max(1).step(0.01)


// Displacement Pass

// const DisplacementShader = {
//     uniforms: 
//     {
//         tDiffuse: {value:null}, 
//         // uTime: {value: 0}
//     },
//     vertexShader: `
//     varying vec2 vUv;
//     void main(){
//         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

//         vUv = uv;
//     }
//     `,
//     fragmentShader: `
//     uniform sampler2D tDiffuse;
//     uniform float uTime;
//     varying vec2 vUv;
//     void main(){

//         vec2 newUv = vec2(
//             vUv.x,
//             vUv.y + sin(vUv.x * 10.0 + uTime)*0.1 
//         );
//         vec4 color = texture2D(tDiffuse,newUv);
      
//         gl_FragColor = color;
//     }
//     `
// }

// const displacementPass = new ShaderPass(DisplacementShader)
// // displacementPass.material.uniforms.uTime.value = 0
// effectComposer.addPass(displacementPass) 


// Futuristic map with normalmap

// Futuristic Pass

const FuturisticShader = {
    uniforms: 
    {
        tDiffuse: {value:null}, 
        uNormalMap: {value:null},
        uHexagonStrength: {value:null},
        uLightStrength:{value:null}
    },
    vertexShader: `
    varying vec2 vUv;
    void main(){
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

        vUv = uv;
    }
    `,
    fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D uNormalMap;
    uniform float uHexagonStrength;
    uniform float uLightStrength;
    varying vec2 vUv;
    void main(){
        vec3 normalColor = texture2D(uNormalMap,vUv).xyz * 2.0 -1.0;
        vec2 newUv = vUv +normalColor.xy * uHexagonStrength;
        vec4 color = texture2D(tDiffuse,newUv);

        vec3 lightDirection = normalize(vec3(-1.0,1.0,0.0));
        float lightness = clamp(dot(normalColor, lightDirection),0.0,1.0);
        color.rgb += lightness*uLightStrength;

        gl_FragColor = color;
    }
    `
}

const futuristicPass = new ShaderPass(FuturisticShader)
futuristicPass.material.uniforms.uHexagonStrength.value = 0.1;
futuristicPass.material.uniforms.uLightStrength.value = 0.15;
futuristicPass.material.uniforms.uNormalMap.value = textureLoader.load('/textures/interfaceNormalMap.png')
effectComposer.addPass(futuristicPass) 

gui.add(futuristicPass.material.uniforms.uHexagonStrength, 'value').min(-3).max(3).step(0.01).name('Hexagon Strength')
gui.add(futuristicPass.material.uniforms.uLightStrength, 'value').min(-3).max(3).step(0.01).name('Lightness Strength')

// There is a problem for the RGBShift so we need to add a new pass at the end
// Gamma pass
const gammaCorrection = new ShaderPass(GammaCorrectionShader)
effectComposer.addPass(gammaCorrection)



//   SMAA pass
// const smaaPass = new SMAAPass()
// effectComposer.addPass(smaaPass)

if(renderer.getPixelRatio()===1 && !renderer.capabilities.isWebGL2){
    const smaaPass = new SMAAPass()
    smaaPass.enabled = true
    effectComposer.addPass(smaaPass)
}

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // update passes
    // displacementPass.material.uniforms.uTime.value = elapsedTime


    // Update controls
    controls.update()

    // // Render
    // renderer.render(scene, camera)

    // effect composer render

    effectComposer.render()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()