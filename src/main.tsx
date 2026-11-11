import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/dm-sans";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="loading">
          <h1>This workspace could not be displayed.</h1>
          <p>Your saved data has not been deleted. Reload to try again.</p>
          <button className="button" onClick={() => location.reload()}>
            Reload SourcePatch
          </button>
        </main>
      );
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
