#version 300 es

precision highp float;
precision highp sampler3D; // Error while compiling without it

in vec4 fs_Pos;

out vec4 out_Col; 

uniform vec2 u_Resolution;

uniform sampler3D u_NoiseTex; 
float noise(vec2 p, float r)
{
    return texture(u_NoiseTex, vec3(fract(p.x/r),
                                               fract(p.y/r),
                                               floor((p.x+p.y)/r))).r;
}

void main()
{
    vec2 uv = fs_Pos.xy;
   // uv.x *= u_Resolution.x / u_Resolution.y;

    vec3 col = vec3(1.,1.,0.86);

    // vignette
	float vignetteAmt = 1.-dot(uv,uv) * .1;
    col *= vignetteAmt;

    // grain
    uv = fs_Pos.xy * .5 + .5;
    col.rgb += (noise(uv, .1) - .5)*.08;

    out_Col = vec4(col, 1.);
}
