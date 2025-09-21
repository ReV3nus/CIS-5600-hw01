import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

const verbose = false;

class Cube extends Drawable {
  buffer: ArrayBuffer;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  center: vec4;

  constructor(center: vec3, public size: number,  public subdivisions: number) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
  }

  create() {
    const faceNormals: Array<Float32Array> =
    [
      new Float32Array([1, 0, 0, 0]),
      new Float32Array([-1, 0, 0, 0]),
      new Float32Array([0, 1, 0, 0]),
      new Float32Array([0, -1, 0, 0]),
      new Float32Array([0, 0, 1, 0]),
      new Float32Array([0, 0, -1, 0])
    ];

    let maxIndexCount = 2 * 6 * Math.pow(4, this.subdivisions);
    let maxVertexCount = 6 * (Math.pow(Math.pow(2, this.subdivisions) + 1, 2));

    if(verbose)console.log("max count: " + maxIndexCount + " " + maxVertexCount);

    const buffer = new ArrayBuffer(
      maxIndexCount * 3 * Uint32Array.BYTES_PER_ELEMENT +
      maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT +
      maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT
    );
    
    const indexByteOffset = 0;
    const positionByteOffset = maxIndexCount * 3 * Uint32Array.BYTES_PER_ELEMENT;
    const normalByteOffset = positionByteOffset + maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT;

    let vertices: Array<Float32Array> = new Array(maxVertexCount);
    let triangles: Array<Uint32Array> = new Array(maxIndexCount);

    for (let i = 0; i < maxIndexCount; i++)
    {
      triangles[i] = new Uint32Array(buffer, indexByteOffset + i * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);
    }
    for (let i = 0; i < maxVertexCount; i++)
    {
      vertices[i] = new Float32Array(buffer, positionByteOffset + i * 4 * Float32Array.BYTES_PER_ELEMENT, 4);
    }
    
    const totalSlides = Math.pow(2, this.subdivisions);
    const totalFaceIdx = 2 * Math.pow(4, this.subdivisions) + 2;
    let vtxIdx = 0;
    let triIdx = 0;

    for(let faceIdx = 0; faceIdx < 6; faceIdx++)
    {
      const nor = faceNormals[faceIdx];
      const startIdx = vtxIdx;

      let h = (faceIdx & 6) >> 1;
      const dir1 = faceNormals[((h + 1) % 3) << 1];
      const dir2 = faceNormals[((h + 2) % 3) << 1];

      const eps1 = vec4.scale(vec4.create(), dir1, Math.pow(0.5, this.subdivisions));
      const eps2 = vec4.scale(vec4.create(), dir2, Math.pow(0.5, this.subdivisions));

      const p0 = vec4.fromValues(
        (nor[0] - dir1[0] - dir2[0]) / 2,
        (nor[1] - dir1[1] - dir2[1]) / 2,
        (nor[2] - dir1[2] - dir2[2]) / 2,
        1
      );

      for(let i = 0; i <= totalSlides; i++)
      {
        for(let j = 0; j <= totalSlides; j++)
        {
          const p = vec4.fromValues(
            (p0[0] + eps1[0] * i + eps2[0] * j) * this.size,
            (p0[1] + eps1[1] * i + eps2[1] * j) * this.size,
            (p0[2] + eps1[2] * i + eps2[2] * j) * this.size,
            1
          );
          
          let n = new Float32Array(buffer, normalByteOffset + vtxIdx * 4 * Float32Array.BYTES_PER_ELEMENT, 4);
          vertices[vtxIdx++].set(p); 
          n.set(nor);
        }
      }

      for(let i = 0; i < totalSlides; i++)
      {
        for(let j = 0; j < totalSlides; j++)
        {
          const curIdx = startIdx + i * (totalSlides + 1) + j;
          triangles[triIdx++].set([curIdx, curIdx + totalSlides + 1, curIdx + 1]);
          triangles[triIdx++].set([curIdx + 1, curIdx + totalSlides + 1, curIdx + totalSlides + 2]);
        }
      }
    }

    this.buffer = buffer;
    this.indices = new Uint32Array(this.buffer, indexByteOffset, triangles.length * 3);
    this.normals = new Float32Array(this.buffer, normalByteOffset, vertices.length * 4);
    this.positions = new Float32Array(this.buffer, positionByteOffset, vertices.length * 4);

  // this.indices = new Uint32Array([0, 2, 1,
  //                                 1, 2, 3]);
  // this.normals = new Float32Array([1, 0, 0, 0,
  //                                  1, 0, 0, 0,
  //                                  1, 0, 0, 0,
  //                                  1, 0, 0, 0]);
  // this.positions = new Float32Array([0.5, -0.5, -0.5, 0,
  //                                    0.5, -0.5, 0.5, 0,
  //                                    0.5, 0.5, -0.5, 0,
  //                                    0.5, 0.5, 0.5, 0]);
    
    this.generateIdx();
    this.generatePos();
    this.generateNor();

    this.count = this.indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    if(verbose)
    {
      console.log(`Created cube with ${vertices.length} vertices`);
      console.log(this.indices.length + " " + this.normals.length + " " + this.positions.length);
      for(let i = 0; i < this.positions.length/4; i++)
      {
        console.log("vertex "+ i + 
          ": pos = " + this.positions[4*i] + " "+this.positions[4*i+1]+ " "+this.positions[4*i+2]+ " "+this.positions[4*i+3]+
        ", nor = " + + this.normals[4*i] + " "+this.normals[4*i+1]+ " "+this.normals[4*i+2]+ " "+this.normals[4*i+3]);
      }
      for(let i =0; i < this.indices.length/3;i++)
      {
        console.log("indice " + i + ": " + this.indices[3*i] +" "+this.indices[3*i+1]+" "+this.indices[3*i+2]);
      }
    }
  }
};

export default Cube;
