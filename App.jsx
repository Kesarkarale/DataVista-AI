 import { useState } from "react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Please fill all fields");
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setName("");
    setEmail("");
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #root {
          min-height: 100vh;
          font-family: Inter, system-ui, sans-serif;
          background: linear-gradient(135deg, #0f172a, #1e293b, #0f172a);
          color: white;
        }

        body {
          overflow-x: hidden;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .login-card, .dashboard-card {
          width: 100%;
          max-width: 1100px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .login-card {
          max-width: 420px;
          padding: 34px 28px;
        }

        .logo {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 22px;
          margin: 0 auto 18px;
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.35);
        }

        .title {
          font-size: 32px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 10px;
        }

        .subtitle {
          text-align: center;
          color: #cbd5e1;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 28px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #e2e8f0;
          font-weight: 600;
        }

        input {
          width: 100%;
          padding: 14px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: white;
          outline: none;
          font-size: 15px;
        }

        input::placeholder {
          color: #94a3b8;
        }

        input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96,165,250,0.15);
        }

        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          transition: 0.3s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          margin-top: 8px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 30px rgba(37, 99, 235, 0.35);
        }

        .dashboard-card {
          padding: 28px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
        }

        .brand h2 {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .brand p {
          color: #cbd5e1;
          font-size: 14px;
        }

        .logout-btn {
          padding: 12px 18px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: white;
          font-weight: 600;
          cursor: pointer;
        }

        .logout-btn:hover {
          background: rgba(255,255,255,0.12);
        }

        .hero {
          background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(139,92,246,0.14));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 28px;
          margin-bottom: 24px;
        }

        .hero h1 {
          font-size: 34px;
          margin-bottom: 10px;
        }

        .hero p {
          color: #dbeafe;
          line-height: 1.7;
          max-width: 760px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 22px;
        }

        .stat-card h3 {
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .stat-card .value {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .stat-card .small {
          color: #94a3b8;
          font-size: 13px;
        }

        .bottom-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 18px;
        }

        .panel {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 22px;
        }

        .panel h3 {
          font-size: 20px;
          margin-bottom: 16px;
        }

        .activity-item {
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .activity-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .activity-item strong {
          display: block;
          margin-bottom: 6px;
        }

        .activity-item span {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.5;
        }

        .chart-box {
          height: 240px;
          display: flex;
          align-items: end;
          gap: 14px;
          padding-top: 18px;
        }

        .bar-wrap {
          flex: 1;
          text-align: center;
        }

        .bar {
          width: 100%;
          border-radius: 14px 14px 6px 6px;
          background: linear-gradient(180deg, #60a5fa, #2563eb);
          box-shadow: 0 10px 24px rgba(37,99,235,0.25);
        }

        .bar-label {
          margin-top: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .hero h1 {
            font-size: 28px;
          }
        }

        @media (max-width: 520px) {
          .login-card {
            padding: 26px 18px;
          }

          .dashboard-card {
            padding: 18px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 28px;
          }

          .hero h1 {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="page">
        {!isLoggedIn ? (
          <div className="login-card">
            <div className="logo">DV</div>
            <div className="title">DataVista AI</div>
            <div className="subtitle">
              Login to access your smart analytics dashboard and view your data insights.
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Login to Dashboard
              </button>
            </form>
          </div>
        ) : (
          <div className="dashboard-card">
            <div className="topbar">
              <div className="brand">
                <div className="brand-box">DV</div>
                <div>
                  <h2>DataVista AI</h2>
                  <p>Welcome back, {name}</p>
                </div>
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <div className="hero">
              <h1>Smart Data Analytics Dashboard</h1>
              <p>
                Analyze business trends, monitor performance, and uncover useful
                insights through an elegant and user-friendly data dashboard.
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Datasets</h3>
                <div className="value">24</div>
                <div className="small">Uploaded this month</div>
              </div>

              <div className="stat-card">
                <h3>Reports Generated</h3>
                <div className="value">12</div>
                <div className="small">Automatic AI summaries</div>
              </div>

              <div className="stat-card">
                <h3>Accuracy Rate</h3>
                <div className="value">94%</div>
                <div className="small">Prediction confidence</div>
              </div>

              <div className="stat-card">
                <h3>Active Users</h3>
                <div className="value">1,284</div>
                <div className="small">Across analytics modules</div>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="panel">
                <h3>Recent Activity</h3>

                <div className="activity-item">
                  <strong>Sales dataset uploaded</strong>
                  <span>AI processed your latest CSV file and generated summary insights.</span>
                </div>

                <div className="activity-item">
                  <strong>Monthly report generated</strong>
                  <span>System created a visual report for revenue and growth trends.</span>
                </div>

                <div className="activity-item">
                  <strong>Customer segmentation updated</strong>
                  <span>New grouping model prepared based on recent user activity.</span>
                </div>

                <div className="activity-item">
                  <strong>Performance metrics refreshed</strong>
                  <span>Dashboard values updated using the latest uploaded records.</span>
                </div>
              </div>

              <div className="panel">
                <h3>Weekly Overview</h3>
                <div className="chart-box">
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: "70px" }}></div>
                    <div className="bar-label">Mon</div>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: "120px" }}></div>
                    <div className="bar-label">Tue</div>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: "95px" }}></div>
                    <div className="bar-label">Wed</div>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: "160px" }}></div>
                    <div className="bar-label">Thu</div>
                  </div>
                  <div className="bar-wrap">
                    <div className="bar" style={{ height: "135px" }}></div>
                    <div className="bar-label">Fri</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}