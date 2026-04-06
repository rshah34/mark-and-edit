import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { HelloStylesPage } from "./components/HelloStylesPage";
import { HelloWorldPage } from "./components/HelloWorldPage";
import { PrototypePage } from "./components/PrototypePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/prototype" replace />} />
          <Route path="/hello-world" element={<HelloWorldPage />} />
          <Route path="/hello-styles" element={<HelloStylesPage />} />
          <Route path="/prototype" element={<PrototypePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
