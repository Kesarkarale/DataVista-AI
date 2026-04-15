import { useEffect, useMemo, useState } from "react";

const starterCsv = `PRODUCT,REGION,MONTH,SALES
Laptop,West,Jan,20000
Mobile,East,Feb,15000
Tablet,North,Mar,12000
Camera,South,Apr,11000
Monitor,West,May,9000
Keyboard,East,Jun,7000
Mouse,North,Jul,6500
Printer,South,Aug,8000
Speaker,West,Sep,6000
Router,East,Oct,7500`;

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

function downloadCsvFile(fileName, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName || "dataset.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [csvText, setCsvText] = useState(starterCsv);
  const [fileName, setFileName] = useState("");
  const [hasUploadedCsv, setHasUploadedCsv] = useState(false);

  const [query, setQuery] = useState("");
  const [analysisText, setAnalysisText] = useState(
    "Use the sample data or upload your own CSV to start analysis."
  );
  const [insightText, setInsightText] = useState(
    "Dashboard is ready. Upload your CSV and ask data questions."
  );
  const [recentQueries, setRecentQueries] = useState([]);
  const [tableSearch, setTableSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [chartAnimated, setChartAnimated] = useState(false);
  const [chartType, setChartType] = useState("top");

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
      const sales = typeof row[salesHeader] === "number" ? row[salesHeader] : 0;
      return sum + sales;
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

  const regionWiseSales = useMemo(() => {
    if (!regionHeader || !salesHeader) return [];
    const map = {};

    rows.forEach((row) => {
      const region = row[regionHeader];
      const sales = typeof row[salesHeader] === "number" ? row[salesHeader] : 0;
      map[region] = (map[region] || 0) + sales;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, regionHeader, salesHeader]);

  const filteredRows = useMemo(() => {
    if (!tableSearch.trim()) return rows;

    const q = tableSearch.toLowerCase();
    return rows.filter((row) =>
      headers.some((header) =>
        String(row[header] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, headers, tableSearch]);

  const visibleRows = filteredRows.slice(0, rowsPerPage);

  const chartData = useMemo(() => {
    if (!hasUploadedCsv || !rows.length) return [];

    if (chartType === "top") {
      return sortedBySales.slice(0, 5).map((item) => ({
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

    if (chartType === "lowest") {
      return [...sortedBySales].slice(-5).map((item) => ({
        name: String(item[productHeader]),
        value: item[salesHeader],
      }));
    }

    if (chartType === "region") {
      return regionWiseSales;
    }

    return [];
  }, [
    hasUploadedCsv,
    rows,
    chartType,
    sortedBySales,
    productHeader,
    salesHeader,
    averageSales,
    totalSales,
    regionWiseSales,
  ]);

  const maxChartValue = Math.max(
    ...chartData.map((item) => (typeof item.value === "number" ? item.value : 0)),
    1
  );

  useEffect(() => {
    if (!chartData.length) {
      setChartAnimated(false);
      return;
    }

    setChartAnimated(false);
    const timer = setTimeout(() => setChartAnimated(true), 120);
    return () => clearTimeout(timer);
  }, [chartData]);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      alert("Please enter name and email.");
      return;
    }

    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setName("");
    setEmail("");
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
      setHasUploadedCsv(true);
      setChartType("top");
      setQuery("");
      setAnalysisText("Dataset uploaded successfully.");
      setInsightText(
        `Dataset ready. ${parsed.rows.length} rows loaded. You can now view top products, region insights, and chart analysis.`
      );
      setRecentQueries([]);
      setTableSearch("");
    };
    reader.readAsText(file);
  };

  const runAnalysis = (inputQuery) => {
    const q = (inputQuery || query).trim().toLowerCase();

    if (!rows.length) {
      setAnalysisText("No dataset available.");
      setInsightText("");
      return;
    }

    if (!q) {
      setAnalysisText("Please enter a question.");
      setInsightText("Type a query like top product, total sales, or average.");
      return;
    }

    setRecentQueries((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 5));

    if (q.includes("top product")) {
      setChartType("top");
      if (topProduct) {
        setAnalysisText(
          `Top product is ${topProduct[productHeader]} with sales ${topProduct[salesHeader]}`
        );
        setInsightText(
          `${topProduct[productHeader]} is the top selling product with sales of ${topProduct[salesHeader]}.`
        );
      }
      return;
    }

    if (q.includes("average")) {
      setChartType("average");
      setAnalysisText(`Average sales is ${averageSales.toFixed(2)}`);
      setInsightText(
        `The average sales value across the dataset is ${averageSales.toFixed(2)}.`
      );
      return;
    }

    if (q.includes("total sales")) {
      setChartType("total");
      setAnalysisText(`Total sales is ${totalSales}`);
      setInsightText(`The dataset generated total sales of ${totalSales}.`);
      return;
    }

    if (q.includes("lowest product")) {
      setChartType("lowest");
      if (lowestProduct) {
        setAnalysisText(
          `Lowest product is ${lowestProduct[productHeader]} with sales ${lowestProduct[salesHeader]}`
        );
        setInsightText(
          `${lowestProduct[productHeader]} has the lowest sales at ${lowestProduct[salesHeader]}.`
        );
      }
      return;
    }

    if (q.includes("region wise sales")) {
      setChartType("region");
      const summary = regionWiseSales
        .map((item) => `${item.name}: ${item.value}`)
        .join(", ");
      setAnalysisText(`Region wise sales: ${summary}`);
      setInsightText("Region comparison completed successfully.");
      return;
    }

    if (q.includes("monthly sales")) {
      setChartType("top");
      setAnalysisText("Monthly sales can be reviewed using the month column in the table.");
      setInsightText("Monthly comparison depends on your uploaded month-wise sales data.");
      return;
    }

    setAnalysisText("Query analyzed successfully.");
    setInsightText("Review the table, stats, and chart for updated insights.");
  };

  const quickQuery = (text) => {
    setQuery(text);
    runAnalysis(text);
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
          font-family: Inter, Arial, sans-serif;
          color: #f8fafc;
          background:
            radial-gradient(circle at top center, rgba(126, 87, 255, 0.22), transparent 25%),
            linear-gradient(180deg, #0a1022 0%, #09152e 100%);
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.8s ease;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: linear-gradient(180deg, rgba(11, 25, 64, 0.96), rgba(8, 20, 53, 0.96));
          border: 1px solid rgba(102, 126, 234, 0.22);
          border-radius: 30px;
          padding: 34px 28px;
          box-shadow: 0 16px 42px rgba(0, 0, 0, 0.28);
        }

        .login-logo {
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

        .login-title {
          text-align: center;
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .login-subtitle {
          text-align: center;
          color: #c7d2fe;
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

        .input::placeholder {
          color: #92a0d3;
        }

        .input:focus {
          border-color: rgba(129, 140, 248, 0.7);
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
        }

        .login-btn {
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

        .login-btn:hover {
          transform: translateY(-2px);
        }

        .app {
          min-height: 100vh;
          padding: 28px 18px 60px;
          animation: fadeIn 0.9s ease;
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
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.22);
        }

        .hero {
          padding: 34px 34px 30px;
          margin-bottom: 26px;
        }

        .hero-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .upload-card,
        .how-card {
          border-radius: 26px;
          padding: 34px 26px;
          border: 1px solid rgba(122, 142, 255, 0.22);
          background: linear-gradient(135deg, rgba(56, 47, 120, 0.45), rgba(17, 31, 78, 0.45));
          min-height: 210px;
        }

        .upload-inner {
          min-height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed rgba(161, 167, 255, 0.3);
          border-radius: 22px;
          padding: 26px;
          cursor: pointer;
          transition: 0.28s ease;
        }

        .upload-inner:hover {
          transform: translateY(-2px);
          border-color: rgba(167, 139, 250, 0.55);
          box-shadow: 0 0 0 6px rgba(99, 102, 241, 0.08);
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
          max-width: 320px;
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
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #d1fae5;
          font-weight: 700;
          font-size: 20px;
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
          flex-wrap: wrap;
          justify-content: center;
          gap: 14px;
        }

        .btn {
          border: none;
          border-radius: 16px;
          padding: 14px 26px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.24s ease, box-shadow 0.24s ease;
          color: white;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2);
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

        .summary {
          padding: 34px;
          margin-bottom: 26px;
          animation: riseUp 0.6s ease;
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
          background: rgba(18, 34, 79, 0.88);
          border: 1px solid rgba(111, 133, 221, 0.22);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          animation: riseUp 0.8s ease both;
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
          background: rgba(15, 28, 68, 0.9);
          border: 1px solid rgba(111, 133, 221, 0.22);
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
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          padding: 14px 16px;
          line-height: 1.6;
        }

        .ask-panel {
          padding: 30px;
          margin-bottom: 26px;
          animation: riseUp 0.7s ease;
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

        .query-input,
        .table-search,
        .rows-select {
          width: 100%;
          height: 58px;
          border-radius: 18px;
          border: 1px solid rgba(145, 157, 215, 0.2);
          background: rgba(255,255,255,0.06);
          color: white;
          padding: 0 20px;
          font-size: 16px;
          outline: none;
        }

        .query-input::placeholder,
        .table-search::placeholder {
          color: #92a0d3;
        }

        .analyze-btn {
          height: 58px;
          background: linear-gradient(135deg, #6d5dfc, #8b5cf6);
          box-shadow: 0 10px 24px rgba(109, 93, 252, 0.2);
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
          border: 1px solid rgba(128, 145, 242, 0.35);
          background: rgba(94, 110, 218, 0.08);
          color: #e5e7eb;
          padding: 12px 18px;
          cursor: pointer;
          font-size: 15px;
          transition: 0.24s ease;
        }

        .chip:hover {
          transform: translateY(-2px);
          background: rgba(94, 110, 218, 0.16);
        }

        .info-box,
        .success-box,
        .query-result,
        .recent-box {
          max-width: 1060px;
          margin-left: auto;
          margin-right: auto;
          border-radius: 22px;
          padding: 20px 22px;
          text-align: center;
          margin-bottom: 18px;
        }

        .info-box {
          background: rgba(49, 83, 185, 0.22);
          border: 1px solid rgba(91, 120, 232, 0.35);
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
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #d1fae5;
          font-size: 18px;
          line-height: 1.55;
        }

        .recent-box {
          background: rgba(49, 83, 185, 0.16);
          border: 1px solid rgba(91, 120, 232, 0.25);
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
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e5e7eb;
        }

        .small-meta {
          text-align: center;
          color: #93a1cc;
          font-size: 16px;
          margin-top: 10px;
        }

        .chart-panel {
          padding: 34px;
          margin-bottom: 26px;
          animation: riseUp 0.8s ease;
        }

        .chart-wrap {
          margin-top: 8px;
          height: 480px;
          padding: 12px 18px 10px;
          position: relative;
          overflow: hidden;
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
          border-left: 1px solid rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: flex-end;
          gap: 26px;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }

        .bar-group {
          flex: 1;
          min-width: 90px;
          max-width: 160px;
          position: relative;
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
          box-shadow: 0 14px 30px rgba(92, 97, 232, 0.25);
          transition: height 1s cubic-bezier(.2,.8,.2,1);
        }

        .bar-label-x {
          margin-top: 12px;
          font-size: 15px;
          color: #d5daf7;
          text-align: center;
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

        .table-panel {
          padding: 30px 30px 20px;
          animation: riseUp 0.9s ease;
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
          border-bottom: 1px solid rgba(255,255,255,0.07);
          font-size: 16px;
        }

        th {
          color: #f8fafc;
          font-size: 17px;
          font-weight: 800;
          background: rgba(255,255,255,0.02);
        }

        td {
          color: #d8dff7;
        }

        tr:hover td {
          background: rgba(255,255,255,0.025);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes riseUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1200px) {
          .hero-title h1 {
            font-size: 44px;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 900px) {
          .hero-grid,
          .dual-grid,
          .query-row {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .hero,
          .summary,
          .ask-panel,
          .chart-panel,
          .table-panel {
            padding: 24px 18px;
          }

          .hero-title h1 {
            font-size: 34px;
          }

          .chart-wrap {
            height: 420px;
          }
        }

        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .hero-left {
            align-items: flex-start;
          }

          .hero-title h1 {
            font-size: 28px;
          }

          .hero-title p {
            font-size: 15px;
          }

          .section-title,
          .ask-title,
          .table-head h2 {
            font-size: 24px;
          }

          .plot {
            gap: 12px;
          }

          .bar-group {
            min-width: 56px;
          }

          .chart-wrap {
            height: 360px;
          }
        }
      `}</style>

      {!isLoggedIn ? (
        <div className="login-page">
          <div className="login-card">
            <div className="login-logo">✦</div>
            <div className="login-title">DataVista AI</div>
            <div className="login-subtitle">
              Login to access your professional DataVista AI dashboard with upload, insights, charts, and table analysis.
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

              <button type="submit" className="login-btn">
                Login to Dashboard
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="app">
          <div className="container">
            <section className="panel hero">
              <div className="hero-header">
                <div className="hero-left">
                  <div className="logo">✦</div>
                  <div className="hero-title">
                    <h1>DataVista AI Dashboard</h1>
                    <p>Upload data, ask questions, and get instant charts, insights, and summaries.</p>
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
                    <li>1. Upload file</li>
                    <li>2. Ask question</li>
                    <li>3. View chart + insights</li>
                  </ul>
                </div>
              </div>

              <div className="status-bar">
                <div className="dataset-pill">
                  <span className="dot"></span>
                  Current dataset: {fileName}
                </div>

                <div className="button-row">
                  <button
                    className="btn btn-reset"
                    onClick={() => {
                      setCsvText(starterCsv);
                      setFileName("sample.csv");
                      setHasUploadedCsv(false);
                      setQuery("");
                      setAnalysisText("Use the sample data or upload your own CSV to start analysis.");
                      setInsightText("Dashboard is ready. Upload your CSV and ask data questions.");
                      setRecentQueries([]);
                      setTableSearch("");
                      setChartType("top");
                    }}
                  >
                    Reset
                  </button>

                  <button
                    className="btn btn-download"
                    onClick={() => downloadCsvFile(fileName, csvText)}
                  >
                    Download CSV
                  </button>
                </div>
              </div>
            </section>

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

                <div className="stat-card">
                  <h4>Average Sales</h4>
                  <div className="value">{averageSales.toFixed(2)}</div>
                </div>
              </div>

              <div className="dual-grid">
                <div className="mini-panel">
                  <h3>Highlights</h3>
                  <ul>
                    <li>Top selling product: <strong>{topProduct?.[productHeader] || "-"}</strong></li>
                    <li>Highest sales value: <strong>{topProduct?.[salesHeader] || 0}</strong></li>
                    <li>Dataset file: <strong>{fileName}</strong></li>
                  </ul>
                </div>

                <div className="mini-panel">
                  <h3>Data Health</h3>
                  <ul>
                    <li>Dataset successfully parsed and ready for analysis.</li>
                    <li>Search, chart, and summary cards are active.</li>
                    <li>Best results come from clean column names.</li>
                  </ul>
                </div>
              </div>
            </section>

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
                <button className="btn analyze-btn" onClick={() => runAnalysis()}>
                  Analyze
                </button>
              </div>

              <div className="chip-row">
                {[
                  "top product",
                  "average",
                  "total sales",
                  "monthly sales",
                  "region wise sales",
                  "lowest product",
                ].map((chip) => (
                  <button key={chip} className="chip" onClick={() => quickQuery(chip)}>
                    {chip}
                  </button>
                ))}
              </div>

              <div className="info-box">
                Suggested insights: compare region performance, find top products, view monthly trend, or check products above a sales threshold.
              </div>

              <div className="query-result">{analysisText}</div>

              <div className="success-box">
                <strong>Insight:</strong> {insightText}
              </div>

              <div className="recent-box">
                <h3>Recent Queries</h3>
                <div className="recent-query-row">
                  {recentQueries.length ? (
                    recentQueries.map((item) => (
                      <span key={item} className="recent-pill">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="recent-pill">No recent queries yet</span>
                  )}
                </div>
              </div>

              <div className="small-meta">
                Total Rows: {rows.length} | Total Columns: {headers.length}
              </div>
            </section>

            {hasUploadedCsv && chartData.length > 0 && (
              <section className="panel chart-panel">
                <h2 className="section-title">
                  {chartType === "top" && "Top Product Sales"}
                  {chartType === "average" && "Average Sales"}
                  {chartType === "total" && "Total Sales"}
                  {chartType === "lowest" && "Lowest Product Sales"}
                  {chartType === "region" && "Region Wise Sales"}
                </h2>

                <div className="legend">
                  <span className="legend-box"></span>
                  <span>
                    {chartType === "top" && "Top Product Sales"}
                    {chartType === "average" && "Average Sales"}
                    {chartType === "total" && "Total Sales"}
                    {chartType === "lowest" && "Lowest Product Sales"}
                    {chartType === "region" && "Region Wise Sales"}
                  </span>
                </div>

                <div className="chart-wrap">
                  <div className="chart-area">
                    <div className="y-axis">
                      {[0, 25, 50, 75, 100].reverse().map((pct, index) => (
                        <div
                          key={pct}
                          className="y-label"
                          style={{ bottom: `${index * 25}%` }}
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

                      {chartData.map((item) => {
                        const rawHeight = ((item.value || 0) / maxChartValue) * 100;
                        const barHeight = chartAnimated ? `${Math.max(rawHeight, 8)}%` : "0%";

                        return (
                          <div className="bar-group" key={item.name}>
                            <div className="bar" style={{ height: barHeight }} />
                            <div className="bar-label-x">{item.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

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
                      {headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr key={index}>
                        {headers.map((header) => (
                          <td key={header}>
                            {typeof row[header] === "number"
                              ? formatNumber(row[header])
                              : row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
