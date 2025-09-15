import * as THREE from "three";

export default class Models {
  constructor() {
    this.group = new THREE.Group();
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
    this.maceColor = 0xff6633                     ;
    const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 32, 32);
    const rodGeometry = new THREE.CylinderGeometry(
      this.rodRadius,
      this.rodRadius,
      this.rodLength,
      32
    );
    const maceMaterial = new THREE.MeshStandardMaterial({
      color: this.maceColor,
      metalness: 0.5,
      roughness: 0.8,
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

    for (let i = 0; i < this.initialRotations.length; i++) {
      const mace = this.createMace(sphereGeometry, rodGeometry, maceMaterial);

      // CONVERTS EULERS TO QUATERNIOS
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

  createMace(sphereGeometry, rodGeometry, maceMaterial) {
    const maceGroup = new THREE.Group();

    const rod = this.createRod(rodGeometry, maceMaterial);
    const sphere = this.createSphere(sphereGeometry, maceMaterial);

    this.rodes.push(rod);
    this.spheres.push(sphere)

    sphere.position.y = this.rodLength / 2;
    maceGroup.add(rod);
    maceGroup.add(sphere);

    return maceGroup;
  }

  createSphere(geometry, material) {
    const sphere = new THREE.Mesh(geometry, material);

    return sphere;
  }
  0;
  createRod(geometry, material) {
    const rod = new THREE.Mesh(geometry, material);

    return rod;
  }
}
