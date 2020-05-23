import React from "react";
import { connect } from "react-redux";
import { State } from "../Store";
const UserComponent: React.FunctionComponent<{
  id: string | undefined;
}> = ({ id }) => {
  return (
    <div className={`current-user ${id ? "login" : "not-login"}`}>
      <span role="img" aria-label="UserLogo">
        🦉
      </span>
      {id}
    </div>
  );
};
export default connect((state: State) => {
  return { id: state.myId };
})(UserComponent);
