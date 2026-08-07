/**
 * MillerIndicesKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 *
 * This screen's play area is driven by draggable items — the three intercept
 * handles and the direction tip — so the move-draggable-items section is the one
 * that carries its real interaction. The right column covers tabbing between the
 * preset buttons and toggling the overlay check boxes.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class MillerIndicesKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [new MoveDraggableItemsKeyboardHelpSection()],
      [new BasicActionsKeyboardHelpSection({ withCheckboxContent: true })],
    );
  }
}
