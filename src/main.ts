import {vec3, vec4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  /* scene functions */
  'Load Scene': loadScene, 
  'Load Music': loadMusic,
  'Restore Params': initControls,


  /* lava ball params */
  baseColor: "#331203",
  size: 1.,
  noiseSize3D: 128,

  /* fire params */
  fireColor1: "#9D4120",
  fireColor2: "#CB8D3D",
  fireIntensity: 1.0,
  fireAlpha: .7,


  /* flow fbm params */
  w0: 0.5,
  iRange: "(1.0, 7.0, 1.0)",
  flowSpeed: "(0.002, 0.0007)",
  gradDisp: "(0.34, 0.01, 0.005)",
  gradRot: "(-1.5, -2.0, -2.5, 0.006)",
  octs: "(0.5, 7.0, 0.5)",
  mixW: 0.5,
  scaling: "(1.7, 1.6, 0.75)",
  expo: 1.3,


  /* hidden params */
  tesselations : 6,
};

//let cube: Cube;
let fireBall: Icosphere;
let fireSphere : Icosphere;
let bgSquare: Square;

let prevSize: number = 0;

function loadScene() {
  fireBall = new Icosphere(vec3.fromValues(0, 0, 0), controls.size, controls.tesselations);
  fireBall.create();
  fireSphere = new Icosphere(vec3.fromValues(0, 0, 0), controls.size * 1.01, controls.tesselations);
  fireSphere.create();
  bgSquare = new Square(vec3.fromValues(0, 0, 0));
  bgSquare.create();
}


let audioContext: AudioContext;
let audioAnalyser: AnalyserNode;
let frequencyData = new Uint8Array();
let audioInitialized = false;

function loadMusic()
{
  document.getElementById('hidden-audio-input')?.click();
}
function setupAudioProcessing() {
  const fileInput = document.getElementById('hidden-audio-input') as HTMLInputElement;
  const audioPlayer = document.getElementById('audio-player') as HTMLAudioElement;
  if (!audioInitialized || audioPlayer.src == null) {
    audioPlayer.hidden = true;
  }

  fileInput.addEventListener('change', (event) => {
    if (!audioInitialized) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioPlayer);
      
      audioAnalyser = audioContext.createAnalyser();
      audioAnalyser.fftSize = 256;
      
      const bufferLength = audioAnalyser.frequencyBinCount;
      frequencyData = new Uint8Array(bufferLength);
      
      source.connect(audioAnalyser);
      audioAnalyser.connect(audioContext.destination);
      
      audioInitialized = true;
    }

    audioPlayer.hidden = false;
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      audioPlayer.src = URL.createObjectURL(files[0]);
      audioPlayer.load();
      audioPlayer.play();
      
      if (audioContext.state === 'suspended') {
          audioContext.resume();
      }
    }
  });
}

function initControls()
{
  controls.baseColor = "#331203";
  controls.size = 1.;
  controls.noiseSize3D = 128;

  /* fire params */
  controls.fireColor1 = "#9D4120";
  controls.fireColor2 = "#CB8D3D";
  controls.fireIntensity = 1.0;
  controls.fireAlpha = .7;


  /* flow fbm params */
  controls.w0 = 0.5;
  controls.iRange = "(1.0, 7.0, 1.0)";
  controls.flowSpeed = "(0.002, 0.0007)";
  controls.gradDisp = "(0.34, 0.01, 0.005)";
  controls.gradRot = "(-1.5, -2.0, -2.5, 0.006)";
  controls.octs = "(0.5, 7.0, 0.5)";
  controls.mixW = 0.5;
  controls.scaling = "(1.7, 1.6, 0.75)";
  controls.expo = 1.3;
}

function generate3DNoise(gl: WebGL2RenderingContext, size: number): WebGLTexture 
{
  const data = new Uint8Array(size * size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        const idx = i * size * size + j * size + k;
        data[idx] = Math.random() * 255;
      }
    }
  }

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_3D, tex);

  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);

  gl.texImage3D(
    gl.TEXTURE_3D,
    0,                // mip level
    gl.R8,
    size, size, size, 
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    data
  ); // got error when set to R32F and FLoat

  gl.bindTexture(gl.TEXTURE_3D, null);

  return tex;
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.addColor(controls, 'baseColor').name('Basic Color');
  gui.add(controls, 'size', 0.2, 5);

  gui.addColor(controls, 'fireColor1').name('Fire Color1');
  gui.addColor(controls, 'fireColor2').name('Fire Color2');
  gui.add(controls, 'fireIntensity', 0.1, 3.5).name("Flame Intensity");
  gui.add(controls, 'fireAlpha', 0., 1.).name("Flame Alpha");


  gui.add(controls, 'Load Scene');
  gui.add(controls, 'Load Music');
  gui.add(controls, 'Restore Params');

  const fbmParamsFolder = gui.addFolder("FBM Params");
  fbmParamsFolder.add(controls, 'w0');
  fbmParamsFolder.add(controls, 'iRange');
  fbmParamsFolder.add(controls, 'flowSpeed');
  fbmParamsFolder.add(controls, 'gradDisp');
  fbmParamsFolder.add(controls, 'gradRot');
  fbmParamsFolder.add(controls, 'octs');
  fbmParamsFolder.add(controls, 'mixW');
  fbmParamsFolder.add(controls, 'scaling');
  fbmParamsFolder.add(controls, 'expo');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2', { alpha: false }); // need to add alpha false or color(0,0,0,0) will displays white as background of webpage
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  setupAudioProcessing();

  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const magmaShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/magma-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/magma-frag.glsl')),
  ]);
  const fireShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/fire-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/fire-frag.glsl')),
  ]);
  const backgroundShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/background-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/background-frag.glsl')),
  ]);


  const noiseTex = generate3DNoise(gl, controls.noiseSize3D);
  magmaShader.setNoiseTex(noiseTex);
  fireShader.setNoiseTex(noiseTex);

  prevSize = controls.size;
  
  
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();

    // Size check
    if(controls.size != prevSize)
    {
      prevSize = controls.size;
      fireBall = new Icosphere(vec3.fromValues(0, 0, 0), controls.size, controls.tesselations);
      fireBall.create();
      fireSphere =new Icosphere(vec3.fromValues(0, 0, 0), controls.size * 1.01, controls.tesselations);
      fireSphere.create();
    }

    // Base Color Transfer
    const intColor = parseInt(controls.baseColor.slice(1), 16);
    const vec4Color = vec4.fromValues(
        ((intColor >> 16) & 255) / 255.0,
        ((intColor >> 8) & 255) / 255.0,
        (intColor & 255) / 255.0,
        1
    )

    // Process Audio
    let bassLevel = 0.0;
    if (audioInitialized) {
        audioAnalyser.getByteFrequencyData(frequencyData);
        
        const bassBinCount = Math.floor(audioAnalyser.frequencyBinCount * 0.1);
        let bassSum = 0;
        for (let i = 0; i < bassBinCount; i++) {
            bassSum += frequencyData[i];
        }
        
        bassLevel = (bassSum / bassBinCount) / 255.0 || 0; 
    }

    magmaShader.setBassLevel(bassLevel);
    fireShader.setBassLevel(bassLevel);
    magmaShader.setMagmaParams(controls, performance.now() * 0.001);
    fireShader.setFireParams(controls, performance.now() * 0.001);

    gl.disable(gl.DEPTH_TEST);
    backgroundShader.setResolution(window.innerWidth, window.innerHeight);
    renderer.render(camera, backgroundShader, [
      bgSquare
    ], vec4Color);
    gl.enable(gl.DEPTH_TEST);

    renderer.render(camera, magmaShader, [
      fireBall
    ], vec4Color);

    renderer.render(camera, fireShader, [
      fireSphere
    ], vec4Color);

    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
