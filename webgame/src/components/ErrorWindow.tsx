import React, { useState, useEffect } from "react";
import { State } from "../Store";
import { connect } from "react-redux";

const ErrorWindow: React.FunctionComponent<{
  message: string;
  timestamp: number;
}> = ({ message, timestamp }) => {
  const [dismissed, setDismiss] = useState(0);
  const [countDown, setCountDown] = useState(6);
  const [previousTimestamp, setPreviousTimestamp] = useState(timestamp);

  if (previousTimestamp !== timestamp) {
    setCountDown(6);
    setPreviousTimestamp(timestamp);
  }

  useEffect(() => {
    let interval: NodeJS.Timeout = setInterval(() => {
      if (countDown > 0) setCountDown(countDown - 1);
      if (countDown === 0) {
        setDismiss(timestamp);
      }
    }, 1000);
    return () => clearInterval(interval);
  });
  if (message === undefined || timestamp === undefined) {
    return null;
  }
  return (
    <div
      className="error-window"
      style={{ display: dismissed === timestamp ? "none" : "flex" }}
    >
      <div className="error-container">
        <div>{message}</div>
        <div>
          <button onClick={() => setDismiss(timestamp)}>
            Ok ({countDown})
          </button>
        </div>
      </div>
    </div>
  );
};

export default connect((state: State) => {
  return state.error;
})(ErrorWindow);
