import React from "react";
import { ConnectionStatus } from "../Types";
import { connect } from "react-redux";
import { State } from "../Store";
const ConnectionComponent: React.FunctionComponent<{
  connection: ConnectionStatus;
}> = ({ connection }) => {
  return <div className={`connection-indicator ${connection}`} />;
};
export default connect((state: State) => {
  return { connection: state.connection };
})(ConnectionComponent);
