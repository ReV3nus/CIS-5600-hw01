#version 300 es

in vec4 vs_Pos;             // The array of vertex positions passed to the shader
out vec4 fs_Pos;


void main()
{
    fs_Pos = vs_Pos;

    gl_Position = vs_Pos;
}
