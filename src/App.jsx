import { useEffect, useMemo, useState } from "react";

function parseCSV(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());

  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row = {};

    headers.forEach((header, index) => {
      const raw = values[index] ?? "";
      const num = Number(raw);
      row[header] = raw !== "" && !Number.isNaN(num) ? num : raw;
    });

    return row;
  });

  return { headers, rows };
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  return new Intl.NumberFormat("en-IN").format(value);
}

function downloadCsv(filename, content) {
  if (!content) return;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "dataset.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getInsightText({
  chartType,
  topProduct,
  lowestProduct,
  averageSales,
  totalSales,
  regionData,
  monthData,
  productHeader,
  salesHeader,
}) {
  if (chartType === "top") {
    return `${
      topProduct?.[productHeader] || "Top product"
    } is currently the highest performer with sales of ${formatNumber(
      topProduct?.[salesHeader] || 0
    )}.`;
  }

  if (chartType === "lowest") {
    return `${
      lowestProduct?.[productHeader] || "Lowest product"
    } is the lowest performer with sales of ${formatNumber(
      lowestProduct?.[salesHeader] || 0
    )}.`;
  }

  if (chartType === "average") {
    return `The average sales across all records is ${formatNumber(
      Number(averageSales.toFixed(2))
    )}.`;
  }

  if (chartType === "total") {
    return `The dataset generated a total sales value of ${formatNumber(totalSales)}.`;
  }

  if (chartType === "region") {
    const bestRegion = [...regionData].sort((a, b) => b.value - a.value)[0];
    if (!bestRegion) return "Region-wise comparison generated successfully.";
    return `${bestRegion.name} is the best performing region with sales of ${formatNumber(
      bestRegion.value
    )}.`;
  }

  if (chartType === "month") {
    const bestMonth = [...monthData].sort((a, b) => b.value - a.value)[0];
    if (!bestMonth) return "Monthly sales trend generated successfully.";
    return `${bestMonth.name} recorded the highest monthly sales at ${formatNumber(
      bestMonth.value
    )}.`;
  }

  return "Analysis generated successfully.";
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("datavista_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [hasUploaded, setHasUploaded] = useState(false);

  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resultText, setResultText] = useState(
    "Upload your CSV and ask a question to generate smart insights."
  );
  const [insightText, setInsightText] = useState(
    "Dashboard loaded successfully. Upload a CSV to unlock live visual analysis."
  );
  const [recentQueries, setRecentQueries] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  const [tableSearch, setTableSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [chartType, setChartType] = useState("top");
  const [animateChart, setAnimateChart] = useState(false);

  const { headers, rows } = useMemo(() => parseCSV(csvText), [csvText]);

  const productHeader =
    headers.find((h) => h.toLowerCase().includes("product")) || headers[0] || "";
  const regionHeader =
    headers.find((h) => h.toLowerCase().includes("region")) || "";
  const monthHeader =
    headers.find((h) => h.toLowerCase().includes("month")) || "";
  const salesHeader =
    headers.find((h) => h.toLowerCase().includes("sales")) || "";

  const totalSales = useMemo(() => {
    if (!salesHeader) return 0;
    return rows.reduce((sum, row) => {
      const value = typeof row[salesHeader] === "number" ? row[salesHeader] : 0;
      return sum + value;
    }, 0);
  }, [rows, salesHeader]);

  const averageSales = rows.length ? totalSales / rows.length : 0;

  const uniqueProducts = useMemo(() => {
    if (!productHeader) return 0;
    return new Set(rows.map((row) => row[productHeader])).size;
  }, [rows, productHeader]);

  const uniqueRegions = useMemo(() => {
    if (!regionHeader) return 0;
    return new Set(rows.map((row) => row[regionHeader])).size;
  }, [rows, regionHeader]);

  const sortedBySales = useMemo(() => {
    if (!salesHeader) return [];
    return [...rows]
      .filter((row) => typeof row[salesHeader] === "number")
      .sort((a, b) => b[salesHeader] - a[salesHeader]);
  }, [rows, salesHeader]);

  const topProduct = sortedBySales[0];
  const lowestProduct = sortedBySales[sortedBySales.length - 1];

  const regionData = useMemo(() => {
    if (!regionHeader || !salesHeader) return [];
    const map = {};
    rows.forEach((row) => {
      const region = row[regionHeader];
      const sales = typeof row[salesHeader] === "number" ? row[salesHeader] : 0;
      map[region] = (map[region] || 0) + sales;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, regionHeader, salesHeader]);

  const monthData = useMemo(() => {
    if (!monthHeader || !salesHeader) return [];
    return rows.map((row) => ({
      name: String(row[monthHeader]),
      value: typeof row[salesHeader] === "number" ? row[salesHeader] : 0,
    }));
  }, [rows, monthHeader, salesHeader]);

  const chartData = useMemo(() => {
    if (!hasUploaded || !hasAnalyzed || !rows.length || !productHeader || !salesHeader) {
      return [];
    }

    if (chartType === "top") {
      return sortedBySales.slice(0, 5).map((item) => ({
        name: String(item[productHeader]),
        value: item[salesHeader],
      }));
    }

    if (chartType === "lowest") {
      return [...sortedBySales]
        .slice(-5)
        .reverse()
        .map((item) => ({
          name: String(item[productHeader]),
          value: item[salesHeader],
        }));
    }

    if (chartType === "average") {
      return rows.slice(0, 5).map((row) => ({
        name: String(row[productHeader]),
        value: averageSales,
      }));
    }

    if (chartType === "total") {
      return rows.slice(0, 5).map((row) => ({
        name: String(row[productHeader]),
        value: totalSales,
      }));
    }

    if (chartType === "region") {
      return regionData;
    }

    if (chartType === "month") {
      return monthData;
    }

    return [];
  }, [
    hasUploaded,
    hasAnalyzed,
    rows,
    chartType,
    sortedBySales,
    productHeader,
    salesHeader,
    averageSales,
    totalSales,
    regionData,
    monthData,
  ]);

  const filteredRows = useMemo(() => {
    if (!rows.length) return [];

    const q = activeQuery.trim().toLowerCase();
    const ts = tableSearch.trim().toLowerCase();

    if (ts) {
      return rows.filter((row) =>
        headers.some((header) =>
          String(row[header] ?? "").toLowerCase().includes(ts)
        )
      );
    }

    if (!hasAnalyzed) {
      return rows;
    }

    if (q.includes("top")) {
      return sortedBySales.slice(0, 5);
    }

    if (q.includes("lowest")) {
      return [...sortedBySales].slice(-5).reverse();
    }

    if (q.includes("average")) {
      return rows.map((row) => ({
        ...row,
        [salesHeader]: Number(averageSales.toFixed(2)),
      }));
    }

    if (q.includes("total")) {
      return rows.map((row) => ({
        ...row,
        [salesHeader]: totalSales,
      }));
    }

    if (q.includes("region")) {
      return regionData.map((item) => ({
        [productHeader || "Product"]: item.name,
        [regionHeader || "Region"]: item.name,
        [monthHeader || "Month"]: "-",
        [salesHeader || "Sales"]: item.value,
      }));
    }

    if (q.includes("month")) {
      return monthData.map((item) => ({
        [productHeader || "Product"]: "-",
        [regionHeader || "Region"]: "-",
        [monthHeader || "Month"]: item.name,
        [salesHeader || "Sales"]: item.value,
      }));
    }

    return rows;
  }, [
    rows,
    headers,
    activeQuery,
    tableSearch,
    hasAnalyzed,
    sortedBySales,
    averageSales,
    totalSales,
    salesHeader,
    regionData,
    monthData,
    productHeader,
    regionHeader,
    monthHeader,
  ]);

  const visibleRows = filteredRows.slice(0, rowsPerPage);

  const maxChartValue = Math.max(
    ...chartData.map((item) => (typeof item.value === "number" ? item.value : 0)),
    1
  );

  const chartTitle =
    chartType === "top"
      ? "Top Product Sales"
      : chartType === "lowest"
      ? "Lowest Product Sales"
      : chartType === "average"
      ? "Average Sales"
      : chartType === "total"
      ? "Total Sales"
      : chartType === "region"
      ? "Region Wise Sales Distribution"
      : "Monthly Sales Trend";

  useEffect(() => {
    if (!chartData.length || chartType === "region" || chartType === "month") {
      setAnimateChart(false);
      return;
    }
    setAnimateChart(false);
    const timer = setTimeout(() => setAnimateChart(true), 120);
    return () => clearTimeout(timer);
  }, [chartData, chartType]);

  const handleSignup = (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      alert("Please fill all fields.");
      return;
    }

    const exists = users.find((u) => u.email === cleanEmail);
    if (exists) {
      alert("Account already exists with this email.");
      return;
    }

    const newUser = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem("datavista_users", JSON.stringify(updatedUsers));

    alert("Account created successfully. Please login.");
    setIsSignup(false);
    setPassword("");
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      alert("Please enter email and password.");
      return;
    }

    const user = users.find(
      (u) => u.email === cleanEmail && u.password === cleanPassword
    );

    if (!user) {
      alert("Invalid email or password.");
      return;
    }

    setName(user.name || "");
    setLoggedIn(true);
    setPassword("");
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setEmail("");
    setPassword("");
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      const parsed = parseCSV(text);

      setCsvText(text);
      setFileName(file.name);
      setHasUploaded(true);

      setQuery("");
      setActiveQuery("");
      setHasAnalyzed(false);
      setLoading(false);

      setTableSearch("");
      setRecentQueries([]);
      setChatHistory([]);
      setRowsPerPage(8);
      setChartType("top");

      setResultText("Dataset uploaded successfully.");
      setInsightText(
        `Dataset ready. ${parsed.rows.length} rows loaded successfully. Enter a query and click Analyze to generate charts and insights.`
      );
    };
    reader.readAsText(file);
  };

  const runAnalysis = (customQuery) => {
    const q = (customQuery || query).trim().toLowerCase();

    if (!rows.length) {
      setResultText("No dataset available.");
      setInsightText("Please upload a valid CSV file.");
      return;
    }

    if (!q) {
      setResultText("Please enter a question.");
      setInsightText(
        "Try queries like top product, total sales, average, monthly sales, or region wise sales."
      );
      return;
    }

    setLoading(true);

    setTimeout(() => {
      let nextChartType = "top";
      let response = "Query analyzed successfully.";

      if (q.includes("top")) {
        nextChartType = "top";
        response = `Top product is ${topProduct?.[productHeader] || "-"} with sales ${formatNumber(
          topProduct?.[salesHeader] || 0
        )}`;
      } else if (q.includes("lowest")) {
        nextChartType = "lowest";
        response = `Lowest product is ${
          lowestProduct?.[productHeader] || "-"
        } with sales ${formatNumber(lowestProduct?.[salesHeader] || 0)}`;
      } else if (q.includes("average")) {
        nextChartType = "average";
        response = `Average sales is ${formatNumber(Number(averageSales.toFixed(2)))}`;
      } else if (q.includes("total")) {
        nextChartType = "total";
        response = `Total sales is ${formatNumber(totalSales)}`;
      } else if (q.includes("region")) {
        nextChartType = "region";
        response = "Showing region wise sales distribution.";
      } else if (q.includes("month")) {
        nextChartType = "month";
        response = "Showing monthly sales trend.";
      }

      const autoInsight = getInsightText({
        chartType: nextChartType,
        topProduct,
        lowestProduct,
        averageSales,
        totalSales,
        regionData,
        monthData,
        productHeader,
        salesHeader,
      });

      setChartType(nextChartType);
      setHasAnalyzed(true);
      setActiveQuery(q);
      setTableSearch("");

      setResultText(response);
      setInsightText(autoInsight);

      setRecentQueries((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 5));
      setChatHistory((prev) => [
        ...prev,
        { type: "user", text: q },
        { type: "bot", text: response },
      ]);

      setLoading(false);
    }, 900);
  };

  const handleQuickQuery = (text) => {
    setQuery(text);
  };

  const resetDashboard = () => {
    setCsvText("");
    setFileName("");
    setHasUploaded(false);

    setQuery("");
    setActiveQuery("");
    setHasAnalyzed(false);
    setLoading(false);

    setTableSearch("");
    setRecentQueries([]);
    setChatHistory([]);
    setRowsPerPage(8);
    setChartType("top");

    setResultText("Upload your CSV and ask a question to generate smart insights.");
    setInsightText("Dashboard loaded successfully. Upload a CSV to unlock live visual analysis.");
  };

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    return ["Column 1"];
  }, [headers]);

  if (!loggedIn) {
    return (
      <>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, #root { min-height: 100%; }
          body {
            font-family: Inter, Arial, sans-serif;
            background:
              radial-gradient(circle at top center, rgba(126, 87, 255, 0.22), transparent 25%),
              linear-gradient(180deg, #0a1022 0%, #09152e 100%);
            color: white;
          }
          .auth-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .auth-card {
            width: 100%;
            max-width: 470px;
            background: linear-gradient(180deg, rgba(11, 25, 64, 0.96), rgba(8, 20, 53, 0.96));
            border: 1px solid rgba(102, 126, 234, 0.22);
            border-radius: 30px;
            padding: 34px 28px;
            box-shadow: 0 16px 42px rgba(0, 0, 0, 0.28);
            animation: fadeIn .8s ease;
          }
          .auth-logo {
            width: 74px;
            height: 74px;
            border-radius: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
            font-size: 30px;
            background: linear-gradient(135deg, #7c4dff, #ff4da6);
            box-shadow: 0 12px 30px rgba(124, 77, 255, 0.35);
          }
          .auth-title {
            text-align: center;
            font-size: 38px;
            font-weight: 800;
            margin-bottom: 8px;
          }
          .auth-subtitle {
            text-align: center;
            color: #c7d2fe;
            line-height: 1.6;
            margin-bottom: 24px;
            font-size: 15px;
          }
          .form-group { margin-bottom: 16px; }
          .label {
            display: block;
            margin-bottom: 8px;
            color: #e5e7eb;
            font-weight: 700;
            font-size: 14px;
          }
          .input {
            width: 100%;
            height: 56px;
            border-radius: 16px;
            border: 1px solid rgba(145, 157, 215, 0.2);
            background: rgba(255,255,255,0.06);
            color: white;
            padding: 0 18px;
            font-size: 15px;
            outline: none;
          }
          .input::placeholder { color: #92a0d3; }
          .input:focus {
            border-color: rgba(129, 140, 248, 0.7);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
          }
          .auth-btn {
            width: 100%;
            height: 56px;
            border: none;
            border-radius: 16px;
            background: linear-gradient(135deg, #6d5dfc, #8b5cf6);
            color: white;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.25s ease;
            margin-top: 8px;
          }
          .auth-btn:hover { transform: translateY(-2px); }
          .switch-auth {
            margin-top: 18px;
            text-align: center;
            color: #c7d2fe;
            font-size: 14px;
          }
          .switch-link {
            color: #a78bfa;
            font-weight: 700;
            cursor: pointer;
            margin-left: 6px;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-logo">✦</div>
            <div className="auth-title">{isSignup ? "Create Account" : "Login"}</div>
            <div className="auth-subtitle">
              {isSignup
                ? "Create your account to access the professional AI data analysis dashboard."
                : "Login with your email and password to access the AI data dashboard."}
            </div>

            <form onSubmit={isSignup ? handleSignup : handleLogin}>
              {isSignup && (
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
              )}

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

              <div className="form-group">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="auth-btn">
                {isSignup ? "Create New Account" : "Login"}
              </button>
            </form>

            <div className="switch-auth">
              {isSignup ? "Already have an account?" : "Don't have an account?"}
              <span
                className="switch-link"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setPassword("");
                }}
              >
                {isSignup ? "Login" : "Sign Up"}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { min-height: 100%; }
        body {
          font-family: Inter, Arial, sans-serif;
          color: #f8fafc;
          background:
            radial-gradient(circle at top center, rgba(126, 87, 255, 0.22), transparent 25%),
            linear-gradient(180deg, #0a1022 0%, #09152e 100%);
        }

        .app {
          min-height: 100vh;
          padding: 28px 18px 60px;
          animation: fadeIn .8s ease;
        }

        .container {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
        }

        .panel {
          background: linear-gradient(180deg, rgba(11, 25, 64, 0.96), rgba(8, 20, 53, 0.96));
          border: 1px solid rgba(102, 126, 234, 0.22);
          border-radius: 30px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.22);
        }

        .hero {
          padding: 34px 34px 30px;
          margin-bottom: 26px;
        }

        .hero-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }

        .hero-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .logo {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7c4dff, #ff4da6);
          box-shadow: 0 12px 30px rgba(124, 77, 255, 0.35);
          font-size: 28px;
        }

        .hero-title h1 {
          font-size: 58px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1.5px;
        }

        .hero-title p {
          margin-top: 6px;
          font-size: 18px;
          color: #c7d2fe;
        }

        .logout-btn {
          border: none;
          border-radius: 16px;
          padding: 14px 22px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .upload-card, .how-card {
          border-radius: 26px;
          padding: 34px 26px;
          border: 1px solid rgba(122, 142, 255, 0.22);
          background: linear-gradient(135deg, rgba(56,47,120,.45), rgba(17,31,78,.45));
          min-height: 210px;
        }

        .upload-inner {
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed rgba(161,167,255,.3);
          border-radius: 22px;
          padding: 26px;
          cursor: pointer;
          transition: .28s ease;
        }

        .upload-inner:hover {
          transform: translateY(-2px);
          border-color: rgba(167,139,250,.55);
          box-shadow: 0 0 0 6px rgba(99,102,241,.08);
        }

        .upload-icon {
          font-size: 28px;
          margin-bottom: 12px;
        }

        .upload-inner h3 {
          font-size: 22px;
          margin-bottom: 10px;
        }

        .upload-inner p {
          color: #b8c2f0;
          text-align: center;
          line-height: 1.6;
        }

        .how-card h3 {
          font-size: 24px;
          text-align: center;
          margin-bottom: 18px;
        }

        .how-list {
          list-style: none;
          display: grid;
          gap: 18px;
          font-size: 20px;
          color: #d8defe;
          line-height: 1.5;
          padding-top: 10px;
          max-width: 340px;
          margin: 0 auto;
        }

        .status-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          margin-top: 24px;
        }

        .dataset-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 22px;
          border-radius: 999px;
          background: rgba(16,185,129,.12);
          border: 1px solid rgba(16,185,129,.4);
          color: #d1fae5;
          font-weight: 700;
          font-size: 20px;
        }

        .dataset-pill.empty {
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          color: #cbd5e1;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 10px #22c55e;
        }

        .button-row {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn {
          border: none;
          border-radius: 16px;
          padding: 14px 26px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          color: white;
          transition: .24s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0,0,0,.2);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-reset {
          background: linear-gradient(135deg, #ff5a36, #ff6b3d);
        }

        .btn-download {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }

        .file-input {
          display: none;
        }

        .summary, .ask-panel, .chart-panel, .table-panel {
          padding: 34px;
          margin-bottom: 26px;
          animation: riseUp .7s ease;
        }

        .section-title {
          text-align: center;
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 28px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .stat-card {
          min-height: 120px;
          border-radius: 22px;
          padding: 26px 18px;
          background: rgba(18,34,79,.88);
          border: 1px solid rgba(111,133,221,.22);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .stat-card h4 {
          color: #aeb8de;
          font-size: 17px;
          font-weight: 500;
          margin-bottom: 16px;
          text-align: center;
        }

        .stat-card .value {
          font-size: 28px;
          font-weight: 800;
        }

        .dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
        }

        .mini-panel {
          border-radius: 26px;
          background: rgba(15,28,68,.9);
          border: 1px solid rgba(111,133,221,.22);
          padding: 26px;
          min-height: 190px;
        }

        .mini-panel h3 {
          font-size: 22px;
          margin-bottom: 16px;
          text-align: center;
        }

        .mini-panel ul {
          list-style: none;
          display: grid;
          gap: 12px;
        }

        .mini-panel li {
          color: #d7ddfb;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.05);
          border-radius: 16px;
          padding: 14px 16px;
          line-height: 1.6;
        }

        .ask-title {
          text-align: center;
          font-size: 34px;
          font-weight: 800;
          margin-bottom: 24px;
        }

        .query-row {
          display: grid;
          grid-template-columns: 1fr 160px;
          gap: 14px;
          align-items: center;
          margin-bottom: 18px;
          max-width: 1040px;
          margin-left: auto;
          margin-right: auto;
        }

        .query-input, .table-search, .rows-select {
          width: 100%;
          height: 58px;
          border-radius: 18px;
          border: 1px solid rgba(145,157,215,.2);
          background: rgba(255,255,255,.06);
          color: white;
          padding: 0 20px;
          font-size: 16px;
          outline: none;
        }

        .query-input::placeholder, .table-search::placeholder {
          color: #92a0d3;
        }

        .analyze-btn {
          height: 58px;
          background: linear-gradient(135deg, #6d5dfc, #8b5cf6);
        }

        .chip-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid rgba(128,145,242,.35);
          background: rgba(94,110,218,.08);
          color: #e5e7eb;
          padding: 12px 18px;
          cursor: pointer;
          font-size: 15px;
          transition: .24s ease;
        }

        .chip:hover {
          transform: translateY(-2px);
          background: rgba(94,110,218,.16);
        }

        .info-box, .success-box, .query-result, .recent-box {
          max-width: 1060px;
          margin-left: auto;
          margin-right: auto;
          border-radius: 22px;
          padding: 20px 22px;
          text-align: center;
          margin-bottom: 18px;
        }

        .info-box {
          background: rgba(49,83,185,.22);
          border: 1px solid rgba(91,120,232,.35);
          color: #d7e3ff;
          font-size: 19px;
          line-height: 1.55;
        }

        .query-result {
          font-size: 20px;
          font-weight: 800;
          color: #f8fafc;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .success-box {
          background: rgba(16,185,129,.12);
          border: 1px solid rgba(16,185,129,.35);
          color: #d1fae5;
          font-size: 18px;
          line-height: 1.55;
        }

        .recent-box {
          background: rgba(49,83,185,.16);
          border: 1px solid rgba(91,120,232,.25);
        }

        .recent-box h3 {
          font-size: 22px;
          margin-bottom: 18px;
        }

        .recent-query-row {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .recent-pill {
          padding: 11px 18px;
          border-radius: 999px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.08);
          color: #e5e7eb;
        }

        .small-meta {
          text-align: center;
          color: #93a1cc;
          font-size: 16px;
          margin-top: 10px;
        }

        .loading-box {
          max-width: 1060px;
          margin: 0 auto 16px;
          border-radius: 18px;
          padding: 14px 18px;
          text-align: center;
          color: #dbeafe;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(129, 140, 248, 0.35);
          font-weight: 700;
          letter-spacing: .4px;
        }

        .typing {
          display: inline-flex;
          gap: 6px;
          margin-left: 10px;
          vertical-align: middle;
        }

        .typing span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c7d2fe;
          animation: bounce 1s infinite;
        }

        .typing span:nth-child(2) { animation-delay: .15s; }
        .typing span:nth-child(3) { animation-delay: .3s; }

        .chat-box {
          max-width: 1060px;
          margin: 0 auto 18px;
          padding: 12px;
          border-radius: 22px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.06);
        }

        .chat-msg {
          display: flex;
          margin-bottom: 12px;
        }

        .chat-msg.user {
          justify-content: flex-end;
        }

        .chat-msg.bot {
          justify-content: flex-start;
        }

        .chat-bubble {
          max-width: 78%;
          padding: 12px 16px;
          border-radius: 18px;
          line-height: 1.5;
          font-size: 15px;
          word-break: break-word;
        }

        .chat-msg.user .chat-bubble {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .chat-msg.bot .chat-bubble {
          background: rgba(255,255,255,.08);
          color: #e5e7eb;
          border: 1px solid rgba(255,255,255,.08);
          border-bottom-left-radius: 6px;
        }

        .chart-wrap {
          margin-top: 8px;
          min-height: 420px;
          padding: 18px;
          position: relative;
          overflow: hidden;
        }

        .legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 12px 0 8px;
          color: #e7ebff;
          font-size: 18px;
        }

        .legend-box {
          width: 56px;
          height: 16px;
          border-radius: 4px;
          background: linear-gradient(180deg, #7068f3, #5b61e8);
        }

        .chart-area {
          height: 100%;
          display: flex;
          align-items: stretch;
          gap: 18px;
        }

        .y-axis {
          width: 90px;
          position: relative;
          padding-top: 24px;
        }

        .y-label {
          position: absolute;
          left: 0;
          transform: translateY(50%);
          color: #c4cbe8;
          font-size: 14px;
        }

        .plot {
          flex: 1;
          position: relative;
          padding: 24px 0 50px;
          border-left: 1px solid rgba(255,255,255,.08);
          border-bottom: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: flex-end;
          gap: 26px;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px solid rgba(255,255,255,.06);
        }

        .bar-group {
          flex: 1;
          min-width: 90px;
          max-width: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }

        .bar {
          width: 100%;
          border-radius: 18px 18px 0 0;
          background: linear-gradient(180deg, #7068f3, #5b61e8);
          box-shadow: 0 14px 30px rgba(92,97,232,.25);
          transition: height 1s cubic-bezier(.2,.8,.2,1);
        }

        .bar-label-x {
          margin-top: 12px;
          font-size: 15px;
          color: #d5daf7;
          text-align: center;
        }

        .line-chart-box {
          height: 340px;
          display: flex;
          align-items: flex-end;
          gap: 14px;
          padding: 24px 0 10px;
          position: relative;
        }

        .line-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }

        .line-point-wrap {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          flex: 1;
        }

        .line-stick {
          width: 8px;
          border-radius: 999px;
          background: linear-gradient(180deg, #60a5fa, #8b5cf6);
          box-shadow: 0 8px 18px rgba(96,165,250,.25);
          transition: height .9s ease;
        }

        .line-value {
          font-size: 12px;
          color: #cbd5e1;
          margin-bottom: 8px;
          text-align: center;
        }

        .line-label {
          margin-top: 10px;
          color: #d5daf7;
          font-size: 14px;
          text-align: center;
        }

        .pie-wrap {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: center;
          min-height: 320px;
        }

        .pie-main {
          width: 240px;
          height: 240px;
          margin: 0 auto;
          border-radius: 50%;
          border: 12px solid rgba(255,255,255,.08);
          box-shadow: inset 0 0 0 18px rgba(10,16,34,.9);
          position: relative;
          overflow: hidden;
        }

        .pie-hole {
          position: absolute;
          inset: 58px;
          background: linear-gradient(180deg, #0b1940, #081435);
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #e5e7eb;
          font-weight: 800;
          padding: 16px;
          font-size: 14px;
          z-index: 2;
        }

        .pie-segment {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .pie-legend {
          display: grid;
          gap: 12px;
        }

        .pie-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.06);
        }

        .pie-left {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #e5e7eb;
        }

        .pie-color {
          width: 14px;
          height: 14px;
          border-radius: 4px;
        }

        .pie-right {
          color: #c7d2fe;
          font-weight: 700;
          text-align: right;
        }

        .table-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .table-head h2 {
          font-size: 30px;
          font-weight: 800;
        }

        .table-controls {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .rows-select {
          width: 120px;
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        th, td {
          padding: 18px 16px;
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,.07);
          font-size: 16px;
        }

        th {
          color: #f8fafc;
          font-size: 17px;
          font-weight: 800;
          background: rgba(255,255,255,.02);
        }

        td {
          color: #d8dff7;
        }

        tr:hover td {
          background: rgba(255,255,255,.025);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes riseUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .7; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        @media (max-width: 1200px) {
          .hero-title h1 { font-size: 44px; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (max-width: 950px) {
          .hero-grid, .dual-grid, .query-row, .pie-wrap { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .hero, .summary, .ask-panel, .chart-panel, .table-panel { padding: 24px 18px; }
          .hero-title h1 { font-size: 34px; }
          .pie-main { width: 220px; height: 220px; }
          .pie-hole { inset: 52px; }
        }

        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr; }
          .hero-title h1 { font-size: 28px; }
          .hero-title p { font-size: 15px; }
          .section-title, .ask-title, .table-head h2 { font-size: 24px; }
          .plot { gap: 12px; }
          .bar-group { min-width: 56px; }
          .chart-wrap { min-height: 340px; }
          .chat-bubble { max-width: 92%; }
        }
      `}</style>

      <div className="app">
        <div className="container">
          <section className="panel hero">
            <div className="hero-header">
              <div className="hero-left">
                <div className="logo">✦</div>
                <div className="hero-title">
                  <h1>AI Data Analyst Dashboard</h1>
                  <p>
                    Welcome{name ? `, ${name}` : ""}! Upload data, ask questions, and get instant charts, insights, and summaries.
                  </p>
                </div>
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>

            <div className="hero-grid">
              <div className="upload-card">
                <label className="upload-inner">
                  <div className="upload-icon">☁</div>
                  <h3>Upload CSV File</h3>
                  <p>Drag & drop or click to upload your CSV dataset</p>
                  <p style={{ marginTop: 10, fontSize: 14 }}>
                    Example columns: product, sales, month, region
                  </p>
                  <input className="file-input" type="file" accept=".csv" onChange={handleUpload} />
                </label>
              </div>

              <div className="how-card">
                <h3>How it works</h3>
                <ul className="how-list">
                  <li>1. Upload your CSV file</li>
                  <li>2. Enter a natural language query</li>
                  <li>3. Click Analyze to generate insights</li>
                </ul>
              </div>
            </div>

            <div className="status-bar">
              {hasUploaded ? (
                <div className="dataset-pill">
                  <span className="dot"></span>
                  Current dataset: {fileName}
                </div>
              ) : (
                <div className="dataset-pill empty">
                  No dataset uploaded yet
                </div>
              )}

              <div className="button-row">
                <button className="btn btn-reset" onClick={resetDashboard}>
                  Reset
                </button>

                <button
                  className="btn btn-download"
                  onClick={() => downloadCsv(fileName, csvText)}
                  disabled={!hasUploaded}
                >
                  Download CSV
                </button>
              </div>
            </div>
          </section>

          {hasUploaded && (
            <section className="panel summary">
              <h2 className="section-title">Dataset Summary</h2>

              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Rows</h4>
                  <div className="value">{rows.length}</div>
                </div>

                <div className="stat-card">
                  <h4>Columns</h4>
                  <div className="value">{headers.length}</div>
                </div>

                <div className="stat-card">
                  <h4>Products</h4>
                  <div className="value">{uniqueProducts}</div>
                </div>

                <div className="stat-card">
                  <h4>Regions</h4>
                  <div className="value">{uniqueRegions}</div>
                </div>

                <div className="stat-card">
                  <h4>Total Sales</h4>
                  <div className="value">{formatNumber(totalSales)}</div>
                </div>
              </div>

              <div className="dual-grid">
                <div className="mini-panel">
                  <h3>Highlights</h3>
                  <ul>
                    <li>
                      Top selling product: <strong>{topProduct?.[productHeader] || "-"}</strong>
                    </li>
                    <li>
                      Highest sales value: <strong>{formatNumber(topProduct?.[salesHeader] || 0)}</strong>
                    </li>
                    <li>
                      Average sales: <strong>{formatNumber(Number(averageSales.toFixed(2)))}</strong>
                    </li>
                  </ul>
                </div>

                <div className="mini-panel">
                  <h3>Project Strength</h3>
                  <ul>
                    <li>CSV upload and intelligent dashboard flow.</li>
                    <li>Query-based chart and table updates.</li>
                    <li>Chat-style analysis output with smart insights.</li>
                  </ul>
                </div>
              </div>
            </section>
          )}

          <section className="panel ask-panel">
            <h2 className="ask-title">Ask Your Data</h2>

            <div className="query-row">
              <input
                className="query-input"
                type="text"
                placeholder="Ask a question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                className="btn analyze-btn"
                onClick={() => runAnalysis()}
                disabled={!hasUploaded || !query.trim() || loading}
              >
                {loading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            <div className="chip-row">
              {[
                "top product",
                "lowest product",
                "average sales",
                "total sales",
                "region wise sales",
                "monthly sales",
              ].map((chip) => (
                <button
                  key={chip}
                  className="chip"
                  onClick={() => handleQuickQuery(chip)}
                  disabled={!hasUploaded || loading}
                  style={{
                    opacity: hasUploaded ? 1 : 0.5,
                    cursor: hasUploaded ? "pointer" : "not-allowed",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="info-box">
              Suggested queries: top product, lowest product, total sales, average sales,
              region wise sales, monthly sales trend.
            </div>

            {loading && (
              <div className="loading-box">
                Analyzing data
                <span className="typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            )}

            <div className="query-result">
              {hasAnalyzed
                ? resultText
                : "Enter a query and click Analyze to generate insights."}
            </div>

            <div className="success-box">
              <strong>Insight:</strong> {insightText}
            </div>

            <div className="chat-box">
              {chatHistory.length ? (
                chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-msg ${msg.type}`}>
                    <div className="chat-bubble">{msg.text}</div>
                  </div>
                ))
              ) : (
                <div className="chat-msg bot">
                  <div className="chat-bubble">
                    Upload a CSV, ask a query, and I will generate a chart, smart summary, and table insights.
                  </div>
                </div>
              )}
            </div>

            <div className="recent-box">
              <h3>Recent Queries</h3>
              <div className="recent-query-row">
                {recentQueries.length ? (
                  recentQueries.map((item) => (
                    <span key={item} className="recent-pill">{item}</span>
                  ))
                ) : (
                  <span className="recent-pill">No recent queries yet</span>
                )}
              </div>
            </div>

            <div className="small-meta">
              {hasUploaded
                ? `Total Rows: ${rows.length} | Total Columns: ${headers.length}`
                : "Upload CSV to begin analysis"}
            </div>
          </section>

          {hasUploaded && hasAnalyzed && chartData.length > 0 && (
            <section className="panel chart-panel">
              <h2 className="section-title">{chartTitle}</h2>

              <div className="legend">
                <span className="legend-box"></span>
                <span>{chartTitle}</span>
              </div>

              <div className="chart-wrap">
                {chartType !== "region" && chartType !== "month" && (
                  <div className="chart-area">
                    <div className="y-axis">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <div
                          key={pct}
                          className="y-label"
                          style={{ bottom: `${pct}%` }}
                        >
                          {formatNumber(Math.round((maxChartValue * pct) / 100))}
                        </div>
                      ))}
                    </div>

                    <div className="plot">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <div
                          key={pct}
                          className="grid-line"
                          style={{ bottom: `${pct}%` }}
                        />
                      ))}

                      {chartData.map((item, index) => {
                        const rawHeight = ((item.value || 0) / maxChartValue) * 100;
                        const barHeight = animateChart ? `${Math.max(rawHeight, 8)}%` : "0%";

                        return (
                          <div className="bar-group" key={`${item.name}-${index}`}>
                            <div className="bar" style={{ height: barHeight }} />
                            <div className="bar-label-x">{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {chartType === "month" && (
                  <div className="line-chart-box">
                    {chartData.map((item, index) => {
                      const rawHeight = ((item.value || 0) / maxChartValue) * 100;
                      return (
                        <div className="line-col" key={`${item.name}-${index}`}>
                          <div className="line-value">{formatNumber(item.value)}</div>
                          <div className="line-point-wrap">
                            <div
                              className="line-stick"
                              style={{ height: `${Math.max(rawHeight * 2.4, 12)}px` }}
                            />
                          </div>
                          <div className="line-label">{item.name}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chartType === "region" && (
                  <div className="pie-wrap">
                    <div className="pie-main">
                      {(() => {
                        const colors = [
                          "#6366f1",
                          "#8b5cf6",
                          "#ec4899",
                          "#06b6d4",
                          "#22c55e",
                          "#f59e0b",
                        ];

                        let start = 0;
                        return (
                          <>
                            {chartData.map((item, index) => {
                              const percent = totalSales
                                ? (item.value / totalSales) * 100
                                : 0;
                              const end = start + percent;
                              const segment = (
                                <div
                                  key={item.name}
                                  className="pie-segment"
                                  style={{
                                    background: `conic-gradient(transparent ${start}%, ${colors[index % colors.length]} ${start}%, ${colors[index % colors.length]} ${end}%, transparent ${end}%)`,
                                  }}
                                />
                              );
                              start = end;
                              return segment;
                            })}
                            <div className="pie-hole">
                              Region
                              <br />
                              Analysis
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="pie-legend">
                      {chartData.map((item, index) => {
                        const colors = [
                          "#6366f1",
                          "#8b5cf6",
                          "#ec4899",
                          "#06b6d4",
                          "#22c55e",
                          "#f59e0b",
                        ];
                        const percentage = totalSales
                          ? ((item.value / totalSales) * 100).toFixed(1)
                          : 0;

                        return (
                          <div className="pie-item" key={item.name}>
                            <div className="pie-left">
                              <span
                                className="pie-color"
                                style={{ background: colors[index % colors.length] }}
                              ></span>
                              <span>{item.name}</span>
                            </div>
                            <div className="pie-right">
                              {formatNumber(item.value)}
                              <br />
                              {percentage}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {hasUploaded && (
            <section className="panel table-panel">
              <div className="table-head">
                <h2>Uploaded Data Table</h2>

                <div className="table-controls">
                  <input
                    className="table-search"
                    type="text"
                    placeholder="Search in table..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                  />

                  <select
                    className="rows-select"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>5 rows</option>
                    <option value={8}>8 rows</option>
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                  </select>
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {tableHeaders.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length ? (
                      visibleRows.map((row, index) => (
                        <tr key={index}>
                          {tableHeaders.map((header) => (
                            <td key={header}>
                              {typeof row[header] === "number"
                                ? formatNumber(row[header])
                                : row[header] ?? "-"}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={tableHeaders.length || 1}>No matching records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
