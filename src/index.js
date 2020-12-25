import * as THREE from 'three';
var OrbitControls = require('three-orbit-controls')(THREE);
// import VertexNormalsHelper from 'three/examples/jsm/helpers/VertexNormalsHelper';


const planeVertex = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

uniform float uTime;
varying float vNoise;
varying vec3 vPosition;
varying vec2 vUv;

void main(){
    float t = uTime * 0.1;
    vNoise = snoise(vec3(position.xy + sin(t) ,position.z ));
    vUv = uv;

    vec3 newPosition = position + vec3(vNoise) * 0.5;

    vPosition = position + 0.1 * vNoise;


    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.);
}
`;

const planeFragment = `
#define PI 3.14159265359
uniform float uTime;
varying float vNoise;
varying vec3 vPosition;
varying vec2 vUv;

float rnd(vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898,78.233)))* 43758.5453123);
}

mat2 scale(vec2 _scale){
    return mat2(_scale.x,0.0,
                0.0,_scale.y);
}

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle),
                sin(_angle),cos(_angle));
}

void main(){

    // vec2 st = gl_FragCoord.xy/vPosition.xy;

    // vec3 a = cross(dFdx(vPosition),dFdy(vPosition));

    vec3 col = vec3(0.0);


    vec2 uv = vUv;
    uv -= vec2(0.5);
    uv *= 50.;
    // uv = scale( vec2(sin(uTime) - 2.0 - 1.0) ) * uv;
    // uv = rotate2d( uTime * 0.1*(PI * 0.5) ) * uv;

    uv += vec2(0.5);

    vec2 gv = fract(uv);
    vec2 id = floor(uv);

    float d = distance(gv, vec2(0.5));
    //d = step(rnd(id) * sin(uTime + id.x * id.y), d);


    col.rgb += d;

    col = 1.0 - col;

    col = mix(vec3(0.0,0.0,0.0), vec3(0.09,1.0,1.0), col);

    // col = fract(col * 5.0);
    // col = 1.0 / col;

    // col.rg += id.xy + sin(uTime);

    gl_FragColor = vec4(col, 1.0);
}
`;


const lineFragment = `
uniform float uTime;
varying float vNoise;
void main(){

    vec3 color = vec3(0.5);

    gl_FragColor = vec4(color,1.);
}
`;


class Scene {
    constructor() {
        this.camera;
        this.renderer;
        this.scene;
        this.controls;
        this.planeGeometry;
        this.planeMaterial;
        this.planeMesh;


        this.actx = new window.AudioContext;
        this.analyser = this.actx.createAnalyser();

        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        this.animate = this.animate.bind(this);
        
        this.calculateMouseCoordinates = this.calculateMouseCoordinates.bind(this);

        document.addEventListener('mousemove', this.calculateMouseCoordinates);


        this.mouse = new THREE.Vector2(0,0);

        // this.addAudio();
        this.createScene();
        this.createCamera();
        this.addFloor();
        this.animate();

    }

    addAudio(){
        var t = this;
        this.audioTag = document.querySelector('.player');
        this.audioTag.addEventListener('click', t.audioTag.play);
        // this.audioTag.click();

    }

    calculateMouseCoordinates(e){
        this.mouse.x = (e.clientX / window.innerWidth - 0.5);
        this.mouse.y = (e.clientY / window.innerHeight - 0.5);
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // this.renderer.context.getExtension('OES_standard_derivatives');

        document.body.appendChild(this.renderer.domElement);

    }

    createCamera() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 10000);

        this.camera.position.set(0, 0, 40);

        this.scene.add(this.camera);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    }

    addFloor() {
        const width = 10;
        const height = 10;
        // const planeGeometry = new THREE.PlaneGeometry(width, height, 200, 200);
        const cubeGeometry = new THREE.BoxBufferGeometry(100, 100, 100, 50, 50, 50);
        const edges = new THREE.WireframeGeometry( cubeGeometry );

        // all materials can be changed according to your taste and needs
        const planeMaterial = new THREE.ShaderMaterial({
            fragmentShader: planeFragment,
            vertexShader: planeVertex,
            // wireframe: true,
            side: THREE.DoubleSide,
            uniforms: {
                uColor: new THREE.Uniform(new THREE.Color(0x101012)),
                uTime: { value: 1.0 },
            }
        });

        const lineMaterial = new THREE.ShaderMaterial({
            fragmentShader: lineFragment,
            vertexShader: planeVertex,
            // wireframe: true,
            uniforms: {
                uColor: new THREE.Uniform(new THREE.Color(0x101012)),
                uTime: { value: 1.0 },
            }
        });

        
        edges.attributes.normal = cubeGeometry.attributes.normal;
        console.log(cubeGeometry);
        console.log(edges);

        this.lineMesh = new THREE.LineSegments( edges, lineMaterial );

        this.planeMesh = new THREE.Mesh(cubeGeometry, planeMaterial);
        // const helper = new VertexNormalsHelper( this.planeMesh, 2, 0x00ff00, 1 );
        // planeGeometry.rotateX(- Math.PI / 2);

        // this.planeMesh.rotation.x = Math.PI / 2;

        this.scene.add(this.planeMesh);
        this.scene.add(this.lineMesh);
        // this.scene.add(this.helper);


        

        this.lineMesh.scale.x = 0.99;
        this.lineMesh.scale.y = 0.99;
        this.lineMesh.scale.z = 0.99;

    }

    animate() {
        this.planeMesh.material.uniforms.uTime.value += 0.1;
        this.lineMesh.material.uniforms.uTime.value += 0.1;

        // this.lineMesh.rotation.x = this.mouse.y * 0.1;
        // this.planeMesh.rotation.x = this.mouse.y * 0.1;

        // this.lineMesh.rotation.y = this.mouse.x * 0.1;
        // this.planeMesh.rotation.y = this.mouse.x * 0.1;

        window.requestAnimationFrame(this.animate);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);

    }
}

var s = new Scene();