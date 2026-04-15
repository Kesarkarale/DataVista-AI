import { useMemo, useState } from "react";

const sampleCsv = `Month,Sales,Profit,Users
Jan,12000,3200,210
Feb,15000,4100,245
Mar,18000,5200,300
Apr,22000,6400,355
May,26000,7600,420
Jun,24000,7100,398`;

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row = {};

    headers.forEach((header, index) => {
      const value = values[index] ?? "";
      const numericValue = Number(value);
      row[header] =
        value !== "" && !Number.isNaN(numericValue) ? numericValue : value;
    });

    return row;
  });

  return { headers, rows };
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fileName, setFileName] = useState("sample-data.csv");
  const [csvText, setCsvText] = useState(sampleCsv);
  const [activePage, setActivePage] = useState("dashboard");
  const [search, setSearch] = useState("");

  const parsed = useMemo(() => parseCSV(csvText), [csvText]);
  const { headers, rows } = parsed;

  const numericHeaders = useMemo(() => {
    return headers.filter((header) =>
      rows.some((row) => typeof row[header] === "number")
    );
  }, [headers, rows]);

  const firstLabelHeader = useMemo(() => {
    return (
      headers.find((header) => !numericHeaders.includes(header)) || headers[0] || ""
    );
  }, [headers, numericHeaders]);

  const primaryMetric = numericHeaders[0] || "";
  const secondaryMetric = numericHeaders[1] || "";
  const tertiaryMetric = numericHeaders[2] || "";

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;

    const query = search.toLowerCase();
    return rows.filter((row) =>
      headers.some((header) =>
        String(row[header] ?? "")
          .toLowerCase()
          .includes(query)
      )
    );
  }, [rows, headers, search]);

  const totals = useMemo(() => {
    const sum = (key) =>
      rows.reduce((acc, row) => {
        const value = row[key];
        return acc + (typeof value === "number" ? value : 0);
      }, 0);

    const avg = (key) => {
      const values = rows
        .map((row) => row[key])
        .filter((value) => typeof value === "number");
      if (!values.length) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const maxRow =
      primaryMetric && rows.length
        ? rows.reduce((best, row) => {
            const bestValue =
              typeof best?.[primaryMetric] === "number" ? best[primaryMetric] : -Infinity;
            const currentValue =
              typeof row?.[primaryMetric] === "number" ? row[primaryMetric] : -Infinity;
            return currentValue > bestValue ? row : best;
          }, rows[0])
        : null;

    return {
      totalPrimary: primaryMetric ? sum(primaryMetric) : 0,
      totalSecondary: secondaryMetric ? sum(secondaryMetric) : 0,
      avgTertiary: tertiaryMetric ? avg(tertiaryMetric) : 0,
      totalRows: rows.length,
      topLabel: maxRow?.[firstLabelHeader] ?? "-",
      topValue:
        maxRow && primaryMetric && typeof maxRow[primaryMetric] === "number"
          ? maxRow[primaryMetric]
          : 0,
    };
  }, [rows, primaryMetric, secondaryMetric, tertiaryMetric, firstLabelHeader]);

  const chartData = useMemo(() => {
    if (!firstLabelHeader || !primaryMetric) return [];
    return rows.slice(0, 6).map((row) => ({
      label: String(row[firstLabelHeader]),
      value: typeof row[primaryMetric] === "number" ? row[primaryMetric] : 0,
    }));
  }, [rows, firstLabelHeader, primaryMetric]);

  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);

  const insights = useMemo(() => {
    const items = [];

    if (primaryMetric) {
      items.push(
        `Total ${primaryMetric} is ${formatCurrency(totals.totalPrimary)} based on ${totals.totalRows} records.`
      );
    }

    if (secondaryMetric) {
      items.push(
        `Combined ${secondaryMetric} reached ${formatCurrency(totals.totalSecondary)} across the uploaded dataset.`
      );
    }

    if (tertiaryMetric) {
      items.push(
        `Average ${tertiaryMetric} is ${formatNumber(Math.round(totals.avgTertiary))}.`
      );
    }

    if (totals.topLabel !== "-") {
      items.push(
        `${totals.topLabel} is the best-performing ${firstLabelHeader.toLowerCase()} for ${primaryMetric}.`
      );
    }

    return items;
  }, [
    primaryMetric,
    secondaryMetric,
    tertiaryMetric,
    totals,
    firstLabelHeader,
  ]);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Please enter full name and email.");
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setName("");
    setEmail("");
    setActivePage("dashboard");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      setCsvText(text);
      setFileName(file.name);
      setActivePage("analytics");
    };
    reader.readAsText(file);
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
          background:
            radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 28%),
            radial-gradient(circle at bottom right, rgba(139,92,246,0.18), transparent 24%),
            linear-gradient(135deg, #07111f, #0f172a 45%, #111827);
          color: #ffffff;
        }

        .page {
          min-height: 100vh;
          display: flex;
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 32px 26px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(12px);
        }

        .logo {
          width: 74px;
          height: 74px;
          margin: 0 auto 18px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 26px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          box-shadow: 0 14px 34px rgba(59,130,246,0.35);
        }

        .title {
          text-align: center;
          font-size: 34px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .subtitle {
          text-align: center;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 24px;
          font-size: 15px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .label {
          display: block;
          margin-bottom: 8px;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 700;
        }

        .input {
          width: 100%;
          padding: 14px 15px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: white;
          outline: none;
          font-size: 15px;
        }

        .input::placeholder {
          color: #94a3b8;
        }

        .input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px rgba(96,165,250,0.14);
        }

        .btn {
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          transition: 0.25s ease;
        }

        .btn-primary {
          width: 100%;
          padding: 14px;
          margin-top: 10px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-size: 16px;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
        }

        .app-shell {
          width: 100%;
          display: grid;
          grid-template-columns: 260px 1fr;
        }

        .sidebar {
          min-height: 100vh;
          padding: 24px 18px;
          border-right: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(10px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .brand-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        }

        .brand h2 {
          font-size: 22px;
          margin-bottom: 2px;
        }

        .brand p {
          color: #94a3b8;
          font-size: 13px;
        }

        .nav {
          display: grid;
          gap: 10px;
        }

        .nav-btn {
          width: 100%;
          text-align: left;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: white;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
        }

        .nav-btn.active {
          background: linear-gradient(135deg, rgba(59,130,246,0.28), rgba(139,92,246,0.18));
          border-color: rgba(96,165,250,0.35);
        }

        .sidebar-card {
          margin-top: 22px;
          padding: 16px;
          border-radius: 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .sidebar-card h4 {
          margin-bottom: 8px;
          font-size: 16px;
        }

        .sidebar-card p {
          color: #cbd5e1;
          font-size: 14px;
          line-height: 1.6;
        }

        .main {
          padding: 24px;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 22px;
        }

        .welcome h1 {
          font-size: 30px;
          margin-bottom: 6px;
        }

        .welcome p {
          color: #cbd5e1;
          line-height: 1.6;
        }

        .top-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search {
          min-width: 230px;
        }

        .logout-btn {
          padding: 12px 18px;
          background: #ef4444;
          color: white;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
        }

        .hero {
          padding: 24px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(135deg, rgba(59,130,246,0.16), rgba(139,92,246,0.12));
          margin-bottom: 22px;
        }

        .hero h2 {
          font-size: 32px;
          margin-bottom: 10px;
        }

        .hero p {
          color: #dbeafe;
          line-height: 1.7;
          max-width: 760px;
        }

        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .badge {
          padding: 9px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 700;
        }

        .grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 22px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
          margin-bottom: 22px;
        }

        .panel {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 16px 34px rgba(0,0,0,0.14);
        }

        .panel h3 {
          font-size: 20px;
          margin-bottom: 14px;
        }

        .kpi-label {
          color: #cbd5e1;
          font-size: 14px;
          margin-bottom: 10px;
          font-weight: 600;
        }

        .kpi-value {
          font-size: 30px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .kpi-sub {
          color: #94a3b8;
          font-size: 13px;
        }

        .upload-box {
          border: 1.5px dashed rgba(148,163,184,0.45);
          border-radius: 18px;
          padding: 22px;
          text-align: center;
          background: rgba(255,255,255,0.03);
        }

        .upload-box h4 {
          margin-bottom: 8px;
          font-size: 18px;
        }

        .upload-box p {
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .muted {
          color: #94a3b8;
          font-size: 13px;
        }

        .chart {
          height: 260px;
          display: flex;
          align-items: end;
          gap: 14px;
          margin-top: 16px;
        }

        .bar-wrap {
          flex: 1;
          text-align: center;
        }

        .bar {
          width: 100%;
          min-height: 18px;
          border-radius: 14px 14px 6px 6px;
          background: linear-gradient(180deg, #60a5fa, #2563eb);
          box-shadow: 0 12px 24px rgba(37,99,235,0.22);
        }

        .bar-label {
          margin-top: 10px;
          font-size: 13px;
          color: #cbd5e1;
        }

        .bar-value {
          margin-top: 5px;
          font-size: 12px;
          color: #94a3b8;
        }

        .insights {
          display: grid;
          gap: 12px;
        }

        .insight-item {
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0;
          line-height: 1.6;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          text-align: left;
          padding: 13px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          white-space: nowrap;
          font-size: 14px;
        }

        th {
          color: #cbd5e1;
          font-weight: 700;
          background: rgba(255,255,255,0.03);
        }

        td {
          color: #f8fafc;
        }

        .activity-list {
          display: grid;
          gap: 12px;
        }

        .activity-item {
          padding: 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .activity-item strong {
          display: block;
          margin-bottom: 6px;
        }

        .activity-item span {
          color: #cbd5e1;
          line-height: 1.6;
          font-size: 14px;
        }

        .hidden-input {
          display: none;
        }

        @media (max-width: 1100px) {
          .grid-4 {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .app-shell {
            grid-template-columns: 1fr;
          }

          .sidebar {
            min-height: auto;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
        }

        @media (max-width: 640px) {
          .grid-4 {
            grid-template-columns: 1fr;
          }

          .title {
            font-size: 28px;
          }

          .hero h2 {
            font-size: 26px;
          }

          .welcome h1 {
            font-size: 24px;
          }

          .search {
            min-width: 100%;
          }
        }
      `}</style>

      {!isLoggedIn ? (
        <div className="login-page">
          <div className="login-card">
            <div className="logo">DV</div>
            <div className="title">DataVista AI</div>
            <div className="subtitle">
              Professional analytics platform for CSV upload, KPI tracking,
              business insights, and smart dashboard reporting.
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                Login to Dashboard
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="page">
          <div className="app-shell">
            <aside className="sidebar">
              <div className="brand">
                <div className="brand-icon">DV</div>
                <div>
                  <h2>DataVista AI</h2>
                  <p>Analytics Workspace</p>
                </div>
              </div>

              <div className="nav">
                <button
                  className={`nav-btn ${activePage === "dashboard" ? "active" : ""}`}
                  onClick={() => setActivePage("dashboard")}
                >
                  Dashboard Overview
                </button>
                <button
                  className={`nav-btn ${activePage === "analytics" ? "active" : ""}`}
                  onClick={() => setActivePage("analytics")}
                >
                  Data Analytics
                </button>
                <button
                  className={`nav-btn ${activePage === "reports" ? "active" : ""}`}
                  onClick={() => setActivePage("reports")}
                >
                  Reports & Insights
                </button>
              </div>

              <div className="sidebar-card">
                <h4>Current Dataset</h4>
                <p>{fileName}</p>
                <p className="muted" style={{ marginTop: "8px" }}>
                  {rows.length} records • {headers.length} columns
                </p>
              </div>

              <div className="sidebar-card">
                <h4>Quick Tip</h4>
                <p>
                  Upload a CSV with a text label column like Month and numeric
                  columns like Sales, Profit, Users for best dashboard results.
                </p>
              </div>
            </aside>

            <main className="main">
              <div className="topbar">
                <div className="welcome">
                  <h1>Welcome back, {name}</h1>
                  <p>
                    Manage uploads, monitor KPIs, and explore data-driven
                    performance insights.
                  </p>
                </div>

                <div className="top-actions">
                  <input
                    className="input search"
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  <label className="upload-btn">
                    Upload CSV
                    <input
                      className="hidden-input"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                  </label>

                  <button className="btn logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>

              <section className="hero">
                <h2>Professional Data Analytics Dashboard</h2>
                <p>
                  This dashboard lets you upload CSV data, calculate key
                  business metrics, visualize trends, and review structured
                  records in a clean professional interface.
                </p>

                <div className="hero-badges">
                  <span className="badge">Live CSV Analysis</span>
                  <span className="badge">Auto KPI Calculation</span>
                  <span className="badge">Interactive Search</span>
                  <span className="badge">Visual Trend Overview</span>
                </div>
              </section>

              <section className="grid-4">
                <div className="panel">
                  <div className="kpi-label">
                    Total {primaryMetric || "Primary Metric"}
                  </div>
                  <div className="kpi-value">
                    {primaryMetric
                      ? formatCurrency(totals.totalPrimary)
                      : "No numeric data"}
                  </div>
                  <div className="kpi-sub">
                    Based on uploaded dataset
                  </div>
                </div>

                <div className="panel">
                  <div className="kpi-label">
                    Total {secondaryMetric || "Secondary Metric"}
                  </div>
                  <div className="kpi-value">
                    {secondaryMetric
                      ? formatCurrency(totals.totalSecondary)
                      : "--"}
                  </div>
                  <div className="kpi-sub">
                    Secondary performance metric
                  </div>
                </div>

                <div className="panel">
                  <div className="kpi-label">
                    Average {tertiaryMetric || "Tertiary Metric"}
                  </div>
                  <div className="kpi-value">
                    {tertiaryMetric
                      ? formatNumber(Math.round(totals.avgTertiary))
                      : "--"}
                  </div>
                  <div className="kpi-sub">
                    Mean value across records
                  </div>
                </div>

                <div className="panel">
                  <div className="kpi-label">Top Performer</div>
                  <div className="kpi-value" style={{ fontSize: "24px" }}>
                    {totals.topLabel}
                  </div>
                  <div className="kpi-sub">
                    Best {firstLabelHeader || "label"} by {primaryMetric || "metric"}:{" "}
                    {primaryMetric ? formatCurrency(totals.topValue) : "--"}
                  </div>
                </div>
              </section>

              <section className="grid-2">
                <div className="panel">
                  <h3>Upload & Dataset Summary</h3>

                  <div className="upload-box">
                    <h4>CSV File Ready</h4>
                    <p>
                      Current file: <strong>{fileName}</strong>
                    </p>
                    <label className="upload-btn">
                      Choose Another CSV
                      <input
                        className="hidden-input"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <p className="muted" style={{ marginTop: "14px" }}>
                      Supported format: comma-separated CSV with header row
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <div className="panel" style={{ padding: "16px" }}>
                      <div className="kpi-label">Rows</div>
                      <div className="kpi-value" style={{ fontSize: "24px" }}>
                        {rows.length}
                      </div>
                    </div>
                    <div className="panel" style={{ padding: "16px" }}>
                      <div className="kpi-label">Columns</div>
                      <div className="kpi-value" style={{ fontSize: "24px" }}>
                        {headers.length}
                      </div>
                    </div>
                    <div className="panel" style={{ padding: "16px" }}>
                      <div className="kpi-label">Numeric Fields</div>
                      <div className="kpi-value" style={{ fontSize: "24px" }}>
                        {numericHeaders.length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <h3>AI-Style Insights</h3>
                  <div className="insights">
                    {insights.map((item, index) => (
                      <div key={index} className="insight-item">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid-2">
                <div className="panel">
                  <h3>{primaryMetric || "Primary Metric"} Trend</h3>
                  <div className="chart">
                    {chartData.map((item) => (
                      <div key={item.label} className="bar-wrap">
                        <div
                          className="bar"
                          style={{
                            height: `${Math.max(
                              30,
                              (item.value / maxChartValue) * 220
                            )}px`,
                          }}
                        />
                        <div className="bar-label">{item.label}</div>
                        <div className="bar-value">
                          {formatNumber(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    <div className="activity-item">
                      <strong>Dataset loaded successfully</strong>
                      <span>
                        {fileName} has been parsed and connected to the dashboard.
                      </span>
                    </div>
                    <div className="activity-item">
                      <strong>Metrics calculated</strong>
                      <span>
                        KPI totals, averages, and best-performing records are ready.
                      </span>
                    </div>
                    <div className="activity-item">
                      <strong>Search enabled</strong>
                      <span>
                        Use the search box to instantly filter records from the table.
                      </span>
                    </div>
                    <div className="activity-item">
                      <strong>Visualization generated</strong>
                      <span>
                        The dashboard created a visual trend view from your uploaded CSV.
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <h3>Data Table</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {headers.map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length ? (
                        filteredRows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {headers.map((header) => (
                              <td key={header}>
                                {typeof row[header] === "number"
                                  ? formatNumber(row[header])
                                  : String(row[header])}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={headers.length || 1}>
                            No matching records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        </div>
      )}
    </>
  );
}
