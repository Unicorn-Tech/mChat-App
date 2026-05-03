import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";

import BootstrapAuth from "./app/BootstrapAuth.jsx";
import store from "./app/store.jsx";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <BootstrapAuth />
      <Toaster position="top-center" />
      <App />
    </Provider>
  </StrictMode>
);
