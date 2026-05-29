import React, { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true);

  return (
    <div className="auth-screen min-h-screen px-4 py-8">
      <div className="auth-screen-inner">
        {isLoginView ? (
          <SignIn switchToSignup={() => setIsLoginView(false)} />
        ) : (
          <SignUp switchToLogin={() => setIsLoginView(true)} />
        )}
        <div className="auth-screen-footer">
          <span className="auth-screen-footer-icon">+</span>
  
        </div>
      </div>
    </div>
  );
};

export default Login;
