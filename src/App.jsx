  import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

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

function rowsToCsv(headers, rows) {
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const safe = String(value).replace(/"/g, '""');
          return `"${safe}"`;
        })
        .join(",")
    ),
  ];
  return csvRows.join("\n");
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

function getBarColor(value, max) {
  const ratio = max ? value / max : 0;
  if (ratio > 0.75) return "linear-gradient(180deg, #22c55e, #16a34a)";
  if (ratio > 0.45) return "linear-gradient(180deg, #7068f3, #5b61e8)";
  return "linear-gradient(180deg, #f59e0b, #ea580c)";
}

export default function App() {
  const chartRef = useRef(null);

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

  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem("datavista_current_user") || "";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("datavista_theme") || "dark";
  });

  const [savedQueries, setSavedQueries] = useState(() => {
    try {
      const saved = localStorage.getItem("datavista_saved_queries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [authMessage, setAuthMessage] = useState("");
  const [authMessageType, setAuthMessageType] = useState("");

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

  const [tableSearch, setTableSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [chartType, setChartType] = useState("top");
  const [animateChart, setAnimateChart] = useState(false);

  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [minSalesFilter, setMinSalesFilter] = useState("");
  const [maxSalesFilter, setMaxSalesFilter] = useState("");

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

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

  const regionOptions = useMemo(() => {
    if (!regionHeader) return [];
    return [...new Set(rows.map((row) => row[regionHeader]).filter(Boolean))];
  }, [rows, regionHeader]);

  const monthOptions = useMemo(() => {
    if (!monthHeader) return [];
    return [...new Set(rows.map((row) => row[monthHeader]).filter(Boolean))];
  }, [rows, monthHeader]);

  const sortedBySales = useMemo(() => {
    if (!salesHeader) return [];
    return [...rows]
      .filter((row) => typeof row[salesHeader] === "number")
      .sort((a, b) => b[salesHeader] - a[salesHeader]);
  }, [rows, salesHeader]);

  const topProduct = sortedBySales[0];
  const lowestProduct = sortedBySales[sortedBySales.length - 1];

  const growthPercentage = useMemo(() => {
    if (!sortedBySales.length || !averageSales) return 0;
    const highest = topProduct?.[salesHeader] || 0;
    return ((highest - averageSales) / averageSales) * 100;
  }, [sortedBySales, averageSales, topProduct, salesHeader]);

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
    const map = {};
    rows.forEach((row) => {
      const month = String(row[monthHeader]);
      const sales = typeof row[salesHeader] === "number" ? row[salesHeader] : 0;
      map[month] = (map[month] || 0) + sales;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rows, monthHeader, salesHeader]);

  const chartData = useMemo(() => {
    if (!hasUploaded || !hasAnalyzed || !rows.length || !productHeader || !salesHeader) {
      return [];
    }

    if (chartType === "top") {
      return sortedBySales.slice(0, rowsPerPage).map((item) => ({
        name: String(item[productHeader]),
        value: item[salesHeader],
      }));
    }

    if (chartType === "lowest") {
      return [...sortedBySales]
        .slice(-rowsPerPage)
        .reverse()
        .map((item) => ({
          name: String(item[productHeader]),
          value: item[salesHeader],
        }));
    }

    if (chartType === "average") {
      return rows.slice(0, rowsPerPage).map((row) => ({
        name: String(row[productHeader]),
        value: averageSales,
      }));
    }

    if (chartType === "total") {
      return rows.slice(0, rowsPerPage).map((row) => ({
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
    rowsPerPage,
  ]);

  const baseFilteredRows = useMemo(() => {
    if (!rows.length) return [];

    const q = activeQuery.trim().toLowerCase();

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
    activeQuery,
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

  const filteredRows = useMemo(() => {
    let data = [...baseFilteredRows];

    const ts = tableSearch.trim().toLowerCase();

    if (ts) {
      data = data.filter((row) =>
        headers.some((header) =>
          String(row[header] ?? "").toLowerCase().includes(ts)
        )
      );
    }

    if (selectedRegion !== "all" && regionHeader) {
      data = data.filter((row) => String(row[regionHeader]) === selectedRegion);
    }

    if (selectedMonth !== "all" && monthHeader) {
      data = data.filter((row) => String(row[monthHeader]) === selectedMonth);
    }

    if (salesHeader && minSalesFilter !== "") {
      data = data.filter((row) => {
        const value = Number(row[salesHeader]);
        return !Number.isNaN(value) && value >= Number(minSalesFilter);
      });
    }

    if (salesHeader && maxSalesFilter !== "") {
      data = data.filter((row) => {
        const value = Number(row[salesHeader]);
        return !Number.isNaN(value) && value <= Number(maxSalesFilter);
      });
    }

    if (sortConfig.key) {
      data.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return sortConfig.direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return data;
  }, [
    baseFilteredRows,
    tableSearch,
    headers,
    selectedRegion,
    selectedMonth,
    minSalesFilter,
    maxSalesFilter,
    regionHeader,
    monthHeader,
    salesHeader,
    sortConfig,
  ]);

  const effectiveRowsPerPage = Math.min(
    rowsPerPage,
    filteredRows.length || rowsPerPage
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / effectiveRowsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * effectiveRowsPerPage;
  const endIndex = startIndex + effectiveRowsPerPage;
  const visibleRows = filteredRows.slice(startIndex, endIndex);

  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

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

  const tableHeaders = useMemo(() => {
    if (headers.length) return headers;
    return ["Column 1"];
  }, [headers]);

  useEffect(() => {
    if (currentUser) {
      setLoggedIn(true);
      setName(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("datavista_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("datavista_saved_queries", JSON.stringify(savedQueries));
  }, [savedQueries]);

  useEffect(() => {
    if (!chartData.length || chartType === "region" || chartType === "month") {
      setAnimateChart(false);
      return;
    }
    setAnimateChart(false);
    const timer = setTimeout(() => setAnimateChart(true), 120);
    return () => clearTimeout(timer);
  }, [chartData, chartType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    tableSearch,
    activeQuery,
    rowsPerPage,
    hasAnalyzed,
    csvText,
    selectedRegion,
    selectedMonth,
    minSalesFilter,
    maxSalesFilter,
    sortConfig,
  ]);

  const handleSignup = (e) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setAuthMessage("Please fill all fields.");
      setAuthMessageType("error");
      return;
    }

    const exists = users.find((u) => u.email === cleanEmail);
    if (exists) {
      setAuthMessage("Account already exists with this email.");
      setAuthMessageType("error");
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

    setAuthMessage("Account created successfully. Please login.");
    setAuthMessageType("success");

    setName("");
    setEmail(cleanEmail);
    setPassword("");
    setIsSignup(false);
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setAuthMessage("Please enter email and password.");
      setAuthMessageType("error");
      return;
    }

    const user = users.find(
      (u) => u.email === cleanEmail && u.password === cleanPassword
    );

    if (!user) {
      setAuthMessage("Invalid email or password.");
      setAuthMessageType("error");
      return;
    }

    setAuthMessage("");
    setAuthMessageType("");

    setName(user.name || "");
    setLoggedIn(true);
    setPassword("");

    localStorage.setItem("datavista_current_user", user.name);
    setCurrentUser(user.name);
  };

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;

    setLoggedIn(false);
    setEmail("");
    setPassword("");
    setCurrentUser("");
    setAuthMessage("");
    setAuthMessageType("");
    localStorage.removeItem("datavista_current_user");
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
      setRowsPerPage(8);
      setCurrentPage(1);
      setChartType("top");
      setSelectedRegion("all");
      setSelectedMonth("all");
      setMinSalesFilter("");
      setMaxSalesFilter("");
      setSortConfig({ key: "", direction: "asc" });

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
        "Try queries like top product, total sales, average sales, product in January, or region wise sales."
      );
      return;
    }

    setLoading(true);

    setTimeout(() => {
      let nextChartType = "top";
      let response = "Query analyzed successfully.";
      let nextRegion = "all";
      let nextMonth = "all";

      const matchedRegion = regionOptions.find((item) =>
        q.includes(String(item).toLowerCase())
      );
      const matchedMonth = monthOptions.find((item) =>
        q.includes(String(item).toLowerCase())
      );

      if (matchedRegion) nextRegion = String(matchedRegion);
      if (matchedMonth) nextMonth = String(matchedMonth);

      if (q.includes("top")) {
        nextChartType = matchedMonth ? "month" : matchedRegion ? "region" : "top";
        response = `Top analysis generated successfully.`;
      } else if (q.includes("lowest")) {
        nextChartType = "lowest";
        response = `Lowest product analysis generated successfully.`;
      } else if (q.includes("average")) {
        nextChartType = "average";
        response = `Average sales is ${formatNumber(Number(averageSales.toFixed(2)))}`;
      } else if (q.includes("total")) {
        nextChartType = "total";
        response = `Total sales is ${formatNumber(totalSales)}`;
      } else if (q.includes("region")) {
        nextChartType = "region";
        response = "Showing region wise sales distribution.";
      } else if (q.includes("month") || matchedMonth) {
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
      setSelectedRegion(nextRegion);
      setSelectedMonth(nextMonth);
      setCurrentPage(1);

      setResultText(response);
      setInsightText(
        matchedRegion || matchedMonth
          ? `${autoInsight} Auto filters applied${matchedRegion ? ` for ${matchedRegion}` : ""}${
              matchedMonth ? ` and ${matchedMonth}` : ""
            }.`
          : autoInsight
      );

      setRecentQueries((prev) => [q, ...prev.filter((item) => item !== q)].slice(0, 5));
      setLoading(false);
    }, 900);
  };

  const handleQuickQuery = (text) => {
    setQuery(text);
  };

  const handleSaveCurrentQuery = () => {
    const clean = query.trim();
    if (!clean) return;
    setSavedQueries((prev) => [clean, ...prev.filter((item) => item !== clean)].slice(0, 8));
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
    setRowsPerPage(8);
    setCurrentPage(1);
    setChartType("top");
    setSelectedRegion("all");
    setSelectedMonth("all");
    setMinSalesFilter("");
    setMaxSalesFilter("");
    setSortConfig({ key: "", direction: "asc" });

    setResultText("Upload your CSV and ask a question to generate smart insights.");
    setInsightText("Dashboard loaded successfully. Upload a CSV to unlock live visual analysis.");
  };

  const handleSort = (header) => {
    setSortConfig((prev) => {
      if (prev.key === header) {
        return {
          key: header,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: header,
        direction: "asc",
      };
    });
  };

  const handleDownloadFilteredCsv = () => {
    const csv = rowsToCsv(tableHeaders, filteredRows);
    downloadCsv(`filtered_${fileName || "dataset.csv"}`, csv);
  };

  const handleDownloadChart = async () => {
    if (!chartRef.current) return;

    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: null,
      scale: 2,
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "chart.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const clearAllFilters = () => {
    setTableSearch("");
    setSelectedRegion("all");
    setSelectedMonth("all");
    setMinSalesFilter("");
    setMaxSalesFilter("");
    setSortConfig({ key: "", direction: "asc" });
    setCurrentPage(1);
  };

  const isDark = theme === "dark";

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
          .auth-message {
            margin-bottom: 16px;
            padding: 14px 16px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
          }
          .auth-message.error {
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #fecaca;
          }
          .auth-message.success {
            background: rgba(34, 197, 94, 0.12);
            border: 1px solid rgba(34, 197, 94, 0.35);
            color: #bbf7d0;
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

            {authMessage && (
              <div className={`auth-message ${authMessageType}`}>
                {authMessage}
              </div>
            )}

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
                  setAuthMessage("");
                  setAuthMessageType("");
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
          color: ${isDark ? "#f8fafc" : "#0f172a"};
          background: ${
            isDark
              ? "radial-gradient(circle at top center, rgba(126, 87, 255, 0.22), transparent 25%), linear-gradient(180deg, #0a1022 0%, #09152e 100%)"
              : "linear-gradient(180deg, #eef2ff 0%, #f8fafc 100%)"
          };
        }

        .app {
          min-height: 100vh;
          padding: 28px 18px 60px;
          animation: fadeIn .8s ease;
        }

        .container {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .panel {
          background: ${
            isDark
              ? "linear-gradient(180deg, rgba(11, 25, 64, 0.96), rgba(8, 20, 53, 0.96))"
              : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))"
          };
          border: 1px solid ${isDark ? "rgba(102, 126, 234, 0.22)" : "rgba(148, 163, 184, 0.3)"};
          border-radius: 30px;
          box-shadow: 0 14px 40px rgba(0,0,0,0.12);
        }

        .hero {
          padding: 34px 34px 30px;
          margin-bottom: 24px;
        }

        .hero-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
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
          color: white;
        }

        .hero-title h1 {
          font-size: 48px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1.2px;
        }

        .hero-title p {
          margin-top: 8px;
          font-size: 17px;
          color: ${isDark ? "#c7d2fe" : "#475569"};
          max-width: 780px;
        }

        .top-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .toggle-btn, .logout-btn {
          border: none;
          border-radius: 16px;
          padding: 14px 20px;
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .toggle-btn {
          background: linear-gradient(135deg, #0ea5e9, #2563eb);
        }

        .logout-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .upload-card, .how-card {
          border-radius: 24px;
          padding: 30px 24px;
          border: 1px solid ${isDark ? "rgba(122, 142, 255, 0.22)" : "rgba(148, 163, 184, 0.24)"};
          background: ${
            isDark
              ? "linear-gradient(135deg, rgba(56,47,120,.45), rgba(17,31,78,.45))"
              : "linear-gradient(135deg, rgba(99,102,241,.08), rgba(59,130,246,.06))"
          };
          min-height: 190px;
        }

        .upload-inner {
          min-height: 128px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1.5px dashed ${isDark ? "rgba(161,167,255,.3)" : "rgba(99,102,241,.35)"};
          border-radius: 20px;
          padding: 22px;
          cursor: pointer;
          transition: .28s ease;
        }

        .upload-inner:hover {
          transform: translateY(-2px);
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
          color: ${isDark ? "#b8c2f0" : "#475569"};
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
          gap: 16px;
          font-size: 18px;
          color: ${isDark ? "#d8defe" : "#334155"};
          line-height: 1.5;
          padding-top: 4px;
          max-width: 340px;
          margin: 0 auto;
        }

        .status-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-top: 22px;
        }

        .dataset-pill {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 14px 22px;
          border-radius: 999px;
          background: rgba(16,185,129,.12);
          border: 1px solid rgba(16,185,129,.4);
          color: ${isDark ? "#d1fae5" : "#065f46"};
          font-weight: 700;
          font-size: 18px;
        }

        .dataset-pill.empty {
          background: ${isDark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.04)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,.12)" : "rgba(148,163,184,.28)"};
          color: ${isDark ? "#cbd5e1" : "#475569"};
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
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          color: white;
          transition: .24s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px rgba(0,0,0,.16);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-reset { background: linear-gradient(135deg, #ff5a36, #ff6b3d); }
        .btn-download { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .btn-save { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        .btn-chart { background: linear-gradient(135deg, #06b6d4, #2563eb); }

        .file-input { display: none; }

        .summary, .ask-panel, .chart-panel, .table-panel {
          padding: 28px;
          margin-bottom: 22px;
          animation: riseUp .7s ease;
        }

        .section-title {
          text-align: center;
          font-size: 30px;
          font-weight: 800;
          margin-bottom: 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-card {
          min-height: 112px;
          border-radius: 20px;
          padding: 22px 16px;
          background: ${isDark ? "rgba(18,34,79,.88)" : "rgba(255,255,255,.75)"};
          border: 1px solid ${isDark ? "rgba(111,133,221,.22)" : "rgba(148,163,184,.22)"};
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          transition: .25s ease;
        }

        .stat-card:hover { transform: translateY(-3px); }

        .stat-card h4 {
          color: ${isDark ? "#aeb8de" : "#64748b"};
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 14px;
          text-align: center;
        }

        .stat-card .value {
          font-size: 24px;
          font-weight: 800;
        }

        .dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .mini-panel {
          border-radius: 22px;
          background: ${isDark ? "rgba(15,28,68,.9)" : "rgba(255,255,255,.8)"};
          border: 1px solid ${isDark ? "rgba(111,133,221,.22)" : "rgba(148,163,184,.22)"};
          padding: 22px;
          min-height: 170px;
        }

        .mini-panel h3 {
          font-size: 21px;
          margin-bottom: 14px;
          text-align: center;
        }

        .mini-panel ul {
          list-style: none;
          display: grid;
          gap: 10px;
        }

        .mini-panel li {
          color: ${isDark ? "#d7ddfb" : "#334155"};
          background: ${isDark ? "rgba(255,255,255,.03)" : "rgba(15,23,42,.03)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,.05)" : "rgba(148,163,184,.12)"};
          border-radius: 14px;
          padding: 12px 14px;
          line-height: 1.55;
        }

        .ask-title {
          text-align: center;
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 22px;
        }

        .query-row {
          display: grid;
          grid-template-columns: 1fr 170px 170px;
          gap: 14px;
          align-items: center;
          margin-bottom: 16px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .query-input, .table-search, .rows-select, .filter-select, .filter-input, .page-select {
          width: 100%;
          height: 52px;
          border-radius: 18px;
          border: 1px solid ${isDark ? "rgba(145,157,215,.2)" : "rgba(148,163,184,.3)"};
          background: ${isDark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.9)"};
          color: ${isDark ? "white" : "#0f172a"};
          padding: 0 18px;
          font-size: 15px;
          outline: none;
        }

        .query-input::placeholder, .table-search::placeholder, .filter-input::placeholder {
          color: ${isDark ? "#92a0d3" : "#64748b"};
        }

        .analyze-btn {
          height: 52px;
          background: linear-gradient(135deg, #6d5dfc, #8b5cf6);
        }

        .chip-row, .saved-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .chip, .saved-pill {
          border-radius: 999px;
          border: 1px solid ${isDark ? "rgba(128,145,242,.35)" : "rgba(99,102,241,.25)"};
          background: ${isDark ? "rgba(94,110,218,.08)" : "rgba(99,102,241,.08)"};
          color: ${isDark ? "#e5e7eb" : "#1e293b"};
          padding: 10px 15px;
          cursor: pointer;
          font-size: 14px;
          transition: .24s ease;
        }

        .chip:hover, .saved-pill:hover {
          transform: translateY(-2px);
        }

        .info-box {
          max-width: 1060px;
          margin: 0 auto 18px;
          border-radius: 20px;
          padding: 16px 18px;
          text-align: center;
          background: ${isDark ? "rgba(49,83,185,.22)" : "rgba(59,130,246,.08)"};
          border: 1px solid ${isDark ? "rgba(91,120,232,.35)" : "rgba(59,130,246,.16)"};
          color: ${isDark ? "#d7e3ff" : "#1e40af"};
          font-size: 16px;
          line-height: 1.55;
        }

        .result-card {
          max-width: 1060px;
          margin: 0 auto 18px;
          padding: 22px;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(16,185,129,.12), rgba(59,130,246,.10));
          border: 1px solid rgba(99,102,241,.25);
          text-align: center;
        }

        .result-card h3 {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 10px;
        }

        .result-card p {
          font-size: 17px;
          line-height: 1.6;
          color: ${isDark ? "#dbeafe" : "#1e3a8a"};
        }

        .recent-inline {
          max-width: 1060px;
          margin: 0 auto 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .recent-pill {
          padding: 10px 16px;
          border-radius: 999px;
          background: ${isDark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.05)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(148,163,184,.18)"};
          color: ${isDark ? "#e5e7eb" : "#334155"};
        }

        .small-meta {
          text-align: center;
          color: ${isDark ? "#93a1cc" : "#64748b"};
          font-size: 16px;
          margin-top: 8px;
        }

        .loading-box {
          max-width: 1060px;
          margin: 0 auto 16px;
          border-radius: 18px;
          padding: 14px 18px;
          text-align: center;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(129, 140, 248, 0.35);
          font-weight: 700;
          letter-spacing: .4px;
        }

        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 16px;
        }

        .skeleton-card {
          height: 90px;
          border-radius: 18px;
          background: linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.12), rgba(255,255,255,.06));
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite linear;
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

        .chart-wrap {
          margin-top: 10px;
          min-height: 420px;
          padding: 16px 18px 18px;
          position: relative;
          overflow: visible;
          border-radius: 20px;
          background: ${isDark ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.55)"};
        }

        .legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 10px 0 8px;
          font-size: 18px;
        }

        .legend-box {
          width: 56px;
          height: 16px;
          border-radius: 4px;
          background: linear-gradient(180deg, #7068f3, #5b61e8);
        }

        .chart-toolbar {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .chart-area {
          height: 100%;
          display: flex;
          align-items: stretch;
          gap: 18px;
        }

        .y-axis {
          width: 72px;
          position: relative;
          padding-top: 8px;
        }

        .y-label {
          position: absolute;
          left: 0;
          transform: translateY(50%);
          color: ${isDark ? "#c4cbe8" : "#64748b"};
          font-size: 13px;
        }

        .plot {
          flex: 1;
          position: relative;
          height: 100%;
          padding: 24px 0 50px;
          border-left: 1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(148,163,184,.22)"};
          border-bottom: 1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(148,163,184,.22)"};
          display: flex;
          align-items: flex-end;
          gap: 18px;
        }

        .grid-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px solid ${isDark ? "rgba(255,255,255,.06)" : "rgba(148,163,184,.14)"};
          z-index: 0;
        }

        .bar-group {
          flex: 1;
          min-width: 58px;
          max-width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
        }

        .bar-value {
          font-size: 12px;
          margin-bottom: 8px;
          color: ${isDark ? "#dbeafe" : "#334155"};
          text-align: center;
        }

        .bar {
          width: 100%;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 14px 30px rgba(92,97,232,.18);
          transition: height 1s cubic-bezier(.2,.8,.2,1), transform .2s ease;
          position: relative;
          z-index: 2;
        }

        .bar:hover {
          transform: translateY(-4px);
        }

        .bar-label-x {
          margin-top: 10px;
          font-size: 13px;
          color: ${isDark ? "#d5daf7" : "#334155"};
          text-align: center;
          word-break: break-word;
        }

        .line-chart-box {
          height: 280px;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 10px 0 6px;
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
          width: 10px;
          border-radius: 999px;
          box-shadow: 0 8px 18px rgba(96,165,250,.25);
          transition: height .9s ease;
        }

        .line-value {
          font-size: 12px;
          color: ${isDark ? "#cbd5e1" : "#334155"};
          margin-bottom: 6px;
          text-align: center;
        }

        .line-label {
          margin-top: 8px;
          color: ${isDark ? "#d5daf7" : "#334155"};
          font-size: 13px;
          text-align: center;
        }

        .pie-wrap {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 20px;
          align-items: center;
          min-height: 250px;
        }

        .pie-main {
          width: 210px;
          height: 210px;
          margin: 0 auto;
          border-radius: 50%;
          border: 10px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(148,163,184,.18)"};
          box-shadow: inset 0 0 0 16px ${isDark ? "rgba(10,16,34,.9)" : "rgba(255,255,255,.82)"};
          position: relative;
          overflow: hidden;
        }

        .pie-hole {
          position: absolute;
          inset: 46px;
          background: ${isDark ? "linear-gradient(180deg, #0b1940, #081435)" : "linear-gradient(180deg, #ffffff, #f1f5f9)"};
          border-radius: 50%;
          border: 1px solid ${isDark ? "rgba(255,255,255,.08)" : "rgba(148,163,184,.18)"};
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          font-weight: 800;
          padding: 14px;
          font-size: 13px;
          z-index: 2;
        }

        .pie-segment {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .pie-legend {
          display: grid;
          gap: 10px;
        }

        .pie-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 12px;
          border-radius: 14px;
          background: ${isDark ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.7)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,.06)" : "rgba(148,163,184,.14)"};
        }

        .pie-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pie-color {
          width: 14px;
          height: 14px;
          border-radius: 4px;
        }

        .pie-right {
          color: ${isDark ? "#c7d2fe" : "#334155"};
          font-weight: 700;
          text-align: right;
          font-size: 14px;
        }

        .table-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .table-head h2 {
          font-size: 28px;
          font-weight: 800;
        }

        .table-controls {
          display: grid;
          grid-template-columns: repeat(6, minmax(120px, 1fr));
          gap: 12px;
          width: 100%;
        }

        .rows-select option, .filter-select option, .page-select option {
          background: ${isDark ? "#0f1b45" : "#ffffff"};
          color: ${isDark ? "white" : "#0f172a"};
        }

        .table-wrap {
          overflow-x: auto;
          border-radius: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        th, td {
          padding: 16px 14px;
          text-align: left;
          border-bottom: 1px solid ${isDark ? "rgba(255,255,255,.07)" : "rgba(148,163,184,.18)"};
          font-size: 15px;
        }

        th {
          font-size: 16px;
          font-weight: 800;
          background: ${isDark ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.85)"};
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        td {
          color: ${isDark ? "#d8dff7" : "#334155"};
        }

        tr:hover td {
          background: ${isDark ? "rgba(255,255,255,.025)" : "rgba(99,102,241,.04)"};
        }

        .pagination-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .page-pills {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .page-btn {
          min-width: 40px;
          height: 40px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          background: ${isDark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.05)"};
          color: ${isDark ? "#fff" : "#0f172a"};
        }

        .page-btn.active {
          background: linear-gradient(135deg, #6d5dfc, #8b5cf6);
          color: white;
        }

        .subheading {
          text-align: center;
          margin-bottom: 12px;
          color: ${isDark ? "#93a1cc" : "#64748b"};
          font-size: 14px;
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

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 1200px) {
          .hero-title h1 { font-size: 40px; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .table-controls { grid-template-columns: repeat(3, minmax(120px, 1fr)); }
        }

        @media (max-width: 950px) {
          .hero-grid, .dual-grid, .pie-wrap { grid-template-columns: 1fr; }
          .query-row { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .hero, .summary, .ask-panel, .chart-panel, .table-panel { padding: 22px 16px; }
          .hero-title h1 { font-size: 32px; }
          .pie-main { width: 180px; height: 180px; }
          .pie-hole { inset: 40px; }
          .table-controls { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
        }

        @media (max-width: 640px) {
          .stats-grid, .table-controls, .skeleton-grid { grid-template-columns: 1fr; }
          .hero-title h1 { font-size: 28px; }
          .hero-title p { font-size: 15px; }
          .section-title, .ask-title, .table-head h2 { font-size: 24px; }
          .plot { gap: 10px; }
          .bar-group { min-width: 48px; }
          .chart-wrap { min-height: 300px; }
          .result-card h3 { font-size: 22px; }
          .result-card p { font-size: 15px; }
          .top-actions { width: 100%; }
        }
      `}</style>

      <div className="app">
        <div className="container">
          <section className="panel hero">
            <div className="hero-header">
              <div className="hero-left">
                <div className="logo">✦</div>
                <div className="hero-title">
                  <h1>DataVista AI Dashboard</h1>
                  <p>
                    Welcome{name ? `, ${name}` : ""}! Upload data, ask questions, and get instant charts, filters, exports, and smart summaries.
                  </p>
                </div>
              </div>

              <div className="top-actions">
                <button
                  className="toggle-btn"
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                >
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>

                <button className="logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
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
                  <li>2. Ask a natural query</li>
                  <li>3. Apply filters, sort, export, and compare</li>
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

                <button
                  className="btn btn-save"
                  onClick={handleSaveCurrentQuery}
                  disabled={!query.trim()}
                >
                  Save Query
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

              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                  <h4>Top Product</h4>
                  <div className="value" style={{ fontSize: "18px", textAlign: "center" }}>
                    {topProduct?.[productHeader] || "-"}
                  </div>
                </div>

                <div className="stat-card">
                  <h4>Lowest Product</h4>
                  <div className="value" style={{ fontSize: "18px", textAlign: "center" }}>
                    {lowestProduct?.[productHeader] || "-"}
                  </div>
                </div>

                <div className="stat-card">
                  <h4>Average Sales</h4>
                  <div className="value">{formatNumber(Number(averageSales.toFixed(2)))}</div>
                </div>

                <div className="stat-card">
                  <h4>Growth %</h4>
                  <div className="value">
                    {Number.isFinite(growthPercentage) ? `${growthPercentage.toFixed(1)}%` : "0%"}
                  </div>
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
                    <li>Sorting, filters, export, pagination, saved queries.</li>
                    <li>Theme toggle and chart image download support.</li>
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
                placeholder="Ask a question... e.g. top product in January or region wise sales"
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

              <button
                className="btn btn-save"
                onClick={handleSaveCurrentQuery}
                disabled={!query.trim()}
              >
                Save Query
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
                "top product in january",
                "sales in west region",
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

            {savedQueries.length > 0 && (
              <>
                <div className="subheading">Saved Queries</div>
                <div className="saved-row">
                  {savedQueries.map((item) => (
                    <button
                      key={item}
                      className="saved-pill"
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="info-box">
              Try combined queries like: <strong>top product in January</strong>, <strong>sales in West region</strong>, <strong>monthly sales</strong>, <strong>region wise sales</strong>.
            </div>

            {loading && (
              <>
                <div className="loading-box">
                  Analyzing data
                  <span className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
                <div className="skeleton-grid">
                  <div className="skeleton-card"></div>
                  <div className="skeleton-card"></div>
                  <div className="skeleton-card"></div>
                </div>
              </>
            )}

            {hasAnalyzed && (
              <div className="result-card">
                <h3>{resultText}</h3>
                <p>{insightText}</p>
              </div>
            )}

            {recentQueries.length > 0 && (
              <div className="recent-inline">
                {recentQueries.map((item) => (
                  <span key={item} className="recent-pill">{item}</span>
                ))}
              </div>
            )}

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

              <div className="chart-toolbar">
                <button className="btn btn-chart" onClick={handleDownloadChart}>
                  Download Chart Image
                </button>
              </div>

              <div className="chart-wrap" ref={chartRef}>
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
                        const barHeight = animateChart ? `${Math.max(rawHeight, 12)}%` : "12%";

                        return (
                          <div className="bar-group" key={`${item.name}-${index}`}>
                            <div className="bar-value">{formatNumber(item.value)}</div>
                            <div
                              className="bar"
                              title={`${item.name}: ${formatNumber(item.value)}`}
                              style={{
                                height: barHeight,
                                background: getBarColor(item.value, maxChartValue),
                              }}
                            />
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
                              title={`${item.name}: ${formatNumber(item.value)}`}
                              style={{
                                height: `${Math.max(rawHeight * 2, 12)}px`,
                                background: getBarColor(item.value, maxChartValue),
                              }}
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
                              const total = chartData.reduce((sum, x) => sum + x.value, 0);
                              const percent = total ? (item.value / total) * 100 : 0;
                              const end = start + percent;
                              const segment = (
                                <div
                                  key={item.name}
                                  className="pie-segment"
                                  title={`${item.name}: ${formatNumber(item.value)}`}
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
                        const chartTotal = chartData.reduce((sum, x) => sum + x.value, 0);
                        const percentage = chartTotal
                          ? ((item.value / chartTotal) * 100).toFixed(1)
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

                <div className="button-row">
                  <button className="btn btn-download" onClick={handleDownloadFilteredCsv}>
                    Download Filtered CSV
                  </button>

                  <button className="btn btn-reset" onClick={clearAllFilters}>
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="table-controls">
                <input
                  className="table-search"
                  type="text"
                  placeholder="Search in table..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                />

                <select
                  className="filter-select"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {regionOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="all">All Months</option>
                  {monthOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <input
                  className="filter-input"
                  type="number"
                  placeholder="Min Sales"
                  value={minSalesFilter}
                  onChange={(e) => setMinSalesFilter(e.target.value)}
                />

                <input
                  className="filter-input"
                  type="number"
                  placeholder="Max Sales"
                  value={maxSalesFilter}
                  onChange={(e) => setMaxSalesFilter(e.target.value)}
                />

                <select
                  className="rows-select"
                  value={effectiveRowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={5}>5 rows</option>
                  <option value={8}>8 rows</option>
                  <option value={10}>10 rows</option>
                  <option value={15}>15 rows</option>
                </select>
              </div>

              <div className="table-wrap" style={{ marginTop: "16px" }}>
                <table>
                  <thead>
                    <tr>
                      {tableHeaders.map((header) => (
                        <th key={header} onClick={() => handleSort(header)}>
                          {header}
                          {sortConfig.key === header
                            ? sortConfig.direction === "asc"
                              ? " ↑"
                              : " ↓"
                            : ""}
                        </th>
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

              <div className="pagination-bar">
                <div style={{ color: isDark ? "#cbd5e1" : "#475569", fontSize: "15px" }}>
                  Page {safeCurrentPage} of {totalPages} | Showing {visibleRows.length} of {filteredRows.length} rows
                </div>

                <div className="page-pills">
                  <button
                    className="btn"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    style={{
                      background: "linear-gradient(135deg, #334155, #1e293b)",
                      padding: "10px 16px",
                    }}
                  >
                    Prev
                  </button>

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      className={`page-btn ${safeCurrentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="btn"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={safeCurrentPage === totalPages}
                    style={{
                      background: "linear-gradient(135deg, #6d5dfc, #8b5cf6)",
                      padding: "10px 16px",
                    }}
                  >
                    Next
                  </button>
                </div>

                <select
                  className="page-select"
                  style={{ maxWidth: "140px" }}
                  value={safeCurrentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                >
                  {pageNumbers.map((page) => (
                    <option key={page} value={page}>
                      Page {page}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}