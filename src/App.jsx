import { useState } from "react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Please fill in both fields.");
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
          min-height: 100%;
        }

        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }

        .page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .card {
          width: 100%;
          max-width: 950px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
        }

        .login-card {
          max-width: 430px;
        }

        .logo {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 22px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }

        .title {
          text-align: center;
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .subtitle {
          text-align: center;
          color: #cbd5e1;
          margin-bottom: 24px;
          line-height: 1.6;
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
          padding: 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.06);
          color: white;
          outline: none;
          font-size: 15px;
        }

        input::placeholder {
          color: #94a3b8;
        }

        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 700;
          margin-top: 8px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-box {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
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
          border: none;
          cursor: pointer;
          background: #ef4444;
          color: white;
          font-weight: 700;
        }

        .hero {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 22px;
        }

        .hero h1 {
          font-size: 34px;
          margin-bottom: 10px;
        }

        .hero p {
          color: #dbeafe;
          line-height: 1.7;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .stat-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 20px;
        }

        .stat-card h3 {
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 10px;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .stat-small {
          color: #94a3b8;
          font-size: 13px;
        }

        .bottom {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 16px;
        }

        .panel {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 20px;
        }

        .panel h3 {
          margin-bottom: 16px;
          font-size: 20px;
        }

        .activity {
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .activity:last-child {
          border-bottom: none;
        }

        .activity strong {
          display: block;
          margin-bottom: 5px;
        }

        .activity span {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.5;
        }

        .chart {
          height: 220px;
          display: flex;
          align-items: end;
          gap: 12px;
          padding-top: 10px;
        }

        .bar-wrap {
          flex: 1;
          text-align: center;
        }

        .bar {
          width: 100%;
          border-radius: 12px 12px 5px 5px;
          background: linear-gradient(180deg, #60a5fa, #2563eb);
        }

        .bar-label {
          margin-top: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .bottom {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 540px) {
          .stats {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 28px;
          }

          .hero h1 {
            font-size: 26px;
          }
        }
      `}</style>

      <div className="page">
        {!isLoggedIn ? (
          <div className="card login-card">
            <div className="logo">DV</div>
            <div className="title">DataVista AI</div>
            <div className="subtitle">
              Login to access your analytics dashboard.
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
          <div className="card">
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
                Analyze performance, track datasets, and view insights in a clean
                and professional dashboard.
              </p>
            </div>

            <div className="stats">
              <div className="stat-card">
                <h3>Total Datasets</h3>
                <div className="stat-value">24</div>
                <div className="stat-small">Uploaded this month</div>
              </div>

              <div className="stat-card">
                <h3>Reports Generated</h3>
                <div className="stat-value">12</div>
                <div className="stat-small">AI summary reports</div>
              </div>

              <div className="stat-card">
                <h3>Accuracy Rate</h3>
                <div className="stat-value">94%</div>
                <div className="stat-small">Prediction confidence</div>
              </div>

              <div className="stat-card">
                <h3>Active Users</h3>
                <div className="stat-value">1,284</div>
                <div className="stat-small">Across dashboard</div>
              </div>
            </div>

            <div className="bottom">
              <div className="panel">
                <h3>Recent Activity</h3>

                <div className="activity">
                  <strong>Sales dataset uploaded</strong>
                  <span>Latest CSV processed and analyzed successfully.</span>
                </div>

                <div className="activity">
                  <strong>Monthly report generated</strong>
                  <span>Revenue trends and summary report created.</span>
                </div>

                <div className="activity">
                  <strong>Customer segmentation updated</strong>
                  <span>New grouping model prepared from fresh data.</span>
                </div>

                <div className="activity">
                  <strong>Dashboard metrics refreshed</strong>
                  <span>All cards updated using latest records.</span>
                </div>
              </div>

              <div className="panel">
                <h3>Weekly Overview</h3>
                <div className="chart">
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
