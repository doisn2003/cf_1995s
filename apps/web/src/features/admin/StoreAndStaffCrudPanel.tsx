import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { StoreDto, StoreType, UserRole } from '@cf19/shared';
import {
  ApiClientError,
  createStoreApi,
  createUserApi,
  fetchStores,
  fetchUsersApi,
  resetUserPinApi,
  updateStoreApi,
  updateUserApi,
  type StaffProfileRecord,
} from '../../api/apiClient';

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'SUPER_ADMIN', label: 'Chủ chuỗi (SUPER_ADMIN)' },
  { value: 'WAREHOUSE_MANAGER', label: 'Quản lý Kho Tổng' },
  { value: 'STORE_MANAGER', label: 'Quản lý Quán' },
  { value: 'CASHIER_STAFF', label: 'Thu ngân POS' },
  { value: 'BARISTA_KDS', label: 'Pha chế KDS' },
];

const STORE_TYPE_LABELS: Record<StoreType, string> = {
  CENTRAL_WAREHOUSE: 'Kho Tổng',
  RETAIL_STORE: 'Quán sở hữu',
  FRANCHISE_STORE: 'Quán nhượng quyền',
};

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} đ`;
}

export function StoreAndStaffCrudPanel() {
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'stores' | 'staff'>('stores');
  const [stores, setStores] = useState<StoreDto[]>([]);
  const [users, setUsers] = useState<StaffProfileRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Store create/edit state
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeCode, setStoreCode] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [storeType, setStoreType] = useState<'RETAIL_STORE' | 'FRANCHISE_STORE'>('RETAIL_STORE');
  const [storeAddress, setStoreAddress] = useState<string>('');
  const [storePhone, setStorePhone] = useState<string>('');
  const [storeMultiplier, setStoreMultiplier] = useState<string>('1.00');
  const [storeActive, setStoreActive] = useState<boolean>(true);
  const [savingStore, setSavingStore] = useState<boolean>(false);

  // Staff create/edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [staffPassword, setStaffPassword] = useState<string>('Cf19@Staff123');
  const [staffName, setStaffName] = useState<string>('');
  const [staffRole, setStaffRole] = useState<UserRole>('CASHIER_STAFF');
  const [staffStoreId, setStaffStoreId] = useState<string>('');
  const [staffHourlyRate, setStaffHourlyRate] = useState<string>('30000');
  const [staffPin, setStaffPin] = useState<string>('');
  const [staffActive, setStaffActive] = useState<boolean>(true);
  const [savingStaff, setSavingStaff] = useState<boolean>(false);

  // Reset PIN inline state
  const [pinTargetUser, setPinTargetUser] = useState<StaffProfileRecord | null>(null);
  const [newPinValue, setNewPinValue] = useState<string>('');
  const [savingPin, setSavingPin] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [stList, uList] = await Promise.all([
        fetchStores(true),
        fetchUsersApi(),
      ]);
      setStores(stList);
      setUsers(uList);
      if (!staffStoreId && stList.length > 0) {
        const firstRetail = stList.find((s) => s.type !== 'CENTRAL_WAREHOUSE') ?? stList[0];
        if (firstRetail) setStaffStoreId(firstRetail.id);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không tải được dữ liệu quản trị.');
    } finally {
      setLoading(false);
    }
  }, [staffStoreId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetStoreForm = () => {
    setEditingStoreId(null);
    setStoreCode('');
    setStoreName('');
    setStoreType('RETAIL_STORE');
    setStoreAddress('');
    setStorePhone('');
    setStoreMultiplier('1.00');
    setStoreActive(true);
  };

  const startEditStore = (st: StoreDto) => {
    setEditingStoreId(st.id);
    setStoreCode(st.code);
    setStoreName(st.name);
    setStoreType(st.type === 'FRANCHISE_STORE' ? 'FRANCHISE_STORE' : 'RETAIL_STORE');
    setStoreAddress(st.address ?? '');
    setStorePhone(st.phone ?? '');
    setStoreMultiplier(String(st.price_multiplier));
    setStoreActive(st.is_active);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveStore = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingStore(true);
    try {
      const multiplier = Number(storeMultiplier);
      if (editingStoreId) {
        await updateStoreApi(editingStoreId, {
          name: storeName.trim(),
          address: storeAddress.trim() || undefined,
          phone: storePhone.trim() || null,
          price_multiplier: multiplier,
          is_active: storeActive,
        });
        setSuccessMsg(`Đã cập nhật chi nhánh ${storeCode}.`);
      } else {
        const created = await createStoreApi({
          code: storeCode.trim().toUpperCase(),
          name: storeName.trim(),
          type: storeType,
          address: storeAddress.trim() || 'Đang cập nhật địa chỉ',
          phone: storePhone.trim() || undefined,
          price_multiplier: multiplier,
        });
        setSuccessMsg(`Đã tạo mới chi nhánh ${created.code} — ${created.name}.`);
      }
      resetStoreForm();
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu chi nhánh thất bại.');
    } finally {
      setSavingStore(false);
    }
  };

  const resetStaffForm = () => {
    setEditingUserId(null);
    setStaffEmail('');
    setStaffPassword('Cf19@Staff123');
    setStaffName('');
    setStaffRole('CASHIER_STAFF');
    setStaffHourlyRate('30000');
    setStaffPin('');
    setStaffActive(true);
  };

  const startEditStaff = (u: StaffProfileRecord) => {
    setEditingUserId(u.id);
    setStaffEmail(u.email);
    setStaffName(u.full_name);
    setStaffRole(u.role);
    setStaffStoreId(u.assigned_store_id ?? '');
    setStaffHourlyRate(String(u.hourly_rate_vnd));
    setStaffActive(u.is_active);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveStaff = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingStaff(true);
    try {
      const assignedId = staffRole === 'SUPER_ADMIN' ? null : staffStoreId || null;
      if (editingUserId) {
        await updateUserApi(editingUserId, {
          full_name: staffName.trim(),
          role: staffRole,
          assigned_store_id: assignedId,
          hourly_rate_vnd: Math.round(Number(staffHourlyRate)),
          is_active: staffActive,
        });
        setSuccessMsg(`Đã cập nhật thông tin nhân sự ${staffName}.`);
      } else {
        await createUserApi({
          email: staffEmail.trim().toLowerCase(),
          password: staffPassword,
          full_name: staffName.trim(),
          role: staffRole,
          assigned_store_id: assignedId,
          hourly_rate_vnd: Math.round(Number(staffHourlyRate)),
          employment_type: 'FULL_TIME',
          manager_pin: staffPin.trim() ? staffPin.trim() : undefined,
        });
        setSuccessMsg(`Đã tạo tài khoản ${staffEmail.trim().toLowerCase()} thành công.`);
      }
      resetStaffForm();
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Lưu nhân sự thất bại.');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleResetPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!pinTargetUser) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setSavingPin(true);
    try {
      await resetUserPinApi(pinTargetUser.id, newPinValue.trim());
      setSuccessMsg(`Đã đặt lại mã PIN 6 chữ số cho ${pinTargetUser.full_name}.`);
      setPinTargetUser(null);
      setNewPinValue('');
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : 'Đặt lại PIN thất bại.');
    } finally {
      setSavingPin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-stone-200/70 p-1">
          <button
            type="button"
            onClick={() => setSubTab('stores')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'stores'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Danh sách Chi nhánh ({stores.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('staff')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              subTab === 'staff'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Nhân sự &amp; Phân quyền ({users.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {subTab === 'stores' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveStore}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-700" />
                {editingStoreId ? `Chỉnh sửa ${storeCode}` : 'Thêm Chi nhánh mới'}
              </h3>
              {editingStoreId && (
                <button
                  type="button"
                  onClick={resetStoreForm}
                  className="text-xs text-stone-500 hover:text-stone-900 underline"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mã Chi nhánh (VD: STORE-05)
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editingStoreId)}
                value={storeCode}
                onChange={(e) => setStoreCode(e.target.value)}
                placeholder="STORE-05"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tên Chi nhánh
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="CF19 Quán 5 — Quận 7"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            {!editingStoreId && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mô hình hoạt động
                </label>
                <select
                  value={storeType}
                  onChange={(e) =>
                    setStoreType(e.target.value as 'RETAIL_STORE' | 'FRANCHISE_STORE')
                  }
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="RETAIL_STORE">Quán sở hữu trực tiếp</option>
                  <option value="FRANCHISE_STORE">Quán nhượng quyền</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Hệ số giá bán
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="3"
                  required
                  value={storeMultiplier}
                  onChange={(e) => setStoreMultiplier(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="028-3800-xxxx"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Địa chỉ cửa hàng"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            {editingStoreId && (
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 pt-1">
                <input
                  type="checkbox"
                  checked={storeActive}
                  onChange={(e) => setStoreActive(e.target.checked)}
                />
                Chi nhánh đang hoạt động
              </label>
            )}

            <button
              type="submit"
              disabled={savingStore}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {savingStore && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingStoreId ? 'Lưu thay đổi chi nhánh' : 'Tạo chi nhánh'}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-stone-900">
                Toàn bộ Điểm Kho &amp; Cửa hàng trong Hệ thống
              </h3>
              <span className="text-xs text-stone-500">{stores.length} điểm</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Mã / Tên điểm</th>
                    <th className="px-4 py-2.5 font-semibold">Loại hình</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Hệ số giá</th>
                    <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stores.map((st) => (
                    <tr key={st.id} className="hover:bg-stone-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-stone-900">
                          {st.code} — {st.name}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {st.address ?? 'Chưa cập nhật địa chỉ'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                          {STORE_TYPE_LABELS[st.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        x{Number(st.price_multiplier).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            st.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {st.is_active ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {st.type !== 'CENTRAL_WAREHOUSE' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => navigate(`/store/${st.id}/manage`)}
                                className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium inline-flex items-center gap-1"
                              >
                                Quản lý <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/store/${st.id}/pos`)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium"
                              >
                                POS
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/store/${st.id}/kds`)}
                                className="px-2 py-1 rounded-lg bg-stone-900 text-amber-300 hover:bg-stone-800 font-medium"
                              >
                                KDS
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate('/warehouse')}
                              className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium"
                            >
                              Mở Kho
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEditStore(st)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveStaff}
            className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5 h-fit"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-700" />
                {editingUserId ? 'Cập nhật Nhân sự' : 'Tạo Tài khoản Nhân sự'}
              </h3>
              {editingUserId && (
                <button
                  type="button"
                  onClick={resetStaffForm}
                  className="text-xs text-stone-500 hover:text-stone-900 underline"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email đăng nhập
              </label>
              <input
                type="email"
                required
                disabled={Boolean(editingUserId)}
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="nhanvien@cf19.vn"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-100"
              />
            </div>

            {!editingUserId && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mật khẩu khởi tạo
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vai trò (RBAC)
              </label>
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {staffRole !== 'SUPER_ADMIN' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Điểm làm việc phân công
                </label>
                <select
                  required
                  value={staffStoreId}
                  onChange={(e) => setStaffStoreId(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- Chọn điểm làm việc --</option>
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code} — {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lương giờ (VNĐ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={staffHourlyRate}
                  onChange={(e) => setStaffHourlyRate(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              {!editingUserId &&
                (staffRole === 'STORE_MANAGER' || staffRole === 'SUPER_ADMIN') && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      PIN Quản lý (6 số)
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={staffPin}
                      onChange={(e) => setStaffPin(e.target.value)}
                      placeholder="6 chữ số"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-mono"
                    />
                  </div>
                )}
            </div>

            {editingUserId && (
              <label className="flex items-center gap-2 text-xs font-medium text-stone-700 pt-1">
                <input
                  type="checkbox"
                  checked={staffActive}
                  onChange={(e) => setStaffActive(e.target.checked)}
                />
                Tài khoản đang hoạt động
              </label>
            )}

            <button
              type="submit"
              disabled={savingStaff}
              className="w-full py-2.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {savingStaff && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUserId ? 'Lưu cập nhật nhân sự' : 'Tạo tài khoản nhân sự'}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-4">
            {pinTargetUser && (
              <form
                onSubmit={handleResetPin}
                className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-wrap items-end gap-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs font-bold text-amber-900 mb-1">
                    Đặt lại mã PIN phê duyệt cho: {pinTargetUser.full_name}
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value)}
                    placeholder="Nhập mã PIN mới gồm 6 chữ số"
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingPin}
                  className="px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 disabled:opacity-50"
                >
                  {savingPin ? 'Đang lưu...' : 'Xác nhận đổi PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPinTargetUser(null);
                    setNewPinValue('');
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-stone-300 text-xs text-stone-700"
                >
                  Hủy
                </button>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-stone-900">
                  Danh sách Nhân sự Toàn chuỗi
                </h3>
                <span className="text-xs text-stone-500">{users.length} nhân sự</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-50 text-stone-600 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Nhân sự</th>
                      <th className="px-4 py-2.5 font-semibold">Vai trò</th>
                      <th className="px-4 py-2.5 font-semibold">Chi nhánh</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Lương giờ</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            {u.full_name}
                            {!u.is_active && (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px]">
                                Khóa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 font-semibold">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          {u.store_code ? `${u.store_code} — ${u.store_name}` : 'Toàn chuỗi'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {formatVnd(u.hourly_rate_vnd)}/h
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {(u.role === 'SUPER_ADMIN' || u.role === 'STORE_MANAGER') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPinTargetUser(u);
                                  setNewPinValue('');
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 inline-flex items-center gap-1 font-medium"
                                title="Đặt lại mã PIN phê duyệt"
                              >
                                <KeyRound className="w-3 h-3" />
                                PIN
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startEditStaff(u)}
                              className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
