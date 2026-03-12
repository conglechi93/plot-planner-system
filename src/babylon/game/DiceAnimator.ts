/**
 * DiceAnimator
 *
 * Loads dice.glb, creates two clone instances and plays a physics-like
 * fall-and-bounce animation.  The dice land showing the exact face that
 * was pre-rolled by the reducer.
 *
 * Usage:
 *   const animator = new DiceAnimator(scene);
 *   await animator.preload();            // prime the asset cache
 *   await animator.rollDice(3, 5);       // animate + resolve when settled
 *   // dice stay visible; call rollDice() again or dispose() to clean up
 */

import {
  Scene,
  Vector3,
  Animation,
  TransformNode,
  SineEase,
  CubicEase,
  EasingFunction,
} from '@babylonjs/core';
import { getContainer } from '../../utils/containerCache';

// ---------------------------------------------------------------------------
// Face-up rotations (Euler XYZ) for each die value 1-6.
//
// These assume the standard Blender / three.js die export convention:
//   face 1 → +Y   face 6 → -Y
//   face 2 → -Z   face 5 → +Z
//   face 3 → -X   face 4 → +X
//
// If the actual dice.glb was exported differently, tweak these offsets.
// ---------------------------------------------------------------------------
const FACE_ROT: Record<number, Vector3> = {
  1: new Vector3(0,               0, 0),
  2: new Vector3(-Math.PI / 2,    0, 0),
  3: new Vector3(0,               0,  Math.PI / 2),
  4: new Vector3(0,               0, -Math.PI / 2),
  5: new Vector3( Math.PI / 2,    0, 0),
  6: new Vector3( Math.PI,        0, 0),
};

const GLB_PATH    = '/models/common/dice.glb';
const ANIM_FPS    = 60;
const FALL_FRAMES = 60;   // frame when die first touches ground
const BOUNCE1_UP  = 68;   // peak of 1st bounce
const BOUNCE1_DN  = 76;   // 2nd landing
const BOUNCE2_UP  = 81;   // peak of 2nd (small) bounce
const SETTLE_FRAME= 88;   // final rest
const SPIN_EXTRA  = 5;    // extra full rotations during fall (for visual variety)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePositionAnim(id: string, x: number): Animation {
  const anim = new Animation(
    `dicePos_${id}`, 'position', ANIM_FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );

  // Gravity-like ease-in for the fall portion only.
  const gravEase = new CubicEase();
  gravEase.setEasingMode(EasingFunction.EASINGMODE_EASEIN);
  anim.setEasingFunction(gravEase);

  anim.setKeys([
    { frame: 0,            value: new Vector3(x,  6.5,  0.4) },
    { frame: FALL_FRAMES,  value: new Vector3(x,  0.6,  0.0) },  // first land
    { frame: BOUNCE1_UP,   value: new Vector3(x,  1.4,  0.0) },  // bounce up
    { frame: BOUNCE1_DN,   value: new Vector3(x,  0.6,  0.0) },  // back down
    { frame: BOUNCE2_UP,   value: new Vector3(x,  0.9,  0.0) },  // small bounce
    { frame: SETTLE_FRAME, value: new Vector3(x,  0.6,  0.0) },  // rest
  ]);

  return anim;
}

function makeRotationAnim(id: string, faceValue: number): Animation {
  const anim = new Animation(
    `diceRot_${id}`, 'rotation', ANIM_FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CONSTANT,
  );

  // Ease-out: starts spinning fast, decelerates to face-up orientation.
  const spinEase = new SineEase();
  spinEase.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  anim.setEasingFunction(spinEase);

  const face = FACE_ROT[faceValue] ?? FACE_ROT[1];

  // Accumulate many full rotations so the die clearly tumbles, then land
  // exactly on the desired face.  Using different multipliers per axis
  // makes the motion look organic rather than axially aligned.
  const TAU = 2 * Math.PI;
  const bigRot = new Vector3(
    face.x + TAU * (SPIN_EXTRA * 6 + 1),
    face.y + TAU * (SPIN_EXTRA * 4),
    face.z + TAU * (SPIN_EXTRA * 5 + 2),
  );

  anim.setKeys([
    { frame: 0,            value: Vector3.Zero() },
    { frame: FALL_FRAMES,  value: bigRot          },  // settle into face on land
    { frame: SETTLE_FRAME, value: bigRot          },  // hold through bounces
  ]);

  return anim;
}

// ---------------------------------------------------------------------------
// DiceAnimator class
// ---------------------------------------------------------------------------

export class DiceAnimator {
  /** Currently live die root nodes (TransformNode from GLB). */
  private nodes: Array<TransformNode | null> = [null, null];
  private preloaded = false;

  constructor(private scene: Scene) {}

  // ── Public API ────────────────────────────────────────────────────────────

  /** Prime the asset container cache so the first roll has no stutter. */
  async preload(): Promise<void> {
    if (this.preloaded) return;
    try {
      await getContainer(this.scene, GLB_PATH);
      this.preloaded = true;
    } catch (err) {
      console.warn('[DiceAnimator] preload failed – dice animation disabled', err);
    }
  }

  /**
   * Show a dice-roll animation for two values, resolve when both dice have
   * settled.  The dice remain visible after the promise resolves (showing
   * the rolled face) until the next rollDice() call or dispose().
   */
  async rollDice(value1: number, value2: number): Promise<void> {
    // Remove any previous dice from the scene.
    this.clearNodes();

    let node1: TransformNode | null = null;
    let node2: TransformNode | null = null;

    try {
      const container = await getContainer(this.scene, GLB_PATH);

      // Instantiate two independent copies.
      const inst1 = container.instantiateModelsToScene(n => `die0_${n}`);
      const inst2 = container.instantiateModelsToScene(n => `die1_${n}`);

      node1 = inst1.rootNodes[0] as TransformNode ?? null;
      node2 = inst2.rootNodes[0] as TransformNode ?? null;
    } catch (err) {
      console.warn('[DiceAnimator] rollDice: could not load dice.glb', err);
      return; // animation skipped; game logic continues as normal
    }

    if (!node1 || !node2) return;

    // Scale the dice to something readable on the board.
    node1.scaling.setAll(0.7);
    node2.scaling.setAll(0.7);

    this.nodes = [node1, node2];

    // Run both animations in parallel; wait for the slower one.
    await Promise.all([
      this.animateNode(node1, 'L', -1.2, value1),
      this.animateNode(node2, 'R',  1.2, value2),
    ]);
  }

  /** Remove both die meshes from the scene. */
  dispose(): void {
    this.clearNodes();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private clearNodes(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n) {
        n.getChildMeshes(false).forEach(m => {
          m.material?.dispose();
          m.dispose();
        });
        n.dispose();
        this.nodes[i] = null;
      }
    }
  }

  private animateNode(
    node: TransformNode,
    id: string,
    x: number,
    faceValue: number,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      // Attach keyframe animations to the node.
      node.animations = [
        makePositionAnim(id, x),
        makeRotationAnim(id, faceValue),
      ];

      const totalMs = (SETTLE_FRAME / ANIM_FPS) * 1000;

      // beginAnimation returns an Animatable; we use the onAnimationEnd callback.
      this.scene.beginAnimation(
        node,
        0,
        SETTLE_FRAME,
        false,  // loop
        1,      // speed ratio
        () => resolve(),
      );

      // Safety fallback in case the callback never fires (scene paused, etc.).
      setTimeout(() => resolve(), totalMs + 500);
    });
  }
}
