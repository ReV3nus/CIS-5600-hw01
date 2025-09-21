#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;
precision highp sampler3D; // Error while compiling without it

uniform vec4 u_Color; // The color with which to render this instance of geometry.

uniform sampler3D u_NoiseTex;   

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

// magma params
uniform float u_Size;
in vec4 fs_mPos;
in vec4 fs_wPos;

uniform float u_Time;
uniform float u_BassLevel;

float noise(vec3 p)
{
    return texture(u_NoiseTex, p).r;
}
vec3 gradNoise(vec3 p)
{
    float eps = 0.09;
    // float noise0 = noise(p);
	float gradx = noise(vec3(p.x+eps,p.y, p.z))-noise(vec3(p.x-eps,p.y, p.z));
	float grady = noise(vec3(p.x,p.y+eps, p.z))-noise(vec3(p.x,p.y-eps, p.z));
    float gradz = noise(vec3(p.x,p.y, p.z+eps))-noise(vec3(p.x,p.y, p.z-eps));
	return vec3(gradx, grady, gradz) ;
}
mat3 GetRotateMatrix(vec3 p, float a)
{
    p = normalize(p);
    float c = cos(a);
    float s = sin(a);
    float ic = 1.0 - c;
    return mat3(
        c + p.x*p.x*ic,      p.x*p.y*ic - p.z*s,  p.x*p.z*ic + p.y*s,
        p.y*p.x*ic + p.z*s,  c + p.y*p.y*ic,      p.y*p.z*ic - p.x*s,
        p.z*p.x*ic - p.y*s,  p.z*p.y*ic + p.x*s,  c + p.z*p.z*ic
    );
}

// const float fbm_w0 = 0.5;
// const vec3 fbm_iRange = vec3(1.0, 7.0, 1.0);
// const vec2 fbm_flowSpeed = vec2(0.002, 0.0007);
// const vec3 fbm_gradDisp = vec3(0.34, 0.01, 0.005);                   //position, time, result
// const vec4 fbm_gradRot = vec4(-1.5, -2.0, -2.5, 0.006);           //x, y, z, time
// const vec3 fbm_octs = vec3(0.5, 7.0, 0.5);                          // Asin(Bx)+C
// const float fbm_mixW = 0.5;
// const vec3 fbm_scaling = vec3(1.7, 1.6, 0.75);                       //p, pp, w
// const float fbm_expo = 1.4;
uniform float fbm_w0;
uniform vec3  fbm_iRange;
uniform vec2  fbm_flowSpeed;
uniform vec3  fbm_gradDisp;
uniform vec4  fbm_gradRot;
uniform vec3  fbm_octs;
uniform float fbm_mixW;
uniform vec3  fbm_scaling;
uniform float fbm_expo;

float flow_fbm(vec3 p)
{
    float w = fbm_w0;
    float res = 0.;
    vec3 pp = p;
    vec3 p0 = p;

    for(float i = fbm_iRange.x; i < fbm_iRange.y; i += fbm_iRange.z)
    {
        p += u_Time * fbm_flowSpeed.x;
        pp += u_Time * fbm_flowSpeed.y;

        vec3 grad = gradNoise(i * p * fbm_gradDisp.x + u_Time * fbm_gradDisp.y);
        grad *= GetRotateMatrix(p0, dot(vec3(fbm_gradRot), p) + fbm_gradRot.a * u_Time);
        p += grad * fbm_gradDisp.z;

        res += (fbm_octs.x * sin(fbm_octs.y * noise(p)) + fbm_octs.z) * w;

        p = mix(pp, p, fbm_mixW);

        p *= fbm_scaling.x;
        pp *= fbm_scaling.y;
        w *= fbm_scaling.z;
    }
    return res;
}

void main()
{
    vec3 p = vec3(fs_mPos) / u_Size;

    // float tmp = texture(u_NoiseTex, p+.5).r;
    // out_Col = vec4(tmp, tmp, tmp, 0.5);
    float fbm_res = flow_fbm(p * .05);
    if(u_BassLevel != 0.0){
        fbm_res /= 1.7 * (3. * u_BassLevel * u_BassLevel - 2. * u_BassLevel * u_BassLevel * u_BassLevel);
    }
    out_Col = vec4(pow(vec3(u_Color) / fbm_res, vec3(fbm_expo)), 1.0);

    // out_Col = vec4(fbm_res, fbm_res, fbm_res,  1.);

    // float tmp = noise(p);
    // out_Col = vec4(tmp, tmp , tmp, 1.0);

    // out_Col = vec4(p, 1.0); 
    
}
