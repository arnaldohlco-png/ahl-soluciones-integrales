import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import { lazy, Suspense, useEffect } from "react";
import Layout from "@/components/Layout";
import { ConfirmProvider } from "@/components/ConfirmProvider";
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Customers = lazy(() => import("@/pages/Customers"));
const Motorcycles = lazy(() => import("@/pages/Motorcycles"));
const ServiceOrders = lazy(() => import("@/pages/ServiceOrders"));
const Products = lazy(() => import("@/pages/Products"));
const Technicians = lazy(() => import("@/pages/TechniciansModule"));
const Suppliers = lazy(() => import("@/pages/SuppliersModule"));
const Ventas = lazy(() => import("@/pages/Ventas"));
const Expenses = lazy(() => import("@/pages/ExpensesModule"));
const Cash = lazy(() => import("@/pages/CashModule"));
const Purchases = lazy(() => import("@/pages/PurchasesModule"));
const Credits = lazy(() => import("@/pages/CreditsModule"));
const Invoices = lazy(() => import("@/pages/InvoicesModule"));
const BrandLines = lazy(() => import("@/pages/BrandLines"));
const Company = lazy(() => import("@/pages/Company"));
const IncomeStatement = lazy(() => import("@/pages/IncomeStatement"));
const Quotations = lazy(() => import("@/pages/Quotations"));
const TechnicianLoans = lazy(() => import("@/pages/TechnicianLoans"));
const CommissionPayments = lazy(() => import("@/pages/CommissionPayments"));
const Services = lazy(() => import("@/pages/ServicesModule"));
const Citas = lazy(() => import("@/pages/Citas"));
const Returns = lazy(() => import("@/pages/ReturnsModule"));
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/motocicletas" element={<Motorcycles />} />
          <Route path="/ordenes" element={<ServiceOrders />} />
          <Route path="/citas" element={<Citas />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/inventario" element={<Products />} />
          <Route path="/tecnicos" element={<Technicians />} />
          <Route path="/proveedores" element={<Suppliers />} />
          <Route path="/marcas" element={<BrandLines />} />
          <Route path="/empresa" element={<Company />} />
          <Route path="/estado-resultados" element={<IncomeStatement />} />
          <Route path="/cotizaciones" element={<Quotations />} />
          <Route path="/prestamos-tecnicos" element={<TechnicianLoans />} />
          <Route path="/pago-comisiones" element={<CommissionPayments />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/compras" element={<Purchases />} />
          <Route path="/facturacion" element={<Invoices />} />
          <Route path="/devoluciones" element={<Returns />} />
          <Route path="/creditos" element={<Credits />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/caja" element={<Cash />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <ConfirmProvider>
            <AuthenticatedApp />
          </ConfirmProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App