import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import CustomerEntry from "./views/CustomerEntry";
import TablePicker from "./views/TablePicker";
import TableAccess from "./views/TableAccess";
import OrderSession from "./views/OrderSession";
import StaffLogin from "./views/StaffLogin";
import WaiterDashboard from "./views/WaiterDashboard";
import WaiterTablesPage from "./views/WaiterTablesPage";
import KitchenDashboard from "./views/KitchenDashboard";
import CashierDashboard from "./views/CashierDashboard";
import CashierTablesPage from "./views/CashierTablesPage";
import MyAccount from "./views/MyAccount";
import AdminModeSelect from "./views/AdminModeSelect";
import AdminOverview from "./views/AdminOverview";
import AdminOperate from "./views/AdminOperate";
import AdminTablesPage from "./views/AdminTablesPage";
import AdminMenuPage from "./views/AdminMenuPage";
import AdminStaffPage from "./views/AdminStaffPage";
import AdminTableRoster from "./views/AdminTableRoster";
import AdminBillsPage from "./views/AdminBillsPage";
import AdminAnalyticsPage from "./views/AdminAnalyticsPage";
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
              <WaiterTablesPage />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/waiter/tables"
          element={
            <ProtectedStaffRoute role="WAITER">
              <WaiterTablesPage />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/waiter/queue"
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
              <CashierTablesPage />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/cashier/tables"
          element={
            <ProtectedStaffRoute role="CASHIER">
              <CashierTablesPage />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/cashier/queue"
          element={
            <ProtectedStaffRoute role="CASHIER">
              <CashierDashboard />
            </ProtectedStaffRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/staff/admin/select"
          element={
            <ProtectedStaffRoute role="ADMIN">
              <AdminModeSelect />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/admin"
          element={
            <ProtectedStaffRoute role="ADMIN">
              <AdminOverview />
            </ProtectedStaffRoute>
          }
        />
        <Route
          path="/staff/admin/operate"
          element={
            <ProtectedStaffRoute role="ADMIN">
              <AdminOperate />
            </ProtectedStaffRoute>
          }
        />
        <Route path="/staff/admin/tables" element={<ProtectedStaffRoute role="ADMIN"><AdminTablesPage /></ProtectedStaffRoute>} />
        <Route path="/staff/admin/menu" element={<ProtectedStaffRoute role="ADMIN"><AdminMenuPage /></ProtectedStaffRoute>} />
        <Route path="/staff/admin/staff" element={<ProtectedStaffRoute role="ADMIN"><AdminStaffPage /></ProtectedStaffRoute>} />
        <Route path="/staff/admin/roster" element={<ProtectedStaffRoute role="ADMIN"><AdminTableRoster /></ProtectedStaffRoute>} />
        <Route path="/staff/admin/bills" element={<ProtectedStaffRoute role="ADMIN"><AdminBillsPage /></ProtectedStaffRoute>} />
        <Route path="/staff/admin/analytics" element={<ProtectedStaffRoute role="ADMIN"><AdminAnalyticsPage /></ProtectedStaffRoute>} />

        {/* Universal My Account — any signed-in staff */}
        <Route
          path="/staff/account"
          element={
            <ProtectedStaffRoute>
              <MyAccount />
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
