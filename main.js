import * as THREE from "three";
import Models from "./Models.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EasePack } from "gsap/EasePack";

gsap.registerPlugin(ScrollTrigger, EasePack);

class App {
  constructor() {
    this.scene = new THREE.Scene();
    
    // Fog helps blend objects into the background color at distance
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

    // Enable shadows for all meshes
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
    const direction = new THREE.Vector3(0, 1, 0);

    // --- Update Helpers (Logic decoupled from GSAP) ---

    // 1. Unfold Maces
    const updateMaceRevealAnimation = (progress) => {
      this.models.maces.forEach((mace, index) => {
        const startQuaternion = this.models.initialQuaternions[index];
        const endQuaternion = this.models.firstAnimationQuaternions[index];
        mace.quaternion.copy(startQuaternion).slerp(endQuaternion, progress);

        direction.set(0, 1, 0).applyQuaternion(mace.quaternion);
        mace.position.copy(direction.multiplyScalar(3));
      });
    };

    // 2. Snap Joints
    const updateMaceJointAnimation = (progress) => {
      this.models.maces.forEach((mace, index) => {
        const currentQuaternion = this.models.firstAnimationQuaternions[index];
        direction.set(0, 1, 0).applyQuaternion(currentQuaternion);
        const distance = THREE.MathUtils.lerp(3, 2, progress);
        mace.position.copy(direction.multiplyScalar(distance));
      });
    };

    // 3. Extend Rods
    const updateRodScaleAnimation = (progress) => {
      const lengthScale = THREE.MathUtils.lerp(1, 1.8, progress);
      this.models.rodes.forEach((rod) => {
        rod.scale.set(1, lengthScale, 1);
      });
      const newRodLength = this.models.rodLength * lengthScale;
      this.models.spheres.forEach((sphere) => {
        sphere.position.y = newRodLength / 2;
      });
    };

    // 4. Final Collapse (Merge to Single Sphere)
    const finalRodLength = this.models.rodLength * 1.8;
    const sphereStartY = finalRodLength / 2;

    const updateFinalCollapse = (progress) => {
      // Shrink rods
      const rodScale = THREE.MathUtils.lerp(1.8, 0, progress);
      this.models.rodes.forEach((rod) => rod.scale.set(1, rodScale, 1));

      // Move spheres to center and scale UP
      const sphereCurrentY = THREE.MathUtils.lerp(sphereStartY, 0, progress);
      const sphereFinalScale = THREE.MathUtils.lerp(1, 4, progress);

      this.models.spheres.forEach((sphere) => {
        sphere.position.y = sphereCurrentY;
        sphere.scale.set(sphereFinalScale, sphereFinalScale, sphereFinalScale);
      });

      // Pull mace groups to absolute center
      this.models.maces.forEach((mace) => {
        const currentDist = mace.position.length();
        const newDist = THREE.MathUtils.lerp(currentDist, 0, progress);
        mace.position.setLength(newDist);
      });
    };

    // --- State Objects ---
    const state = {
      reveal: 0,
      joint: 0,
      scale: 0,
      collapse: 0,
    };

    // --- The Master Timeline ---
    const mainTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5, // Smoother scrubbing
      },
    });

    // We use absolute durations to represent proportions of the scroll height.
    // Phase 1 (15%), Phase 2 (25%), Phase 3 (25%), Phase 4 (35%)
    // Total Duration units = 100

    // === PHASE 1: ASSEMBLE (Duration 15) ===
    mainTl.addLabel("phase1")
      .to(state, {
          reveal: 1,
          duration: 15,
          onUpdate: () => updateMaceRevealAnimation(state.reveal),
      }, "phase1")
      .to(this.models.group.rotation, { 
          x: 0, z: 0.23, y: -0.4, duration: 15 
      }, "phase1")
      .to(state, {
          joint: 1,
          duration: 8, // Joints snap faster than the full reveal
          ease: "elastic.out(1, 0.5)",
          onUpdate: () => updateMaceJointAnimation(state.joint),
      }, "phase1+=7"); 


    // === PHASE 2: EXPANSION & GLOW (Duration 25) ===
    mainTl.addLabel("phase2", ">") // Starts immediately after Phase 1
      .to(state, {
          scale: 1,
          duration: 25,
          onUpdate: () => updateRodScaleAnimation(state.scale),
      }, "phase2")
      .to(this.models.group.rotation, { 
          x: 0.5, z: 1.4, y: 0.4, duration: 25 
      }, "phase2")
      .to(this.camera.position, { z: 11, duration: 25 }, "phase2")
      .to(this.models.maceMaterial, { emissiveIntensity: 2.5, duration: 25 }, "phase2");


    // === PHASE 3: THE VORTEX (Duration 25) ===
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


    // === PHASE 4: FINAL COLLAPSE (Duration 35) ===
    mainTl.addLabel("phase4", ">")
      .to(this.camera.position, { 
          z: 35, duration: 35, ease: "power2.inOut" 
      }, "phase4")
      .to(this.camera.rotation, { 
          z: 0, duration: 35, ease: "power2.inOut" 
      }, "phase4")
      .to(state, {
          collapse: 1,
          duration: 35,
          ease: "power2.inOut",
          onUpdate: () => updateFinalCollapse(state.collapse),
      }, "phase4")
      .to(this.models.maceMaterial, { 
          emissiveIntensity: 5, duration: 35 
      }, "phase4")
      .to(this.models.group.rotation, { 
          y: "+=2", x: "+=0.5", duration: 35 
      }, "phase4");
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Mouse Tilt Logic
    if (this.tiltGroup) {
      this.targetRotation.x = this.mousePosition.y * 0.15;
      this.targetRotation.y = this.mousePosition.x * 0.15;
      this.tiltGroup.rotation.x += (this.targetRotation.x - this.tiltGroup.rotation.x) * 0.05;
      this.tiltGroup.rotation.y += (this.targetRotation.y - this.tiltGroup.rotation.y) * 0.05;
    }

    // Passive Particle Rotation
    if (this.models.particlesGroup) {
      this.models.particlesGroup.rotation.y += 0.001;
      this.models.particlesGroup.rotation.z -= 0.0005;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();