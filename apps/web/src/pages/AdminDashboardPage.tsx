import { useNavigate, useLocation } from 'react-router-dom';

export default function AdminDashboardPage() {
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
            <h1>관리자 대시보드</h1>
            <p>
              로그인한 관리자: {adminName} / {adminEmail}
            </p>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </header>

        <section className="card-grid">
          <div className="card">
            <h3>서비스 운영 상태</h3>
            <p>
              PromptGuard 관리자 콘솔에 정상적으로 접속된 상태입니다. 현재 관리자는
              룰 등록, 수정, 삭제 및 활성화 상태를 관리할 수 있습니다.
            </p>
          </div>

          <div className="card">
            <h3>룰 엔진 운영 방식</h3>
            <p>
              백엔드는 룰을 저장하고 배포하며, 실제 프롬프트 분석은 브라우저 확장에서
              WebAssembly 기반 룰 엔진으로 로컬에서 수행됩니다.
            </p>
          </div>

          <div className="card">
            <h3>프라이버시 보호 구조</h3>
            <p>
              사용자 프롬프트 원문은 서버나 DB에 저장되지 않습니다. 서버는 관리자 룰만
              관리하며, 분석 대상 원문은 브라우저 내부에서만 처리됩니다.
            </p>
          </div>

          <div className="card">
            <h3>API 연동 현황</h3>
            <p>
              <code>/admin/rules</code> 및 <code>/admin/rules/active</code> API를 통해
              룰 CRUD와 활성 룰 배포가 연결된 상태입니다.
            </p>
          </div>
        </section>

        <section className="large-card">
          <h2>관리 기능 안내</h2>
          <p>
            <strong>룰 관리</strong> 페이지에서는 탐지 패턴과 위험도를 추가·수정·삭제할 수
            있으며, 활성 룰은 크롬 익스텐션에서 주기적으로 동기화되어 즉시 반영됩니다.
          </p>
          <p>
            <strong>로그 보기</strong> 페이지에서는 관리자 활동 및 룰 변경 이력을 확인할 수
            있고, <strong>설정</strong> 페이지에서는 관리자 콘솔 운영에 필요한 기본 항목을
            관리할 수 있습니다.
          </p>
        </section>

        <section className="large-card">
          <h2>현재 시스템 요약</h2>
          <p>
            PromptGuard는 관리자 서버와 사용자 분석 엔진의 역할을 분리한 구조를 사용합니다.
            관리 서버는 룰을 배포하고, 사용자 측 브라우저 확장은 해당 룰을 내려받아 프롬프트
            인젝션 의심 패턴을 실시간으로 분석하고 경고 또는 차단합니다.
          </p>
        </section>
      </main>
    </div>
  );
}