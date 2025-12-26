import * as THREE from "three";

export default class Models {
  constructor() {
    this.group = new THREE.Group();
    this.particlesGroup = new THREE.Group(); // New Group for particles
    this.is_ready = false;
    this.maces = [];
    this.rodes = [];
    this.spheres = [];
    this.initialQuaternions = [];
    this.firstAnimationQuaternions = [];

    // CONTROL PROPERTIES
    this.sphereRadius = 1;
    this.rodLength = 4.5;
    this.rodRadius = 0.275;
    this.maceColor = 0xff6633;
    
    // GEOMETRY
    const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 32, 32);
    const rodGeometry = new THREE.CylinderGeometry(
      this.rodRadius,
      this.rodRadius,
      this.rodLength,
      32
    );

    // MATERIAL - Tweaked for better lighting response
    this.maceMaterial = new THREE.MeshStandardMaterial({
      color: this.maceColor,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0x9e2a00, // Base glow color (dark red/orange)
      emissiveIntensity: 0, // Starts off
    });

    // INITIAL POSITION
    this.initialRotations = [
      { x: 30, y: 0, z: 30 },
      { x: 30, y: 0, z: 30 },
      { x: -30, y: 0, z: -30 },
      { x: -30, y: 0, z: -30 },
      { x: 150, y: 0, z: 30 },
      { x: 150, y: 0, z: 30 },
      { x: -150, y: 0, z: -30 },
      { x: -150, y: 0, z: -30 },
    ];

    // FIRST ANIMATION ROTATION
    this.firstAnimationRotations = [
      { x: 45, y: 0, z: 15 },
      { x: 15, y: 0, z: 45 },
      { x: -15, y: 0, z: -45 },
      { x: -45, y: 0, z: -15 },
      { x: 135, y: 0, z: 15 },
      { x: -15, y: 0, z: 135 },
      { x: 15, y: 0, z: -135 }, 
      { x: -135, y: 0, z: -15 },
    ];

    this.initMaces(sphereGeometry, rodGeometry);
    this.initParticles(); // Initialize the new particles
    
    this.group.add(this.particlesGroup);
  }

  initMaces(sphereGeometry, rodGeometry) {
    for (let i = 0; i < this.initialRotations.length; i++) {
      const mace = this.createMace(sphereGeometry, rodGeometry, this.maceMaterial);

      const initial = this.initialRotations[i];
      const target = this.firstAnimationRotations[i];

      const initialQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(initial.x),
          THREE.MathUtils.degToRad(initial.y),
          THREE.MathUtils.degToRad(initial.z)
        )
      );

      const targetQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(target.x),
          THREE.MathUtils.degToRad(target.y),
          THREE.MathUtils.degToRad(target.z)
        )
      );

      this.initialQuaternions.push(initialQuaternion);
      this.firstAnimationQuaternions.push(targetQuaternion);

      mace.quaternion.copy(initialQuaternion);
      mace.translateY(3);

      this.group.add(mace);
      this.maces.push(mace);
    }
  }

  // NEW: Create floating dust/stars
  initParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);

    for(let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 25; // Spread area
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        sizeAttenuation: true,
        color: 0xffe066, // Matches your light color
        transparent: true,
        opacity: 0.6,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particlesGroup.add(this.particles);
  }

  createMace(sphereGeometry, rodGeometry, maceMaterial) {
    const maceGroup = new THREE.Group();
    const rod = this.createRod(rodGeometry, maceMaterial);
    const sphere = this.createSphere(sphereGeometry, maceMaterial);

    this.rodes.push(rod);
    this.spheres.push(sphere);

    sphere.position.y = this.rodLength / 2;
    maceGroup.add(rod);
    maceGroup.add(sphere);

    return maceGroup;
  }

  createSphere(geometry, material) {
    return new THREE.Mesh(geometry, material);
  }

  createRod(geometry, material) {
    return new THREE.Mesh(geometry, material);
  }
}