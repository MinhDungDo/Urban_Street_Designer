import * as BABYLON from '@babylonjs/core';
import type { Building } from '../domain/Building';

export class BuildingGenerator {
  private material!: BABYLON.StandardMaterial;
  private roofMaterial!: BABYLON.StandardMaterial;

  constructor(private scene: BABYLON.Scene) {
    this.createMaterials();
  }

  private createMaterials(): void {
    const mat = new BABYLON.StandardMaterial('mat_building', this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.82, 0.78, 0.72);
    mat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this.material = mat;

    const roof = new BABYLON.StandardMaterial('mat_roof', this.scene);
    roof.diffuseColor = new BABYLON.Color3(0.55, 0.52, 0.5);
    this.roofMaterial = roof;
  }

  generate(building: Building): BABYLON.Mesh | null {
    const pts = building.footprintPolygon;
    if (pts.length < 3) return null;

    // Convert to Babylon polygon shape (XZ plane, Y is up)
    const shape = pts.map((p) => new BABYLON.Vector3(p.x, 0, p.z));

    // Close polygon if not closed
    const first = shape[0];
    const last = shape[shape.length - 1];
    if (Math.abs(first.x - last.x) > 0.001 || Math.abs(first.z - last.z) > 0.001) {
      shape.push(first.clone());
    }

    try {
      // Use ExtrudePolygon — requires EarCut
      // Babylon uses a 2D polygon in the XZ plane
      const poly2d = pts.map((p) => new BABYLON.Vector2(p.x, p.z));

      const mesh = BABYLON.MeshBuilder.ExtrudePolygon(
        `building_${building.id}`,
        {
          shape: poly2d.map((v) => new BABYLON.Vector3(v.x, 0, v.y)),
          depth: building.height,
          sideOrientation: BABYLON.Mesh.FRONTSIDE,
          updatable: false,
        },
        this.scene
      );

      // ExtrudePolygon extrudes downward, flip it up
      mesh.position.y = building.height;
      mesh.material = this.material;
      mesh.receiveShadows = true;
      mesh.metadata = { buildingId: building.id };
      mesh.isPickable = false;

      return mesh;
    } catch {
      // Fallback for complex polygons: skip silently
      return null;
    }
  }

  dispose(mesh: BABYLON.Mesh): void {
    mesh.dispose();
  }
}
