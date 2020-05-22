import { HallProps } from "./Types";

const SET_MY_ID = "SET_MY_ID";
const REQUEST_HALL = "REQUEST_HALL";

interface SetMyIdAction {
  type: typeof SET_MY_ID;
  id: string;
}
interface RequestHallAction {
  type: typeof REQUEST_HALL;
}
export const setMyID = function(id: string) {
  return {
    type: SET_MY_ID,
    id,
  };
};

export const requestHall = function(hall: HallProps) {
  return {
    type: REQUEST_HALL,
  };
};

export type GameAction = SetMyIdAction | RequestHallAction;
