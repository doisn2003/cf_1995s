import { create } from 'zustand';
import {
  SEED_IDS,
  type AuthenticatedUserDto,
  type UserRole,
} from '@cf19/shared';

export interface AuthSession {
  accessToken: string;
  user: AuthenticatedUserDto;
}

export interface DemoQuickAccount {
  email: string;
  password: string;
  label: string;
  role: UserRole;
  branch: string;
}

export const DEMO_QUICK_ACCOUNTS: readonly DemoQuickAccount[] = [
  {
    email: 'admin@cf19.vn',
    password: 'Cf19@Admin123',
    label: 'Nguyễn Minh Quân (Chủ Chuỗi)',
    role: 'SUPER_ADMIN',
    branch: 'Toàn hệ thống',
  },
  {
    email: 'warehouse@cf19.vn',
    password: 'Cf19@Warehouse123',
    label: 'Trần Văn Hùng (Quản Lý Kho Tổng)',
    role: 'WAREHOUSE_MANAGER',
    branch: 'Kho Tổng Tây Nguyên',
  },
  {
    email: 'manager.store01@cf19.vn',
    password: 'Cf19@Manager01',
    label: 'Lê Thị Thảo (Quản Lý Quán 1)',
    role: 'STORE_MANAGER',
    branch: 'CF19 Quán 1',
  },
  {
    email: 'manager.store02@cf19.vn',
    password: 'Cf19@Manager02',
    label: 'Phạm Quốc Bảo (Quản Lý Quán 2)',
    role: 'STORE_MANAGER',
    branch: 'CF19 Quán 2',
  },
  {
    email: 'cashier.store01@cf19.vn',
    password: 'Cf19@Cashier01',
    label: 'Võ Ngọc Linh (Thu Ngân Quán 1)',
    role: 'CASHIER_STAFF',
    branch: 'CF19 Quán 1',
  },
  {
    email: 'cashier.store02@cf19.vn',
    password: 'Cf19@Cashier02',
    label: 'Đặng Minh Anh (Thu Ngân Quán 2)',
    role: 'CASHIER_STAFF',
    branch: 'CF19 Quán 2',
  },
  {
    email: 'barista.store01@cf19.vn',
    password: 'Cf19@Barista01',
    label: 'Hoàng Gia Huy (Pha Chế Quán 1)',
    role: 'BARISTA_KDS',
    branch: 'CF19 Quán 1',
  },
  {
    email: 'barista.store02@cf19.vn',
    password: 'Cf19@Barista02',
    label: 'Bùi Tuấn Kiệt (Pha Chế Quán 2)',
    role: 'BARISTA_KDS',
    branch: 'CF19 Quán 2',
  },
];

const SESSION_STORAGE_KEY = 'cf19_auth_session_v2';

function loadSavedSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.accessToken && parsed?.user?.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function getRoleDefaultRoute(user: AuthenticatedUserDto): string {
  switch (user.role) {
    case 'SUPER_ADMIN':
      return '/executive';
    case 'WAREHOUSE_MANAGER':
      return '/warehouse';
    case 'STORE_MANAGER':
      return `/store/${user.assigned_store_id ?? SEED_IDS.stores.store01}/manage`;
    case 'CASHIER_STAFF':
      return `/store/${user.assigned_store_id ?? SEED_IDS.stores.store01}/pos`;
    case 'BARISTA_KDS':
      return `/store/${user.assigned_store_id ?? SEED_IDS.stores.store01}/kds`;
  }
}

export function canAccessStore(
  user: AuthenticatedUserDto,
  targetStoreId: string,
): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'WAREHOUSE_MANAGER') {
    return targetStoreId === user.assigned_store_id;
  }
  return user.assigned_store_id === targetStoreId;
}

interface AuthStoreState {
  accessToken: string | null;
  currentUser: AuthenticatedUserDto | null;
  setSession: (session: AuthSession) => void;
  logout: () => void;
}

const initialSession = loadSavedSession();

export const useAuthStore = create<AuthStoreState>((set) => ({
  accessToken: initialSession?.accessToken ?? null,
  currentUser: initialSession?.user ?? null,
  setSession: (session) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    set({ accessToken: session.accessToken, currentUser: session.user });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    set({ accessToken: null, currentUser: null });
  },
}));
