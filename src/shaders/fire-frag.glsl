#version 300 es


precision highp float;
precision highp sampler3D; // Error while compiling without it

uniform vec4 u_FireColor1;
uniform vec4 u_FireColor2;

uniform sampler3D u_NoiseTex;   

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_Col;

out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.


in vec4 fs_mPos;
in vec4 fs_wPos;
in vec4 fs_uPos;

uniform float u_Time;
uniform float u_Size;
uniform float u_FireAlpha;
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
vec3 getUpwardTangent(vec3 p)
{
    p = normalize(p);
    float y = p.y;
    y = sqrt(1. - y * y);
    // y = max(1., y);
    float t = sqrt((1. - y * y) / max(0.001, p.x * p.x + p.z * p.z));
    float s = p.y > 0. ? -1. : 1.;
    vec3 tg = vec3(p.x * t * s, y, p.z * t * s);
    return tg;
}

float bias(float t, float b) {
    return (t / ((((1.0/b) - 2.0)*(1.0 - t))+1.0));
}

vec4 fbmColor(vec3 p)
{
    const vec3 gradDisp = vec3(0.3, 0.005, 0.01);
    const vec4 gradRot = vec4(-1.5, -2.0, -2.5, 0.06);

   // vec3 movDir = (-getUpwardTangent(p)) * 0.01;
    vec3 movDir = vec3(0., -1., 0.);
    //return -movDir.y / 0.01;

    float amp = 0.6;
    float freq = 1.0;
    float res = 0.;
    vec3 p0 = normalize(p);

    p += u_Time * movDir * 0.02;
    
    for(float i = 1.; i < 3.; i++)
    {

        vec3 grad = gradNoise(i * p * gradDisp.x + u_Time * gradDisp.y) * gradDisp.z;
        grad *= GetRotateMatrix(p0, dot(gradRot.xyz, p) + gradRot.a * u_Time);
        p += grad;

        res += amp * noise(p * freq);


        amp *= 0.5;
        freq *= 2.;
    }

    // float mask1 = smoothstep(0.3, 0.7, res);
    // float mask2 = 1. - smoothstep(-.4, .6, p0.y);
    float mask1 = 1. - pow(smoothstep(-.4, .6, p0.y), 2.);

    float a = atan(p0.x / p0.z);
    float anoise = noise(vec3(a * 0.08, 0., 0.) + vec3(.54, .26, .81) * u_Time * 0.004);
    anoise = bias(anoise, 0.1);
    anoise = -.2 + anoise * 1.2;

    float mask2 = 1. - smoothstep(anoise - .3, anoise + .3, p0.y);
    mask1 *= mask2;

    float mask = 1. - step(mask1 + .1, res);
    float mask3 = step(mask1, res) - step(mask1 + .1, res);

    // float stroke = step(0.65, fbm(p * 12.));
    // mask *= (1.0 - 0.5*stroke);


    if(mask1 - .1 >= res)
    {
        // vec3 red = vec3(157./255., 65./255., 32./255.);
        // vec3 yellow = vec3(203./255., 141./255., 61./255.);
        vec3 fluc =  (u_FireColor2.xyz - u_FireColor1.xyz) * (noise(p * .2 + u_Time * .01) * 2. - 1. )* .2;
        float val = (mask1 - .1) * .5;

        if(res <= val)return vec4(u_FireColor1.xyz + fluc, 1.);
        if(res <= val + .04)return vec4(0., 0., 0., 1.);
        return vec4(u_FireColor2.xyz - fluc, 1.);
        // return mix(red, yellow, res / (mask1 - .1));
    }
    if(mask1 + .1 >= res)
    {
        float stroke = noise(p * vec3(28., 10.1, 27.1))+
                     noise(p * vec3(11., 5., 14.)) + 
                     noise(p * vec3(3., 1.2, 4.));
        stroke *= stroke;
        stroke = step(0.9, stroke);
        return vec4(vec3(1. - stroke), 1.);
        // return vec3(0.0, 0.0, 0.0);
    }
    return vec4(0.);
}

void main()
{
    vec3 p = vec3(fs_uPos) * 1.;

    vec4 fbmRes = fbmColor(p * .1);



    // out_Col = u_Color;
    out_Col = vec4(fbmRes.xyz, min(fbmRes.a, u_FireAlpha));
    
}
