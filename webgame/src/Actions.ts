import { HallProps } from "./Types";

// not used

// in use
export const DISMISS_ERROR = "DismissError";
export const CLICK_CARD = "ClickCard";
export interface ClickCardAction {
  type: typeof CLICK_CARD;
  pile: string;
  index: number;
  value: number;
}
