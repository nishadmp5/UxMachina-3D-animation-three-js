import * as THREE from "three";
import Models from "./Models.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EasePack } from "gsap/EasePack";

gsap.registerPlugin(ScrollTrigger, EasePack);

class App {
  constructor() {
    this.scene = new THREE.Scene();

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

    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableDamping = true;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffe066, 5);
    directionalLight.position.set(-100, 50, -25);
    directionalLight.castShadow = true;

    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    (directionalLight.shadow.camera.near = 0.5),
      (directionalLight.shadow.camera.far = 150);

    this.camera.add(directionalLight);
    this.scene.add(this.camera);

    this.models = new Models();
    this.models.group.rotation.y = -0.75;

    this.models.group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.tiltGroup = new THREE.Group();
    this.tiltGroup.add(this.models.group)
    this.scene.add(this.tiltGroup);

    this.mousePosition = new THREE.Vector2();

    this.setupScrollAnimation();
    this.animate();
  }

  setupMouseListener(){
    window.addEventListener("mousemove",(event)=>{
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = (event.clientY / window.innerHeight) * 2 + 1;
    })
  }

  removeMouseListener(){
     window.removeEventListener("mousemove",(event)=>{
      this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = (event.clientY / window.innerHeight) * 2 + 1;
    })
  }

  setupScrollAnimation() {
    const direction = new THREE.Vector3(0, 1, 0);
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

    const jointState = { progress: 0 };

    const firstTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top top",
        end: "top+=10% top",
        onLeave: () => {
          gsap.to(jointState, {
            progress: 1,
            duration: 1.5,
            ease: "elastic.out",
            onUpdate: () => updateMaceJointAnimation(jointState.progress),
          });
         this.setupMouseListener();

        },
        onEnterBack: () => {
          gsap.to(jointState, {
            progress: 0,
            duration: 1.5,
            ease: "elastic.out",
            onUpdate: () => updateMaceJointAnimation(jointState.progress),
          });
          this.removeMouseListener()
        },
        scrub: 1.2,
      },
    });

    firstTimeline.to(this.models.group.rotation, {
      x: 0,
      z: 0.23,
      y: -0.4,
    });

    const revealState = { progress: 0 };

    firstTimeline.to(
      revealState,
      {
        progress: 1,
        duration: 2,
        ease: "power2.Out",
        onUpdate: () => updateMaceRevealAnimation(revealState.progress),
      },
      "<"
    );

    const maceScaleState = { progress: 0 };
    const secondTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "#scroll-space",
        start: "top+=10% top",
        // end: "bottom bottom",
        end: "top+=30% top",
        scrub: 1.2,
        onLeave: () => {
          gsap.to(maceScaleState, {
            progress: 1,
            duration: 2,
            ease: "elastic.out",
            onUpdate: () => {
              const lengthScale = THREE.MathUtils.lerp(
                1,
                1.8,
                maceScaleState.progress
              );
              this.models.rodes.forEach((rod) => {
                rod.scale.set(1, lengthScale, 1);
              });
                const newRodLength = this.models.rodLength * lengthScale;
              this.models.spheres.forEach((sphere)=>{
                sphere.position.y = newRodLength/2
              })
            },
          });
        },
        onEnterBack: () => {
          gsap.to(maceScaleState, {
            progress: 0,
            duration: 2,
            ease: "elastic.in",
            onUpdate: () => {
              const lengthScale = THREE.MathUtils.lerp(
                1,
                1.8,
                maceScaleState.progress
              );
              this.models.rodes.forEach((rod) => {
                rod.scale.set(1, lengthScale, 1);
              });
                const newRodLength = this.models.rodLength * lengthScale;
              this.models.spheres.forEach((sphere)=>{
                sphere.position.y = newRodLength/2
              })
            },
          });
        },
      },
    });

    secondTimeline.to(this.models.group.rotation, {
      x: -0.025,
      z: 0.9,
      y: -0.6,
    });

    secondTimeline.to(this.models.group.rotation, {
      x: 0.5,
      z: 1.4,
      y: 0.4,
    });
    secondTimeline.to(
      this.camera.position,
      {
        z: 11,
      },
      "<"
    );

    // secondTimeline.to(maceScaleState, {
    //   progress: 1,
    //   onUpdate: () => {},
    // });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if(this.tiltGroup){
      const targetRotationX = this.mousePosition.y * 0.1; 
        const targetRotationY = this.mousePosition.x * 0.3;

        // Animate the tiltGroup, leaving the models.group free for GSAP
        this.tiltGroup.rotation.x += (targetRotationX - this.tiltGroup.rotation.x) * 0.05;
        this.tiltGroup.rotation.y += (targetRotationY - this.tiltGroup.rotation.y) * 0.05;
    }
    // this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
