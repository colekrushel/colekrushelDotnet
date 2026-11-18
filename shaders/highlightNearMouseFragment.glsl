uniform vec2  uMouse;       // 0..1, y up 
uniform vec2  uResolution;  // ratio
uniform vec3  uBaseColor;
uniform vec3  uColorNear;
uniform float uRadius;      // highlight radius
uniform float uDepthPower;  // fade highlight with depth

in vec2  outCenter01;
in float outDepth;
in vec3  outViewNormal;

out vec4 fragColor;

void main() {
  //distance from the cursor to this pyramid's center
  float aspect = uResolution.x / uResolution.y;
  float dist = length((outCenter01 - uMouse) * vec2(aspect, 1.0));
  float proximity = 1.0 - smoothstep(0.0, uRadius, dist); //corrected for aspect ratio

  float depthWeight = pow(1.0 - outDepth, uDepthPower);
  float strength = proximity * depthWeight;

  // light shading on faces facing camera
  vec3 n = normalize(outViewNormal);
  float shade = (0.55 + 0.45 * max(n.z, 0.0));
  // make faces away from camera darker regardless of highlight
  shade = shade * (clamp(depthWeight*1.0, 0.5, 1.0));
  
  //lerps between basecolor and nearcolor based on strength, then applies shade to highlight faces
  vec3 color = mix(uBaseColor, uColorNear, strength) * shade;

  fragColor = vec4(color, 1.0);

}
