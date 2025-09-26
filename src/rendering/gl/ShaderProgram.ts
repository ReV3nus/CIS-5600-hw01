import {vec4, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      console.log(gl.getShaderInfoLog(this.shader));
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;

  unifResolution: WebGLUniformLocation;

  unifNoiseTex : WebGLUniformLocation;
  unifSize : WebGLUniformLocation;
  unifTime     : WebGLUniformLocation;

  unif_w0          :WebGLUniformLocation;
  unif_iRange      :WebGLUniformLocation;
  unif_flowSpeed   :WebGLUniformLocation;
  unif_gradDisp    :WebGLUniformLocation;
  unif_gradRot     :WebGLUniformLocation;
  unif_octs        :WebGLUniformLocation;
  unif_mixW        :WebGLUniformLocation;
  unif_scaling     :WebGLUniformLocation;
  unif_expo        :WebGLUniformLocation;

  unifWaveSpeed : WebGLUniformLocation;
  unifWaveAmpl  : WebGLUniformLocation;

  unifFireColor1 : WebGLUniformLocation;
  unifFireColor2  : WebGLUniformLocation;
  unifFireIntensity: WebGLUniformLocation;
  unifFireAlpha    : WebGLUniformLocation;

  unifBassLevel : WebGLUniformLocation;

  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifColor      = gl.getUniformLocation(this.prog, "u_Color");

    this.unifResolution = gl.getUniformLocation(this.prog, "u_Resolution");

    this.unifNoiseTex   = gl.getUniformLocation(this.prog, "u_NoiseTex");
    this.unifSize       = gl.getUniformLocation(this.prog, "u_Size");
    this.unifTime       = gl.getUniformLocation(this.prog, "u_Time");

    this.unif_w0          = gl.getUniformLocation(this.prog, "fbm_w0");
    this.unif_iRange      = gl.getUniformLocation(this.prog, "fbm_iRange");
    this.unif_flowSpeed   = gl.getUniformLocation(this.prog, "fbm_flowSpeed");
    this.unif_gradDisp    = gl.getUniformLocation(this.prog, "fbm_gradDisp");
    this.unif_gradRot     = gl.getUniformLocation(this.prog, "fbm_gradRot");
    this.unif_octs        = gl.getUniformLocation(this.prog, "fbm_octs");
    this.unif_mixW        = gl.getUniformLocation(this.prog, "fbm_mixW");
    this.unif_scaling     = gl.getUniformLocation(this.prog, "fbm_scaling");
    this.unif_expo        = gl.getUniformLocation(this.prog, "fbm_expo");

    this.unifWaveSpeed   = gl.getUniformLocation(this.prog, "u_WaveSpeed");
    this.unifWaveAmpl    = gl.getUniformLocation(this.prog, "u_WaveAmpl");

    this.unifFireColor1   = gl.getUniformLocation(this.prog, "u_FireColor1");
    this.unifFireColor2   = gl.getUniformLocation(this.prog, "u_FireColor2");
    this.unifFireIntensity= gl.getUniformLocation(this.prog, "u_FireIntensity");
    this.unifFireAlpha    = gl.getUniformLocation(this.prog, "u_FireAlpha");

    this.unifBassLevel   = gl.getUniformLocation(this.prog, "u_BassLevel");
  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  setResolution(x: number, y: number)
  {
    this.use();
    if (this.unifResolution !== -1) {
      gl.uniform2f(this.unifResolution, x, y);
    }
  }
  
  setTime(time: number)
  {
    this.use();
    if (this.unifTime != -1)
    {
      gl.uniform1f(this.unifTime, time);
    }
  }

  setBassLevel(bass: number){
    this.use();
    if(this.unifBassLevel != -1){
      gl.uniform1f(this.unifBassLevel, bass);
    }
  }


  setNoiseTex(tex: WebGLTexture)
  {
    this.use();
    if (this.unifNoiseTex !== -1)
    {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, tex);
      gl.uniform1i(this.unifNoiseTex, 0);
    }
  }
  setMagmaParams(controls: any, time: number)
  {
    this.use();
    if (this.unifSize !== -1)
    {
      gl.uniform1f(this.unifSize, controls.size);
    }
    if (this.unifWaveSpeed !== -1)
    {
      gl.uniform1f(this.unifWaveSpeed, controls.waveSpeed);
    }
    if (this.unifWaveAmpl !== -1)
    {
      gl.uniform1f(this.unifWaveAmpl, controls.waveAmpl);
    }
    if (this.unifTime != -1)
    {
      gl.uniform1f(this.unifTime, time);
    }

    if (this.unif_w0 != -1)
    {
      gl.uniform1f(this.unif_w0, controls.w0);
    }
    if (this.unif_mixW != -1)
    {
      gl.uniform1f(this.unif_mixW, controls.mixW);
    }
    if (this.unif_expo != -1)
    {
      gl.uniform1f(this.unif_expo, controls.expo);
    }
    
    if (this.unif_flowSpeed != -1)
    {
      let vec = controls.flowSpeed.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform2f(this.unif_flowSpeed, vec[0], vec[1]);
    }
    if (this.unif_gradDisp != -1)
    {
      let vec = controls.gradDisp.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform3f(this.unif_gradDisp, vec[0], vec[1], vec[2]);
    }
    if (this.unif_iRange != -1)
    {
      let vec = controls.iRange.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform3f(this.unif_iRange, vec[0], vec[1], vec[2]);
    }
    if (this.unif_octs != -1)
    {
      let vec = controls.octs.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform3f(this.unif_octs, vec[0], vec[1], vec[2]);
    }
    if (this.unif_scaling != -1)
    {
      let vec = controls.scaling.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform3f(this.unif_scaling, vec[0], vec[1], vec[2]);
    }
    if (this.unif_gradRot != -1)
    {
      let vec = controls.gradRot.match(/-?\d+(\.\d+)?/g).map(Number);
      gl.uniform4f(this.unif_gradRot, vec[0], vec[1], vec[2], vec[3]);
    }
  }
  setFireParams(controls: any, time: number)
  {
    this.use();
    if (this.unifSize !== -1)
    {
      gl.uniform1f(this.unifSize, controls.size);
    }
    if (this.unifTime != -1)
    {
      gl.uniform1f(this.unifTime, time);
    }
    if (this.unifFireIntensity != -1)
    {
      gl.uniform1f(this.unifFireIntensity, controls.fireIntensity);
    }
    if (this.unifFireAlpha != -1)
    {
      gl.uniform1f(this.unifFireAlpha, controls.fireAlpha);
    }

    if (this.unifFireColor1 !== -1) {
      const intColor = parseInt(controls.fireColor1.slice(1), 16);
          const vec4Color = vec4.fromValues(
              ((intColor >> 16) & 255) / 255.0,
              ((intColor >> 8) & 255) / 255.0,
              (intColor & 255) / 255.0,
              1
          )
      gl.uniform4fv(this.unifFireColor1, vec4Color);
    }
    if (this.unifFireColor2 !== -1) {
      const intColor = parseInt(controls.fireColor2.slice(1), 16);
          const vec4Color = vec4.fromValues(
              ((intColor >> 16) & 255) / 255.0,
              ((intColor >> 8) & 255) / 255.0,
              (intColor & 255) / 255.0,
              1
          )
      gl.uniform4fv(this.unifFireColor2, vec4Color);
    }
  }



  draw(d: Drawable) {
    this.use();
    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
  }
};

export default ShaderProgram;
