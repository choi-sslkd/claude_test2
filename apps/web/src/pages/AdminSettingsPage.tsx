import { useLocation, useNavigate } from 'react-router-dom';

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const adminName = localStorage.getItem('admin_name') || '관리자';
  const adminEmail = localStorage.getItem('admin_email') || 'admin@promptguard.com';

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');

    navigate('/admin/login');
  };

  return (
    <div className="page dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>PromptGuard</h2>
          <p>관리자 콘솔</p>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${
              location.pathname === '/admin/dashboard' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/dashboard')}
          >
            대시보드
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/rules' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/rules')}
          >
            룰 관리
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/logs' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/logs')}
          >
            로그 보기
          </button>

          <button
            className={`menu-item ${
              location.pathname === '/admin/settings' ? 'active' : ''
            }`}
            onClick={() => navigate('/admin/settings')}
          >
            설정
          </button>
        </nav>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>설정</h1>
            <p>관리자 콘솔 및 시스템 운영 정보를 확인합니다.</p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <section className="card-grid">
          <div className="card">
            <h3>관리자 계정</h3>
            <p>
              현재 로그인 계정은 <strong>{adminName}</strong>이며, 등록 이메일은{' '}
              <strong>{adminEmail}</strong>입니다.
            </p>
          </div>

          <div className="card">
            <h3>API 서버 주소</h3>
            <p>
              관리자 콘솔은 현재 <code>http://localhost:3000</code> 백엔드 API와
              연결되어 룰 CRUD 및 활성 룰 배포 기능을 수행합니다.
            </p>
          </div>

          <div className="card">
            <h3>룰 동기화 주기</h3>
            <p>
              크롬 익스텐션은 활성 룰을 주기적으로 다시 조회하여 최신 정책을 반영합니다.
              현재 기본 동기화 주기는 60초입니다.
            </p>
          </div>

          <div className="card">
            <h3>보안 운영 정책</h3>
            <p>
              관리자 서버는 룰 정보만 저장하며, 사용자 프롬프트 원문은 저장하거나
              분석 서버로 전송하지 않습니다.
            </p>
          </div>
        </section>

        <section className="large-card">
          <h2>시스템 구성 안내</h2>
          <p>
            PromptGuard는 관리자 서버와 사용자 분석 엔진을 분리한 구조를 사용합니다.
            관리자는 이 콘솔에서 탐지 룰을 운영하고, 사용자의 실제 프롬프트 분석은
            브라우저 확장에서 WebAssembly 기반 엔진으로 수행됩니다.
          </p>
        </section>

        <section className="large-card">
          <h2>향후 확장 예정 항목</h2>
          <p>
            이후 버전에서는 관리자 비밀번호 변경, 감사 로그 보존 기간 설정, 위험도
            임계치 조정, 룰 배포 정책 설정 등의 기능을 추가할 수 있습니다.
          </p>
        </section>
      </main>
    </div>
  );
}