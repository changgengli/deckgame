import React, { useEffect, useRef, useState, MouseEvent } from "react";
import { ConnectionStatus } from "../Types";
import { connect } from "react-redux";
import { State } from "../Store";
const UserComponent: React.FunctionComponent<{
  id: string | undefined;
}> = ({ id }) => {
  return (
    <div className={`current-user ${id ? "login" : "not-login"}`}>🦉{id}</div>
  );
};
export default connect((state: State) => {
  return { id: state.myId };
})(UserComponent);
