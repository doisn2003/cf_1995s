import { useEffect, useState, type ReactNode } from 'react';
import { Building2, LogOut, ShieldAlert, UserCircle2 } from 'lucide-react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StoreDto, UserRole } from '@cf19/shared';
import { fetchStores } from '../api/apiClient';
import {
  canAccessStore,
  getRoleDefaultRoute,
  useAuthStore,
} from '../store/authStore';

export interface RoleGuardProps {
  allowedRoles: readonly UserRole[];
  requireStoreMatch?: boolean;
  children: ReactNode;
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Chủ chuỗi',
  WAREHOUSE_MANAGER: 'Quản lý Kho Tổng',
  STORE_MANAGER: 'Quản lý Cửa hàng',
  CASHIER_STAFF: 'Thu ngân POS',
  BARISTA_KDS: 'Pha chế KDS',
};

export function RoleGuard({
  allowedRoles,
  requireStoreMatch = false,
  children,
}: RoleGuardProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-red-700">
            Không có quyền truy cập phân hệ này
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Tài khoản <span className="font-semibold">{currentUser.full_name}</span>{' '}
            ({ROLE_LABELS[currentUser.role]}) không được cấp quyền vào chức năng này.
          </p>
          <button
            type="button"
            onClick={() => navigate(getRoleDefaultRoute(currentUser))}
            className="mt-6 px-5 py-2.5 rounded-xl bg-amber-800 text-white text-sm font-medium hover:bg-amber-900 transition"
          >
            Quay về màn hình làm việc
          </button>
        </div>
      </div>
    );
  }

  if (requireStoreMatch && storeId && !canAccessStore(currentUser, storeId)) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-300 p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-red-700">
            Truy cập ngoài chi nhánh được giao
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Tài khoản <span className="font-semibold">{currentUser.full_name}</span>{' '}
            chỉ được phép thao tác trong phạm vi chi nhánh đã phân công.
          </p>
          <button
            type="button"
            onClick={() => navigate(getRoleDefaultRoute(currentUser))}
            className="mt-6 px-5 py-2.5 rounded-xl bg-amber-800 text-white text-sm font-medium hover:bg-amber-900 transition"
          >
            Trở về chi nhánh của tôi
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export interface RoleShellHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  dark?: boolean;
}

export function RoleShellHeader({
  title,
  subtitle,
  badgeText,
  dark = false,
}: RoleShellHeaderProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const [stores, setStores] = useState<StoreDto[]>([]);

  useEffect(() => {
    if (currentUser?.role === 'SUPER_ADMIN') {
      void fetchStores()
        .then((list) => setStores(list))
        .catch(() => setStores([]));
    }
  }, [currentUser?.role]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const retailStores = stores.filter((s) => s.type !== 'CENTRAL_WAREHOUSE');
  const assignedStoreId = currentUser?.assigned_store_id;

  return (
    <header
      className={
        dark
          ? 'bg-stone-900 border-b border-stone-800 text-stone-100 px-6 py-3.5'
          : 'bg-white border-b border-stone-200 text-stone-900 px-6 py-3.5'
      }
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight">{title}</h1>
            <span
              className={
                dark
                  ? 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900'
              }
            >
              {badgeText}
            </span>
          </div>
          <p className={dark ? 'text-xs text-stone-400 mt-0.5' : 'text-xs text-stone-500 mt-0.5'}>
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick workspace navigation for SUPER_ADMIN across Executive, Warehouse & all Stores */}
          {currentUser?.role === 'SUPER_ADMIN' && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 opacity-60" />
              <select
                aria-label="Điều hướng phân hệ & chi nhánh"
                value={location.pathname}
                onChange={(e) => {
                  if (e.target.value) navigate(e.target.value);
                }}
                className={
                  dark
                    ? 'text-xs rounded-lg bg-stone-800 border border-stone-700 text-stone-100 px-2.5 py-1.5'
                    : 'text-xs rounded-lg bg-stone-50 border border-stone-300 text-stone-800 px-2.5 py-1.5'
                }
              >
                <option value="/executive">Điều hành Chuỗi (P&amp;L &amp; Quản trị)</option>
                <option value="/warehouse">Kho Tổng Tây Nguyên</option>
                {retailStores.map((st) => (
                  <optgroup key={st.id} label={`${st.code} — ${st.name}`}>
                    <option value={`/store/${st.id}/manage`}>
                      {st.code}: Quản lý Quán
                    </option>
                    <option value={`/store/${st.id}/pos`}>
                      {st.code}: Thu ngân POS
                    </option>
                    <option value={`/store/${st.id}/kds`}>
                      {st.code}: Pha chế KDS
                    </option>
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Quick view switcher for Store Manager within their own assigned branch */}
          {currentUser?.role === 'STORE_MANAGER' && assignedStoreId && (
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
              {[
                { label: 'Quản lý', path: `/store/${assignedStoreId}/manage` },
                { label: 'POS', path: `/store/${assignedStoreId}/pos` },
                { label: 'KDS', path: `/store/${assignedStoreId}/kds` },
              ].map((nav) => {
                const active = location.pathname === nav.path;
                return (
                  <button
                    key={nav.path}
                    type="button"
                    onClick={() => navigate(nav.path)}
                    className={
                      active
                        ? 'px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-800 text-white'
                        : 'px-2.5 py-1 rounded-md text-xs font-medium text-stone-700 hover:bg-stone-200'
                    }
                  >
                    {nav.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Logged-in user badge */}
          {currentUser && (
            <div
              className={
                dark
                  ? 'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 text-xs'
                  : 'hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs'
              }
            >
              <UserCircle2 className="w-4 h-4 opacity-70" />
              <div className="leading-tight">
                <div className="font-semibold">{currentUser.full_name}</div>
                <div className={dark ? 'text-[10px] text-stone-400' : 'text-[10px] text-stone-500'}>
                  {ROLE_LABELS[currentUser.role]}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className={
              dark
                ? 'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                : 'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700'
            }
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </div>
    </header>
  );
}
