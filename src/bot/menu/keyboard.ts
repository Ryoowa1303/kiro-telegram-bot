/**
 * The always-visible reply keyboard shown beneath the message box.
 */
import { Keyboard } from "grammy";

export const BTN = {
  project: "\u{1F4C1} Project",
  agent: "\u{1F916} Agent",
  reasoning: "\u{1F9E0} Reasoning",
  model: "\u{1F9E9} Model",
  sessions: "\u{1F5C2} Sessions",
  tasks: "\u2705 Tasks",
  status: "\u{1F4CA} Status",
  newSession: "\u{1F195} New",
  stop: "\u23F9 Stop",
} as const;

export const BUTTON_LABELS: string[] = Object.values(BTN);

export function mainKeyboard(): Keyboard {
  return new Keyboard()
    .text(BTN.project)
    .text(BTN.agent)
    .text(BTN.reasoning)
    .row()
    .text(BTN.model)
    .text(BTN.sessions)
    .text(BTN.tasks)
    .row()
    .text(BTN.status)
    .text(BTN.newSession)
    .text(BTN.stop)
    .resized()
    .persistent();
}
