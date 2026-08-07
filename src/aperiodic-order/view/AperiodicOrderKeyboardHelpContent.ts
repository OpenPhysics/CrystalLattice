/**
 * AperiodicOrderKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 *
 * The hand-placement board is reachable without a pointer — the palette tiles and
 * every candidate slot are buttons — so the basic-actions section, which covers
 * tabbing between buttons and toggling check boxes, is what this screen's
 * interaction actually needs. There are no sliders or combo boxes here.
 */

import { BasicActionsKeyboardHelpSection, TwoColumnKeyboardHelpContent } from "scenerystack/scenery-phet";

export class AperiodicOrderKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super([new BasicActionsKeyboardHelpSection({ withCheckboxContent: true })], []);
  }
}
