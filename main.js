import * as THREE from "three";
import Models from "./Models.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EasePack } from "gsap/EasePack";

gsap.registerPlugin(ScrollTrigger, EasePack);

class App {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 18;

    const canvas = document.querySelector("#hero-canvas");

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffe066, 4);
    directionalLight.position.set(-10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const spotLight = new THREE.SpotLight(0x4a7aff, 10);
    spotLight.position.set(15, 0, -10);
    spotLight.lookAt(0, 0, 0);
    this.scene.add(spotLight);

    // --- Models ---
    this.models = new Models();
    this.models.group.rotation.y = -0.75;

    this.models.group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.tiltGroup = new THREE.Group();
    this.tiltGroup.add(this.models.group);
    this.scene.add(this.tiltGroup);

    this.mousePosition = new THREE.Vector2();
    this.targetRotation = { x: 0, y: 0 };

    // --- CENTRAL STATE OBJECT ---
    // GSAP will only modify these numbers. 
    // The visual updates happen in the animate() loop.
    this.state = {
      reveal: 0,   // 0 to 1 (Rotation)
      joint: 0,    // 0 to 1 (Snap together)
      scale: 0,    // 0 to 1 (Rods grow)
      collapse: 0, // 0 to 1 (Final merge)
    };

    this.setupMouseListener();
    this.setupScrollAnimation();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize(), false);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setupMouseListener() {
    window.addEventListener("mousemove", (event) => {
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
  }

  setupScrollAnimation() {
    // --- The Master Timeline ---
    const mainTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
      },
    });

    // === PHASE 1: ASSEMBLE ===
    mainTl.addLabel("phase1")
      .to(this.state, {
          reveal: 1, 
          duration: 15,
          ease: "power1.inOut"
      }, "phase1")
      .to(this.models.group.rotation, { 
          x: 0, z: 0.23, y: -0.4, duration: 15 
      }, "phase1")
      .to(this.state, {
          joint: 1, 
          duration: 8, 
          // Changed from 'elastic' to 'back.out' for a cleaner, less glitchy snap
          ease: "back.out(1.2)" 
      }, "phase1+=7"); 


    // === PHASE 2: EXPANSION & GLOW ===
    mainTl.addLabel("phase2", ">")
      .to(this.state, {
          scale: 1, 
          duration: 25,
          ease: "power1.inOut"
      }, "phase2")
      .to(this.models.group.rotation, { 
          x: 0.5, z: 1.4, y: 0.4, duration: 25 
      }, "phase2")
      .to(this.camera.position, { z: 11, duration: 25 }, "phase2")
      .to(this.models.maceMaterial, { emissiveIntensity: 2.5, duration: 25 }, "phase2");


    // === PHASE 3: THE VORTEX ===
    mainTl.addLabel("phase3", ">")
      .to(this.models.group.rotation, { 
          z: 3.5, y: 2, duration: 25, ease: "power2.inOut" 
      }, "phase3")
      .to(this.camera.position, { 
          z: 4, duration: 25, ease: "power2.in" 
      }, "phase3")
      .to(this.camera.rotation, { 
          z: -0.5, duration: 25 
      }, "phase3")
      .to(this.models.particlesGroup.scale, { 
          x: 2, y: 2, z: 2, duration: 25 
      }, "phase3");


    // === PHASE 4: FINAL COLLAPSE ===
    mainTl.addLabel("phase4", ">")
      .to(this.camera.position, { 
          z: 35, duration: 35, ease: "power2.inOut" 
      }, "phase4")
      .to(this.camera.rotation, { 
          z: 0, duration: 35, ease: "power2.inOut" 
      }, "phase4")
      .to(this.state, {
          collapse: 1, 
          duration: 35, 
          ease: "power2.inOut"
      }, "phase4")
      .to(this.models.maceMaterial, { 
          emissiveIntensity: 5, duration: 35 
      }, "phase4")
      .to(this.models.group.rotation, { 
          y: 4.0, x: 1.0, duration: 35 
      }, "phase4");
  }

  // --- SINGLE SOURCE OF TRUTH FOR POSITIONS ---
  updateObjects() {
    const dir = new THREE.Vector3(0, 1, 0);

    // 1. Calculate Global Factors based on state
    //    Dist: Starts at 3 -> Goes to 2 (Joint) -> Goes to 0 (Collapse)
    let currentDist = THREE.MathUtils.lerp(3, 2, this.state.joint);
    currentDist = THREE.MathUtils.lerp(currentDist, 0, this.state.collapse);

    //    Rod Scale: Starts at 1 -> Goes to 1.8 (Scale) -> Goes to 0 (Collapse)
    let currentRodScale = THREE.MathUtils.lerp(1, 1.8, this.state.scale);
    currentRodScale = THREE.MathUtils.lerp(currentRodScale, 0, this.state.collapse);

    //    Sphere Scale: Starts at 1 -> Goes to 4 (Collapse)
    const currentSphereScale = THREE.MathUtils.lerp(1, 4, this.state.collapse);

    const baseRodLength = this.models.rodLength; 
    
    // 2. Apply to all objects
    this.models.maces.forEach((mace, index) => {
        // A. Handle Rotation (Reveal)
        const startQ = this.models.initialQuaternions[index];
        const endQ = this.models.firstAnimationQuaternions[index];
        mace.quaternion.copy(startQ).slerp(endQ, this.state.reveal);

        // B. Handle Position (Orbit)
        //    We calculate position based on the current rotation and the calculated global distance
        dir.set(0, 1, 0).applyQuaternion(mace.quaternion);
        mace.position.copy(dir.multiplyScalar(currentDist));
    });

    // 3. Update Internal Parts (Rods & Spheres)
    this.models.rodes.forEach(rod => {
        rod.scale.set(1, currentRodScale, 1);
    });

    const currentRodLength = baseRodLength * currentRodScale;
    
    // During collapse, sphere moves from rod tip to center (0)
    let sphereY = currentRodLength / 2;
    // However, if we are collapsing, we just want them to zero out relative to the rod logic?
    // Actually, our previous logic was lerping Y position to 0. 
    // Since rod length goes to 0, sphereY naturally goes to 0.
    
    this.models.spheres.forEach(sphere => {
        sphere.position.y = sphereY;
        sphere.scale.set(currentSphereScale, currentSphereScale, currentSphereScale);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 1. Calculate all physics/transforms for this frame
    this.updateObjects();

    // 2. Mouse Tilt
    if (this.tiltGroup) {
      this.targetRotation.x = this.mousePosition.y * 0.15;
      this.targetRotation.y = this.mousePosition.x * 0.15;
      this.tiltGroup.rotation.x += (this.targetRotation.x - this.tiltGroup.rotation.x) * 0.05;
      this.tiltGroup.rotation.y += (this.targetRotation.y - this.tiltGroup.rotation.y) * 0.05;
    }

    // 3. Particles
    if (this.models.particlesGroup) {
      this.models.particlesGroup.rotation.y += 0.001;
      this.models.particlesGroup.rotation.z -= 0.0005;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();