import { useState, useEffect, useCallback, useRef } from "react"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"

// ── FONT ─────────────────────────────────────────────────────────────────────
const fl = document.createElement("link")
fl.rel = "stylesheet"
fl.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"
document.head.appendChild(fl)

// ── THEME TOKENS ─────────────────────────────────────────────────────────────
const LIGHT = {
  primary: "#007782",
  primaryLight: "#E6FAFA",
  primaryDim: "rgba(0,119,130,0.12)",
  success: "#28865A",
  successLight: "#EBFCEF",
  error: "#D04555",
  errorLight: "#FFF4F4",
  warning: "#F9BB42",
  warningLight: "#FFF5E5",

  bg: "#F7F8F8",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  border: "rgba(15,18,18,0.08)",
  borderStrong: "rgba(15,18,18,0.16)",

  textPrimary: "#0F1212",
  textSecondary: "#5A6566",
  textPlaceholder: "#9CA3A5",
  textInverse: "#FFFFFF",

  shadow: "0 2px 8px rgba(15,18,18,0.06), 0 0 0 1px rgba(15,18,18,0.04)",
  shadowMd: "0 4px 16px rgba(15,18,18,0.10), 0 0 0 1px rgba(15,18,18,0.04)",
  shadowLg: "0 8px 32px rgba(15,18,18,0.12)",

  radius: "12px",
  radiusSm: "8px",
  radiusPill: "9999px",
  chartGrid: "rgba(15,18,18,0.05)",
}

const DARK = {
  ...LIGHT,
  bg: "#0D1010",
  surface: "#161A1A",
  surfaceRaised: "#1E2424",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.13)",
  textPrimary: "#EDF2F2",
  textSecondary: "#8A9899",
  textPlaceholder: "#4E5B5C",
  shadow: "0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
  shadowLg: "0 8px 32px rgba(0,0,0,0.5)",
  chartGrid: "rgba(255,255,255,0.04)",
  primaryLight: "rgba(0,119,130,0.18)",
  successLight: "rgba(40,134,90,0.15)",
  errorLight: "rgba(208,69,85,0.15)",
  warningLight: "rgba(249,187,66,0.12)",
}

// ── STYLES ────────────────────────────────────────────────────────────────────
function injectStyles(T) {
  let el = document.getElementById("ds-styles")
  if (!el) { el = document.createElement("style"); el.id = "ds-styles"; document.head.appendChild(el) }
  el.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg}; font-family: Inter, system-ui, sans-serif; color: ${T.textPrimary}; }
  input, textarea, button, select { font-family: Inter, system-ui, sans-serif; }

  .app { min-height: 100vh; background: ${T.bg}; color: ${T.textPrimary}; transition: background 0.2s, color 0.2s; }

  /* NAV */
  .nav {
    height: 56px; background: ${T.surface}; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; padding: 0 20px; gap: 16px;
    position: sticky; top: 0; z-index: 200; box-shadow: ${T.shadow};
  }
  .nav-logo {
    width: 30px; height: 30px; border-radius: 8px; background: ${T.primary};
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: #fff; flex-shrink: 0;
  }
  .nav-title { font-size: 15px; font-weight: 600; color: ${T.textPrimary}; white-space: nowrap; }
  .nav-sep { flex: 1; }

  /* TABS */
  .tabs { display: flex; gap: 2px; }
  .tab {
    height: 32px; padding: 0 14px; border-radius: ${T.radiusPill};
    border: none; font-size: 13px; font-weight: 500; cursor: pointer;
    transition: all 0.15s; color: ${T.textSecondary}; background: transparent;
  }
  .tab:hover { background: ${T.border}; color: ${T.textPrimary}; }
  .tab.active { background: ${T.primary}; color: #fff; }

  /* ICON BUTTON */
  .icon-btn {
    width: 32px; height: 32px; border-radius: ${T.radiusSm};
    border: 1px solid ${T.border}; background: ${T.surface};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 15px; color: ${T.textSecondary};
    transition: all 0.15s;
  }
  .icon-btn:hover { border-color: ${T.primary}; color: ${T.primary}; }

  /* DROPDOWN */
  .dropdown-wrap { position: relative; }
  .dropdown-trigger {
    height: 32px; padding: 0 12px; border-radius: ${T.radiusPill};
    border: 1px solid ${T.border}; background: ${T.surface};
    font-size: 13px; font-weight: 500; color: ${T.textPrimary};
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    transition: all 0.15s; white-space: nowrap;
  }
  .dropdown-trigger:hover { border-color: ${T.primary}; }
  .dropdown-trigger.open { border-color: ${T.primary}; box-shadow: 0 0 0 3px ${T.primaryDim}; }
  .dropdown-label { font-size: 11px; font-weight: 600; color: ${T.textPlaceholder}; text-transform: uppercase; letter-spacing: 0.07em; margin-right: 2px; }
  .dropdown-arrow { color: ${T.textPlaceholder}; font-size: 10px; margin-left: 2px; transition: transform 0.15s; }
  .dropdown-arrow.open { transform: rotate(180deg); }
  .dropdown-menu {
    position: absolute; top: calc(100% + 6px); left: 0;
    background: ${T.surface}; border: 1px solid ${T.border};
    border-radius: ${T.radiusSm}; box-shadow: ${T.shadowMd};
    min-width: 160px; z-index: 300; overflow: hidden;
    animation: fadeIn 0.1s ease;
  }
  .dropdown-menu.right { left: auto; right: 0; }
  .dropdown-item {
    padding: 9px 14px; font-size: 13px; color: ${T.textSecondary};
    cursor: pointer; transition: background 0.1s; display: flex; align-items: center; justify-content: space-between;
  }
  .dropdown-item:hover { background: ${T.bg}; color: ${T.textPrimary}; }
  .dropdown-item.selected { color: ${T.primary}; font-weight: 500; background: ${T.primaryLight}; }
  .dropdown-item.disabled { opacity: 0.4; pointer-events: none; }
  .dropdown-check { font-size: 12px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

  /* PAGE */
  .page { max-width: 1020px; margin: 0 auto; padding: 24px 20px 80px; }

  /* CARDS */
  .card {
    background: ${T.surface}; border-radius: ${T.radius};
    box-shadow: ${T.shadow}; transition: box-shadow 0.15s;
    border: 1px solid ${T.border};
  }
  .card:hover { box-shadow: ${T.shadowMd}; }
  .card-pad { padding: 18px 20px; }

  /* STAT CARD */
  .stat-card { padding: 18px 20px; }
  .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.09em; color: ${T.textPlaceholder}; margin-bottom: 8px; }
  .stat-val { font-size: 26px; font-weight: 600; color: ${T.textPrimary}; line-height: 1; margin-bottom: 6px; }
  .stat-foot { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; overflow: hidden; min-width: 0; }
  .trend { font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border-radius: ${T.radiusPill}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; cursor: default; flex-shrink: 0; }
  .trend.up { background: ${T.successLight}; color: ${T.success}; }
  .trend.down { background: ${T.errorLight}; color: ${T.error}; }
  .trend.flat { background: ${T.bg}; color: ${T.textPlaceholder}; border: 1px solid ${T.border}; }

  /* BADGE */
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: ${T.radiusPill}; font-size: 11px; font-weight: 500; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: default; }
  .badge.success { background: ${T.successLight}; color: ${T.success}; }
  .badge.error { background: ${T.errorLight}; color: ${T.error}; }
  .badge.warn { background: ${T.warningLight}; color: ${T.warning}; }
  .badge.neutral { background: ${T.bg}; color: ${T.textPlaceholder}; border: 1px solid ${T.border}; }

  /* CHART */
  .chart-title { font-size: 15px; font-weight: 600; color: ${T.textPrimary}; margin-bottom: 2px; }
  .chart-sub { font-size: 12px; color: ${T.textPlaceholder}; margin-bottom: 14px; }

  /* GRIDS */
  .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 14px; }
  .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 14px; }
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .g21 { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 14px; }

  /* SECTION */
  .sec-head { font-size: 18px; font-weight: 600; color: ${T.textPrimary}; margin: 24px 0 12px; }

  /* DASH TABS */
  .dash-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
  .dash-tab {
    height: 30px; padding: 0 14px; border-radius: ${T.radiusPill};
    border: 1px solid ${T.border}; background: ${T.surface};
    font-size: 13px; font-weight: 400; cursor: pointer;
    color: ${T.textSecondary}; transition: all 0.12s;
  }
  .dash-tab:hover { border-color: ${T.primary}; color: ${T.primary}; }
  .dash-tab.active { background: ${T.primary}; border-color: ${T.primary}; color: #fff; font-weight: 500; }

  /* COMPARE BANNER */
  .compare-bar {
    background: ${T.primaryLight}; border: 1px solid ${T.primary}33;
    border-radius: ${T.radiusSm}; padding: 8px 14px; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px; font-size: 13px;
    color: ${T.primary};
  }

  /* INFO BANNER */
  .banner { border-radius: ${T.radiusSm}; padding: 14px 16px; display: flex; gap: 12px; margin-bottom: 14px; }
  .banner-icon { font-size: 18px; flex-shrink: 0; }
  .banner-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
  .banner-text { font-size: 13px; line-height: 1.5; }
  .banner.info { background: ${T.primaryLight}; }
  .banner.info .banner-title { color: ${T.primary}; }
  .banner.info .banner-text { color: ${T.textSecondary}; }
  .banner.success { background: ${T.successLight}; }
  .banner.success .banner-title { color: ${T.success}; }
  .banner.warn { background: ${T.warningLight}; }
  .banner.warn .banner-title { color: #a07000; }
  .banner.error { background: ${T.errorLight}; }
  .banner.error .banner-title { color: ${T.error}; }

  /* TABLE */
  .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
  .tbl th { padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: ${T.textPlaceholder}; border-bottom: 1px solid ${T.border}; }
  .tbl td { padding: 10px 12px; border-bottom: 1px solid ${T.border}; color: ${T.textSecondary}; vertical-align: middle; }
  .tbl td:first-child { color: ${T.textPrimary}; font-weight: 500; }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: ${T.bg}; }

  /* PROG */
  .prog { height: 5px; background: ${T.bg}; border-radius: 3px; overflow: hidden; border: 1px solid ${T.border}; }
  .prog-fill { height: 100%; border-radius: 3px; }

  /* UMUX */
  .umux-val { font-size: 44px; font-weight: 600; line-height: 1; margin: 10px 0 8px; }
  .umux-bar { height: 6px; background: ${T.bg}; border-radius: 3px; position: relative; margin-bottom: 6px; overflow: visible; border: 1px solid ${T.border}; }
  .umux-threshold { position: absolute; left: 70%; top: -5px; bottom: -5px; width: 2px; background: ${T.warning}; border-radius: 1px; }
  .umux-labels { display: flex; justify-content: space-between; font-size: 11px; color: ${T.textPlaceholder}; }

  /* QUAL */
  .qual-row { padding: 9px 16px; border-bottom: 1px solid ${T.border}; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 13px; }
  .qual-row:last-child { border-bottom: none; }
  .qual-n { font-size: 11px; color: ${T.textPlaceholder}; flex-shrink: 0; }

  /* SETTINGS */
  .settings-wrap { display: grid; grid-template-columns: 200px 1fr; min-height: calc(100vh - 56px); }
  .settings-side { background: ${T.surface}; border-right: 1px solid ${T.border}; padding: 16px 8px; position: sticky; top: 56px; height: calc(100vh - 56px); overflow-y: auto; }
  .side-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: ${T.textPlaceholder}; padding: 0 8px; margin: 14px 0 4px; }
  .side-label:first-child { margin-top: 0; }
  .side-item { padding: 8px 10px; border-radius: ${T.radiusSm}; cursor: pointer; font-size: 13px; color: ${T.textSecondary}; transition: all 0.1s; margin-bottom: 1px; display: flex; align-items: center; gap: 8px; }
  .side-item:hover { background: ${T.bg}; color: ${T.textPrimary}; }
  .side-item.active { background: ${T.primaryLight}; color: ${T.primary}; font-weight: 500; }
  .side-dot { width: 6px; height: 6px; border-radius: 50%; margin-left: auto; flex-shrink: 0; }
  .side-dot.ok { background: ${T.success}; }
  .side-dot.warn { background: ${T.warning}; }
  .side-dot.none { background: ${T.bg}; border: 1px solid ${T.borderStrong}; }
  .settings-main { padding: 28px 32px; max-width: 660px; }
  .src-icon { font-size: 28px; margin-bottom: 10px; }
  .src-title { font-size: 20px; font-weight: 600; color: ${T.textPrimary}; margin-bottom: 4px; }
  .src-desc { font-size: 14px; color: ${T.textSecondary}; line-height: 1.6; margin-bottom: 24px; }

  /* HOW TO */
  .how-to { background: ${T.bg}; border: 1px solid ${T.border}; border-radius: ${T.radiusSm}; padding: 14px 16px; margin-bottom: 18px; }
  .how-to-lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${T.textPlaceholder}; margin-bottom: 10px; }
  .how-step { display: flex; gap: 10px; font-size: 13px; color: ${T.textSecondary}; line-height: 1.5; margin-bottom: 7px; align-items: flex-start; }
  .how-step:last-child { margin-bottom: 0; }
  .step-n { width: 18px; height: 18px; border-radius: 50%; background: ${T.surface}; border: 1px solid ${T.border}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; color: ${T.textPlaceholder}; flex-shrink: 0; margin-top: 1px; }
  code { background: ${T.bg}; border: 1px solid ${T.border}; padding: 1px 5px; border-radius: 5px; font-family: 'DM Mono',monospace; font-size: 11px; color: ${T.primary}; }

  /* FILE UPLOAD */
  .upload-zone {
    border: 2px dashed ${T.borderStrong}; border-radius: ${T.radius};
    padding: 28px; text-align: center; cursor: pointer;
    transition: all 0.15s; background: ${T.bg}; margin-bottom: 12px;
  }
  .upload-zone:hover, .upload-zone.drag { border-color: ${T.primary}; background: ${T.primaryLight}; }
  .upload-icon { font-size: 28px; margin-bottom: 8px; }
  .upload-title { font-size: 14px; font-weight: 500; color: ${T.textPrimary}; margin-bottom: 4px; }
  .upload-sub { font-size: 12px; color: ${T.textPlaceholder}; }
  .upload-success { background: ${T.successLight}; border: 1px solid ${T.success}33; border-radius: ${T.radiusSm}; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${T.success}; margin-bottom: 12px; }

  /* INPUT */
  .field { margin-bottom: 18px; }
  .field-label { font-size: 13px; font-weight: 500; color: ${T.textSecondary}; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .field-hint { font-size: 11px; color: ${T.textPlaceholder}; }
  .bl-input { width: 100%; background: ${T.bg}; border: none; border-bottom: 1px solid ${T.borderStrong}; padding: 6px 2px; font-size: 14px; color: ${T.textPrimary}; outline: none; transition: border-color 0.15s; resize: vertical; }
  .bl-input:focus { border-bottom-color: ${T.primary}; }
  .bl-input.ok { border-bottom-color: ${T.success}; }
  .bl-input.err { border-bottom-color: ${T.error}; }
  .bl-input::placeholder { color: ${T.textPlaceholder}; }

  /* BUTTONS */
  .btn { height: 40px; padding: 0 18px; border-radius: 9999px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
  .btn-primary { background: ${T.primary}; color: #fff; }
  .btn-primary:hover { background: #006370; }
  .btn-outlined { background: transparent; border: 1px solid ${T.primary}; color: ${T.primary}; }
  .btn-outlined:hover { background: ${T.primaryLight}; }
  .btn-ghost { background: transparent; border: 1px solid ${T.border}; color: ${T.textSecondary}; }
  .btn-ghost:hover { background: ${T.bg}; color: ${T.textPrimary}; }
  .btn-sm { height: 32px; font-size: 12px; padding: 0 14px; }
  .btn:disabled { opacity: 0.4; pointer-events: none; }
  .action-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
  .test-ok { font-size: 12px; color: ${T.success}; }
  .test-err { font-size: 12px; color: ${T.error}; }

  /* NUM INPUT */
  .num-input { width: 88px; background: ${T.bg}; border: 1px solid ${T.border}; border-radius: ${T.radiusSm}; padding: 6px 10px; font-size: 13px; color: ${T.textPrimary}; outline: none; text-align: right; }
  .num-input:focus { border-color: ${T.primary}; box-shadow: 0 0 0 3px ${T.primaryDim}; }

  /* MODAL */
  .overlay { position: fixed; inset: 0; background: rgba(15,18,18,0.5); display: flex; align-items: center; justify-content: center; z-index: 500; padding: 16px; backdrop-filter: blur(2px); }
  .modal { background: ${T.surface}; border-radius: ${T.radius}; box-shadow: ${T.shadowLg}; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; padding: 24px; border: 1px solid ${T.border}; }
  .modal-title { font-size: 18px; font-weight: 600; color: ${T.textPrimary}; margin-bottom: 2px; }
  .modal-sub { font-size: 13px; color: ${T.textSecondary}; margin-bottom: 22px; }
  .modal-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid ${T.border}; gap: 12px; }
  .modal-row:last-of-type { border-bottom: none; }
  .modal-row-label { font-size: 13px; font-weight: 500; color: ${T.textPrimary}; }
  .modal-row-hint { font-size: 11px; color: ${T.textPlaceholder}; }

  /* OV GRID */
  .ov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ov-item { background: ${T.bg}; border: 1px solid ${T.border}; border-radius: ${T.radiusSm}; padding: 12px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.1s; }
  .ov-item:hover { background: ${T.primaryLight}; border-color: ${T.primary}33; }

  /* SPIN */
  .spin { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* FORMAT */
  .fmt-box { border: 1px solid ${T.border}; border-radius: ${T.radiusSm}; margin-bottom: 14px; overflow: hidden; }
  .fmt-trigger { padding: 9px 14px; display: flex; justify-content: space-between; cursor: pointer; font-size: 12px; font-weight: 500; color: ${T.textSecondary}; background: ${T.bg}; }
  .fmt-trigger:hover { color: ${T.textPrimary}; }
  .fmt-body { padding: 12px 14px; border-top: 1px solid ${T.border}; font-family: 'DM Mono',monospace; font-size: 10px; color: ${T.textPlaceholder}; background: ${T.bg}; line-height: 1.8; }

  /* DIVIDER */
  .div { border: none; border-top: 1px solid ${T.border}; margin: 20px 0; }
  `
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const QUARTERS = ["Q1 '24","Q2 '24","Q3 '24","Q4 '24","Q1 '25","Q2 '25"]
const SEED = {
  "Q1 '24":{ csat:3.4,efficiency:3.1,discoverability:2.9,confidence:3.3,handoff:3.0,zhUmux:58,sbUmux:54,figmaInserts:1820,detaches:310,codeWeb:940,codeIOS:720,codeAndroid:650,customWeb:24,customIOS:18,customAndroid:21,docCoverage:61,zhTraffic:4200,sbTraffic:2800 },
  "Q2 '24":{ csat:3.6,efficiency:3.4,discoverability:3.1,confidence:3.5,handoff:3.2,zhUmux:62,sbUmux:59,figmaInserts:2140,detaches:290,codeWeb:1180,codeIOS:890,codeAndroid:810,customWeb:22,customIOS:16,customAndroid:19,docCoverage:66,zhTraffic:4900,sbTraffic:3400 },
  "Q3 '24":{ csat:3.8,efficiency:3.7,discoverability:3.4,confidence:3.8,handoff:3.5,zhUmux:67,sbUmux:64,figmaInserts:2680,detaches:255,codeWeb:1490,codeIOS:1120,codeAndroid:1040,customWeb:19,customIOS:14,customAndroid:17,docCoverage:72,zhTraffic:5600,sbTraffic:4100 },
  "Q4 '24":{ csat:4.0,efficiency:3.9,discoverability:3.6,confidence:4.0,handoff:3.7,zhUmux:71,sbUmux:68,figmaInserts:3210,detaches:230,codeWeb:1820,codeIOS:1380,codeAndroid:1290,customWeb:17,customIOS:12,customAndroid:15,docCoverage:76,zhTraffic:6300,sbTraffic:4800 },
  "Q1 '25":{ csat:4.2,efficiency:4.1,discoverability:3.8,confidence:4.2,handoff:3.9,zhUmux:74,sbUmux:72,figmaInserts:3740,detaches:198,codeWeb:2210,codeIOS:1650,codeAndroid:1540,customWeb:14,customIOS:10,customAndroid:12,docCoverage:80,zhTraffic:7100,sbTraffic:5600 },
}
const DOC_STATUS = [
  { name:"Documented", value:80, color:"#28865A" },
  { name:"In Progress", value:10, color:"#F9BB42" },
  { name:"Outdated",    value:5,  color:"#D04555" },
  { name:"Not Documented", value:4, color:"#9CA3A5" },
  { name:"Blocked",    value:1,  color:"#D04555" },
]
const QUAL = {
  positive:[ { text:"Consistent tokens across platforms",n:12 },{ text:"Button & form components are reliable",n:18 },{ text:"Changelog keeps us informed",n:9 },{ text:"Icon library is comprehensive",n:14 } ],
  negative:[ { text:"Hard to find the right component",n:21 },{ text:"Android docs lag behind Web",n:17 },{ text:"Missing complex table patterns",n:14 },{ text:"Storybook examples feel basic",n:11 } ],
}
const FIELDS = [
  { key:"csat",label:"CSAT",hint:"/ 5",step:0.1,max:5 },
  { key:"efficiency",label:"Perceived Efficiency",hint:"/ 5",step:0.1,max:5 },
  { key:"discoverability",label:"Discoverability",hint:"/ 5",step:0.1,max:5 },
  { key:"confidence",label:"User Confidence",hint:"/ 5",step:0.1,max:5 },
  { key:"handoff",label:"Handoff Time",hint:"/ 5",step:0.1,max:5 },
  { key:"zhUmux",label:"ZH UMUX",hint:"/ 100",step:1,max:100 },
  { key:"sbUmux",label:"SB UMUX",hint:"/ 100",step:1,max:100 },
  { key:"figmaInserts",label:"Figma Inserts (90d)",hint:"count",step:1 },
  { key:"detaches",label:"Figma Detaches (90d)",hint:"count",step:1 },
  { key:"codeWeb",label:"Code Inserts — Web",hint:"count",step:1 },
  { key:"codeIOS",label:"Code Inserts — iOS",hint:"count",step:1 },
  { key:"codeAndroid",label:"Code Inserts — Android",hint:"count",step:1 },
  { key:"customWeb",label:"Custom Components — Web",hint:"count",step:1 },
  { key:"customIOS",label:"Custom Components — iOS",hint:"count",step:1 },
  { key:"customAndroid",label:"Custom Components — Android",hint:"count",step:1 },
  { key:"docCoverage",label:"Doc Coverage",hint:"%",step:1,max:100 },
  { key:"zhTraffic",label:"ZH Traffic (sessions)",hint:"count",step:1 },
  { key:"sbTraffic",label:"SB Traffic (sessions)",hint:"count",step:1 },
]

// ── HELPERS ────────────────────────────────────────────────────────────────────
const fmt = (v,d=1) => v!=null ? Number(v).toFixed(d) : "—"
const fmtN = v => v!=null ? Number(v).toLocaleString() : "—"
const parseCSV = txt => {
  const lines = txt.trim().split("\n").filter(Boolean)
  if(lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""))
  return lines.slice(1).map(line => {
    const vals = []
    let cur = "", inQ = false
    for(let c of line) { if(c==='"') inQ=!inQ; else if(c==="," && !inQ) { vals.push(cur.trim()); cur="" } else cur+=c }
    vals.push(cur.trim())
    return Object.fromEntries(headers.map((h,i) => [h, (vals[i]||"").replace(/^"|"$/g,"").trim()]))
  })
}

// ── DROPDOWN ──────────────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onChange, disabledOptions = [], placeholder = "Select…" }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const fn = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])
  return (
    <div className="dropdown-wrap" ref={ref}>
      <div className={`dropdown-trigger ${open?"open":""}`} onClick={() => setOpen(o=>!o)}>
        {label && <span className="dropdown-label">{label}</span>}
        <span style={{ color: value ? undefined : "#9CA3A5" }}>{value || placeholder}</span>
        <span className={`dropdown-arrow ${open?"open":""}`}>▾</span>
      </div>
      {open && (
        <div className="dropdown-menu">
          {options.map(o => (
            <div key={o}
              className={`dropdown-item ${value===o?"selected":""} ${disabledOptions.includes(o)?"disabled":""}`}
              onClick={() => { onChange(o); setOpen(false) }}>
              {o}
              {value===o && <span className="dropdown-check">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TOOLTIP ────────────────────────────────────────────────────────────────────
function BloomTip({ active, payload, label, theme: T }) {
  if(!active || !payload?.length) return null
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"10px 14px", fontSize:12, boxShadow:T.shadowMd }}>
      <div style={{ fontWeight:600, color:T.textSecondary, marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:2 }}>
          <div style={{ width:7, height:7, borderRadius:2, background:p.color }} />
          <span style={{ color:T.textSecondary }}>{p.name}:</span>
          <span style={{ fontWeight:600, color:T.textPrimary }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── TREND ──────────────────────────────────────────────────────────────────────
function Trend({ curr, prev, invert }) {
  if(curr==null || prev==null) return null
  const d = curr - prev
  const pct = prev !== 0 ? ((d/prev)*100).toFixed(0) : 0
  const up = d > 0
  const good = invert ? !up : up
  const cls = good ? "up" : d===0 ? "flat" : "down"
  const label = `${up?"↑":"↓"} ${Math.abs(pct)}% quarter-over-quarter`
  return <span className={`trend ${cls}`} title={label}>{up?"↑":"↓"} {Math.abs(pct)}% QoQ</span>
}

// ── TARGET BADGE ──────────────────────────────────────────────────────────────
function TargetBadge({ v, target, invert }) {
  if(v==null) return null
  const ok = invert ? v<=target : v>=target
  const label = ok ? `On target (target: ${invert?"≤":"≥"}${target})` : `Below target (target: ${invert?"≤":"≥"}${target})`
  return <span className={`badge ${ok?"success":"error"}`} title={label}>{ok?"✓ On target":"Below target"}</span>
}

// ── DATA MODAL ────────────────────────────────────────────────────────────────
function DataModal({ quarter, existing, onSave, onClose, T }) {
  const [vals, setVals] = useState({ ...existing })
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div className="modal-title">Edit data — {quarter}</div>
            <div className="modal-sub">Update metrics for this quarter. Empty fields keep their existing values.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flexShrink:0 }}>✕ Close</button>
        </div>
        {FIELDS.map(f => (
          <div className="modal-row" key={f.key}>
            <div>
              <div className="modal-row-label">{f.label}</div>
              <div className="modal-row-hint">{f.hint}</div>
            </div>
            <input type="number" className="num-input"
              value={vals[f.key] ?? ""}
              step={f.step} min={0} max={f.max}
              onChange={e => setVals(v => ({ ...v, [f.key]: e.target.value===""?undefined:parseFloat(e.target.value) }))}
            />
          </div>
        ))}
        <div className="action-row" style={{ marginTop:20 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { onSave(vals); onClose() }}>Save changes</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── CSV UPLOAD ────────────────────────────────────────────────────────────────
function CSVUpload({ onParsed, label, hint, T }) {
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const ref = useRef()

  const handle = (f) => {
    if(!f || !f.name.endsWith(".csv")) { setError("Please upload a .csv file"); return }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const rows = parseCSV(e.target.result)
        if(rows.length === 0) throw new Error("No data rows found in CSV")
        setFile(f.name)
        setError(null)
        onParsed(rows, e.target.result)
      } catch(err) { setError(err.message) }
    }
    reader.readAsText(f)
  }

  return (
    <div>
      <input ref={ref} type="file" accept=".csv" style={{ display:"none" }}
        onChange={e => handle(e.target.files[0])} />
      {file ? (
        <div className="upload-success">
          <span>✓</span>
          <span><strong>{file}</strong> uploaded successfully</span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft:"auto" }} onClick={() => setFile(null)}>Replace</button>
        </div>
      ) : (
        <div className={`upload-zone ${drag?"drag":""}`}
          onClick={() => ref.current.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]) }}>
          <div className="upload-icon">📂</div>
          <div className="upload-title">{label || "Drop your CSV here, or click to browse"}</div>
          <div className="upload-sub">{hint || "Exported directly from GetDX or Google Sheets"}</div>
        </div>
      )}
      {error && <div style={{ fontSize:12, color:"#D04555", marginTop:6 }}>✗ {error}</div>}
    </div>
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ allData, selQ, compQ, onEditQ, T }) {
  const [tab, setTab] = useState("Overview")
  const chartData = QUARTERS.filter(q => allData[q]).map(q => ({ q, ...allData[q] }))
  const curr = allData[selQ] || {}
  const comp = compQ ? (allData[compQ] || {}) : (allData[QUARTERS[QUARTERS.indexOf(selQ)-1]] || {})
  const tip = useCallback(props => <BloomTip {...props} theme={T} />, [T])
  const detachRate = curr.figmaInserts ? Math.round((curr.detaches/curr.figmaInserts)*100) : null

  return (
    <div className="page">
      {compQ && (
        <div className="compare-bar">
          <span>↔</span>
          <strong>{selQ}</strong> compared to <strong>{compQ}</strong>
          <span style={{ fontSize:12, opacity:0.7 }}>· All trend indicators reflect this comparison</span>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:600, color:T.textPrimary }}>Design System Metrics</div>
          <div style={{ fontSize:13, color:T.textSecondary, marginTop:3 }}>
            {selQ} {compQ ? `vs ${compQ}` : ""}
          </div>
        </div>
        <button className="btn btn-outlined btn-sm" onClick={() => onEditQ(selQ)}>✏ Edit {selQ} data</button>
      </div>

      <div className="dash-tabs">
        {["Overview","Adoption","Satisfaction","Documentation"].map(t => (
          <button key={t} className={`dash-tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab==="Overview" && (
        <>
          <div className="g4">
            {[
              { label:"CSAT", val:`${fmt(curr.csat)}/5`, r:curr.csat, p:comp.csat, target:4.0 },
              { label:"ZH UMUX", val:`${fmt(curr.zhUmux,0)}/100`, r:curr.zhUmux, p:comp.zhUmux, target:70 },
              { label:"SB UMUX", val:`${fmt(curr.sbUmux,0)}/100`, r:curr.sbUmux, p:comp.sbUmux, target:70 },
              { label:"Doc Coverage", val:`${fmt(curr.docCoverage,0)}%`, r:curr.docCoverage, p:comp.docCoverage, target:80 },
            ].map(({ label, val, r, p, target }) => (
              <div className="card stat-card" key={label}>
                <div className="stat-label">{label}</div>
                <div className="stat-val">{val}</div>
                <div className="stat-foot">
                  <Trend curr={r} prev={p} />
                  <TargetBadge v={r} target={target} />
                </div>
              </div>
            ))}
          </div>
          <div className="g2">
            <div className="card card-pad">
              <div className="chart-title">Survey Scores — all dimensions</div>
              <div className="chart-sub">5-point scale · trend across all quarters</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
                  <XAxis dataKey="q" tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                  <YAxis domain={[2.5,5]} tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                  <Tooltip content={tip} />
                  <Line type="monotone" dataKey="csat" name="CSAT" stroke={T.primary} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke={T.success} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="discoverability" name="Discoverability" stroke={T.warning} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="confidence" name="Confidence" stroke="#9B59B6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="handoff" name="Handoff" stroke="#3498DB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card card-pad">
              <div className="chart-title">UMUX Scores</div>
              <div className="chart-sub">0–100 · 70+ = acceptable · dashed = threshold</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gzh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.primary} stopOpacity={0.15}/><stop offset="95%" stopColor={T.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gsb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.success} stopOpacity={0.15}/><stop offset="95%" stopColor={T.success} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
                  <XAxis dataKey="q" tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40,100]} tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                  <Tooltip content={tip} />
                  <Area type="monotone" dataKey="zhUmux" name="Zeroheight" stroke={T.primary} fill="url(#gzh)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="sbUmux" name="Storybook" stroke={T.success} fill="url(#gsb)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="g2">
            <div className="card">
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, color:T.success, fontWeight:600, fontSize:13 }}>✓ Working well — {selQ}</div>
              {QUAL.positive.map((t,i) => <div className="qual-row" key={i}><span style={{ color:T.textSecondary }}>{t.text}</span><span className="qual-n">{t.n} mentions</span></div>)}
            </div>
            <div className="card">
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, color:"#a07000", fontWeight:600, fontSize:13 }}>⚠ Needs attention — {selQ}</div>
              {QUAL.negative.map((t,i) => <div className="qual-row" key={i}><span style={{ color:T.textSecondary }}>{t.text}</span><span className="qual-n">{t.n} mentions</span></div>)}
            </div>
          </div>
        </>
      )}

      {tab==="Adoption" && (
        <>
          <div className="g4">
            {[
              { label:"Figma Inserts (90d)", val:fmtN(curr.figmaInserts), r:curr.figmaInserts, p:comp.figmaInserts },
              { label:"Detach Rate", val:detachRate!=null?`${detachRate}%`:"—", r:detachRate, p:comp.figmaInserts?Math.round((comp.detaches/comp.figmaInserts)*100):null, invert:true },
              { label:"Web Code Inserts", val:fmtN(curr.codeWeb), r:curr.codeWeb, p:comp.codeWeb },
              { label:"iOS Code Inserts", val:fmtN(curr.codeIOS), r:curr.codeIOS, p:comp.codeIOS },
            ].map(({ label,val,r,p,invert }) => (
              <div className="card stat-card" key={label}>
                <div className="stat-label">{label}</div>
                <div className="stat-val">{val}</div>
                <div className="stat-foot"><Trend curr={r} prev={p} invert={invert} /></div>
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ marginBottom:14 }}>
            <div className="chart-title">Code Inserts by Platform</div>
            <div className="chart-sub">Production component usage</div>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData}>
                <defs>
                  {[["web",T.primary],["ios",T.success],["android","#3498DB"]].map(([k,c]) => (
                    <linearGradient key={k} id={`ga${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.15}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
                <XAxis dataKey="q" tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                <Tooltip content={tip} />
                <Area type="monotone" dataKey="codeWeb" name="Web" stroke={T.primary} fill="url(#gaweb)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="codeIOS" name="iOS" stroke={T.success} fill="url(#gaios)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="codeAndroid" name="Android" stroke="#3498DB" fill="url(#gaandroid)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card card-pad">
            <div className="chart-title">Custom Components by Product Teams</div>
            <div className="chart-sub">Decreasing = DS coverage is improving</div>
            <ResponsiveContainer width="100%" height={170}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.chartGrid} vertical={false} />
                <XAxis dataKey="q" tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:10, fill:T.textPlaceholder }} axisLine={false} tickLine={false} />
                <Tooltip content={tip} />
                <Line type="monotone" dataKey="customWeb" name="Web" stroke={T.primary} strokeWidth={2} dot={{ r:3, fill:T.primary }} />
                <Line type="monotone" dataKey="customIOS" name="iOS" stroke={T.success} strokeWidth={2} dot={{ r:3, fill:T.success }} />
                <Line type="monotone" dataKey="customAndroid" name="Android" stroke="#3498DB" strokeWidth={2} dot={{ r:3, fill:"#3498DB" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab==="Satisfaction" && (
        <>
          <div className="g3" style={{ marginBottom:14 }}>
            {[
              { k:"csat",label:"CSAT",target:4.0 },
              { k:"efficiency",label:"Efficiency",target:4.0 },
              { k:"discoverability",label:"Discoverability",target:3.8 },
              { k:"confidence",label:"Confidence",target:4.0 },
              { k:"handoff",label:"Handoff Time",target:3.8 },
            ].map(({ k,label,target }) => {
              const v = curr[k], ok = v!=null && v>=target
              return (
                <div className="card stat-card" key={k} style={{ textAlign:"center" }}>
                  <div className="stat-label">{label}</div>
                  <div className="stat-val" style={{ fontSize:32, color: v==null?T.textPlaceholder:ok?T.primary:T.error }}>{v!=null?fmt(v):"—"}</div>
                  <div style={{ fontSize:11, color:T.textPlaceholder, marginBottom:6 }}>/ 5.0 · target ≥{target}</div>
                  {v!=null && <TargetBadge v={v} target={target} />}
                </div>
              )
            })}
          </div>
          <div className="g2">
            {["zhUmux","sbUmux"].map(k => {
              const v = curr[k], ok = v!=null && v>=70, label = k==="zhUmux"?"Zeroheight":"Storybook"
              return (
                <div className="card card-pad" key={k}>
                  <div className="chart-title">{label} · UMUX</div>
                  <div className="umux-val" style={{ color: v==null?T.textPlaceholder:ok?T.primary:T.warning }}>{v!=null?Math.round(v):"—"}</div>
                  {v!=null && <>
                    <div className="umux-bar">
                      <div style={{ width:`${v}%`, height:"100%", background:ok?T.primary:T.warning, borderRadius:3 }} />
                      <div className="umux-threshold" />
                    </div>
                    <div className="umux-labels"><span>0 · Poor</span><span style={{ color:T.warning }}>70 · Acceptable</span><span>100 · Excellent</span></div>
                  </>}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab==="Documentation" && (
        <>
          <div className="g21">
            <div className="card card-pad">
              <div className="chart-title">Coverage by Platform</div>
              <div className="chart-sub">Target: ≥ 80% documented</div>
              {[
                { p:"Web", pct:curr.docCoverage ? Math.min(curr.docCoverage-2,100) : null },
                { p:"iOS", pct:curr.docCoverage ? Math.min(curr.docCoverage-15,100) : null },
                { p:"Android", pct:curr.docCoverage ? Math.min(curr.docCoverage-18,100) : null },
                { p:"General / Tokens", pct:curr.docCoverage ? Math.min(curr.docCoverage+5,100) : null },
              ].map(({ p, pct }) => (
                <div key={p} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5 }}>
                    <span style={{ color:T.textSecondary, fontWeight:500 }}>{p}</span>
                    <span style={{ fontWeight:600, fontSize:12, color:pct!=null?(pct>=80?T.success:T.warning):T.textPlaceholder }}>{pct!=null?`${Math.round(pct)}%`:"—"}</span>
                  </div>
                  {pct!=null && <div className="prog"><div className="prog-fill" style={{ width:`${pct}%`, background:pct>=80?T.success:pct>=70?T.warning:T.error }} /></div>}
                </div>
              ))}
              <hr className="div" />
              <div style={{ display:"flex", gap:24, marginTop:4 }}>
                {[{ label:"ZH Sessions", val:curr.zhTraffic, prev:comp.zhTraffic },{ label:"SB Sessions", val:curr.sbTraffic, prev:comp.sbTraffic }].map(({ label,val,prev:pv }) => (
                  <div key={label}>
                    <div style={{ fontSize:11, color:T.textPlaceholder, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>{label}</div>
                    <div style={{ fontSize:20, fontWeight:600, color:T.textPrimary }}>{fmtN(val)||"—"}</div>
                    <Trend curr={val} prev={pv} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card card-pad">
              <div className="chart-title">Status breakdown</div>
              <div className="chart-sub">{selQ}</div>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={DOC_STATUS} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {DOC_STATUS.map((e,i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v=>`${v}%`} contentStyle={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
              {DOC_STATUS.map(s => (
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:7, height:7, borderRadius:2, background:s.color }} />
                    <span style={{ color:T.textSecondary }}>{s.name}</span>
                  </div>
                  <span style={{ fontWeight:500, color:T.textPrimary }}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── SOURCES ────────────────────────────────────────────────────────────────────
const SOURCES = [
  { id:"survey", label:"Quarterly Survey (GetDX)", icon:"📋", type:"upload",
    desc:"Upload your CSV export from GetDX directly. No link needed — just drag and drop the file.",
    steps:[{ t:"In GetDX, go to your quarterly survey results" },{ t:"Click Export → Download as CSV" },{ t:"Drag and drop the file below, or click to browse" }],
    format:"Quarter, CSAT, Efficiency, Discoverability, Confidence, Handoff\nQ1 2025, 4.2, 4.1, 3.8, 4.2, 3.9", key:"surveyCsv" },
  { id:"docstatus", label:"Documentation Status", icon:"📄", type:"sheets",
    desc:"Publish your doc status Google Sheet as CSV and paste the URL.",
    steps:[{ t:"Open your doc status Google Sheet" },{ t:<>Go to <code>File → Share → Publish to web</code></> },{ t:"Choose the tab, set to CSV, copy the URL" }],
    format:"PageName, Platform, Status, Quarter\nButton, Web, Documented, Q1 2025", key:"docStatusUrl", placeholder:"https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" },
  { id:"figma", label:"Figma Analytics", icon:"🎨", type:"upload",
    desc:"Export component analytics from Figma (Enterprise only) and upload the CSV file.",
    steps:[{ t:"In Figma, open your Design System project" },{ t:<>Go to <code>Analytics → Export as CSV</code></> },{ t:"Upload the downloaded file below" }],
    format:"component_name, total_instances, inserts_90d, detaches_90d\nButton, 8420, 1200, 36", key:"figmaCsv" },
  { id:"ga", label:"Google Analytics", icon:"📈", type:"info",
    desc:"GA4 requires a backend proxy to keep credentials safe. Follow the setup guide below.",
    steps:[{ t:<>Create a free <strong>Vercel</strong> account</> },{ t:"Deploy the DS proxy function (link in setup guide)" },{ t:"Add GA4_PROPERTY_ID and service account key as env vars" },{ t:"Paste your Vercel URL below — dashboard will call it automatically" }],
    format:"", key:"gaProxyUrl", placeholder:"https://your-proxy.vercel.app/api/ga" },
  { id:"hotjar", label:"UMUX (Hotjar)", icon:"📊", type:"upload",
    desc:"Export your UMUX survey responses from Hotjar and upload the CSV.",
    steps:[{ t:"In Hotjar, go to Surveys" },{ t:"Open your UMUX survey" },{ t:<>Click <code>Download responses → CSV</code></> },{ t:"Upload the file below" }],
    format:"source, q1_meets_needs, q2_frustrating, q3_easy_to_use, q4_too_much_time\nZeroheight, 6, 2, 5, 2", key:"umuxCsv" },
]

function Settings({ config, setConfig, connStatus, setConnStatus, onSaved, T }) {
  const [active, setActive] = useState("overview")
  const [testing, setTesting] = useState({})
  const [testResult, setTestResult] = useState({})
  const [showFmt, setShowFmt] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { await window.storage.set("ds:config", JSON.stringify(config), false) } catch {}
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  const handleTest = async (source) => {
    const url = config[source.key]
    if(!url?.trim()) return
    setTesting(t => ({ ...t, [source.key]:true }))
    try {
      const res = await fetch(url.trim(), { mode:"cors" })
      if(!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const lines = text.trim().split("\n").filter(Boolean)
      if(lines.length < 2) throw new Error("No data rows found")
      setTestResult(r => ({ ...r, [source.key]:{ ok:true, msg:`✓ ${lines.length-1} rows` } }))
      setConnStatus(s => ({ ...s, [source.key]:"ok" }))
    } catch(e) {
      setTestResult(r => ({ ...r, [source.key]:{ ok:false, msg:`✗ ${e.message}` } }))
      setConnStatus(s => ({ ...s, [source.key]:"err" }))
    }
    setTesting(t => ({ ...t, [source.key]:false }))
  }

  const getStatus = key => {
    if(connStatus[key]==="ok") return "ok"
    if(config[key]?.trim()) return "warn"
    return "none"
  }

  const activeDef = SOURCES.find(s => s.id===active)

  return (
    <div className="settings-wrap">
      <div className="settings-side">
        <div className="side-label">Overview</div>
        <div className={`side-item ${active==="overview"?"active":""}`} onClick={() => setActive("overview")}>🏠 All sources</div>
        <div className="side-label">Sources</div>
        {SOURCES.map(s => (
          <div key={s.id} className={`side-item ${active===s.id?"active":""}`} onClick={() => setActive(s.id)}>
            <span>{s.icon}</span><span style={{ flex:1 }}>{s.label}</span>
            <div className={`side-dot ${getStatus(s.key)}`} />
          </div>
        ))}
        <hr className="div" />
        <button className="btn btn-primary btn-sm" style={{ width:"100%" }} onClick={handleSave} disabled={saving}>
          {saving?"Saving…":saved?"✓ Saved!":"Save settings"}
        </button>
      </div>

      <div className="settings-main">
        {active==="overview" && (
          <>
            <div className="src-title">Data Sources</div>
            <div className="src-desc">Connect your metrics sources here. You can mix CSV uploads, sheet URLs, and manual entry — whatever works for each source.</div>
            <div className="banner info">
              <div className="banner-icon">💡</div>
              <div>
                <div className="banner-title">Three ways to get data in</div>
                <div className="banner-text">
                  <strong>CSV upload</strong> — drag &amp; drop directly from GetDX, Figma, or Hotjar.<br/>
                  <strong>Google Sheets URL</strong> — publish your sheet as CSV, paste the link. Auto-refreshes.<br/>
                  <strong>Manual entry</strong> — click "Edit quarter data" on the dashboard to type numbers directly.
                </div>
              </div>
            </div>
            <div className="ov-grid">
              {SOURCES.map(s => (
                <div key={s.id} className="ov-item" onClick={() => setActive(s.id)}>
                  <div style={{ width:10, height:10, borderRadius:"50%", flexShrink:0, background:getStatus(s.key)==="ok"?T.success:getStatus(s.key)==="warn"?T.warning:T.border, border:getStatus(s.key)==="none"?`1px solid ${T.borderStrong}`:"none" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, fontSize:13, color:T.textPrimary }}>{s.icon} {s.label}</div>
                    <div style={{ fontSize:11, color:T.textPlaceholder }}>{getStatus(s.key)==="ok"?"Connected":getStatus(s.key)==="warn"?"Configured — not tested":"Not configured"}</div>
                  </div>
                  <span style={{ color:T.textPlaceholder }}>›</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:32 }}>
              <div style={{ fontSize:15, fontWeight:600, color:T.textPrimary, marginBottom:8 }}>Security & Access</div>
              <div className="banner warn">
                <div className="banner-icon">🔒</div>
                <div>
                  <div className="banner-title">Deploying this dashboard for your team</div>
                  <div className="banner-text">
                    When you deploy to <strong>Vercel</strong>, enable <strong>Vercel Authentication</strong> from your project settings (no code needed). Whitelist your teammates' email addresses. Only they can access the dashboard. Your data lives in <strong>Supabase</strong> (free tier) — encrypted at rest, never public.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeDef && (
          <>
            <div className="src-icon">{activeDef.icon}</div>
            <div className="src-title">{activeDef.label}</div>
            <div className="src-desc">{activeDef.desc}</div>
            <div className="how-to">
              <div className="how-to-lbl">How to get your data</div>
              {activeDef.steps.map((step,i) => (
                <div className="how-step" key={i}><div className="step-n">{i+1}</div><div>{step.t}</div></div>
              ))}
            </div>

            {activeDef.type==="upload" && (
              <>
                {activeDef.format && (
                  <div className="fmt-box">
                    <div className="fmt-trigger" onClick={() => setShowFmt(f => ({ ...f, [active]:!f[active] }))}>
                      <span>Expected column format</span><span>{showFmt[active]?"↑ hide":"↓ show"}</span>
                    </div>
                    {showFmt[active] && <div className="fmt-body">{activeDef.format}</div>}
                  </div>
                )}
                <CSVUpload
                  label={`Upload ${activeDef.label} CSV`}
                  hint={`Exported from ${activeDef.id==="survey"?"GetDX":activeDef.id==="figma"?"Figma Analytics":"Hotjar"}`}
                  onParsed={(rows, raw) => {
                    setConfig(c => ({ ...c, [activeDef.key]: raw }))
                    setConnStatus(s => ({ ...s, [activeDef.key]:"ok" }))
                  }}
                  T={T}
                />
              </>
            )}

            {activeDef.type==="sheets" && (
              <>
                {activeDef.format && (
                  <div className="fmt-box">
                    <div className="fmt-trigger" onClick={() => setShowFmt(f => ({ ...f, [active]:!f[active] }))}>
                      <span>Expected column format</span><span>{showFmt[active]?"↑ hide":"↓ show"}</span>
                    </div>
                    {showFmt[active] && <div className="fmt-body">{activeDef.format}</div>}
                  </div>
                )}
                <div className="field">
                  <div className="field-label">Published CSV URL</div>
                  <input type="text" className={`bl-input ${testResult[activeDef.key]?.ok===true?"ok":testResult[activeDef.key]?.ok===false?"err":""}`}
                    value={config[activeDef.key]||""}
                    onChange={e => { setConfig(c => ({ ...c, [activeDef.key]:e.target.value })); setTestResult(r => ({ ...r, [activeDef.key]:null })) }}
                    placeholder={activeDef.placeholder}
                  />
                </div>
                <div className="action-row">
                  <button className="btn btn-outlined btn-sm" onClick={() => handleTest(activeDef)} disabled={testing[activeDef.key]||!config[activeDef.key]?.trim()}>
                    {testing[activeDef.key]?"Testing…":"Test connection"}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saved?"✓ Saved!":"Save"}</button>
                  {testResult[activeDef.key] && <div className={testResult[activeDef.key].ok?"test-ok":"test-err"}>{testResult[activeDef.key].msg}</div>}
                </div>
              </>
            )}

            {activeDef.type==="info" && (
              <>
                <div className="field">
                  <div className="field-label">Vercel proxy URL <span className="field-hint">(paste after deploying)</span></div>
                  <input type="text" className="bl-input"
                    value={config[activeDef.key]||""}
                    onChange={e => setConfig(c => ({ ...c, [activeDef.key]:e.target.value }))}
                    placeholder={activeDef.placeholder}
                  />
                </div>
                <div className="action-row">
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saved?"✓ Saved!":"Save"}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── APP ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false)
  const [view, setView] = useState("dashboard")
  const [selQ, setSelQ] = useState("Q1 '25")
  const [compQ, setCompQ] = useState(null)
  const [allData, setAllData] = useState({})
  const [config, setConfig] = useState({})
  const [connStatus, setConnStatus] = useState({})
  const [editingQ, setEditingQ] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const T = dark ? DARK : LIGHT
  injectStyles(T)

  // Load on mount
  useEffect(() => {
    ;(async () => {
      try {
        const savedConfig = await window.storage.get("ds:config")
        if(savedConfig?.value) setConfig(JSON.parse(savedConfig.value))
        const savedData = await window.storage.get("ds:allData")
        setAllData(savedData?.value ? JSON.parse(savedData.value) : SEED)
        if(!savedData?.value) await window.storage.set("ds:allData", JSON.stringify(SEED), false)
      } catch { setAllData(SEED) }
      setLoaded(true)
    })()
  }, [])

  const saveQ = useCallback(async (q, vals) => {
    const updated = { ...allData, [q]: { ...(allData[q]||{}), ...vals } }
    setAllData(updated)
    try { await window.storage.set("ds:allData", JSON.stringify(updated), false) } catch {}
  }, [allData])

  if(!loaded) return (
    <div style={{ fontFamily:"Inter,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:LIGHT.bg, color:LIGHT.textSecondary }}>
      Loading…
    </div>
  )

  const isDemo = JSON.stringify(allData) === JSON.stringify(SEED)

  return (
    <div className="app">
      {/* NAV */}
      <div className="nav">
        <div className="nav-logo">DS</div>
        <div className="nav-title">Design System Metrics</div>

        {/* Quarter selectors — only in dashboard */}
        {view==="dashboard" && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:16 }}>
            <Dropdown
              label="Quarter"
              value={selQ}
              options={QUARTERS.filter(q => allData[q])}
              onChange={q => { setSelQ(q); if(compQ===q) setCompQ(null) }}
            />
            <Dropdown
              label="Compare with"
              value={compQ}
              options={["None", ...QUARTERS.filter(q => allData[q] && q!==selQ)]}
              onChange={q => setCompQ(q==="None"?null:q)}
              placeholder="None"
            />
          </div>
        )}

        <div className="nav-sep" />

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div className="tabs">
            <button className={`tab ${view==="dashboard"?"active":""}`} onClick={() => setView("dashboard")}>Dashboard</button>
            <button className={`tab ${view==="settings"?"active":""}`} onClick={() => setView("settings")}>⚙ Sources</button>
          </div>
          {/* Dark mode toggle */}
          <button
            className="icon-btn"
            onClick={() => setDark(d => !d)}
            title={dark?"Switch to light mode":"Switch to dark mode"}
            style={{ fontSize:14 }}
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>

      {view==="dashboard" && (
        <>
          {isDemo && (
            <div style={{ background:T.primaryLight, borderBottom:`1px solid ${T.primary}22`, padding:"8px 20px", display:"flex", alignItems:"center", gap:10, fontSize:13, color:T.primary }}>
              <span>👁</span>
              <span><strong>Sample data.</strong> Go to Sources to connect your real data, or click "Edit quarter data" to enter numbers manually.</span>
              <button className="btn btn-outlined btn-sm" style={{ marginLeft:"auto" }} onClick={() => setView("settings")}>Configure sources →</button>
            </div>
          )}
          <Dashboard allData={allData} selQ={selQ} compQ={compQ} onEditQ={q => setEditingQ(q)} T={T} />
        </>
      )}

      {view==="settings" && (
        <Settings config={config} setConfig={setConfig} connStatus={connStatus} setConnStatus={setConnStatus} onSaved={() => {}} T={T} />
      )}

      {editingQ && (
        <DataModal quarter={editingQ} existing={allData[editingQ]||{}} onSave={vals => saveQ(editingQ, vals)} onClose={() => setEditingQ(null)} T={T} />
      )}
    </div>
  )
}