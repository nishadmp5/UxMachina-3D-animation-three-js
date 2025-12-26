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
        const distance = THREE.MathUtils.lerp(3, 2, progress);
        mace.position.copy(direction.multiplyScalar(distance));
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

    // --- NEW Helper for Final Collapse ---
    const finalRodLength = this.models.rodLength * 1.8; // Length at end of tl2
    const sphereStartY = finalRodLength / 2; 

    const updateFinalCollapse = (progress) => {
        // 1. Shrink rods to zero scale
        const rodScale = THREE.MathUtils.lerp(1.8, 0, progress);
        this.models.rodes.forEach(rod => rod.scale.set(1, rodScale, 1));

        // 2. Move spheres to local 0,0,0 and scale them UP into one big ball
        const sphereCurrentY = THREE.MathUtils.lerp(sphereStartY, 0, progress);
        const sphereFinalScale = THREE.MathUtils.lerp(1, 4, progress); // Scale up to 4x

        this.models.spheres.forEach(sphere => {
             sphere.position.y = sphereCurrentY;
             sphere.scale.set(sphereFinalScale, sphereFinalScale, sphereFinalScale);
        });

        // 3. Move the Mace Groups to absolute center
        this.models.maces.forEach(mace => {
            // Current distance is approx 2. Target is 0.
            const currentDist = mace.position.length();
            const newDist = THREE.MathUtils.lerp(currentDist, 0, progress);
            mace.position.setLength(newDist);
        });
    }


    // --- Timeline 1: The Assemble (0% - 15%) ---
    const tl1 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top top",
        end: "top+=15% top",
        scrub: 1,
      },
    });
    const revealState = { progress: 0 };
    const jointState = { progress: 0 };
    tl1.to(revealState, { progress: 1, duration: 2, onUpdate: () => updateMaceRevealAnimation(revealState.progress) })
       .to(this.models.group.rotation, { x: 0, z: 0.23, y: -0.4, duration: 2 }, "<")
       .to(jointState, { progress: 1, duration: 1, ease: "elastic.out(1, 0.5)", onUpdate: () => updateMaceJointAnimation(jointState.progress) });

    // --- Timeline 2: The Expansion & Glow (15% - 40%) ---
    const tl2 = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-space",
          start: "top+=15% top",
          end: "top+=40% top",
          scrub: 1,
        },
    });
    const maceScaleState = { progress: 0 };
    tl2.to(maceScaleState, { progress: 1, onUpdate: () => updateRodScaleAnimation(maceScaleState.progress) })
       .to(this.models.group.rotation, { x: 0.5, z: 1.4, y: 0.4 }, "<")
       .to(this.camera.position, { z: 11 }, "<")
       .to(this.models.maceMaterial, { emissiveIntensity: 2.5 }, "<");


    // --- Timeline 3: The Vortex Zoom In (40% - 65%) ---
    const tl3 = gsap.timeline({
        scrollTrigger: {
          trigger: "#scroll-space",
          start: "top+=40% top",
          end: "top+=65% top",
          scrub: 1,
        },
    });
    tl3.to(this.models.group.rotation, { z: 3.5, y: 2, ease: "power2.inOut" })
       .to(this.camera.position, { z: 4, ease: "power2.in" }, "<")
       .to(this.camera.rotation, { z: -0.5 }, "<")
       .to(this.models.particlesGroup.scale, { x: 2, y: 2, z: 2 }, "<");

    // --- Timeline 4: Final Collapse into Single Ball (65% - 100%) ---
    const tl4 = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top+=65% top",
        end: "bottom bottom",
        scrub: 1,
      },
    });

    const collapseState = { progress: 0 };

    // 1. Zoom Camera Far Out and reset rotation
    tl4.to(this.camera.position, { z: 35, duration: 3, ease: "power2.inOut" })
       .to(this.camera.rotation, { z: 0, duration: 3, ease: "power2.inOut" }, "<")
       // 2. Collapse maces into one big sphere
       .to(collapseState, { 
           progress: 1, 
           duration: 3, 
           ease: "power2.inOut",
           onUpdate: () => updateFinalCollapse(collapseState.progress)
       }, "<0.5") // Start slightly after camera begins moving
       // 3. Intensify glow for final sphere
       .to(this.models.maceMaterial, { emissiveIntensity: 5 }, "<")
       // 4. Rotate the final ball gently
       .to(this.models.group.rotation, { y: "+=2", x: "+=0.5", duration: 3}, "<");

  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.tiltGroup) {
      this.targetRotation.x = this.mousePosition.y * 0.15;
      this.targetRotation.y = this.mousePosition.x * 0.15;
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