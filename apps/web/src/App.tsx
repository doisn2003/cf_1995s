import { useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Coffee, KeyRound, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { ApiClientError, loginWithPassword } from './api/apiClient';
import { RoleGuard } from './components/RoleGuard';
import { BaristaKdsLayout } from './layouts/BaristaKdsLayout';
import { CashierPosLayout } from './layouts/CashierPosLayout';
import { ExecutiveLayout } from './layouts/ExecutiveLayout';
import { StoreManagerLayout } from './layouts/StoreManagerLayout';
import { WarehouseLayout } from './layouts/WarehouseLayout';
import {
  DEMO_QUICK_ACCOUNTS,
  getRoleDefaultRoute,
  useAuthStore,
} from './store/authStore';

function LoginPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('admin@cf19.vn');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showQuickAccounts, setShowQuickAccounts] = useState<boolean>(false);

  if (currentUser) {
    return <Navigate to={getRoleDefaultRoute(currentUser)} replace />;
  }

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const result = await loginWithPassword(loginEmail.trim(), loginPassword);
      setSession({
        accessToken: result.access_token,
        user: result.user,
      });
      navigate(getRoleDefaultRoute(result.user), { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    await performLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50/40 to-stone-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
        <div className="bg-stone-900 text-white px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CF19 Coffee Chain</h1>
              <p className="text-xs text-stone-300 mt-0.5">
                Hệ Thống Quản Trị Kho Tổng Tây Nguyên &amp; Chuỗi Cửa Hàng
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Email nhân sự
            </label>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@cf19.vn"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Mật khẩu
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu tài khoản"
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-sm py-3 transition disabled:opacity-60 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xác thực...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Đăng nhập hệ thống
              </>
            )}
          </button>

          <div className="pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowQuickAccounts((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-stone-500 hover:text-amber-800 py-1"
            >
              <span className="inline-flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Điền nhanh tài khoản vận hành (5 Vai trò)
              </span>
              {showQuickAccounts ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showQuickAccounts && (
              <div className="mt-2.5 space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {DEMO_QUICK_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      void performLogin(acc.email, acc.password);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl border border-stone-200 hover:border-amber-600 hover:bg-amber-50/60 transition flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-800 truncate">
                        {acc.label}
                      </div>
                      <div className="text-[11px] text-stone-500 truncate">
                        {acc.email} • {acc.branch}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/executive"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <ExecutiveLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/warehouse"
          element={
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'WAREHOUSE_MANAGER']}>
              <WarehouseLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/manage"
          element={
            <RoleGuard
              allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER']}
              requireStoreMatch
            >
              <StoreManagerLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/pos"
          element={
            <RoleGuard
              allowedRoles={['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER_STAFF']}
              requireStoreMatch
            >
              <CashierPosLayout />
            </RoleGuard>
          }
        />
        <Route
          path="/store/:storeId/kds"
          element={
            <RoleGuard
              allowedRoles={[
                'SUPER_ADMIN',
                'STORE_MANAGER',
                'CASHIER_STAFF',
                'BARISTA_KDS',
              ]}
              requireStoreMatch
            >
              <BaristaKdsLayout />
            </RoleGuard>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
