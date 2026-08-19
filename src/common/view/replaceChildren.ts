/**
 * replaceChildren.ts
 *
 * Assigning `node.children = next` only detaches the previous children. Nodes
 * that linked to a Property (AtomNode colour, Path stroke, ArrowNode fill, …)
 * stay alive through that listener until `dispose()`. Views that rebuild on
 * every camera or slider sample must dispose the ones they drop, or a few
 * minutes of fuzz will OOM the tab.
 *
 * `Node.dispose()` itself only detaches descendants, so dropped children are
 * released with {@link Node.disposeSubtree}.
 */

import type { Node } from "scenerystack/scenery";

/**
 * Replaces `parent`'s children with `next`, disposing any node that is no
 * longer a child (and that node's descendants). Persistent children (handles,
 * palettes) can be passed through in `next` and are left alone.
 */
export function replaceChildren(parent: Node, next: readonly Node[]): void {
  const previous = parent.getChildren();
  const nextChildren = next.slice();
  parent.children = nextChildren;
  for (const child of previous) {
    if (!(nextChildren.includes(child) || child.isDisposed)) {
      child.disposeSubtree();
    }
  }
}
