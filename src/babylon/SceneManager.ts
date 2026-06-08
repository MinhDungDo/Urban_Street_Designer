import * as BABYLON from '@babylonjs/core';
import { RoadGenerator, type RoadMeshGroup } from '../generators/RoadGenerator';
import { BuildingGenerator } from '../generators/BuildingGenerator';
import { TreeGenerator } from '../generators/TreeGenerator';
import type { RoadSegment } from '../domain/RoadSegment';
import type { Building } from '../domain/Building';
import type { Tree } from '../domain/Tree';

export type OnRoadPickedCallback = (roadId: string | null) => void;

export class SceneManager {
  public scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private camera!: BABYLON.ArcRotateCamera;
  private light!: BABYLON.DirectionalLight;
  private ground!: BABYLON.Mesh;

  private roadGenerator: RoadGenerator;
  private buildingGenerator: BuildingGenerator;
  private treeGenerator: TreeGenerator;

  private roadMeshGroups = new Map<string, RoadMeshGroup>();
  private buildingMeshes = new Map<string, BABYLON.Mesh>();

  private selectedRoadId: string | null = null;
  private onRoadPicked: OnRoadPickedCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = new BABYLON.Color4(0.12, 0.14, 0.16, 1);

    this.roadGenerator = new RoadGenerator(this.scene);
    this.buildingGenerator = new BuildingGenerator(this.scene);
    this.treeGenerator = new TreeGenerator(this.scene);

    this.setupCamera();
    this.setupLighting();
    this.setupGround();
    this.setupPointerPicking();
    this.startRenderLoop();
  }

  private setupCamera(): void {
    this.camera = new BABYLON.ArcRotateCamera(
      'cam',
      -Math.PI / 2,
      Math.PI / 3,
      200,
      BABYLON.Vector3.Zero(),
      this.scene
    );
    this.camera.lowerRadiusLimit = 20;
    this.camera.upperRadiusLimit = 2000;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.05;
    this.camera.panningSensibility = 100;
    this.camera.attachControl(this.engine.getRenderingCanvas()!, true);
    this.camera.wheelPrecision = 0.5;
  }

  private setupLighting(): void {
    // Ambient
    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.5;
    ambient.diffuse = new BABYLON.Color3(0.9, 0.92, 1.0);

    // Sun
    this.light = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -1).normalize(), this.scene);
    this.light.intensity = 0.8;
    this.light.diffuse = new BABYLON.Color3(1, 0.97, 0.9);
  }

  private setupGround(): void {
    this.ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 4000, height: 4000 }, this.scene);
    const mat = new BABYLON.StandardMaterial('mat_ground', this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.15, 0.18, 0.14);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    this.ground.material = mat;
    this.ground.isPickable = false;
  }

  private setupPointerPicking(): void {
    this.scene.onPointerDown = (evt, pickResult) => {
      if (evt.button !== 0) return;
      if (pickResult.hit && pickResult.pickedMesh?.metadata?.roadId) {
        const roadId = pickResult.pickedMesh.metadata.roadId as string;
        this.onRoadPicked?.(roadId);
      } else if (pickResult.hit && !pickResult.pickedMesh?.metadata?.roadId) {
        this.onRoadPicked?.(null);
      }
    };
  }

  setOnRoadPicked(cb: OnRoadPickedCallback): void {
    this.onRoadPicked = cb;
  }

  // ── Scene loading ─────────────────────────────────────────────────────────

  loadScene(roads: RoadSegment[], buildings: Building[], trees: Tree[]): void {
    this.clearScene();

    for (const road of roads) {
      const group = this.roadGenerator.generate(road);
      this.roadMeshGroups.set(road.id, group);
    }

    for (const building of buildings) {
      const mesh = this.buildingGenerator.generate(building);
      if (mesh) this.buildingMeshes.set(building.id, mesh);
    }

    this.treeGenerator.generateAll(trees);

    this.fitCamera(roads);
  }

  private fitCamera(roads: RoadSegment[]): void {
    if (roads.length === 0) return;
    let sumX = 0, sumZ = 0, count = 0;
    for (const road of roads) {
      for (const p of road.centerLinePoints) {
        sumX += p.x; sumZ += p.z; count++;
      }
    }
    if (count > 0) {
      this.camera.target = new BABYLON.Vector3(sumX / count, 0, sumZ / count);
      this.camera.radius = 300;
    }
  }

  clearScene(): void {
    for (const group of this.roadMeshGroups.values()) {
      this.roadGenerator.dispose(group);
    }
    this.roadMeshGroups.clear();

    for (const mesh of this.buildingMeshes.values()) {
      this.buildingGenerator.dispose(mesh);
    }
    this.buildingMeshes.clear();

    this.treeGenerator.disposeAll();
    this.selectedRoadId = null;
  }

  // ── Road editing ──────────────────────────────────────────────────────────

  setSelectedRoad(id: string | null): void {
    // Deselect previous
    if (this.selectedRoadId) {
      const prev = this.roadMeshGroups.get(this.selectedRoadId);
      if (prev) this.roadGenerator.setSelected(prev, false);
    }

    this.selectedRoadId = id;

    if (id) {
      const group = this.roadMeshGroups.get(id);
      if (group) this.roadGenerator.setSelected(group, true);
    }
  }

  rebuildRoad(road: RoadSegment): void {
    const existing = this.roadMeshGroups.get(road.id);
    if (existing) {
      this.roadGenerator.dispose(existing);
    }

    const newGroup = this.roadGenerator.generate(road);
    this.roadMeshGroups.set(road.id, newGroup);

    // Re-apply selection highlight if this is the selected road
    if (this.selectedRoadId === road.id) {
      this.roadGenerator.setSelected(newGroup, true);
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => this.scene.render());
  }

  handleResize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.engine.stopRenderLoop();
    this.clearScene();
    this.treeGenerator.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }
}
