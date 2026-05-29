import React, { useMemo, useState } from 'react';
import { ConfirmDialog, MaskedPasswordInput, ToastMessage } from '../../components/ui';
import { useAuth } from '../../Context/auth-context';

const initialNewAccount = {
  username: '',
  password: '',
  role: 'Staff',
};

const initialPasswordReset = {
  username: '',
  password: '',
  confirmPassword: '',
};

const ManageUsers = () => {
  const { user, users, createUser, updateUserRole, resetUserPassword, removeUser } = useAuth();
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [newAccount, setNewAccount] = useState(initialNewAccount);
  const [passwordReset, setPasswordReset] = useState(initialPasswordReset);
  const [userPendingDelete, setUserPendingDelete] = useState(null);

  const sortedUsers = useMemo(() => users.slice().sort((a, b) => a.id - b.id), [users]);

  const handleRoleUpdate = async (username, role) => {
    try {
      await updateUserRole(username, role);
      setFeedback({ type: 'success', text: `${username} was updated to ${role} successfully.` });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to update role.' });
    }
  };

  const handleRemoveUser = async (username) => {
    setUserPendingDelete(username);
  };

  const confirmDelete = async () => {
    if (!userPendingDelete) return;

    try {
      await removeUser(userPendingDelete);
      setFeedback({ type: 'success', text: `${userPendingDelete} was deleted successfully.` });
      if (passwordReset.username === userPendingDelete) {
        setPasswordReset(initialPasswordReset);
      }
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to remove user.' });
    }
    setUserPendingDelete(null);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    try {
      const createdUser = await createUser(newAccount);
      setNewAccount(initialNewAccount);
      setFeedback({ type: 'success', text: `${createdUser.username} was created successfully.` });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to create user.' });
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!passwordReset.username) {
      setFeedback({ type: 'error', text: 'Select a user first.' });
      return;
    }

    if (passwordReset.password !== passwordReset.confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      await resetUserPassword(passwordReset.username, passwordReset.password);
      setPasswordReset((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setFeedback({ type: 'success', text: `The password for ${passwordReset.username} was reset successfully.` });
    } catch (error) {
      setFeedback({ type: 'error', text: error.message || 'Unable to reset password.' });
    }
  };

  const isOwnAccount = (username) => user?.username === username;

  return (
    <div className="page-stack">
      <ToastMessage type={feedback.type} text={feedback.text} onClose={() => setFeedback({ type: '', text: '' })} />
      <ConfirmDialog
        open={Boolean(userPendingDelete)}
        title="Delete user"
        message={userPendingDelete ? `Are you sure you want to delete user ${userPendingDelete}?` : ''}
        confirmLabel="Delete user"
        onConfirm={confirmDelete}
        onCancel={() => setUserPendingDelete(null)}
      />

      <section className="section-card">
        <h2 className="text-2xl font-bold text-slate-800">Manage Users</h2>
        <p className="mt-1 text-sm text-slate-500">Create accounts, update roles, reset passwords, and remove users.</p>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="section-card">
          <h3 className="text-lg font-bold text-slate-900">Create User</h3>
          <p className="mt-1 text-sm text-slate-500">Provision staff, doctor, or admin accounts directly from the control panel.</p>
          <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
            <div>
              <label className="field-label">Username</label>
              <input
                value={newAccount.username}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Enter username"
                className="form-field"
                required
              />
            </div>
            <div>
              <label className="field-label">Temporary password</label>
              <MaskedPasswordInput
                value={newAccount.password}
                onChange={(value) => setNewAccount((prev) => ({ ...prev, password: value }))}
                placeholder="Create strong password"
                className="form-field"
                required
              />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select
                value={newAccount.role}
                onChange={(event) => setNewAccount((prev) => ({ ...prev, role: event.target.value }))}
                className="form-field"
              >
                <option value="Staff">Staff</option>
                <option value="Doctor">Doctor</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
            <button type="submit" className="action-button action-button-info">
              Create user
            </button>
          </form>
        </article>

        <article className="section-card">
          <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
          <p className="mt-1 text-sm text-slate-500">Choose a user from the table, then assign a new strong password.</p>
          <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
            <div>
              <label className="field-label">Selected user</label>
              <input
                value={passwordReset.username}
                readOnly
                placeholder="Choose a user from the table"
                className="form-field bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="field-label">New password</label>
              <MaskedPasswordInput
                value={passwordReset.password}
                onChange={(value) => setPasswordReset((prev) => ({ ...prev, password: value }))}
                placeholder="Enter new password"
                className="form-field"
                required
              />
            </div>
            <div>
              <label className="field-label">Confirm password</label>
              <MaskedPasswordInput
                value={passwordReset.confirmPassword}
                onChange={(value) => setPasswordReset((prev) => ({ ...prev, confirmPassword: value }))}
                placeholder="Confirm new password"
                className="form-field"
                required
              />
            </div>
            <button type="submit" className="action-button action-button-info">
              Reset password
            </button>
          </form>
        </article>
      </section>

      <section className="section-card">
        <div className="table-shell">
          <table className="table-base min-w-[560px] sm:min-w-[700px]">
            <thead className="text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((account) => (
                <tr key={account.username} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500">{account.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{account.username}</td>
                  <td className="px-4 py-3 text-slate-700">{account.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordReset((prev) => ({ ...prev, username: account.username }))}
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleUpdate(account.username, 'Staff')}
                        className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        Set Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleUpdate(account.username, 'Doctor')}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Set Doctor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleUpdate(account.username, 'Administrator')}
                        className="rounded-md bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                      >
                        Set Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(account.username)}
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={isOwnAccount(account.username)}
                      >
                        Delete user
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ManageUsers;
