import * as BABYLON from '@babylonjs/core';
import type { RoadSegment } from '../domain/RoadSegment';
import { computeRoadTotalWidth } from '../domain/RoadSegment';

export interface RoadMeshGroup {
  roadId: string;
  surface: BABYLON.Mesh;
  bikeLaneLeft?: BABYLON.Mesh;
  bikeLaneRight?: BABYLON.Mesh;
  sidewalkLeft: BABYLON.Mesh;
  sidewalkRight: BABYLON.Mesh;
  curbLeft: BABYLON.Mesh;
  curbRight: BABYLON.Mesh;
  root: BABYLON.TransformNode;
}

const CURB_HEIGHT = 0.15;
const CURB_WIDTH = 0.1;
const ROAD_Y = 0.01; // slight elevation above ground

export class RoadGenerator {
  private materials: {
    asphalt?: BABYLON.StandardMaterial;
    bike?: BABYLON.StandardMaterial;
    sidewalk?: BABYLON.StandardMaterial;
    curb?: BABYLON.StandardMaterial;
    selected?: BABYLON.StandardMaterial;
  } = {};

  constructor(private scene: BABYLON.Scene) {
    this.createMaterials();
  }

  private createMaterials(): void {
    const asphalt = new BABYLON.StandardMaterial('mat_asphalt', this.scene);
    asphalt.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.22);
    asphalt.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    this.materials.asphalt = asphalt;

    const bike = new BABYLON.StandardMaterial('mat_bike', this.scene);
    bike.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.35);
    this.materials.bike = bike;

    const sidewalk = new BABYLON.StandardMaterial('mat_sidewalk', this.scene);
    sidewalk.diffuseColor = new BABYLON.Color3(0.78, 0.74, 0.68);
    this.materials.sidewalk = sidewalk;

    const curb = new BABYLON.StandardMaterial('mat_curb', this.scene);
    curb.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    this.materials.curb = curb;

    const selected = new BABYLON.StandardMaterial('mat_selected', this.scene);
    selected.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0);
    selected.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.3);
    this.materials.selected = selected;
  }

  generate(road: RoadSegment): RoadMeshGroup {
    const root = new BABYLON.TransformNode(`road_root_${road.id}`, this.scene);

    const path = road.centerLinePoints.map((p) => new BABYLON.Vector3(p.x, ROAD_Y, p.z));

    const totalWidth = computeRoadTotalWidth(road);
    const laneZone = road.laneCount * road.laneWidth;
    const bikeW = road.bikeLaneEnabled ? road.bikeLaneWidth : 0;

    // Offsets from centerline (positive = left, negative = right in path-normal space)
    const surfaces = [
      // Road surface
      {
        key: 'surface',
        left: laneZone / 2 + bikeW,
        right: -(laneZone / 2 + bikeW),
        y: ROAD_Y,
        mat: this.materials.asphalt!,
        height: 0.02,
      },
    ];

    const surface = this.buildRibbonStrip(
      `road_surface_${road.id}`,
      path,
      laneZone / 2 + bikeW,
      -(laneZone / 2 + bikeW),
      0,
      this.materials.asphalt!
    );
    surface.parent = root;

    // Bike lanes
    let bikeLaneLeft: BABYLON.Mesh | undefined;
    let bikeLaneRight: BABYLON.Mesh | undefined;

    if (road.bikeLaneEnabled) {
      bikeLaneLeft = this.buildRibbonStrip(
        `road_bike_left_${road.id}`,
        path,
        laneZone / 2 + bikeW,
        laneZone / 2,
        0.01,
        this.materials.bike!
      );
      bikeLaneLeft.parent = root;

      bikeLaneRight = this.buildRibbonStrip(
        `road_bike_right_${road.id}`,
        path,
        -laneZone / 2,
        -(laneZone / 2 + bikeW),
        0.01,
        this.materials.bike!
      );
      bikeLaneRight.parent = root;
    }

    // Sidewalks
    const sidewalkYOffset = 0.05;
    const leftStart = laneZone / 2 + bikeW + road.sidewalkLeftWidth;
    const leftEnd = laneZone / 2 + bikeW;
    const sidewalkLeft = this.buildRibbonStrip(
      `road_sw_left_${road.id}`,
      path,
      leftStart,
      leftEnd,
      sidewalkYOffset,
      this.materials.sidewalk!
    );
    sidewalkLeft.parent = root;

    const rightStart = -(laneZone / 2 + bikeW);
    const rightEnd = -(laneZone / 2 + bikeW + road.sidewalkRightWidth);
    const sidewalkRight = this.buildRibbonStrip(
      `road_sw_right_${road.id}`,
      path,
      rightStart,
      rightEnd,
      sidewalkYOffset,
      this.materials.sidewalk!
    );
    sidewalkRight.parent = root;

    // Curbs
    const curbLeft = this.buildRibbonStrip(
      `road_curb_left_${road.id}`,
      path,
      leftEnd + CURB_WIDTH,
      leftEnd,
      CURB_HEIGHT,
      this.materials.curb!
    );
    curbLeft.parent = root;

    const curbRight = this.buildRibbonStrip(
      `road_curb_right_${road.id}`,
      path,
      rightStart,
      rightStart - CURB_WIDTH,
      CURB_HEIGHT,
      this.materials.curb!
    );
    curbRight.parent = root;

    const group: RoadMeshGroup = {
      roadId: road.id,
      surface,
      bikeLaneLeft,
      bikeLaneRight,
      sidewalkLeft,
      sidewalkRight,
      curbLeft,
      curbRight,
      root,
    };

    // Make surface pickable for selection
    surface.metadata = { roadId: road.id };
    surface.isPickable = true;

    return group;
  }

  setSelected(group: RoadMeshGroup, selected: boolean): void {
    group.surface.material = selected ? this.materials.selected! : this.materials.asphalt!;
  }

  dispose(group: RoadMeshGroup): void {
    group.root.getChildMeshes().forEach((m) => m.dispose());
    group.root.dispose();
  }

  /**
   * Build a ribbon strip following a path with left/right offsets in the normal direction.
   * leftOffset and rightOffset are signed distances from the centerline.
   */
  private buildRibbonStrip(
    name: string,
    path: BABYLON.Vector3[],
    leftOffset: number,
    rightOffset: number,
    yElevation: number,
    material: BABYLON.StandardMaterial
  ): BABYLON.Mesh {
    if (path.length < 2) {
      // Degenerate path - create a tiny invisible mesh
      const m = BABYLON.MeshBuilder.CreateBox(name, { size: 0.01 }, this.scene);
      m.isVisible = false;
      return m;
    }

    const leftPath: BABYLON.Vector3[] = [];
    const rightPath: BABYLON.Vector3[] = [];

    for (let i = 0; i < path.length; i++) {
      const normal = this.computeNormal(path, i);
      const leftPt = path[i].add(normal.scale(leftOffset)).add(new BABYLON.Vector3(0, yElevation, 0));
      const rightPt = path[i].add(normal.scale(rightOffset)).add(new BABYLON.Vector3(0, yElevation, 0));
      leftPath.push(leftPt);
      rightPath.push(rightPt);
    }

    const mesh = BABYLON.MeshBuilder.CreateRibbon(
      name,
      {
        pathArray: [leftPath, rightPath],
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        updatable: false,
      },
      this.scene
    );
    mesh.material = material;
    mesh.receiveShadows = true;
    return mesh;
  }

  private computeNormal(path: BABYLON.Vector3[], i: number): BABYLON.Vector3 {
    let dir: BABYLON.Vector3;

    if (path.length === 1) {
      dir = BABYLON.Vector3.Forward();
    } else if (i === 0) {
      dir = path[1].subtract(path[0]).normalize();
    } else if (i === path.length - 1) {
      dir = path[i].subtract(path[i - 1]).normalize();
    } else {
      dir = path[i + 1].subtract(path[i - 1]).normalize();
    }

    // Perpendicular in XZ plane (left normal)
    return new BABYLON.Vector3(-dir.z, 0, dir.x).normalize();
  }
}
