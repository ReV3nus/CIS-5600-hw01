#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.
precision highp sampler3D; // Error while compiling without it

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

uniform sampler3D u_NoiseTex;   

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

// magma params
out vec4 fs_wPos;
out vec4 fs_mPos;

uniform float u_Time;
uniform float u_Size;

uniform float u_WaveSpeed;
uniform float u_WaveAmpl;

uniform float u_BassLevel;

float rdm(vec3 p)
{
    float res = p.x + p.y + p.z;
    return res;
}

float noise(vec3 p)
{
    return texture(u_NoiseTex, p).r;
}
float fbm(vec3 p, int octaves, float lacunarity, float gain)
{
    float res = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < octaves; i++) {
        res += noise(p * frequency) * amplitude;
        frequency *= lacunarity; 
        amplitude *= gain;
    }
    return res;
}

float bias(float t, float b) {
    return (t / ((((1.0/b) - 2.0)*(1.0 - t))+1.0));
}

vec4 fbmDisp(vec3 p)
{
    vec3 p0 = normalize(p);
    float nscale = length(p);

    vec3 p_low = p0 * .02 + vec3(.2, -5., .2) * u_Time * .002;
    float displacement_low = fbm(p_low, 4, 2.0, 0.5) * 0.9;

    vec3 p_high = p0 * .2 + vec3(.5, -8., .5) * u_Time * .010;
    float displacement_high = fbm(p_high, 6, 2.2, 0.45) * 0.2;

    float total_displacement = displacement_low + displacement_high;

    float upward_bias = bias((p0.y * (0.9 / 2.0) + (0.9 / 2.0 + 0.1)), .35);
    total_displacement *= upward_bias;

    vec3 finalPosition = p + p0 * total_displacement * nscale ;
    return vec4(finalPosition, 1.);
}
void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation


    fs_mPos = fbmDisp(vs_Pos.xyz);

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.

    fs_wPos = u_Model * fs_mPos;
    

    gl_Position = u_ViewProj * fs_mPos;

}
