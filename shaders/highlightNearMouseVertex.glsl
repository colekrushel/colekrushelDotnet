// instanceMatrix, modelMatrix, viewMatrix, projectionMatrix, normalMatrix,position and normal are all provided by three.js for a ShaderMaterial
// used on an InstancedMesh.

uniform vec3  uFaceNormal;  //normal of the face the camera is looking at
uniform float uFacePlane;   
uniform float uDepthSpan;   

//these values are consistent across every vertex of one pyramid, so entire pyramid is shaded the same
out vec2  outCenter01;    // pyramid centre on screen, 0..1 (matches with uMouse)
out float outDepth;       // 0 = at the front face plane, 1 = deepest
out vec3  outViewNormal;  // for simple shading

void main() {
  //because this is an instanced mesh we must apply the instanced matrix ourself
  mat4 instanceModel = modelMatrix * instanceMatrix;
  //pyramid center in world space
  vec3 worldCenter = (instanceModel * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // where the center is in screen space
  vec4 centerClip = projectionMatrix * viewMatrix * vec4(worldCenter, 1.0);
  outCenter01 = centerClip.xy / centerClip.w * 0.5 + 0.5;

  // how far behind the front face plane the center normalised to 0..1
  outDepth = clamp((uFacePlane - dot(worldCenter, uFaceNormal)) / uDepthSpan, 0.0, 1.0);

  // uniform scale only, so mat3(instanceMatrix) is safe for normals
  outViewNormal = normalMatrix * normalize(mat3(instanceMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * instanceModel * vec4(position, 1.0);
}
