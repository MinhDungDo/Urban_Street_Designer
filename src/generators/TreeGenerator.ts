import * as BABYLON from '@babylonjs/core';
import type { Tree } from '../domain/Tree';

export class TreeGenerator {
  private trunkMesh: BABYLON.Mesh | null = null;
  private canopyMesh: BABYLON.Mesh | null = null;
  private instances: BABYLON.InstancedMesh[] = [];

  constructor(private scene: BABYLON.Scene) {
    this.createTemplateMeshes();
  }

  private createTemplateMeshes(): void {
    const trunkMat = new BABYLON.StandardMaterial('mat_trunk', this.scene);
    trunkMat.diffuseColor = new BABYLON.Color3(0.4, 0.25, 0.1);

    const canopyMat = new BABYLON.StandardMaterial('mat_canopy', this.scene);
    canopyMat.diffuseColor = new BABYLON.Color3(0.2, 0.5, 0.2);

    this.trunkMesh = BABYLON.MeshBuilder.CreateCylinder(
      'tree_trunk_template',
      { height: 2.5, diameterTop: 0.2, diameterBottom: 0.35, tessellation: 6 },
      this.scene
    );
    this.trunkMesh.material = trunkMat;
    this.trunkMesh.isVisible = false;
    this.trunkMesh.isPickable = false;

    // Low-poly canopy using a slightly irregular sphere
    this.canopyMesh = BABYLON.MeshBuilder.CreateSphere(
      'tree_canopy_template',
      { diameter: 4, segments: 4 },
      this.scene
    );
    this.canopyMesh.material = canopyMat;
    this.canopyMesh.isVisible = false;
    this.canopyMesh.isPickable = false;
  }

  generateAll(trees: Tree[]): void {
    this.disposeAll();

    if (!this.trunkMesh || !this.canopyMesh) return;

    for (const tree of trees) {
      const trunkInst = this.trunkMesh.createInstance(`trunk_${tree.id}`);
      trunkInst.position = new BABYLON.Vector3(tree.position.x, 1.25, tree.position.z);
      trunkInst.isPickable = false;

      const canopyInst = this.canopyMesh.createInstance(`canopy_${tree.id}`);
      canopyInst.position = new BABYLON.Vector3(tree.position.x, 4.5, tree.position.z);
      canopyInst.isPickable = false;

      this.instances.push(trunkInst, canopyInst);
    }
  }

  disposeAll(): void {
    this.instances.forEach((i) => i.dispose());
    this.instances = [];
  }

  dispose(): void {
    this.disposeAll();
    this.trunkMesh?.dispose();
    this.canopyMesh?.dispose();
  }
}
