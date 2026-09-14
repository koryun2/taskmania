import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalStyle } from "./styles/global";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <GlobalStyle />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
