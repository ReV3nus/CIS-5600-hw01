#version 300 es

precision highp sampler3D; // Error while compiling without it
uniform sampler3D u_NoiseTex;   
uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

uniform float u_Size;

in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

out vec4 fs_wPos;
out vec4 fs_mPos;
out vec4 fs_uPos;

uniform float u_Time;
uniform float u_FireIntensity;
uniform float u_BassLevel;

float noise(vec3 p)
{
    return texture(u_NoiseTex, p).r;
}
float rdm(vec3 p)
{
    float res = p.x + p.y + p.z;
    return res;
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
vec4 Disp(vec3 p)
{
    vec3 p0 = normalize(p);
    vec3 disp = p0 * u_Size * .05;

    vec3 pp = p0 * .03 + vec3(.2, -5., .2) * u_Time * .004;
    float displacement = fbm(pp, 4, 2.0, 0.5) * .8;

    float h = (p0.y + 1.) * .9;
    float intensity = u_FireIntensity * (u_BassLevel == 0. ? 1. : bias(u_BassLevel, .3));
    vec3 dispDir = (p0 + intensity * vec3(0., 1., 0.) * bias(h, .6));
    
    float upward_bias = bias(h, .6);
    displacement *= upward_bias;

    disp += displacement * dispDir * u_Size;

    p += disp;

    if(p.y > 0.)
    {
        h = p.y * .6;
        float rd = (1. - bias(h, .4) * .5);
        p = vec3(p.x * rd, p.y, p.z * rd);
    }

    h = p.y + 1.;
    float lmt = 1.1 + h * .2;
    if(length(p) <= u_Size * lmt)
    {
        p *= u_Size * lmt / length(p);
    }
    
    return vec4(p, 1.);
}
void main()
{
    fs_Col = vs_Col;

    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);

    fs_uPos = vs_Pos / u_Size;
    fs_mPos = vs_Pos;

    fs_mPos = Disp(fs_mPos.xyz);
    //fs_mPos += vec4(normalize(vs_Pos.xyz) * u_Size * .15, 0.);

    fs_wPos = u_Model * fs_mPos;

    gl_Position = u_ViewProj * fs_mPos;

}
