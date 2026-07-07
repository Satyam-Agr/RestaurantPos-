import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { Toaster } from "sonner";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            fontFamily: "DM Sans, sans-serif",
            borderRadius: "12px",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
