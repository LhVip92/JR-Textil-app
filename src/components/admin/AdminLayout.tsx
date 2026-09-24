import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Tags, LogOut, Home, Package } from 'lucide-react';
import { signOut } from '@/services/auth.service';
import clsx from 'clsx';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/categorias', label: 'Categorias', icon: Tags, end: false },
  { to: '/admin/products', label: 'Produtos', icon: Package, end: false }
] as const;

export function AdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-40 bg-brand-black text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded hover:bg-white/10"
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="font-bold">Painel Administrativo</span>
          <NavLink to="/" className="ml-auto p-2 rounded hover:bg-white/10" aria-label="Site">
            <Home size={20} />
          </NavLink>
        </div>
      </header>

      <div className="flex">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-30 w-64 bg-brand-black text-white pt-20 px-3 transition-transform',
            open ? 'translate-x-0' : '-translate-x-full',
            'md:static md:translate-x-0 md:pt-4'
          )}
        >
          <nav className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-3 rounded text-sm',
                    isActive ? 'bg-brand-red' : 'hover:bg-white/10'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="mt-4 flex items-center gap-3 px-3 py-3 rounded text-sm hover:bg-white/10 text-left"
            >
              <LogOut size={18} />
              Sair
            </button>
          </nav>
        </aside>

        {open && (
          <button
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
          />
        )}

        <main className="flex-1 p-4 md:p-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}