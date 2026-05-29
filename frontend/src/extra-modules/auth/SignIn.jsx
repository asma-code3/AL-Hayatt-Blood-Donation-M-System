import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiLock, FiUser, FiUserCheck } from 'react-icons/fi';
import { useAuth } from '../../Context/auth-context';
import { BrandMark, MaskedPasswordInput, ToastMessage } from '../../components/ui';

const roleOptions = [
  {
    value: 'Staff',
    label: 'Staff',
    description: 'Handles daily blood bank operations.',
    icon: FiUser,
  },
  {
    value: 'Doctor',
    label: 'Doctor',
    description: 'Focuses on patient workflows.',
    icon: FiUserCheck,
  },
];

const SignIn = ({ switchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [role, setRole] = useState('Staff');
  const [loginError, setLoginError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);

  const { login, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const roleRouteMap = {
    Administrator: '/dashboard',
    Staff: '/dashboard',
    Doctor: '/dashboard',
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const result = await login(username, password, role);

    if (result.success) {
      navigate(roleRouteMap[result.role] || '/dashboard', {
        replace: true,
      });
      return;
    }

    setLoginError(result.message || 'Login failed');
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoginError('');
    setResetMessage('');

    if (resetPassword !== confirmResetPassword) {
      setLoginError('New password and confirmation do not match.');
      return;
    }

    const result = await forgotPassword({ username, password: resetPassword });
    if (!result.success) {
      setLoginError(result.message || 'Unable to reset password.');
      return;
    }

    setResetMessage(result.message || 'Password reset successfully.');
    setResetPassword('');
    setConfirmResetPassword('');
    setIsForgotPasswordMode(false);
  };

  return (
    <form onSubmit={isForgotPasswordMode ? handleForgotPassword : handleLogin} className="auth-form-card auth-form-enter" autoComplete="on">
      <ToastMessage type={loginError ? 'error' : 'success'} text={loginError || resetMessage} onClose={() => { setLoginError(''); setResetMessage(''); }} />
      <div className="mb-8 flex justify-center">
        <BrandMark size="md" align="center" title="Al-Hayatt" subtitle="Blood Donation Management System" />
      </div>

      <div className="mb-6 text-center">
        <h2 className="auth-form-title">{isForgotPasswordMode ? 'Reset password' : 'Login'}</h2>
        <p className="auth-form-subtitle">
          {isForgotPasswordMode ? 'Enter your username and set a new password.' : 'Welcome back! Please login to your account'}
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="auth-label">Username</label>
          <div className="auth-input-shell">
            <FiUser className="auth-input-icon" />
            <input
              id="login-username"
              name="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input auth-input-with-leading-icon"
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </div>
        </div>

        <div>
          <label className="auth-label ">Password</label>
          <div className="auth-input-shell">
            <FiLock className="auth-input-icon" />
          <MaskedPasswordInput
            id="login-password"
            name="password"
            placeholder={isForgotPasswordMode ? 'Create new password' : 'Enter your password'}
            value={isForgotPasswordMode ? resetPassword : password}
            onChange={isForgotPasswordMode ? setResetPassword : setPassword}
            className="auth-input auth-input-with-leading-icon auth-password-input"
            autoComplete={isForgotPasswordMode ? 'new-password' : 'current-password'}
            nativePassword
            required
          />
          </div>
        </div>

        {isForgotPasswordMode ? (
          <div>
            <label className="auth-label">Confirm password</label>
            <div className="auth-input-shell">
              <FiLock className="auth-input-icon" />
              <MaskedPasswordInput
                id="login-confirm-reset-password"
                name="confirm-reset-password"
                placeholder="Confirm new password"
                value={confirmResetPassword}
                onChange={setConfirmResetPassword}
                className="auth-input auth-input-with-leading-icon auth-password-input"
                autoComplete="new-password"
                nativePassword
                required
              />
            </div>
          </div>
        ) : null}

        {!isForgotPasswordMode ? (
        <div>
          <label className="auth-label">Role as</label>
          <div className="auth-role-grid">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const isActive = role === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`auth-role-card ${isActive ? 'auth-role-card-active' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                    className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                        isActive ? 'border-red-500' : 'border-slate-300'
                      }`}
                    >
                      {isActive && <div className="h-2 w-2 rounded-full bg-red-500" />}
                    </div>

                    <div className={`auth-role-icon ${isActive ? 'auth-role-icon-active' : ''}`}>
                      <Icon />
                    </div>

                    <div className="min-w-0 text-left">
                      <p className="text-[12px] font-bold">{option.label}</p>
                      <p className="text-[10px] leading-4 text-slate-500">{option.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        ) : null}

        <button type="submit" className="auth-primary-button w-full">
          <span>{isForgotPasswordMode ? 'Reset password' : 'Login'}</span>
          <FiArrowRight />
        </button>
      </div>

      <div className="mt-4 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setIsForgotPasswordMode((prev) => !prev);
            setLoginError('');
            setResetMessage('');
          }}
          className="auth-inline-link"
        >
          {isForgotPasswordMode ? 'Back to login' : 'Forgot password?'}
        </button>
      </div>

      <div className="auth-divider">or</div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={switchToSignup}
          className="auth-inline-link"
        >
          Sign up
        </button>
      </p>
    </form>
  );
};

export default SignIn;
