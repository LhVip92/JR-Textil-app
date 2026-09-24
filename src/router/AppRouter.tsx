import { Routes, Route } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { RequireAuth } from '@/components/admin/RequireAuth';
import HomePage from '@/pages/HomePage';
import CatalogPage from '@/pages/CatalogPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage';
import NotFoundPage from '@/pages/NotFoundPage';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import ProductsPage from '@/pages/admin/ProductsPage';
import ProductFormPage from '@/pages/admin/ProductFormPage';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* ============ ROTAS PÚBLICAS ============ */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/catalogo" element={<PublicLayout><CatalogPage /></PublicLayout>} />
      <Route path="/produto/:slug" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />

      {/* ============ SACOLA + CHECKOUT ============ */}
      <Route path="/sacola" element={<PublicLayout><CartPage /></PublicLayout>} />
      <Route path="/checkout" element={<PublicLayout><CheckoutPage /></PublicLayout>} />
      <Route path="/checkout/sucesso" element={<PublicLayout><CheckoutSuccessPage /></PublicLayout>} />

      {/* ============ LOGIN ============ */}
      <Route path="/admin/login" element={<PublicLayout><LoginPage /></PublicLayout>} />

      {/* ============ PAINEL ADMINISTRATIVO ============ */}
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
      </Route>

      {/* ============ 404 ============ */}
      <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
    </Routes>
  );
}