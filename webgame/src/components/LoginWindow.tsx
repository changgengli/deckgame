import React, { useState } from "react";
import { State } from "../Store";
import { connect } from "react-redux";
import { send } from "@giantmachines/redux-websocket";

const LoginWindow: React.FunctionComponent<{
  dispatchLogin: (id: string) => void;
  errorMessage: string | undefined;
}> = ({ dispatchLogin, errorMessage }) => {
  const [id, setId] = useState("");
  return (
    <div>
      <div>
        <input
          type="text"
          value={id}
          placeholder="username"
          onChange={(e) => setId(e.target.value)}
        />
        <button onClick={() => dispatchLogin(id)}>Login</button>
      </div>
      {errorMessage ? <div>{errorMessage} </div> : null}
    </div>
  );
};

export default connect(
  (state: State) => {
    return {
      errorMessage: state.login?.errorMessage,
    };
  },
  (dispatch) => {
    let password = "";
    return {
      dispatchLogin: (id: string) =>
        dispatch(send({ type: "Login", id, password })),
    };
  }
)(LoginWindow);
