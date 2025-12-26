import * as THREE from "three";
import Models from "./Models.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EasePack } from "gsap/EasePack";

gsap.registerPlugin(ScrollTrigger, EasePack);

class App {
  constructor() {
    this.scene = new THREE.Scene();

    // Fog for depth fading - slightly darker to emphasize the final glow
    this.scene.fog = new THREE.FogExp2(0x000000, 0.025);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Initial camera start
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

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(ambientLight);

    // Main Key Light
    const directionalLight = new THREE.DirectionalLight(0xffe066, 4);
    directionalLight.position.set(-10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Rim Light
    const spotLight = new THREE.SpotLight(0x4a7aff, 10);
    spotLight.position.set(15, 0, -10);
    spotLight.lookAt(0,0,0);
    this.scene.add(spotLight);

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

    this.setupMouseListener();
    this.setupScrollAnimation();
    this.animate();
    
    window.addEventListener('resize', () => this.onWindowResize(), false);
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

    // --- Helpers ---
    const updateMaceRevealAnimation = (progress) => {
      this.models.maces.forEach((mace, index) => {
        const startQuaternion = this.models.initialQuaternions[index];
        const endQuaternion = this.models.firstAnimationQuaternions[index];
        mace.quaternion.copy(startQuaternion).slerp(endQuaternion, progress);

        direction.set(0, 1, 0).applyQuaternion(mace.quaternion);
        mace.position.copy(direction.multiplyScalar(3));
      });
    };

    const updateMaceJointAnimation = (progress) => {
      this.models.maces.forEach((mace, index) => {
        const currentQuaternion = this.models.firstAnimationQuaternions[index];
        direction.set(0, 1, 0).applyQuaternion(currentQuaternion);
        // Store current distance for later use
        mace.userData.currentDistance = THREE.MathUtils.lerp(3, 2, progress);
        mace.position.copy(direction.multiplyScalar(mace.userData.currentDistance));
      });
    };

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
    
    // New helper for final collapse
    const updateFinalCollapse = (progress) => {
        // 1. Shrink Rods back down
        const lengthScale = THREE.MathUtils.lerp(1.8, 0.3, progress); // Shrink to 30% size
        this.models.rodes.forEach((rod) => rod.scale.set(1, lengthScale, 1));
        const newRodLength = this.models.rodLength * lengthScale;
        this.models.spheres.forEach((sphere) => sphere.position.y = newRodLength / 2);

        // 2. Pull mace groups toward center
        this.models.maces.forEach((mace, index) => {
            const currentQuaternion = this.models.firstAnimationQuaternions[index];
            direction.set(0, 1, 0).applyQuaternion(currentQuaternion);
            // Pull from distance 2 down to distance 0.5
            const collapseDistance = THREE.MathUtils.lerp(2, 0.5, progress);
            mace.position.copy(direction.multiplyScalar(collapseDistance));
        });
    }


    // --- Timeline 1: The Assemble (0% - 20%) ---
    const tl1 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top top",
        end: "top+=20% top",
        scrub: 1,
      },
    });

    const revealState = { progress: 0 };
    const jointState = { progress: 0 };

    tl1.to(revealState, {
        progress: 1,
        duration: 2,
        onUpdate: () => updateMaceRevealAnimation(revealState.progress),
    })
    .to(this.models.group.rotation, { x: 0, z: 0.23, y: -0.4, duration: 2 }, "<")
    .to(jointState, {
        progress: 1,
        duration: 1,
        ease: "elastic.out(1, 0.5)",
        onUpdate: () => updateMaceJointAnimation(jointState.progress),
    });

    // --- Timeline 2: The Expansion (20% - 45%) ---
    const tl2 = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-space",
          start: "top+=20% top",
          end: "top+=45% top", // Adjusted end time
          scrub: 1,
        },
    });

    const maceScaleState = { progress: 0 };

    tl2.to(maceScaleState, {
        progress: 1,
        onUpdate: () => updateRodScaleAnimation(maceScaleState.progress),
    })
    .to(this.models.group.rotation, { x: 0.5, z: 1.4, y: 0.4 }, "<")
    .to(this.camera.position, { z: 11 }, "<")
    // Start glow
    .to(this.models.maceMaterial, { emissiveIntensity: 2 }, "<");


    // --- Timeline 3: The Vortex (45% - 75%) ---
    const tl3 = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-space",
          start: "top+=45% top", // Adjusted start time
          end: "top+=75% top",   // Adjusted end time
          scrub: 1,
        },
    });

    tl3.to(this.models.group.rotation, { 
        z: 3.5, 
        y: 2, 
        ease: "power2.inOut" 
    })
    // Zoom in tight
    .to(this.camera.position, { z: 5, ease: "power2.in" }, "<")
    // Camera Twist
    .to(this.camera.rotation, { z: -0.5 }, "<")
    // Particles Expand
    .to(this.models.particlesGroup.scale, { x: 2, y: 2, z: 2 }, "<");


    // --- Timeline 4: The Final Collapse (75% - 100%) ---
    const tl4 = gsap.timeline({
        scrollTrigger: {
            trigger: "#scroll-space",
            start: "top+=75% top",
            end: "bottom bottom",
            scrub: 1.5, // A bit softer scrub for the final moment
        }
    });

    const collapseState = { progress: 0 };

    // 1. Run collapse update helper
    tl4.to(collapseState, {
        progress: 1,
        onUpdate: () => updateFinalCollapse(collapseState.progress),
        ease: "power3.in" // Accelerate into the collapse
    })
    // 2. Move camera FAR back
    .to(this.camera.position, { z: 30, ease: "power2.inOut" }, "<")
    // 3. Untwist camera
    .to(this.camera.rotation, { z: 0, ease: "power2.inOut" }, "<")
    // 4. Stabilize rotation into a fast, clean spin
    .to(this.models.group.rotation, { x: 0, z: 0, y: 0, ease: "power1.out" }, "<")
    // 5. Intensify glow drastically (super dense energy ball)
    .to(this.models.maceMaterial, { emissiveIntensity: 8 }, "<")
    // 6. Suck particles back in
    .to(this.models.particlesGroup.scale, { x: 0.5, y: 0.5, z: 0.5 }, "<")
    // 7. Fade out ambient light so only the glow remains
    .to(this.scene.children.find(c => c.isAmbientLight), { intensity: 0.6 }, "<");

  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.tiltGroup) {
      // Reduced tilt effect slightly for stability
      this.targetRotation.x = this.mousePosition.y * 0.1;
      this.targetRotation.y = this.mousePosition.x * 0.1;

      this.tiltGroup.rotation.x += (this.targetRotation.x - this.tiltGroup.rotation.x) * 0.05;
      this.tiltGroup.rotation.y += (this.targetRotation.y - this.tiltGroup.rotation.y) * 0.05;
    }

    if (this.models.particlesGroup) {
        this.models.particlesGroup.rotation.y += 0.001;
        this.models.particlesGroup.rotation.z -= 0.0005;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

new App();