import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerEntry from "./views/CustomerEntry";
import TablePicker from "./views/TablePicker";
import TableAccess from "./views/TableAccess";
import OrderSession from "./views/OrderSession";
import StaffLogin from "./views/StaffLogin";
import WaiterDashboard from "./views/WaiterDashboard";
import KitchenDashboard from "./views/KitchenDashboard";
import CashierDashboard from "./views/CashierDashboard";
import DebugPanel from "./components/DebugPanel";
import ProtectedStaffRoute from "./components/ProtectedStaffRoute";

function App() {
  return (
    <div className="min-h-full bg-bg text-ink font-body">
      <Routes>
        {/* Customer flow — arrives via QR: /?qr=<token> */}
        <Route path="/" element={<CustomerEntry />} />
        <Route path="/scan" element={<TablePicker />} />
        <Route path="/table" element={<TableAccess />} />
        <Route path="/order" element={<OrderSession />} />

        {/* Staff flow */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route
          path="/staff/waiter"
          element={
            <ProtectedStaffRoute role="WAITER">
              <WaiterDashboard />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/kitchen"
          element={
            <ProtectedStaffRoute role="KITCHEN">
              <KitchenDashboard />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/cashier"
          element={
            <ProtectedStaffRoute role="CASHIER">
              <CashierDashboard />
            </ProtectedStaffRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <DebugPanel />
    </div>
  );
}

export default App;
