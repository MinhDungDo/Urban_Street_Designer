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
    this.camera = new BABYLON.ArcRotateCamera('cam', -Math.PI / 2, Math.PI / 3, 200, BABYLON.Vector3.Zero(), this.scene);
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 2000;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.05;
    this.camera.wheelPrecision = 0.8;

    // Right-mouse = orbit (button 2), middle = pan
    this.camera.inputs.clear();
    const mouseInput = new BABYLON.ArcRotateCameraMouseWheelInput();
    this.camera.inputs.add(mouseInput);

    const pointerInput = new BABYLON.ArcRotateCameraPointersInput();
    // buttons: 0=left, 1=middle, 2=right
    // orbit on right-click (2), pan on middle (1)
    pointerInput.buttons = [2, 1];
    this.camera.inputs.add(pointerInput);

    this.camera.attachControl(this.engine.getRenderingCanvas()!, true);
    this.camera.panningSensibility = 80;
    this.camera.panningInertia = 0.9;
  }

  private setupLighting(): void {
    const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.5;
    ambient.diffuse = new BABYLON.Color3(0.9, 0.92, 1.0);
    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -1).normalize(), this.scene);
    sun.intensity = 0.8;
    sun.diffuse = new BABYLON.Color3(1, 0.97, 0.9);
  }

  private setupGround(): void {
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 4000, height: 4000 }, this.scene);
    const mat = new BABYLON.StandardMaterial('mat_ground', this.scene);
    mat.diffuseColor = new BABYLON.Color3(0.15, 0.18, 0.14);
    mat.specularColor = new BABYLON.Color3(0, 0, 0);
    ground.material = mat;
    ground.isPickable = false;
  }

  private setupPointerPicking(): void {
    // Left click (button 0) = select road only (camera uses right-click for orbit)
    this.scene.onPointerDown = (evt, pickResult) => {
      if (evt.button !== 0) return;
      if (pickResult.hit && pickResult.pickedMesh?.metadata?.roadId) {
        this.onRoadPicked?.(pickResult.pickedMesh.metadata.roadId as string);
      } else {
        this.onRoadPicked?.(null);
      }
    };
  }

  setOnRoadPicked(cb: OnRoadPickedCallback): void {
    this.onRoadPicked = cb;
  }

  loadScene(roads: RoadSegment[], buildings: Building[], trees: Tree[]): void {
    this.clearScene();
    for (const road of roads) {
      this.roadMeshGroups.set(road.id, this.roadGenerator.generate(road));
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
      for (const p of road.centerLinePoints) { sumX += p.x; sumZ += p.z; count++; }
    }
    if (count > 0) {
      this.camera.target = new BABYLON.Vector3(sumX / count, 0, sumZ / count);
      this.camera.radius = 300;
    }
  }

  clearScene(): void {
    for (const group of this.roadMeshGroups.values()) this.roadGenerator.dispose(group);
    this.roadMeshGroups.clear();
    for (const mesh of this.buildingMeshes.values()) this.buildingGenerator.dispose(mesh);
    this.buildingMeshes.clear();
    this.treeGenerator.disposeAll();
    this.selectedRoadId = null;
  }

  setSelectedRoad(id: string | null): void {
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
    if (existing) this.roadGenerator.dispose(existing);
    const newGroup = this.roadGenerator.generate(road);
    this.roadMeshGroups.set(road.id, newGroup);
    if (this.selectedRoadId === road.id) this.roadGenerator.setSelected(newGroup, true);
  }

  captureScreenshot(): Promise<string> {
    return new Promise((resolve) => {
      BABYLON.Tools.CreateScreenshotUsingRenderTarget(this.engine, this.camera, { width: 1920, height: 1080 }, (data) => {
        resolve(data);
      });
    });
  }

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
