import * as T from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const palette = ["#b9d9b2", "#f7ba68", "#b999df", "#819295"].map(
  (x) => new T.Color(x),
);
const datePalette = ["#68a9db", "#c49bc9", "#dca64c", "#78b8a6", "#dc8fa7"].map(
  (x) => new T.Color(x),
);
const spectral = ["#9386ce", "#72b0c7", "#65c4bd", "#bbd184", "#f3dd88"].map(
  (x) => new T.Color(x),
);
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

/** A local-coordinate point viewer. Display points never produce chart statistics. */
export class CloudScene {
  constructor(container, data, onSample) {
    this.container = container;
    this.data = data;
    this.cache = new Map();
    this.version = 0;
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x0b2425, 0);
    this.canvas = this.renderer.domElement;
    this.canvas.id = "point-scene";
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute(
      "aria-label",
      "3D point cloud. Drag to rotate, right-drag or two fingers to pan, wheel or pinch to zoom. Scroll outside the cloud to read on. Arrow keys rotate, plus and minus zoom, Home resets the view.",
    );
    container.append(this.canvas);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(37, 1, 0.05, 500);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(42, -45, 5);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.target.set(0, 0, -10);
    this.controls.minDistance = 0.6;
    this.controls.maxDistance = 180;
    this.controls.enableDamping = false;
    this.controls.dampingFactor = 0.16;
    this.manual = false;
    this.controls.update();
    this.controls.addEventListener("start", () => this.holdView());
    this.controls.addEventListener("change", () => {
      if (!this.ticking) this.wake();
    });
    this.goalPosition = this.camera.position.clone();
    this.goalTarget = this.controls.target.clone();
    this.markers = new T.Group();
    this.scene.add(this.markers);
    const ray = new T.Raycaster();
    let down;
    this.canvas.addEventListener("pointerdown", (e) => {
      down = [e.clientX, e.clientY];
    });
    this.canvas.addEventListener("pointerup", (e) => {
      if (
        !this.controls.enabled ||
        !down ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5
      )
        return;
      const r = this.canvas.getBoundingClientRect();
      ray.setFromCamera(
        new T.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - ((e.clientY - r.top) / r.height) * 2,
        ),
        this.camera,
      );
      const hit = ray
        .intersectObjects(this.markers.children)
        .find((h) => h.object.userData.sample);
      if (hit) onSample(hit.object.userData.sample);
    });
    this.canvas.addEventListener("keydown", (e) => {
      if (!this.controls.enabled) return;
      const offset = this.camera.position.clone().sub(this.controls.target);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight")
        offset.applyAxisAngle(
          new T.Vector3(0, 0, 1),
          e.key === "ArrowLeft" ? 0.12 : -0.12,
        );
      else if (e.key === "ArrowUp" || e.key === "ArrowDown")
        offset.z += e.key === "ArrowUp" ? 1 : -1;
      else if (e.key === "+" || e.key === "=") offset.multiplyScalar(0.88);
      else if (e.key === "-") offset.multiplyScalar(1.12);
      else if (e.key === "Home") {
        this.reset();
        e.preventDefault();
        return;
      } else return;
      e.preventDefault();
      this.holdView();
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
      this.render();
    });
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      container.dispatchEvent(
        new CustomEvent("scene-error", {
          detail:
            "The 3D graphics context was interrupted. Reload to restore it; the story and results remain available.",
        }),
      );
    });
    new ResizeObserver(() => {
      const w = container.clientWidth,
        h = container.clientHeight;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.render();
    }).observe(container);
    reduced.addEventListener("change", () => {
      this.controls.enableDamping = this.manual && !reduced.matches;
      this.wake();
    });
  }

  async load(entry, alignment = false) {
    if (this.cache.has(entry.file)) return this.cache.get(entry.file);
    const promise = (async () => {
      const response = await fetch(entry.file);
      if (!response.ok) throw new Error("Unable to load point data");
      const buffer = await response.arrayBuffer(),
        n = entry.n;
      if (buffer.byteLength !== n * (alignment ? 28 : 24))
        throw new Error("Incomplete point data");
      if (alignment)
        return {
          before: new Float32Array(buffer, 0, 3 * n),
          after: new Float32Array(buffer, 12 * n, 3 * n),
          dates: new Uint8Array(buffer, 24 * n, n),
          n,
        };
      return {
        xyz: new Float32Array(buffer, 0, 3 * n),
        reflectance: new Float32Array(buffer, 12 * n, n),
        flags: new Uint8Array(buffer, 20 * n, n),
        channels: new Uint8Array(buffer, 21 * n, n),
        materials: new Uint8Array(buffer, 22 * n, n),
        n,
      };
    })();
    this.cache.set(entry.file, promise);
    if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value);
    try {
      return await promise;
    } catch (e) {
      this.cache.delete(entry.file);
      throw e;
    }
  }

  async show(state) {
    const version = ++this.version;
    const alignment = state.view === "alignment";
    const tower = this.data.towers[state.tower];
    const entry = alignment
      ? this.data.alignment
      : tower.clouds.find((x) => x.date === state.date);
    // Keep the last complete snapshot visible while the next one loads.
    const points = await this.load(entry, alignment);
    if (version !== this.version) return null;
    const positions = [],
      colors = [];
    const color = new T.Color();
    for (let i = 0; i < points.n; i++) {
      let xyz;
      if (alignment) {
        xyz = state.endpoint === "before" ? points.before : points.after;
        color.copy(datePalette[points.dates[i]]);
      } else {
        const f = points.flags[i];
        if (
          (state.cleaning === "default_structure" ||
            state.cleaning === "default_both") &&
          f & 1
        )
          continue;
        if (
          (state.cleaning === "no_wood" || state.cleaning === "default_both") &&
          f & 2
        )
          continue;
        if (
          state.channel !== "all" &&
          (!(f & 4) || points.channels[i] !== Number(state.channel))
        )
          continue;
        xyz = points.xyz;
        if (state.channel === "all") color.copy(palette[points.materials[i]]);
        else {
          const v = points.reflectance[i] / 25,
            j = Math.min(3, Math.floor(v));
          color.copy(spectral[j]).lerp(spectral[j + 1], v - j);
        }
      }
      positions.push(xyz[3 * i], xyz[3 * i + 1], xyz[3 * i + 2]);
      colors.push(color.r, color.g, color.b);
    }
    const geom = new T.BufferGeometry();
    geom.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    const material = new T.PointsMaterial({
      size: state.pointSize || 1.5,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: reduced.matches ? 1 : 0.35,
    });
    if (this.cloud) {
      this.scene.remove(this.cloud);
      this.cloud.geometry.dispose();
      this.cloud.material.dispose();
    }
    this.cloud = new T.Points(geom, material);
    this.scene.add(this.cloud);
    this.setSamples(tower.samples, !alignment && state.samples);
    this.canvas.dataset.tower = state.tower;
    this.canvas.dataset.date = alignment ? "five-date-alignment" : state.date;
    this.canvas.dataset.visiblePoints = String(positions.length / 3);
    this.canvas.dataset.cleaning = state.cleaning;
    this.canvas.dataset.channel = state.channel;
    this.canvas.dataset.endpoint = state.endpoint;
    this.wake();
    return positions.length / 3;
  }

  setSamples(samples, visible) {
    for (const object of [...this.markers.children]) {
      this.markers.remove(object);
      object.geometry.dispose();
      object.material.dispose();
    }
    this.markers.visible = visible;
    if (!visible) return;
    for (const sample of samples) {
      const vertices = [];
      for (let i = 0; i < 8; i++)
        for (const bit of [1, 2, 4])
          if (i < (i ^ bit))
            vertices.push(...sample.corners[i], ...sample.corners[i ^ bit]);
      const box = new T.LineSegments(
        new T.BufferGeometry().setAttribute(
          "position",
          new T.Float32BufferAttribute(vertices, 3),
        ),
        new T.LineBasicMaterial({
          color: 0xffeeae,
          transparent: true,
          opacity: 0.8,
          depthTest: false,
        }),
      );
      const marker = new T.Mesh(
        new T.SphereGeometry(0.16, 10, 8),
        new T.MeshBasicMaterial({ color: 0xffeeae, depthTest: false }),
      );
      marker.position.fromArray(sample.position);
      marker.userData.sample = sample.id;
      marker.renderOrder = 2;
      this.markers.add(box, marker);
    }
  }

  inspect(value) {
    this.canvas.dataset.inspect = String(value);
  }

  holdView() {
    this.manual = true;
    this.focusPosition = null;
    this.controls.enableDamping = !reduced.matches;
    this.cameraMode();
  }

  reset() {
    // Flush any remaining gesture inertia before restoring the guided view.
    this.controls.enableDamping = false;
    this.controls.update();
    this.manual = false;
    this.focusPosition = null;
    this.cameraMode();
    this.wake();
  }

  cameraMode() {
    this.canvas.dataset.cameraMode = this.manual ? "manual" : "guided";
    this.container.dispatchEvent(
      new CustomEvent("camera-mode", {
        detail: this.canvas.dataset.cameraMode,
      }),
    );
  }

  view(pose, progress = 0) {
    const heading =
      pose.heading + (reduced.matches ? 0 : (progress - 0.5) * 0.16);
    this.goalTarget.set(0, 0, pose.z);
    this.goalPosition.set(
      Math.sin(heading) * pose.range,
      -Math.cos(heading) * pose.range,
      pose.z + pose.range * pose.elevation,
    );
    if (!this.manual) this.wake();
  }

  focus(position) {
    this.holdView();
    this.focusTarget = new T.Vector3().fromArray(position);
    this.focusPosition = this.focusTarget.clone().add(new T.Vector3(4, -5, 2));
    this.wake();
  }

  wake() {
    if (this.frame || this.ticking) return;
    let previous = performance.now();
    const tick = (now) => {
      this.frame = null;
      this.ticking = true;
      const elapsed = Math.min(now - previous, 64);
      const step = reduced.matches ? 1 : 1 - Math.exp(-elapsed / 260);
      previous = now;
      const destination =
        this.focusPosition || (!this.manual && this.goalPosition);
      const target = this.focusPosition ? this.focusTarget : this.goalTarget;
      let moving = false;
      if (destination) {
        this.controls.enableDamping = false;
        this.camera.position.lerp(destination, step);
        this.controls.target.lerp(target, step);
        moving =
          this.camera.position.distanceTo(destination) > 0.001 ||
          this.controls.target.distanceTo(target) > 0.001;
        if (!moving) {
          this.camera.position.copy(destination);
          this.controls.target.copy(target);
          this.focusPosition = null;
        }
      }
      this.controls.dampingFactor = 1 - Math.exp(-elapsed / 85);
      const orbiting = this.controls.update();
      if (!destination) moving = orbiting;
      if (this.cloud)
        this.cloud.material.opacity = Math.min(
          1,
          this.cloud.material.opacity + (reduced.matches ? 1 : elapsed / 420),
        );
      this.render();
      this.ticking = false;
      if (moving || (this.cloud && this.cloud.material.opacity < 1))
        this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.canvas.dataset.camera = this.camera.position
      .toArray()
      .map((x) => x.toFixed(3))
      .join(",");
    this.canvas.dataset.target = this.controls.target
      .toArray()
      .map((x) => x.toFixed(3))
      .join(",");
  }
}
