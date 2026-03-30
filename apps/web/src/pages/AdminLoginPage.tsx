import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/auth';

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {
      const result = await adminLogin({ email, password });

      localStorage.setItem('admin_access_token', result.accessToken);
      localStorage.setItem('admin_role', result.user.role);
      localStorage.setItem('admin_name', result.user.name);
      localStorage.setItem('admin_email', result.user.email);

      navigate('/admin/dashboard');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        '로그인에 실패했습니다. 관리자 계정을 다시 확인하세요.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="badge">ADMIN</span>
          <h1>PromptGuard 관리자 로그인</h1>
          <p>로그인 후 관리자 페이지에서 룰을 등록하고 관리합니다.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              placeholder="admin@promptguard.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMessage && <div className="error-box">{errorMessage}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-footer">
          <p>초기 테스트 계정은 백엔드에 하드코딩된 관리자 계정을 사용하면 됩니다.</p>
        </div>
      </div>
    </div>
  );
}