import React, { useState } from 'react';
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

const isStrongPassword = (password) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const getPasswordIssues = (password) => {
  const issues = [];

  if (password.length < 8) issues.push('8 characters');
  if (!/[A-Z]/.test(password)) issues.push('uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('lowercase letter');
  if (!/\d/.test(password)) issues.push('number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('special character');

  return issues;
};

const SignUp = ({ switchToLogin }) => {
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Staff');

  const [registerError, setRegisterError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register } = useAuth();
  const passwordIssues = getPasswordIssues(registerPassword);
  const showPasswordHint = registerPassword.length > 0;

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setSuccessMessage('');

    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }

    if (!isStrongPassword(registerPassword)) {
      setRegisterError('Password needs 8+ chars with uppercase, lowercase, number, and special character.');
      return;
    }

    const result = await register({
      username: registerUsername,
      password: registerPassword,
      role,
    });

    if (!result.success) {
      setRegisterError(result.message);
      return;
    }

    setSuccessMessage('Account created successfully');

    setRegisterUsername('');
    setRegisterPassword('');
    setConfirmPassword('');

    window.setTimeout(() => {
      switchToLogin();
    }, 800);
  };

  return (
    <form onSubmit={handleRegister} className="auth-form-card auth-form-enter" autoComplete="on">
      <ToastMessage
        type={registerError ? 'error' : 'success'}
        text={registerError || successMessage}
        onClose={() => {
          setRegisterError('');
          setSuccessMessage('');
        }}
      />
      <div className="mb-6 flex justify-center">
        <BrandMark size="md" align="center" title="Al-Hayatt" subtitle="Blood Donation Management System" />
      </div>

      <div className="mb-5 text-center">
        <h2 className="auth-form-title">Create account</h2>
        <p className="auth-form-subtitle">Set up a secure staff or doctor account</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="auth-label">Username</label>
          <div className="auth-input-shell">
            <FiUser className="auth-input-icon" />
            <input
              id="register-username"
              name="username"
              type="text"
              placeholder="Create your username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              className="auth-input auth-input-with-leading-icon"
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>
        </div>

        <div>
          <label className="auth-label">Password</label>
          <div className="auth-input-shell">
            <FiLock className="auth-input-icon" />
            <MaskedPasswordInput
              id="register-password"
              name="new-password"
              placeholder="Create your password"
              value={registerPassword}
              onChange={setRegisterPassword}
              className="auth-input auth-input-with-leading-icon auth-password-input"
              autoComplete="new-password"
              nativePassword
              required
            />
          </div>
        </div>

        <div>
          <label className="auth-label">Confirm password</label>
          <div className="auth-input-shell">
            <FiLock className="auth-input-icon" />
            <MaskedPasswordInput
              id="register-confirm-password"
              name="confirm-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              className="auth-input auth-input-with-leading-icon auth-password-input"
              autoComplete="new-password"
              nativePassword
              required
            />
          </div>
        </div>

        <p className={`text-xs ${showPasswordHint ? (passwordIssues.length === 0 ? 'text-green-600' : 'text-amber-600') : 'text-slate-500'}`}>
          {showPasswordHint
            ? passwordIssues.length === 0
              ? 'Password looks strong.'
              : `Add: ${passwordIssues.join(', ')}.`
            : 'Password must include uppercase, lowercase, number, and special character.'}
        </p>

        <div>
          <label className="auth-label">Register as</label>
        <div className="auth-role-grid">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const isActive = role === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`auth-role-card ${
                  isActive ? 'auth-role-card-active' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 ${
                      isActive ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                    )}
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

        <button type="submit" className="auth-primary-button w-full">
          <span>Create account</span>
          <FiArrowRight />
        </button>
      </div>

      <div className="auth-divider">or</div>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={switchToLogin}
          className="auth-inline-link"
        >
          Login
        </button>
      </p>
    </form>
  );
};

export default SignUp;
