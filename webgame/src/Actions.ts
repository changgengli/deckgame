import { HallProps } from "./Types";
import { Sorter } from "./Store";

// not used

// in use
export const DISMISS_ERROR = "DismissError";
export const CLICK_CARD = "ClickCard";
export const SET_SORTER = "SetSorter";
export interface ClickCardAction {
  type: typeof CLICK_CARD;
  pile: string;
  index: number;
  value: number;
}

export interface SetSorterAction {
  type: typeof SET_SORTER;
  pile: string;
  sorter: Sorter;
}
