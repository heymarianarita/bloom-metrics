import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Sun, Settings, Moon, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X, Check, AlertTriangle, Search, Lock, Upload, ChevronDown, Pencil, Eye, Users, BarChart2, BookOpen, ClipboardList, FileText, TrendingUp, Info } from "lucide-react"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from "recharts"

// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
const LIGHT = {
  primary:"#007782", primaryLight:"rgba(0,119,130,0.08)", primaryMid:"rgba(0,119,130,0.15)", primaryBorder:"rgba(0,119,130,0.25)",
  success:"#28865A", successBg:"#EBFCEF",
  error:"#D04555", errorBg:"#FFF4F4",
  warning:"#F9BB42", warningBg:"#FFF5E5",
  bg:"#F7F8F8", surface:"#FFFFFF", surfaceHover:"#F7F8F8",
  border:"rgba(15,18,18,0.08)", borderMid:"rgba(15,18,18,0.12)", borderStrong:"rgba(15,18,18,0.20)",
  text:"#0F1212", textSec:"#3D4849", textMuted:"#6B7475",
  shadow:"0 1px 3px rgba(15,18,18,0.06),0 0 0 1px rgba(15,18,18,0.06)",
  shadowMd:"0 4px 12px rgba(15,18,18,0.08),0 0 0 1px rgba(15,18,18,0.06)",
  shadowLg:"0 8px 24px rgba(15,18,18,0.12)",
  r:"8px", rLg:"12px", rPill:"9999px",
  chart:"rgba(15,18,18,0.04)"
}
const DARK = {
  ...LIGHT,
  bg:"#0D1010", surface:"#141A1A", surfaceHover:"#1A2020",
  border:"rgba(255,255,255,0.07)", borderMid:"rgba(255,255,255,0.10)", borderStrong:"rgba(255,255,255,0.16)",
  text:"#EDF2F2", textSec:"#B0BCBD", textMuted:"#7E8E8F",
  shadow:"0 1px 3px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.05)",
  shadowMd:"0 4px 12px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06)",
  shadowLg:"0 8px 24px rgba(0,0,0,0.5)",
  primaryLight:"rgba(0,119,130,0.12)", successBg:"rgba(40,134,90,0.12)",
  errorBg:"rgba(208,69,85,0.12)", warningBg:"rgba(249,187,66,0.10)",
  chart:"rgba(255,255,255,0.04)"
}
const getSystemPref = () => typeof window!=="undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light"

// ─── STYLES ───────────────────────────────────────────────────────────────────
function injectStyles(T) {
  let el = document.getElementById("dsm4-styles")
  if (!el) { el=document.createElement("style"); el.id="dsm4-styles"; document.head.appendChild(el) }
  el.textContent=`
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{background:${T.bg};color:${T.text};}
  body{font-family:Inter,system-ui,sans-serif;background:${T.bg};color:${T.textSec};font-size:16px;line-height:22px;font-weight:375;-webkit-font-smoothing:antialiased;}
  input,textarea,button,select{font-family:inherit;font-size:16px;font-weight:375;}
  /* ── DS TYPOGRAPHY SCALE ──────────────────────────────────────────── */
  .t-heading{font-size:22px;line-height:28px;font-weight:580;color:${T.text};}
  .t-section{font-size:18px;line-height:24px;font-weight:580;color:${T.text};}
  .t-title{font-size:16px;line-height:22px;font-weight:500;color:${T.text};}
  .t-title-link{font-size:16px;line-height:22px;font-weight:500;color:${T.primary};text-decoration:underline;cursor:pointer;}
  .t-body{font-size:16px;line-height:22px;font-weight:375;color:${T.textSec};}
  .t-highlighted{font-size:16px;line-height:22px;font-weight:375;color:${T.text};}
  .t-body-link{font-size:16px;line-height:22px;font-weight:375;color:${T.primary};text-decoration:underline;cursor:pointer;}
  .t-input{font-size:16px;line-height:22px;font-weight:375;color:${T.text};}
  .t-subtitle{font-size:14px;line-height:18px;font-weight:375;color:${T.textMuted};}
  .t-subtitle-link{font-size:14px;line-height:18px;font-weight:375;color:${T.primary};text-decoration:underline;cursor:pointer;}
  .t-caption{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}
  .t-caption-link{font-size:12px;line-height:16px;font-weight:375;color:${T.primary};text-decoration:underline;cursor:pointer;}

  .app{min-height:100vh;background:${T.bg};color:${T.text};}

  /* NAV */
  .nav{height:48px;background:${T.surface};border-bottom:1px solid ${T.border};display:flex;align-items:stretch;padding:0 20px;gap:0;position:sticky;top:0;z-index:200;}
  .nav-logo{width:28px;height:28px;border-radius:6px;background:${T.primary};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:580;color:#fff;flex-shrink:0;align-self:center;margin-right:4px;}
  .nav-title{font-size:16px;line-height:22px;font-weight:500;color:${T.text};white-space:nowrap;align-self:center;margin-right:12px;cursor:pointer;}
  .nav-divider{width:1px;height:18px;background:${T.border};flex-shrink:0;align-self:center;}
  .nav-stretch{flex:1;}
  .nav-tabs{display:flex;align-items:stretch;height:100%;}
  .nav-tab{height:100%;padding:0 14px;border:none;background:transparent;font-size:14px;line-height:18px;font-weight:375;cursor:pointer;color:${T.textSec};position:relative;white-space:nowrap;display:flex;align-items:center;}
  .nav-tab:hover{color:${T.text};}
  .nav-tab.active{color:${T.primary};font-weight:500;}
  .nav-tab.active::after{content:"";position:absolute;bottom:0;left:14px;right:14px;height:2px;background:${T.primary};border-radius:2px 2px 0 0;}
  .nav-tab-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:8px;font-size:12px;line-height:16px;font-weight:375;margin-left:5px;padding:0 3px;background:${T.errorBg};color:#b02035;}
  .nav-tab-badge.warn{background:${T.warningBg};color:#7a5800;}

  /* ROLE CHIP */
  .role-chip{display:flex;align-items:center;gap:5px;padding:3px 10px;border-radius:${T.rPill};border:1px solid ${T.border};font-size:12px;line-height:16px;font-weight:375;color:${T.textSec};background:${T.bg};}
  .role-chip.admin{border-color:${T.primaryBorder};color:${T.primary};background:${T.primaryLight};}

  /* TABS */
  .tabs{display:flex;gap:2px;}
  .tab{height:30px;padding:0 12px;border-radius:${T.rPill};border:none;font-size:14px;line-height:18px;font-weight:375;cursor:pointer;color:${T.textSec};background:transparent;}
  .tab:hover{background:${T.surfaceHover};color:${T.text};}
  .tab.active{background:${T.primary};color:#fff;}
  .tab.viewer-hidden{display:none;}

  /* THEME TOGGLE */
  .theme-toggle{display:flex;border:1px solid ${T.border};border-radius:${T.rPill};overflow:hidden;background:${T.bg};}
  .theme-btn{height:26px;padding:0 10px;font-size:12px;line-height:16px;font-weight:375;cursor:pointer;border:none;background:transparent;color:${T.textMuted};white-space:nowrap;}
  .theme-btn.active{background:${T.surface};color:${T.text};font-weight:500;box-shadow:${T.shadow};}
  .theme-btn:hover:not(.active){color:${T.text};}

  /* ICON BTN */
  .icon-btn{width:30px;height:30px;border-radius:${T.r};border:1px solid ${T.border};background:${T.surface};display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:${T.textSec};flex-shrink:0;}
  .icon-btn:hover{border-color:${T.primary};color:${T.primary};}

  /* DROPDOWN */
  .dd-lbl{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}
  .dd-trigger{height:44px;padding:0 12px;border-radius:6px;border:1px solid ${T.borderStrong};background:${T.surface};font-size:16px;line-height:22px;font-weight:375;color:${T.text};cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;min-width:0;width:100%;}
  .dd-trigger:hover{border-color:${T.primary};}
  .dd-trigger.open{border-color:${T.primary};box-shadow:0 0 0 3px ${T.primaryLight};}
  .dd-val{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left;}
  .dd-arrow{color:${T.textMuted};font-size:14px;flex-shrink:0;}
  .dd-arrow.open{transform:rotate(180deg);}
  .dd-menu{position:absolute;top:calc(100% + 4px);left:0;background:${T.surface};border:1px solid ${T.borderMid};border-radius:6px;box-shadow:${T.shadowMd};min-width:100%;z-index:300;overflow:hidden;animation:ddIn .1s ease;}
  .dd-menu.right{left:auto;right:0;}
  .dd-item{padding:10px 14px;font-size:16px;line-height:22px;font-weight:375;color:${T.textSec};cursor:pointer;display:flex;align-items:center;justify-content:space-between;white-space:nowrap;}
  .dd-item:hover{background:${T.bg};color:${T.text};}
  .dd-item.selected{color:${T.primary};font-weight:500;}
  .dd-item.disabled{opacity:.4;pointer-events:none;}
  .dd-check{font-size:12px;}
  @keyframes ddIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}

  /* PAGE */
  .page{max-width:1040px;margin:0 auto;padding:24px 20px 80px;}

  /* CARDS */
  .card{background:${T.surface};border-radius:${T.rLg};border:1px solid ${T.borderMid};}
  .card-pad{padding:18px 20px;}
  .card-hover:hover{box-shadow:${T.shadowMd};}

  /* SECTION DIVIDER (Vinted-style 8px coloured spacer) */
  .section-spacer{height:8px;background:${T.bg};margin:0 -20px;}

  /* STAT CARD */
  .stat-card{padding:16px 18px;}
  .stat-lbl{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-bottom:6px;}
  .stat-val{font-size:24px;font-weight:580;color:${T.text};line-height:1;margin-bottom:6px;}
  .stat-foot{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;overflow:hidden;min-width:0;}

  /* BADGES (no-wrap + truncate + tooltip via title) */
  .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:${T.rPill};font-size:12px;line-height:16px;font-weight:375;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;cursor:default;flex-shrink:0;}
  .badge.ok{background:${T.successBg};color:${T.success};}
  .badge.err{background:${T.errorBg};color:${T.error};}
  .badge.warn{background:${T.warningBg};color:#7a5800;}
  .badge.neutral{background:${T.bg};color:${T.textSec};border:1px solid ${T.border};}

  /* TREND */
  .trend{font-size:12px;line-height:16px;font-weight:375;display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:${T.rPill};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;cursor:default;flex-shrink:0;}
  .trend.up{background:${T.successBg};color:${T.success};}
  .trend.dn{background:${T.errorBg};color:${T.error};}
  .trend.flat{background:${T.bg};color:${T.textMuted};border:1px solid ${T.border};}

  /* GRIDS */
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
  .g21{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;}

  /* CHART */
  .chart-title{font-size:16px;line-height:22px;font-weight:500;color:${T.text};margin-bottom:2px;}
  .chart-sub{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-bottom:12px;}

  /* COMPARE BANNER */
  .compare-bar{background:${T.primaryLight};border:1px solid ${T.primaryBorder};border-radius:${T.r};padding:7px 14px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;font-weight:375;color:${T.primary};}

  /* INFO BANNER */
  .banner{border-radius:${T.r};padding:14px 16px;display:flex;gap:12px;margin-bottom:14px;border:1px solid transparent;}
  .banner-icon{font-size:18px;flex-shrink:0;margin-top:1px;}
  .banner-title{font-size:14px;line-height:18px;font-weight:500;margin-bottom:2px;}
  .banner-text{font-size:12px;line-height:16px;font-weight:375;color:${T.textSec};}
  .banner.info{background:${T.primaryLight};border-color:${T.primaryBorder};}
  .banner.info .banner-title{color:${T.primary};}
  .banner.success{background:${T.successBg};}
  .banner.success .banner-title{color:${T.success};}
  .banner.warn{background:${T.warningBg};}
  .banner.warn .banner-title{color:#7a5800;}
  .banner.err{background:${T.errorBg};}
  .banner.err .banner-title{color:${T.error};}

  /* SIGNAL CARDS */
  .signal{display:flex;gap:10px;padding:10px 14px;border-radius:${T.r};margin-bottom:8px;align-items:flex-start;border:1px solid transparent;}
  .signal.err{background:${T.errorBg};border-color:${T.error}22;}
  .signal.warn{background:${T.warningBg};border-color:${T.warning}33;}
  .signal.ok{background:${T.successBg};border-color:${T.success}22;}
  .signal.info{background:${T.primaryLight};border-color:${T.primaryBorder};}
  .signal-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:5px;}
  .signal-dot.err{background:${T.error};}
  .signal-dot.warn{background:${T.warning};}
  .signal-dot.ok{background:${T.success};}
  .signal-dot.info{background:${T.primary};}
  .signal-body{flex:1;}
  .signal-head{font-size:14px;line-height:18px;font-weight:500;color:${T.text};margin-bottom:2px;}
  .signal-text{font-size:12px;color:${T.textSec};line-height:1.5;}

  /* RAG */
  .rag-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;}
  .rag-card{padding:14px;border-radius:${T.r};border:2px solid ${T.border};cursor:pointer;text-align:center;}
  .rag-label{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-bottom:8px;}
  .rag-dots{display:flex;gap:6px;justify-content:center;}
  .rag-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;opacity:.3;border:2px solid transparent;}
  .rag-dot.active{opacity:1;}
  .rag-dot.G.active{background:${T.successBg};border-color:${T.success};}
  .rag-dot.A.active{background:${T.warningBg};border-color:${T.warning};}
  .rag-dot.R.active{background:${T.errorBg};border-color:${T.error};}

  /* MILESTONE */
  .milestone{display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid ${T.border};font-size:14px;line-height:18px;font-weight:375;}
  .milestone:last-child{border-bottom:none;}
  .ms-status{width:80px;font-size:12px;line-height:16px;font-weight:375;flex-shrink:0;padding:2px 8px;border-radius:${T.rPill};text-align:center;}
  .ms-name{flex:1;color:${T.text};}
  .ms-phase{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};flex-shrink:0;}
  .ms-date{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};flex-shrink:0;width:70px;text-align:right;}

  /* PROG */
  .prog{height:4px;background:${T.bg};border-radius:2px;overflow:hidden;border:1px solid ${T.border};}
  .prog-fill{height:100%;border-radius:2px;}

  /* UMUX */
  .umux-val{font-size:40px;font-weight:580;line-height:1;margin:8px 0 6px;}
  .umux-bar{height:5px;background:${T.bg};border-radius:3px;position:relative;margin-bottom:5px;border:1px solid ${T.border};}
  .umux-thresh{position:absolute;left:70%;top:-4px;bottom:-4px;width:2px;background:${T.warning};border-radius:1px;}
  .umux-lbls{display:flex;justify-content:space-between;font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}

  /* TABLE */
  .tbl{width:100%;border-collapse:collapse;font-size:14px;line-height:18px;}
  .tbl th{padding:8px 12px;text-align:left;font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};border-bottom:1px solid ${T.border};}
  .tbl td{padding:9px 12px;border-bottom:1px solid ${T.border};font-size:14px;line-height:18px;font-weight:375;color:${T.textSec};vertical-align:middle;}
  .tbl td:first-child{color:${T.text};font-weight:500;}
  .tbl tr:last-child td{border-bottom:none;}
  .tbl tr:hover td{background:${T.bg};}

  /* BUTTONS */
  .btn{height:40px;padding:0 18px;border-radius:8px;font-size:16px;line-height:22px;font-weight:500;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:6px;}
  .btn-primary{background:${T.primary};color:#fff;border:1px solid ${T.primary};}
  .btn-primary:hover{background:#006370;}
  .btn-outlined{background:${T.surface};border:1px solid ${T.borderStrong};color:${T.text};}
  .btn-outlined:hover{border-color:${T.primary};color:${T.primary};background:${T.primaryLight};}
  .btn-ghost{background:transparent;border:1px solid transparent;color:${T.textSec};}
  .btn-ghost:hover{background:${T.bg};color:${T.text};}
  .btn-sm{height:32px;font-size:14px;line-height:18px;font-weight:375;padding:0 12px;border-radius:6px;}
  .btn-danger{background:transparent;border:1px solid ${T.error}44;color:${T.error};}
  .btn-danger:hover{background:${T.errorBg};}
  .btn:disabled{opacity:.4;pointer-events:none;}
  .action-row{display:flex;align-items:center;gap:8px;margin-top:8px;}

  /* FIELDS */
  .field{margin-bottom:16px;}
  .field-lbl{font-size:14px;line-height:18px;font-weight:375;color:${T.textMuted};margin-bottom:6px;}
  .field-hint{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-left:6px;}
  .bl-input{width:100%;background:${T.bg};border:none;border-bottom:1px solid ${T.borderStrong};padding:6px 2px;font-size:16px;line-height:22px;font-weight:375;color:${T.text};outline:none;}
  .bl-input:focus{border-bottom-color:${T.primary};}
  .bl-input::placeholder{color:${T.textMuted};}

  /* NUM INPUT */
  .num-in{width:84px;background:${T.bg};border:1px solid ${T.border};border-radius:${T.r};padding:5px 9px;font-size:16px;line-height:22px;font-weight:375;color:${T.text};outline:none;text-align:right;}
  .num-in:focus{border-color:${T.primary};box-shadow:0 0 0 3px ${T.primaryLight};}

  /* SELECT */
  .bl-select{background:${T.bg};border:none;border-bottom:1px solid ${T.borderStrong};padding:6px 2px;font-size:16px;line-height:22px;font-weight:375;color:${T.text};outline:none;width:100%;}

  /* UPLOAD */
  .upload-zone{border:2px dashed ${T.borderMid};border-radius:${T.rLg};padding:24px;text-align:center;cursor:pointer;background:${T.bg};}
  .upload-zone:hover,.upload-zone.drag{border-color:${T.primary};background:${T.primaryLight};}
  .upload-icon{font-size:24px;margin-bottom:6px;}
  .upload-title{font-size:16px;line-height:22px;font-weight:500;color:${T.text};margin-bottom:3px;}
  .upload-sub{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}
  .upload-success{background:${T.successBg};border:1px solid ${T.success}33;border-radius:${T.r};padding:9px 14px;display:flex;align-items:center;gap:8px;font-size:14px;line-height:18px;font-weight:375;color:${T.success};}

  /* SETTINGS */
  .settings-layout{display:grid;grid-template-columns:210px 1fr;min-height:calc(100vh - 48px);}
  .settings-side{background:${T.surface};border-right:1px solid ${T.border};padding:14px 8px;position:sticky;top:48px;height:calc(100vh - 48px);overflow-y:auto;}
  .side-lbl{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};padding:0 8px;margin:14px 0 4px;}
  .side-lbl:first-child{margin-top:0;}
  .side-item{padding:7px 10px;border-radius:${T.r};cursor:pointer;font-size:14px;line-height:18px;font-weight:375;color:${T.textSec};margin-bottom:1px;display:flex;align-items:center;gap:8px;}
  .side-item:hover{background:${T.bg};color:${T.text};}
  .side-item.active{background:${T.primaryLight};color:${T.primary};font-weight:500;}
  .side-dot{width:6px;height:6px;border-radius:50%;margin-left:auto;flex-shrink:0;}
  .side-dot.ok{background:${T.success};}
  .side-dot.warn{background:${T.warning};}
  .side-dot.none{background:transparent;border:1px solid ${T.borderStrong};}
  .settings-main{padding:24px 28px;max-width:680px;}
  .src-title{font-size:22px;line-height:28px;font-weight:580;color:${T.text};margin-bottom:4px;}
  .src-desc{font-size:14px;line-height:18px;font-weight:375;color:${T.textMuted};margin-bottom:20px;}

  /* HOW-TO */
  .how-to{background:${T.bg};border:1px solid ${T.border};border-radius:${T.r};padding:14px 16px;margin-bottom:16px;}
  .how-to-lbl{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-bottom:10px;}
  .how-step{display:flex;gap:9px;font-size:12px;line-height:16px;font-weight:375;color:${T.textSec};margin-bottom:6px;align-items:flex-start;}
  .how-step:last-child{margin-bottom:0;}
  .step-n{width:17px;height:17px;border-radius:50%;background:${T.surface};border:1px solid ${T.border};display:flex;align-items:center;justify-content:center;font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};flex-shrink:0;margin-top:1px;}
  code{background:${T.bg};border:1px solid ${T.border};padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px;line-height:16px;color:${T.primary};}

  /* FMT BOX */
  .fmt-box{border:1px solid ${T.border};border-radius:${T.r};margin-bottom:12px;overflow:hidden;}
  .fmt-trigger{padding:8px 14px;display:flex;justify-content:space-between;cursor:pointer;font-size:12px;line-height:16px;font-weight:375;color:${T.textSec};background:${T.bg};}
  .fmt-body{padding:11px 14px;border-top:1px solid ${T.border};font-family:monospace;font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};background:${T.bg};}

  /* COMPONENT MANAGER */
  .comp-row{display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid ${T.border};font-size:14px;line-height:18px;font-weight:375;gap:10px;}
  .comp-row:last-child{border-bottom:none;}
  .comp-row.hidden{opacity:.45;}
  .comp-name{flex:1;color:${T.text};font-weight:500;font-size:14px;line-height:18px;}
  .comp-stat{width:70px;text-align:right;color:${T.textSec};}

  /* TOGGLE */
  .toggle{width:34px;height:20px;border-radius:10px;cursor:pointer;position:relative;flex-shrink:0;}
  .toggle.on{background:${T.primary};}
  .toggle.off{background:${T.borderStrong};}
  .toggle-thumb{position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:3px;transition:left .15s;}
  .toggle.on .toggle-thumb{left:17px;}
  .toggle.off .toggle-thumb{left:3px;}

  /* GA PROPERTY ROW */
  .ga-row{display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid ${T.border};}
  .ga-row:last-child{border-bottom:none;}
  .ga-name{font-size:14px;line-height:18px;font-weight:375;color:${T.text};flex:1;}
  .ga-id{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}

  /* MODAL */
  .overlay{position:fixed;inset:0;background:rgba(15,18,18,.5);display:flex;align-items:center;justify-content:center;z-index:500;padding:16px;backdrop-filter:blur(2px);}
  .modal{background:${T.surface};border-radius:${T.rLg};box-shadow:${T.shadowLg};width:100%;max-width:540px;max-height:90vh;overflow-y:auto;padding:22px;border:1px solid ${T.borderMid};}
  .modal-title{font-size:18px;line-height:24px;font-weight:580;color:${T.text};margin-bottom:2px;}
  .modal-sub{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};margin-bottom:20px;}
  .modal-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid ${T.border};gap:12px;}
  .modal-row:last-of-type{border-bottom:none;}
  .modal-row-lbl{font-size:14px;line-height:18px;font-weight:375;color:${T.text};}
  .modal-row-hint{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}

  /* ROLES PAGE */
  .member-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid ${T.border};font-size:14px;line-height:18px;font-weight:375;}
  .member-row:last-child{border-bottom:none;}
  .member-email{flex:1;color:${T.text};}

  /* QUAL */
  .qual-row{padding:8px 14px;border-bottom:1px solid ${T.border};display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:14px;line-height:18px;font-weight:375;}
  .qual-row:last-child{border-bottom:none;}

  /* SPIN */
  .spin{animation:spin 1s linear infinite;display:inline-block;}
  @keyframes spin{to{transform:rotate(360deg)}}

  /* MISC */
  .divider{border:none;border-top:1px solid ${T.border};margin:16px 0;}
  .section-head{font-size:18px;line-height:24px;font-weight:580;color:${T.text};margin:22px 0 10px;}
  .test-ok{font-size:12px;line-height:16px;font-weight:375;color:${T.success};}
  .test-err{font-size:12px;line-height:16px;font-weight:375;color:${T.error};}

  /* LENS SECTION */
  .lens-header{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid ${T.border};font-size:16px;line-height:22px;font-weight:500;color:${T.text};}
  .lens-num{width:22px;height:22px;border-radius:50%;background:${T.primary};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:580;flex-shrink:0;}
  .lens-sub{font-size:12px;line-height:16px;font-weight:375;color:${T.textMuted};}

  /* INTERP */
  .interp{padding:12px 14px;border-radius:${T.r};border:1px solid transparent;margin-bottom:8px;}
  .interp.ok{background:${T.successBg};border-color:${T.success}22;}
  .interp.warn{background:${T.warningBg};border-color:${T.warning}33;}
  .interp.err{background:${T.errorBg};border-color:${T.error}22;}
  .interp-head{font-size:14px;line-height:18px;font-weight:500;color:${T.text};margin-bottom:3px;}
  .interp-text{font-size:12px;line-height:16px;font-weight:375;color:${T.textSec};}

  .info-icon{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid currentColor;font-size:12px;font-weight:375;font-style:normal;line-height:1;cursor:help;flex-shrink:0;}
`
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const QUARTERS = ["Q1 '24","Q2 '24","Q3 '24","Q4 '24","Q1 '25","Q2 '25","Q3 '25","Q4 '25"]
const SEED = {
  "Q1 '24":{csat:3.4,efficiency:3.1,discoverability:2.9,confidence:3.3,handoff:3.0,zhUmux:58,sbUmux:54,figmaInserts:1820,detaches:310,codeWeb:940,codeIOS:720,codeAndroid:650,customWeb:24,customIOS:18,customAndroid:21,docCoverage:61,zhTraffic:4200,sbTraffic:2800},
  "Q2 '24":{csat:3.6,efficiency:3.4,discoverability:3.1,confidence:3.5,handoff:3.2,zhUmux:62,sbUmux:59,figmaInserts:2140,detaches:290,codeWeb:1180,codeIOS:890,codeAndroid:810,customWeb:22,customIOS:16,customAndroid:19,docCoverage:66,zhTraffic:4900,sbTraffic:3400},
  "Q3 '24":{csat:3.8,efficiency:3.7,discoverability:3.4,confidence:3.8,handoff:3.5,zhUmux:67,sbUmux:64,figmaInserts:2680,detaches:255,codeWeb:1490,codeIOS:1120,codeAndroid:1040,customWeb:19,customIOS:14,customAndroid:17,docCoverage:72,zhTraffic:5600,sbTraffic:4100},
  "Q4 '24":{csat:4.0,efficiency:3.9,discoverability:3.6,confidence:4.0,handoff:3.7,zhUmux:71,sbUmux:68,figmaInserts:3210,detaches:230,codeWeb:1820,codeIOS:1380,codeAndroid:1290,customWeb:17,customIOS:12,customAndroid:15,docCoverage:76,zhTraffic:6300,sbTraffic:4800},
  "Q1 '25":{csat:4.2,efficiency:4.1,discoverability:3.8,confidence:4.2,handoff:3.9,zhUmux:74,sbUmux:72,figmaInserts:3740,detaches:198,codeWeb:2210,codeIOS:1650,codeAndroid:1540,customWeb:14,customIOS:10,customAndroid:12,docCoverage:80,zhTraffic:7100,sbTraffic:5600},
}
const SEED_RAG = { discovery:"green", delivery:"green", impact:"amber" }
const SEED_MILESTONES = [
  { id:1,name:"Token migration to new naming convention",phase:"Delivery",status:"on-track",date:"Mar 2025"},
  { id:2,name:"Android component parity with Web",phase:"Discovery",status:"at-risk",date:"Apr 2025"},
  { id:3,name:"Storybook v8 upgrade",phase:"Delivery",status:"complete",date:"Feb 2025"},
  { id:4,name:"UMUX baseline across all tools",phase:"Discovery",status:"on-track",date:"Mar 2025"},
]
const QUAL = {
  positive:[
    {platform:"Design",items:[
      {text:"Icon library is comprehensive",n:14},
      {text:"Consistent tokens across platforms",n:12},
      {text:"Figma component variants are well structured",n:10},
      {text:"Spacing scale is intuitive",n:7},
    ]},
    {platform:"Web",items:[
      {text:"Button & form components are reliable",n:18},
      {text:"Storybook integration makes adoption easy",n:13},
      {text:"Changelog keeps us informed",n:9},
      {text:"Theming support is solid",n:6},
    ]},
    {platform:"iOS",items:[
      {text:"Swift UI primitives are solid",n:8},
      {text:"Token parity with Figma is well maintained",n:7},
      {text:"Navigation components save time",n:6},
      {text:"Dark mode support works out of the box",n:4},
    ]},
    {platform:"Android",items:[
      {text:"Compose components are stable",n:7},
      {text:"Design tokens well documented",n:6},
      {text:"Color system maps cleanly to Material",n:5},
      {text:"Component previews in docs are helpful",n:4},
    ]},
  ],
  negative:[
    {platform:"Design",items:[
      {text:"Hard to find the right component",n:21},
      {text:"Missing complex table patterns",n:14},
      {text:"Overlay and dialog patterns are inconsistent",n:9},
      {text:"No guidance on data visualisation components",n:6},
    ]},
    {platform:"Web",items:[
      {text:"Storybook examples feel too basic",n:11},
      {text:"No motion or animation guidance",n:8},
      {text:"Form validation patterns are underdocumented",n:7},
      {text:"Missing responsive layout utilities",n:5},
    ]},
    {platform:"iOS",items:[
      {text:"Missing navigation patterns",n:9},
      {text:"UIKit components lagging behind SwiftUI",n:7},
      {text:"Accessibility guidelines are incomplete",n:5},
      {text:"No gesture interaction patterns documented",n:4},
    ]},
    {platform:"Android",items:[
      {text:"Android docs lag behind Web",n:17},
      {text:"XML components not at parity with Compose",n:10},
      {text:"No guidance on large screen layouts",n:7},
      {text:"Missing loading skeleton components",n:5},
    ]},
  ],
}
// ─── ADOPTION COMPONENT DATA (seed) ──────────────────────────────────────────
const COMPONENT_DATA = {
  Web: [
    {component:"Button",adoption:2210,projects:["Buyer","Search","Member Acquisition","Trust","Revenue","Seller Tools","Discovery","Payments Platform","Marketplace","Catalogue"]},
    {component:"Input",adoption:1870,projects:["Buyer","Search","Trust","Seller Tools","Payments Platform","Marketplace","Member Lifecycle"]},
    {component:"Modal",adoption:1540,projects:["Buyer","Trust","Revenue","Seller Tools","Discovery","Member Acquisition","Catalogue"]},
    {component:"Badge",adoption:1320,projects:["Search","Trust","Marketplace","Revenue","Seller Tools","Member Lifecycle"]},
    {component:"Card",adoption:1180,projects:["Buyer","Search","Discovery","Member Acquisition","Marketplace","Catalogue"]},
    {component:"Dropdown",adoption:980,projects:["Buyer","Seller Tools","Search","Trust","Revenue"]},
    {component:"Toast",adoption:760,projects:["Buyer","Trust","Payments Platform","Seller Tools"]},
    {component:"Table",adoption:640,projects:["Trust","Revenue","Marketplace","Seller Tools","Discovery"]},
    {component:"Tabs",adoption:520,projects:["Buyer","Marketplace","Discovery","Member Lifecycle"]},
    {component:"Checkbox",adoption:480,projects:["Trust","Seller Tools","Buyer","Payments Platform"]},
  ],
  iOS: [
    {component:"Button",adoption:1650,projects:["Buyer","Search","Trust","Member Acquisition","Revenue","Seller Tools"]},
    {component:"NavigationBar",adoption:1380,projects:["Buyer","Search","Trust","Member Acquisition","Discovery","Marketplace"]},
    {component:"Card",adoption:1120,projects:["Buyer","Search","Discovery","Catalogue","Member Lifecycle"]},
    {component:"Badge",adoption:920,projects:["Search","Trust","Revenue","Member Lifecycle"]},
    {component:"Input",adoption:780,projects:["Buyer","Trust","Seller Tools","Payments Platform"]},
    {component:"Sheet",adoption:640,projects:["Buyer","Trust","Discovery","Payments Platform"]},
    {component:"Toast",adoption:520,projects:["Buyer","Trust","Payments Platform"]},
    {component:"Tabs",adoption:410,projects:["Buyer","Marketplace","Discovery"]},
  ],
  "Android (XML)": [
    {component:"Button",adoption:1540,projects:["Buyer","Search","Trust","Member Acquisition","Revenue"]},
    {component:"Toolbar",adoption:1290,projects:["Buyer","Search","Trust","Discovery","Marketplace"]},
    {component:"Card",adoption:1040,projects:["Buyer","Discovery","Catalogue","Member Lifecycle"]},
    {component:"Badge",adoption:860,projects:["Search","Trust","Revenue","Marketplace"]},
    {component:"Input",adoption:720,projects:["Buyer","Trust","Seller Tools","Payments Platform"]},
    {component:"BottomSheet",adoption:580,projects:["Buyer","Trust","Discovery"]},
    {component:"Toast",adoption:460,projects:["Buyer","Trust","Payments Platform"]},
  ],
  "Android (Compose)": [
    {component:"Button",adoption:870,projects:["Buyer","Search","Trust","Revenue"]},
    {component:"Scaffold",adoption:720,projects:["Buyer","Search","Discovery","Marketplace"]},
    {component:"Card",adoption:590,projects:["Buyer","Discovery","Catalogue"]},
    {component:"Badge",adoption:460,projects:["Search","Trust","Revenue"]},
    {component:"TextField",adoption:380,projects:["Buyer","Trust","Seller Tools"]},
  ],
}
const CUSTOM_DATA = {
  Web: [
    {component:"LegacyDataTable",adoption:38,projects:["Trust (22x)","Revenue (10x)","Marketplace (6x)"]},
    {component:"CustomFilterBar",adoption:24,projects:["Search (14x)","Discovery (10x)"]},
    {component:"LegacyModal",adoption:19,projects:["Buyer (11x)","Member Acquisition (8x)"]},
    {component:"OldBadge",adoption:15,projects:["Revenue (9x)","Seller Tools (6x)"]},
    {component:"InlineForm",adoption:12,projects:["Trust (7x)","Payments Platform (5x)"]},
  ],
  iOS: [
    {component:"LegacyNavBar",adoption:22,projects:["Buyer (13x)","Discovery (9x)"]},
    {component:"CustomActionSheet",adoption:17,projects:["Trust (10x)","Payments Platform (7x)"]},
    {component:"OldCard",adoption:14,projects:["Search (8x)","Catalogue (6x)"]},
    {component:"LegacyBadge",adoption:9,projects:["Revenue (5x)","Member Lifecycle (4x)"]},
  ],
  "Android (XML)": [
    {component:"LegacyToolbar",adoption:28,projects:["Buyer (16x)","Discovery (12x)"]},
    {component:"CustomBottomSheet",adoption:21,projects:["Trust (12x)","Payments Platform (9x)"]},
    {component:"OldCard",adoption:17,projects:["Search (9x)","Catalogue (8x)"]},
    {component:"LegacyBadge",adoption:12,projects:["Revenue (7x)","Marketplace (5x)"]},
  ],
  "Android (Compose)": [
    {component:"LegacyMigratedButton",adoption:14,projects:["Buyer (8x)","Revenue (6x)"]},
    {component:"CustomScaffold",adoption:10,projects:["Search (6x)","Discovery (4x)"]},
    {component:"OldTextField",adoption:8,projects:["Trust (5x)","Seller Tools (3x)"]},
  ],
}
const DOC_STATUS = [{name:"Documented",value:80,color:"#28865A"},{name:"In Progress",value:10,color:"#F9BB42"},{name:"Outdated",value:5,color:"#D04555"},{name:"Not Documented",value:4,color:"#9CA3A5"},{name:"Blocked",value:1,color:"#D04555"}]

// ─── TEAM HIERARCHY ───────────────────────────────────────────────────────────
// grandparent_team_name = Business Unit
const TEAM_TO_BU = {"A-Team":"Marketplace","Advantage":"Marketplace","Albatross":"Pay","Android Technologies":"Marketplace","Async":"Infrastructure","Atlas":"Marketplace","Autobahn":"Marketplace","Backend Services":"Marketplace","Bebra":"Marketplace","Bees":"Pay","Braze":"Marketplace","Buyer":"Marketplace","Buyer 1":"Marketplace","Buyer 2":"Marketplace","Buyer, Supply & MLC Analytics Engineering":"Marketplace","Catalogue":"Marketplace","CI/CD":"Infrastructure","Cloud":"Infrastructure","Competitive Intelligence":"Marketplace","Compute":"Infrastructure","Content Design":"Design","Cozy":"Marketplace","Cyber Defence":"Security & Privacy","Cyber Risk and Access Management":"Security & Privacy","Data Infrastructure":"Infrastructure","Data Infrastructure 1":"DSA","Data Infrastructure 2":"DSA","Data Infrastructure 3":"DSA","Data Platform Experience":"Infrastructure","Data Platform Foundations":"Infrastructure","Databases":"Infrastructure","Design Operations":"Design","Design System":"Infrastructure","Developer Portal":"Infrastructure","Developer Tools":"Infrastructure","Digital Marketing Intelligence":"Marketplace","Discovery":"Marketplace","Dune":"Vinted Go","Ember":"Marketplace","Engineering":"Engineering","Engineering Experience":"Engineering","Experimentation":"Infrastructure","FBI":"Marketplace","Financial Forecasting and Analytics":"DSA","Fishing":"Marketplace","Foundations":"Infrastructure","Futurama":"Vinted Go","Group Applied Data":"DSA","Hedwig":"Marketplace","Help Experience":"Design","Help Experience Intelligence":"Marketplace","Ignis":"Marketplace","Information Security Engineering":"Security & Privacy","Infrastructure":"Infrastructure","iOS Technologies":"Marketplace","IT":"Infrastructure","IT Hardware":"Infrastructure","IT Life-cycle & Partnership":"Infrastructure","IT Support":"Infrastructure","IT Systems":"Infrastructure","IT Workplace":"Infrastructure","Item Engagement":"Marketplace","Item Inventory":"Marketplace","Kerbal":"Vinted Go","KFC":"Pay","Listing Subdomain":"Marketplace","Localisation":"Group Function","Magic":"Marketplace","Market Research":"Group Function","Marketing Analytics Engineering":"Marketplace","Marketing Modelling Intelligence":"Marketplace","Marketing other":"Marketplace","Marketplace":"Engineering","Marketplace Intelligence":"Marketplace","Marketplace Payments":"DSA","Marketplace Technologies":"Marketplace","Member Acquisition":"Marketplace","Member Lifecycle":"Marketplace","Milky Way":"Vinted Go","ML Platform":"Infrastructure","MLC":"Marketplace","More":"Marketplace","NASA":"Marketplace","Network":"Vinted Go","Nomads":"Marketplace","Observability Infra":"Infrastructure","Ontologies Platform":"Marketplace","OpsTech":"Vinted Go","Order":"Marketplace","Order Technologies":"Marketplace","Owls":"Pay","Pacman":"Vinted Go","Panda":"Marketplace","Pay":"Pay","Payments Intelligence":"Pay","Payments Platform":"Pay","Penguins":"Pay","People Infrastructure":"DSA","Phoenix":"Pay","Pointers":"Vinted Go","Points":"Vinted Go","Privacy Engineering":"Security & Privacy","Production Engineering":"Engineering","Programs":"Marketplace","Protect & Support":"Marketplace","Protect & Support Intelligence":"Marketplace","Purchase":"Marketplace","QA Technologies":"Marketplace","Racoons":"Pay","Resilience":"Marketplace","Revenue":"Marketplace","Revenue 2":"Marketplace","Revenue, Purchase & Order":"Marketplace","Rududu":"Pay","Sandpipers":"Pay","Search":"Marketplace","Search Platform":"Marketplace","Security":"Marketplace","Security & Marketplace Technologies":"Marketplace","Security and Privacy Engineering":"Security & Privacy","Security Technologies":"Marketplace","Seller Tools":"Marketplace","sNASA":"Marketplace","Spark":"Marketplace","Sphinx":"Marketplace","Stargate":"Vinted Go","Starlink":"Vinted Go","Starship":"Vinted Go","Storage":"Infrastructure","Super Mario":"Vinted Go","Suply":"Marketplace","Supply":"Marketplace","Tetris":"Vinted Go","Tracksuits":"Vinted Go","Translation Lifecycle":"Marketplace","Trust":"Marketplace","Trust & Safety":"Marketplace","Trust and Safety 2":"Marketplace","Trust Experience":"Marketplace","User Research":"Group Function","Vanguard":"Marketplace","VCarrier Product":"Vinted Go","VComms Platform":"Marketplace","VCRM":"Marketplace","VGo Analytics Engineering":"DSA","VGo Fulfilment":"DSA","VGo Network":"DSA","VGo OpsTech":"DSA","VGo Points":"Vinted Go","VGo Points Intelligence":"Vinted Go","VGo Tech Support":"Vinted Go","Vinted Go":"Vinted Go","Vinted Pay":"Pay","Vintegreat":"Vinted Go","VITA":"Infrastructure","Wakanda":"Marketplace","Web Technologies":"Marketplace","Zebra":"Marketplace","Zen":"Marketplace"}

// Filter options
const ROLE_FILTERS = ["All roles","Product Designer","Content Designer","iOS Engineer","Web Engineer","Android Engineer"]
const BU_FILTERS   = ["All BUs","Marketplace","Pay","Infrastructure","Group Function","Security & Privacy","Engineering","DSA","Vinted Go"]
const PLATFORM_FILTERS = ["All platforms","Figma","Web","iOS","Android (XML)","Android (Compose)"]
const ADOPTION_BU_FILTERS = ["All BUs","Marketplace","Vinted Go"]

// Per-filter sample multipliers — simulate segmented survey responses
// Keys: role or BU → { metric: multiplier }
const ROLE_DELTA = {
  "Product Designer":     { csat:.08, efficiency:.06, discoverability:.05, confidence:.07, handoff:.04, zhUmux:3, sbUmux:-2 },
  "Content Designer":     { csat:.04, efficiency:.03, discoverability:.08, confidence:.04, handoff:.02, zhUmux:2, sbUmux:-1 },
  "iOS Engineer":         { csat:-.04, efficiency:-.02, discoverability:-.06, confidence:-.03, handoff:-.05, zhUmux:-1, sbUmux:4 },
  "Web Engineer":         { csat:.02, efficiency:.04, discoverability:-.03, confidence:.02, handoff:.01, zhUmux:1, sbUmux:5 },
  "Android Engineer":     { csat:-.06, efficiency:-.04, discoverability:-.08, confidence:-.05, handoff:-.07, zhUmux:-2, sbUmux:1 },
}
const BU_DELTA = {
  "Marketplace":   { csat:.05, efficiency:.04, discoverability:.03, confidence:.05, handoff:.02, zhUmux:2, sbUmux:2 },
  "Pay":           { csat:.00, efficiency:.02, discoverability:-.02, confidence:.01, handoff:.00, zhUmux:0, sbUmux:1 },
  "Infrastructure":{ csat:-.03, efficiency:.06, discoverability:-.04, confidence:.00, handoff:.03, zhUmux:1, sbUmux:6 },
  "Vinted Go":     { csat:-.05, efficiency:-.02, discoverability:-.06, confidence:-.04, handoff:-.05, zhUmux:-3, sbUmux:-2 },
  "DSA":           { csat:.03, efficiency:.00, discoverability:.02, confidence:.03, handoff:.01, zhUmux:1, sbUmux:0 },
  "Group Function":{ csat:.07, efficiency:.03, discoverability:.06, confidence:.06, handoff:.03, zhUmux:4, sbUmux:-1 },
  "Security & Privacy":{ csat:-.02, efficiency:.01, discoverability:-.03, confidence:-.01, handoff:.00, zhUmux:-1, sbUmux:2 },
  "Engineering":   { csat:-.01, efficiency:.05, discoverability:-.02, confidence:.01, handoff:.02, zhUmux:0, sbUmux:4 },
}

// Adoption platform multipliers (code inserts)
const PLATFORM_MULTIPLIER = {
  "Figma":               { figmaInserts:1, detaches:1, codeWeb:0, codeIOS:0, codeAndroid:0, codeAndroidCompose:0 },
  "Web":                 { figmaInserts:0, detaches:0, codeWeb:1, codeIOS:0, codeAndroid:0, codeAndroidCompose:0 },
  "iOS":                 { figmaInserts:0, detaches:0, codeWeb:0, codeIOS:1, codeAndroid:0, codeAndroidCompose:0 },
  "Android (XML)":       { figmaInserts:0, detaches:0, codeWeb:0, codeIOS:0, codeAndroid:1, codeAndroidCompose:0 },
  "Android (Compose)":   { figmaInserts:0, detaches:0, codeWeb:0, codeIOS:0, codeAndroid:0, codeAndroidCompose:1 },
}
const ADOPTION_BU_MULTIPLIER = {
  "Marketplace": { codeWeb:.58, codeIOS:.52, codeAndroid:.55, codeAndroidCompose:.50 },
  "Vinted Go":   { codeWeb:.18, codeIOS:.22, codeAndroid:.20, codeAndroidCompose:.25 },
}

// Apply filter deltas to base data
function applyFilters(base, activeRole, activeBU) {
  if(!base) return base
  const rd = activeRole && activeRole !== "All roles" ? (ROLE_DELTA[activeRole]||{}) : {}
  const bd = activeBU && activeBU !== "All BUs" ? (BU_DELTA[activeBU]||{}) : {}
  const out = { ...base }
  const SCORE_KEYS = ["csat","efficiency","discoverability","confidence","handoff"]
  const UMUX_KEYS  = ["zhUmux","sbUmux"]
  SCORE_KEYS.forEach(k => {
    if(out[k] != null) {
      const v = out[k] + (rd[k]||0) + (bd[k]||0)
      out[k] = Math.min(5, Math.max(1, Math.round(v * 10) / 10))
    }
  })
  UMUX_KEYS.forEach(k => {
    if(out[k] != null) {
      const v = out[k] + (rd[k]||0) + (bd[k]||0)
      out[k] = Math.min(100, Math.max(0, Math.round(v)))
    }
  })
  // Add Android Compose (split from Android)
  if(out.codeAndroid != null) out.codeAndroidCompose = Math.round(out.codeAndroid * 0.42)
  return out
}
const FIELDS = [
  {key:"csat",label:"CSAT",hint:"/5",step:.1,max:5},{key:"efficiency",label:"Efficiency",hint:"/5",step:.1,max:5},
  {key:"discoverability",label:"Discoverability",hint:"/5",step:.1,max:5},{key:"confidence",label:"Confidence",hint:"/5",step:.1,max:5},
  {key:"handoff",label:"Handoff",hint:"/5",step:.1,max:5},{key:"zhUmux",label:"ZH UMUX",hint:"/100",step:1,max:100},
  {key:"sbUmux",label:"SB UMUX",hint:"/100",step:1,max:100},{key:"figmaInserts",label:"Figma Inserts",hint:"count",step:1},
  {key:"detaches",label:"Figma Detaches",hint:"count",step:1},{key:"codeWeb",label:"Code Inserts Web",hint:"count",step:1},
  {key:"codeIOS",label:"Code Inserts iOS",hint:"count",step:1},{key:"codeAndroid",label:"Code Inserts Android",hint:"count",step:1},
  {key:"customWeb",label:"Custom Comps Web",hint:"count",step:1},{key:"customIOS",label:"Custom Comps iOS",hint:"count",step:1},
  {key:"customAndroid",label:"Custom Comps Android",hint:"count",step:1},{key:"docCoverage",label:"Doc Coverage",hint:"%",step:1,max:100},
  {key:"zhTraffic",label:"ZH Traffic",hint:"sessions",step:1},{key:"sbTraffic",label:"SB Traffic",hint:"sessions",step:1},
]

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (v,d=1) => v!=null ? Number(v).toFixed(d) : "—"
const fmtN = v => v!=null ? Number(v).toLocaleString() : "—"
const parseCSV = txt => {
  const lines = txt.trim().split("\n").filter(Boolean)
  if(lines.length<2) return []
  const headers = lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""))
  return lines.slice(1).map(line=>{
    const vals=[]; let cur="",inQ=false
    for(const c of line){if(c==='"')inQ=!inQ;else if(c===","&&!inQ){vals.push(cur.trim());cur=""}else cur+=c}
    vals.push(cur.trim())
    return Object.fromEntries(headers.map((h,i)=>[h,(vals[i]||"").replace(/^"|"$/g,"").trim()]))
  })
}

// Quarter detection from filename: "2025 Q1", "Q1_2025", "Survey_2025_Q2.csv", etc.
const detectQuarter = filename => {
  if(!filename) return null
  const m1 = filename.match(/(\d{4})\s*[_\-\s]?[Qq](\d)/i)
  const m2 = filename.match(/[Qq](\d)\s*[_\-\s]?(\d{4})/i)
  if(m1) return `Q${m1[2]} '${m1[1].slice(2)}`
  if(m2) return `Q${m2[1]} '${m2[2].slice(2)}`
  return null
}

// ─── SIGNALS ENGINE ───────────────────────────────────────────────────────────
// 3-Lens performance framework: automated signal computation
const computeSignals = (allData, selQ, compQ) => {
  const curr = allData[selQ] || {}
  const qs = QUARTERS.filter(q=>allData[q])
  const prevQ = compQ || qs[qs.indexOf(selQ)-1]
  const prev = prevQ ? (allData[prevQ]||{}) : {}
  const signals = []

  // ── Lens 3: User & Adoption Signals ──────────────────────────────────────
  // UMUX critical
  if(curr.zhUmux!=null&&curr.zhUmux<70)
    signals.push({sev:"err",key:"zh_umux_low",head:"Zeroheight UMUX below threshold",text:`Score is ${Math.round(curr.zhUmux)}/100 — below 70 means docs are actively hurting users. Prioritise an IA review immediately.`})
  if(curr.sbUmux!=null&&curr.sbUmux<70)
    signals.push({sev:"err",key:"sb_umux_low",head:"Storybook UMUX below threshold",text:`Score is ${Math.round(curr.sbUmux)}/100. Users find Storybook hard to use. Review navigation and example coverage.`})

  // CSAT trend
  if(curr.csat!=null&&curr.csat<4.0){
    const delta = prev.csat ? curr.csat-prev.csat : null
    if(delta!==null&&delta<=0)
      signals.push({sev:"err",key:"csat_falling",head:"CSAT below target and declining",text:`${fmt(curr.csat)}/5.0 and dropping. Not a speed problem — review what shipped and whether it solved real pain.`})
    else
      signals.push({sev:"warn",key:"csat_low",head:"CSAT below target",text:`${fmt(curr.csat)}/5.0 (target ≥4.0). Holding steady but not improving. Check qualitative feedback for root cause.`})
  }

  // Detach rate
  if(curr.figmaInserts&&curr.detaches&&prev.figmaInserts&&prev.detaches){
    const r = curr.detaches/curr.figmaInserts
    const rp = prev.detaches/prev.figmaInserts
    if(r>0.15&&r>rp*1.05)
      signals.push({sev:"warn",key:"detach_rising",head:"Detach rate rising above 15%",text:`${Math.round(r*100)}% of inserts are being detached. Product teams are working around the DS — likely coverage gaps not addressed by roadmap.`})
  }

  // Custom components trending up
  const cc = (curr.customWeb||0)+(curr.customIOS||0)+(curr.customAndroid||0)
  const pcc = (prev.customWeb||0)+(prev.customIOS||0)+(prev.customAndroid||0)
  if(pcc>0&&cc>pcc*1.1)
    signals.push({sev:"warn",key:"custom_rising",head:"Custom components increasing",text:`Up ${cc-pcc} across platforms QoQ. Teams are building outside the DS — coverage gap and/or adoption friction.`})

  // Doc coverage
  if(curr.docCoverage!=null&&curr.docCoverage<80)
    signals.push({sev:"warn",key:"doc_low",head:"Documentation coverage below target",text:`${fmt(curr.docCoverage,0)}% documented (target ≥80%). Incomplete docs slow adoption and increase custom component creation.`})

  // Discoverability specific
  if(curr.discoverability!=null&&curr.discoverability<3.5)
    signals.push({sev:"warn",key:"disco_low",head:"Discoverability consistently low",text:`${fmt(curr.discoverability)}/5.0. Users can't find components. This directly correlates with custom component growth.`})

  // All green
  if(signals.length===0&&Object.keys(curr).length>0)
    signals.push({sev:"ok",key:"all_ok",head:"All user & adoption signals on target",text:`CSAT, UMUX, coverage, and adoption metrics are all meeting or exceeding targets this quarter.`})

  return signals
}

// Cross-lens interpretation (requires RAG + signals together)
const computeInterpretation = (rag, signals) => {
  if(!rag) return []
  const interps = []
  const hasErr = signals.some(s=>s.sev==="err")
  const hasWarn = signals.some(s=>s.sev==="warn")
  const csatFlat = signals.find(s=>s.key==="csat_low")
  const csatFalling = signals.find(s=>s.key==="csat_falling")
  const allOk = signals.find(s=>s.key==="all_ok")

  if(rag.delivery==="green"&&rag.impact==="red")
    interps.push({type:"err",head:"Delivery green, impact red",text:"Team is shipping on time but not moving the right metrics. You may be solving the wrong problems or working on initiatives disconnected from OKRs. Revisit the roadmap."})
  if(rag.delivery==="green"&&(csatFlat||csatFalling))
    interps.push({type:"warn",head:"On-time delivery, flat satisfaction",text:"A scoping or quality problem, not a speed problem. What's shipping isn't translating to user value. Dig into the qualitative feedback."})
  if(rag.delivery==="green"&&rag.impact==="green"&&allOk)
    interps.push({type:"ok",head:"All three lenses aligned",text:"Milestones moving, team executing well, users reporting improvement. Confidence is high this quarter."})
  if(rag.discovery==="red")
    interps.push({type:"warn",head:"Discovery quality flagged",text:"Low-quality hypotheses entering the pipeline means delivery and impact will suffer in future quarters, even if current numbers look fine."})
  if(interps.length===0&&(hasErr||hasWarn))
    interps.push({type:"warn",head:"User signals need attention",text:"Team execution looks solid but users are surfacing issues. Consider adding discovery work to address the flagged signals next quarter."})
  return interps
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
// --- INFOTIP -----------------------------------------------------------------
function InfoTip({text,T}){
  const [show,setShow]=useState(false)
  return(
    <span style={{position:"relative",display:"inline-flex",flexShrink:0}}
      onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{color:T.textMuted,display:"inline-flex",cursor:"help",opacity:.75,lineHeight:1}}>
        <Info size={15}/>
      </span>
      {show&&(
        <span style={{
          position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",
          background:T.text,color:T.surface,
          fontSize:12,lineHeight:"18px",fontWeight:375,
          padding:"8px 10px",borderRadius:6,
          width:230,whiteSpace:"normal",zIndex:999,
          boxShadow:"0 4px 16px rgba(0,0,0,.2)",
          pointerEvents:"none",display:"block",
        }}>
          {text}
          <span style={{
            position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",
            width:0,height:0,
            borderLeft:"5px solid transparent",borderRight:"5px solid transparent",
            borderTop:`5px solid ${T.text}`,
          }}/>
        </span>
      )}
    </span>
  )
}

function Dropdown({label,value,options,onChange,disabled=[],placeholder="Select…",right=false}){
  const [open,setOpen]=useState(false)
  const ref=useRef()
  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}
    document.addEventListener("mousedown",fn); return()=>document.removeEventListener("mousedown",fn)
  },[])
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:130}} ref={ref}>
      {label&&<span className="dd-lbl">{label}</span>}
      <div style={{position:"relative"}}>
        <div className={`dd-trigger ${open?"open":""}`} onClick={()=>setOpen(o=>!o)}>
          <span className="dd-val">{value||placeholder}</span>
          <span className={`dd-arrow ${open?"open":""}`}><ChevronDown size={16}/></span>
        </div>
        {open&&<div className={`dd-menu ${right?"right":""}`}>
          {options.map(o=>(
            <div key={o} className={`dd-item ${value===o?"selected":""} ${disabled.includes(o)?"disabled":""}`}
              onClick={()=>{onChange(o);setOpen(false)}}>
              {o}{value===o&&<span className="dd-check"><Check size={12}/></span>}
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}

function Toggle({on,onChange}){
  return(
    <div className={`toggle ${on?"on":"off"}`} onClick={()=>onChange(!on)}>
      <div className="toggle-thumb"/>
    </div>
  )
}

function BloomTip({active,payload,label,T}){
  if(!active||!payload?.length) return null
  return(
    <div style={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:T.r,padding:"9px 13px",fontSize:12,boxShadow:T.shadowMd}}>
      <div style={{fontWeight:500,lineHeight:"18px",color:T.textSec,marginBottom:5}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
          <div style={{width:7,height:7,borderRadius:2,background:p.color}}/>
          <span style={{color:T.textSec}}>{p.name}:</span>
          <span style={{fontWeight:500,color:T.text}}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function TrendBadge({curr,prev,invert}){
  if(curr==null||prev==null) return null
  const d=curr-prev, pct=prev!==0?((d/prev)*100).toFixed(0):0
  const up=d>0, good=invert?!up:up
  const cls=d===0?"flat":good?"up":"dn"
  const label=`${up?"↑":"↓"} ${Math.abs(pct)}% vs previous quarter (${prev} → ${curr})`
  return <span className={`trend ${cls}`} title={label}>{up?<ArrowUp size={11}/>:<ArrowDown size={11}/>} {Math.abs(pct)}%</span>
}

function TargetBadge({v,target,invert}){
  if(v==null) return null
  const ok=invert?v<=target:v>=target
  const label=ok?`On target (≥${target})`:`Below target (target: ${invert?"≤":"≥"}${target})`
  return <span className={`badge ${ok?"ok":"err"}`} title={label}>{ok?<><Check size={11}/> On target</>:<>Below target</>}</span>
}

// ─── MULTI-SELECT DROPDOWN ────────────────────────────────────────────────────
function MultiSelect({ label, options, values, onChange, T }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener("mousedown", fn)
    return () => document.removeEventListener("mousedown", fn)
  }, [])

  const allSelected = values.length === 0
  const toggle = opt => {
    if (values.includes(opt)) {
      onChange(values.filter(v => v !== opt))
    } else {
      onChange([...values, opt])
    }
  }

  const displayLabel = allSelected
    ? `All ${label.toLowerCase()}s`
    : values.length === 1
      ? values[0]
      : `${values.length} selected`

  return (
    <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:130}} ref={ref}>
      {label&&<span className="dd-lbl">{label}</span>}
      <div style={{position:"relative"}}>
      <div className={`dd-trigger ${open ? "open" : ""}`} style={{ minWidth: 140 }} onClick={() => setOpen(o => !o)}>
        <span className="dd-val" style={{ color: allSelected ? T.textMuted : T.text }}>{displayLabel}</span>
        <span className={`dd-arrow ${open ? "open" : ""}`}><ChevronDown size={16}/></span>
      </div>
      {open && (
        <div className="dd-menu" style={{ minWidth: 200 }}>
          {/* All option */}
          <div className={`dd-item ${allSelected ? "selected" : ""}`} onClick={() => onChange([])}>
            <span>All {label.toLowerCase()}s</span>
            {allSelected && <span className="dd-check"><Check size={12}/></span>}
          </div>
          <div style={{ height: 1, background: T.border, margin: "2px 0" }} />
          {options.map(o => {
            const active = values.includes(o)
            return (
              <div key={o} className={`dd-item ${active ? "selected" : ""}`} onClick={() => toggle(o)}
                style={{ gap: 8, justifyContent: "flex-start" }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${active ? T.primary : T.borderStrong}`,
                  background: active ? T.primary : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {active && <span style={{ color: "#fff", display:"inline-flex" }}><Check size={10}/></span>}
                </div>
                <span>{o}</span>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}

function CSVUpload({onParsed,label,hint,T}){
  const [drag,setDrag]=useState(false)
  const [file,setFile]=useState(null)
  const [error,setError]=useState(null)
  const ref=useRef()
  const handle=f=>{
    if(!f) return
    if(!f.name.toLowerCase().endsWith(".csv")){setError("Please upload a .csv file");return}
    const detectedQ=detectQuarter(f.name)
    const reader=new FileReader()
    reader.onload=e=>{
      try{
        const rows=parseCSV(e.target.result)
        if(rows.length===0) throw new Error("No data rows found in CSV")
        setFile({name:f.name,detectedQ}); setError(null)
        onParsed(rows,e.target.result,detectedQ)
      }catch(err){setError(err.message)}
    }
    reader.readAsText(f)
  }
  return(
    <div>
      <input ref={ref} type="file" accept=".csv" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
      {file?(
        <div>
          <div className="upload-success">
            <span style={{display:"inline-flex"}}><Check size={14}/></span>
            <span><strong>{file.name}</strong> uploaded{file.detectedQ&&<> · detected quarter: <strong>{file.detectedQ}</strong></>}</span>
            <button className="btn btn-ghost btn-sm" style={{marginLeft:"auto"}} onClick={()=>setFile(null)}>Replace</button>
          </div>
          {file.detectedQ&&<div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textSec,marginTop:4}}>Quarter auto-detected from filename. You can override this in the data entry modal.</div>}
        </div>
      ):(
        <div className={`upload-zone ${drag?"drag":""}`}
          onClick={()=>ref.current.click()}
          onDragOver={e=>{e.preventDefault();setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0])}}>
          <div className="upload-icon"><Upload size={24}/></div>
          <div className="upload-title">{label||"Drop CSV here, or click to browse"}</div>
          <div className="upload-sub">{hint||"Files named with YYYY Q# will auto-detect the quarter"}</div>
        </div>
      )}
      {error&&<div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:"#D04555",marginTop:5}}><X size={12}/> {error}</div>}
    </div>
  )
}

// ─── DATA MODAL ───────────────────────────────────────────────────────────────
function DataModal({quarter,existing,onSave,onClose,T}){
  const [vals,setVals]=useState({...existing})
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div className="modal-title">Edit data — {quarter}</div>
            <div className="modal-sub">Update metrics for this quarter. Empty fields keep existing values.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={14}/></button>
        </div>
        {FIELDS.map(f=>(
          <div className="modal-row" key={f.key}>
            <div><div className="modal-row-lbl">{f.label}</div><div className="modal-row-hint">{f.hint}</div></div>
            <input type="number" className="num-in"
              value={vals[f.key]??""}
              step={f.step} min={0} max={f.max}
              onChange={e=>setVals(v=>({...v,[f.key]:e.target.value===""?undefined:parseFloat(e.target.value)}))}/>
          </div>
        ))}
        <div className="action-row" style={{marginTop:18}}>
          <button className="btn btn-primary btn-sm" onClick={()=>{onSave(vals);onClose()}}>Save changes</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── MILESTONE STATUS ─────────────────────────────────────────────────────────
const MS_COLORS = {
  "on-track":["#28865A","#EBFCEF"],
  "at-risk":["#F9BB42","#FFF5E5"],
  "off-track":["#D04555","#FFF4F4"],
  "complete":["#007782","#E6FAFA"],
  "not-started":["#9CA3A5","#F0F2F2"],
  "delayed":["#D04555","#FFF4F4"],
}
function MSBadge({status}){
  const [color,bg]=MS_COLORS[status]||["#9CA3A5","#F0F2F2"]
  return <span className="ms-status" style={{background:bg,color}}>{status.replace("-"," ")}</span>
}

// ─── PERFORMANCE / SIGNALS PANEL ─────────────────────────────────────────────
function PerformanceTab({allData,selQ,compQ,rag,setRag,milestones,setMilestones,T,isAdmin}){
  const qs=QUARTERS.filter(q=>allData[q])
  const prevQ=compQ||(qs[qs.indexOf(selQ)-1])
  const signals=useMemo(()=>computeSignals(allData,selQ,prevQ),[allData,selQ,prevQ])
  const interpretation=useMemo(()=>computeInterpretation(rag,signals),[rag,signals])
  const [newMs,setNewMs]=useState({name:"",phase:"Discovery",status:"not-started",date:""})
  const tip=useCallback(props=><BloomTip {...props} T={T}/>,[T])

  const RAG_DIMS=["discovery","delivery","impact"]
  const RAG_LABELS={discovery:"Discovery",delivery:"Delivery",impact:"Impact"}

  return(
    <div>
      {/* INTERPRETATION */}
      {interpretation.length>0&&(
        <div className="card" style={{marginBottom:14}}>
          <div className="lens-header">
            <div style={{fontSize:14,lineHeight:"18px",fontWeight:375,fontWeight:500,color:T.text}}><Search size={16}/> Cross-lens interpretation</div>
            <span style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>Based on your R-A-G grades + computed signals</span>
          </div>
          <div style={{padding:"12px 14px"}}>
            {interpretation.map((i,idx)=>(
              <div key={idx} className={`interp ${i.type}`}>
                <div className="interp-head">{i.head}</div>
                <div className="interp-text">{i.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="g21" style={{alignItems:"start"}}>
        <div>
          {/* LENS 2: Team R-A-G */}
          <div className="card" style={{marginBottom:14}}>
            <div className="lens-header">
              <div className="lens-num">2</div>
              <div><div>Team Execution — R-A-G</div><div className="lens-sub">Self-reported by domain leads · {selQ}</div></div>
              {!isAdmin&&<span style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginLeft:"auto"}}>read-only</span>}
            </div>
            <div style={{padding:"12px 14px"}}>
              <div className="rag-grid">
                {RAG_DIMS.map(dim=>(
                  <div key={dim} className="rag-card" style={{borderColor:rag[dim]==="green"?T.success:rag[dim]==="amber"?T.warning:rag[dim]==="red"?T.error:T.border}}>
                    <div className="rag-label">{RAG_LABELS[dim]}</div>
                    <div className="rag-dots">
                      {["green","amber","red"].map(v=>(
                        <div key={v} className={`rag-dot ${v==="green"?"G":v==="amber"?"A":"R"} ${rag[dim]===v?"active":""}`}
                          onClick={()=>isAdmin&&setRag(r=>({...r,[dim]:v}))}>
                          <span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:v==="green"?T.success:v==="amber"?T.warning:T.error}}></span>
                        </div>
                      ))}
                    </div>
                    {rag[dim]&&<div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginTop:6}}>{rag[dim]}</div>}
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,background:T.bg,padding:"8px 10px",borderRadius:T.r}}>
                <strong style={{color:T.textSec}}>Criteria:</strong> Green ≥80% on-plan · Amber 60–80% · Red &lt;60%<br/>
                Impact grade reflects whether shipped work moved intended OKRs.
              </div>
            </div>
          </div>

          {/* LENS 1: Initiative Health */}
          <div className="card">
            <div className="lens-header" style={{justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div className="lens-num">1</div>
                <div><div>Initiative Health</div><div className="lens-sub">Milestone tracking</div></div>
              </div>
            </div>
            <div>
              {milestones.map(m=>(
                <div className="milestone" key={m.id}>
                  <MSBadge status={m.status}/>
                  <div className="ms-name">{m.name}</div>
                  <div className="ms-phase">{m.phase}</div>
                  <div className="ms-date">{m.date}</div>
                  {isAdmin&&<button className="btn btn-ghost btn-sm" style={{padding:"0 8px",fontSize:12}}
                    onClick={()=>setMilestones(ms=>ms.filter(x=>x.id!==m.id))}><X size={14}/></button>}
                </div>
              ))}
              {milestones.length===0&&<div style={{padding:"20px 14px",textAlign:"center",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>No milestones yet — add one below.</div>}
            </div>
            {isAdmin&&(
              <div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <input className="bl-input" style={{flex:2,minWidth:160}} placeholder="Milestone name…" value={newMs.name} onChange={e=>setNewMs(m=>({...m,name:e.target.value}))}/>
                <select className="bl-select" style={{flex:1,minWidth:100}} value={newMs.phase} onChange={e=>setNewMs(m=>({...m,phase:e.target.value}))}>
                  <option>Discovery</option><option>Delivery</option>
                </select>
                <select className="bl-select" style={{flex:1,minWidth:110}} value={newMs.status} onChange={e=>setNewMs(m=>({...m,status:e.target.value}))}>
                  <option value="not-started">Not started</option><option value="on-track">On track</option>
                  <option value="at-risk">At risk</option><option value="off-track">Off track</option>
                  <option value="delayed">Delayed</option><option value="complete">Complete</option>
                </select>
                <input className="bl-input" style={{width:100}} type="text" placeholder="Date" value={newMs.date} onChange={e=>setNewMs(m=>({...m,date:e.target.value}))}/>
                <button className="btn btn-primary btn-sm" disabled={!newMs.name.trim()}
                  onClick={()=>{setMilestones(ms=>[...ms,{...newMs,id:Date.now()}]);setNewMs({name:"",phase:"Discovery",status:"not-started",date:""})}}>
                  + Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LENS 3: Auto-computed signals */}
        <div className="card">
          <div className="lens-header">
            <div className="lens-num">3</div>
            <div><div>User & Adoption Signals</div><div className="lens-sub">Auto-computed from data</div></div>
          </div>
          <div style={{padding:"12px 14px"}}>
            {signals.map(s=>(
              <div key={s.key} className={`signal ${s.sev}`}>
                <div className={`signal-dot ${s.sev}`}/>
                <div className="signal-body">
                  <div className="signal-head">{s.head}</div>
                  <div className="signal-text">{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({allData,selQ,compQ,onSelQChange,onCompQChange,availableQs,onEditQ,rag,setRag,milestones,setMilestones,T,isAdmin,tab,setTab}){
  // Impact filters — arrays for multi-select
  const [impactRoles, setImpactRoles] = useState([])  // empty = all
  const [impactBUs,   setImpactBUs]   = useState([])  // empty = all
  // Adoption filters
  const [adoptPlatforms, setAdoptPlatforms] = useState([])
  const [adoptBUs,       setAdoptBUs]       = useState([])

  const qs=QUARTERS.filter(q=>allData[q])
  const prevQ=compQ||(qs[qs.indexOf(selQ)-1])
  const tip=useCallback(props=><BloomTip {...props} T={T}/>,[T])

  // Multi-select filter: combine deltas from all selected roles/BUs (average)
  const applyMultiFilters = useCallback((base, roles, bus) => {
    if(!base) return base
    const roleList = roles.length > 0 ? roles : []
    const buList   = bus.length > 0   ? bus   : []
    if(roleList.length === 0 && buList.length === 0) return base

    // Average the deltas across selected segments
    const avgDelta = (list, MAP) => {
      if(!list.length) return {}
      const keys = ["csat","efficiency","discoverability","confidence","handoff","zhUmux","sbUmux"]
      const result = {}
      keys.forEach(k => {
        const sum = list.reduce((acc, seg) => acc + (MAP[seg]?.[k] || 0), 0)
        result[k] = sum / list.length
      })
      return result
    }
    const rd = avgDelta(roleList, ROLE_DELTA)
    const bd = avgDelta(buList,   BU_DELTA)
    const out = { ...base }
    const SCORE_KEYS = ["csat","efficiency","discoverability","confidence","handoff"]
    const UMUX_KEYS  = ["zhUmux","sbUmux"]
    SCORE_KEYS.forEach(k => {
      if(out[k] != null) out[k] = Math.min(5, Math.max(1, Math.round((out[k] + (rd[k]||0) + (bd[k]||0)) * 10) / 10))
    })
    UMUX_KEYS.forEach(k => {
      if(out[k] != null) out[k] = Math.min(100, Math.max(0, Math.round(out[k] + (rd[k]||0) + (bd[k]||0))))
    })
    if(out.codeAndroid != null) out.codeAndroidCompose = Math.round(out.codeAndroid * .42)
    return out
  }, [])

  // Filtered current/prev data
  const curr = useMemo(() => applyMultiFilters(allData[selQ]||{}, impactRoles, impactBUs), [allData, selQ, impactRoles, impactBUs, applyMultiFilters])
  const prev = useMemo(() => applyMultiFilters(allData[prevQ]||{}, impactRoles, impactBUs), [allData, prevQ, impactRoles, impactBUs, applyMultiFilters])

  // Chart data — filtered for survey, raw for adoption
  const chartData = useMemo(() => qs.map(q => ({
    q,
    ...applyMultiFilters(allData[q], impactRoles, impactBUs),
    _rawCodeWeb: allData[q]?.codeWeb,
    _rawCodeIOS: allData[q]?.codeIOS,
    _rawCodeAndroid: allData[q]?.codeAndroid,
    _rawCodeAndroidCompose: allData[q]?.codeAndroid ? Math.round(allData[q].codeAndroid * .42) : null,
    _rawFigmaInserts: allData[q]?.figmaInserts,
    _rawDetaches: allData[q]?.detaches,
    _rawCustomWeb: allData[q]?.customWeb,
    _rawCustomIOS: allData[q]?.customIOS,
    _rawCustomAndroid: allData[q]?.customAndroid,
  })), [qs, allData, impactRoles, impactBUs, applyMultiFilters])

  const signals=useMemo(()=>computeSignals(allData,selQ,prevQ),[allData,selQ,prevQ])
  const criticalCount=signals.filter(s=>s.sev==="err").length
  const warnCount=signals.filter(s=>s.sev==="warn").length
  const detachRate=curr.figmaInserts?Math.round((curr.detaches/curr.figmaInserts)*100):null

  // Adoption BU-filtered multiplier — average across selected BUs
  const rawCurr = allData[selQ] || {}
  const rawPrev = allData[prevQ] || {}

  const adoptVal = (key, raw) => {
    if(raw == null) return null
    if(!adoptBUs.length) return raw
    const mults = adoptBUs.map(bu => ADOPTION_BU_MULTIPLIER[bu]?.[key]).filter(m => m != null)
    if(!mults.length) return raw
    const avg = mults.reduce((a,b) => a+b, 0) / mults.length
    return Math.round(raw * avg)
  }

  // Platform visibility — empty array = show all
  const showFigma   = adoptPlatforms.length === 0 || adoptPlatforms.includes("Figma")
  const showWeb     = adoptPlatforms.length === 0 || adoptPlatforms.includes("Web")
  const showiOS     = adoptPlatforms.length === 0 || adoptPlatforms.includes("iOS")
  const showAndXML  = adoptPlatforms.length === 0 || adoptPlatforms.includes("Android (XML)")
  const showAndComp = adoptPlatforms.length === 0 || adoptPlatforms.includes("Android (Compose)")
  const showCode    = showWeb || showiOS || showAndXML || showAndComp

  // Adoption chart keys
  const adoptChartLines = [
    showWeb     && { key:"_rawCodeWeb",            name:"Web",              color:T.primary },
    showiOS     && { key:"_rawCodeIOS",            name:"iOS",              color:T.success },
    showAndXML  && { key:"_rawCodeAndroid",        name:"Android (XML)",    color:"#3498DB" },
    showAndComp && { key:"_rawCodeAndroidCompose", name:"Android (Compose)",color:"#9B59B6" },
  ].filter(Boolean)

  // Adoption stat cards
  const adoptStatCards = [
    showFigma   && { lbl:"Figma Inserts (90d)", val:fmtN(adoptVal("figmaInserts",rawCurr.figmaInserts)), r:adoptVal("figmaInserts",rawCurr.figmaInserts), p:adoptVal("figmaInserts",rawPrev.figmaInserts) },
    showFigma   && { lbl:"Detach Rate", val:rawCurr.figmaInserts?`${detachRate}%`:"—", r:detachRate, p:rawPrev.figmaInserts?Math.round((rawPrev.detaches/rawPrev.figmaInserts)*100):null, inv:true },
    showWeb     && { lbl:"Web Inserts", val:fmtN(adoptVal("codeWeb",rawCurr.codeWeb)), r:adoptVal("codeWeb",rawCurr.codeWeb), p:adoptVal("codeWeb",rawPrev.codeWeb) },
    showiOS     && { lbl:"iOS Inserts", val:fmtN(adoptVal("codeIOS",rawCurr.codeIOS)), r:adoptVal("codeIOS",rawCurr.codeIOS), p:adoptVal("codeIOS",rawPrev.codeIOS) },
    showAndXML  && { lbl:"Android (XML)", val:fmtN(adoptVal("codeAndroid",rawCurr.codeAndroid)), r:adoptVal("codeAndroid",rawCurr.codeAndroid), p:adoptVal("codeAndroid",rawPrev.codeAndroid) },
    showAndComp && { lbl:"Android (Compose)", val:fmtN(rawCurr.codeAndroidCompose||Math.round((rawCurr.codeAndroid||0)*.42)), r:rawCurr.codeAndroidCompose, p:rawPrev.codeAndroidCompose },
  ].filter(Boolean)

  const impactFilterActive = impactRoles.length > 0 || impactBUs.length > 0
  const adoptFilterActive  = adoptPlatforms.length > 0 || adoptBUs.length > 0

  // Role/BU option lists (without "All X" — that's handled by empty array)
  const ROLE_OPTS = ROLE_FILTERS.slice(1)
  const BU_OPTS   = BU_FILTERS.slice(1)
  const PLATFORM_OPTS = PLATFORM_FILTERS.slice(1)
  const ADOPT_BU_OPTS = ADOPTION_BU_FILTERS.slice(1)

  return(
    <div className="page">
      {/* -- IMPACT tab --------------------------------------------------- */}
      {tab==="Impact"&&(
        <>
          {/* Filter bar */}
          <div style={{display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap",marginBottom:14,padding:"14px 16px",background:T.surface,borderRadius:8,border:`1px solid ${T.border}`}}>
            <Dropdown label="Quarter" value={selQ} options={availableQs} onChange={q=>{onSelQChange(q);if(compQ===q)onCompQChange(null)}}/>
            <Dropdown label="Compare" value={compQ} options={["None",...availableQs.filter(q=>q!==selQ)]} onChange={q=>onCompQChange(q==="None"?null:q)} placeholder="None"/>
            <div style={{width:1,height:32,background:T.border,flexShrink:0,alignSelf:"flex-end",marginBottom:6}}/>
            <MultiSelect label="Role" options={ROLE_OPTS} values={impactRoles} onChange={setImpactRoles} T={T}/>
            <MultiSelect label="Org function" options={BU_OPTS} values={impactBUs} onChange={setImpactBUs} T={T}/>
            {impactFilterActive&&(
              <button onClick={()=>{setImpactRoles([]);setImpactBUs([])}} className="btn btn-ghost btn-sm" style={{alignSelf:"flex-end",marginLeft:"auto"}}>
                <X size={13}/> Clear
              </button>
            )}
          </div>
          {impactFilterActive&&(
            <div className="banner info" style={{marginBottom:12}}>
              <div className="banner-icon"><Search size={18}/></div>
              <div>
                <div className="banner-title">Filtered view — {[...impactRoles,...impactBUs].join(" · ")}</div>
                <div className="banner-text">Metrics reflect the selected segment. Sample sizes may be smaller.</div>
              </div>
            </div>
          )}
          {compQ&&<div className="compare-bar" style={{marginBottom:12}}>Comparing <strong style={{margin:"0 4px"}}>{selQ}</strong> vs <strong style={{margin:"0 4px"}}>{compQ}</strong></div>}

          {/* Survey score cards - UMUX gauge style */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:12}}>
            {[
              {k:"csat",l:"CSAT",t:4.0,max:5,q:"How satisfied are you with the design system overall?"},
              {k:"efficiency",l:"Efficiency",t:4.0,max:5,q:"The design system helps me complete my work faster."},
              {k:"discoverability",l:"Discoverability",t:3.8,max:5,q:"I can easily find the components and patterns I need."},
              {k:"confidence",l:"Confidence",t:4.0,max:5,q:"I feel confident that I’m using the design system correctly."},
              {k:"handoff",l:"Handoff",t:3.8,max:5,q:"The design system makes designer–engineer handoff smoother."},
            ].map(({k,l,t,max,q})=>{
              const v=curr[k], ok=v!=null&&v>=t, pct=v!=null?(v/max)*100:null
              return(
                <div className="card card-pad" key={k} style={{display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span className="stat-lbl" style={{margin:0}}>{l}</span>
                    <InfoTip text={q} T={T}/>
                  </div>
                  <div style={{fontSize:24,lineHeight:"28px",fontWeight:580,color:v==null?T.textMuted:ok?T.primary:T.error,lineHeight:1}}>{v!=null?fmt(v):"—"}</div>
                  <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>/5.0 · target ≥{t}</div>
                  {pct!=null&&<>
                    <div style={{height:5,background:T.bg,borderRadius:3,overflow:"hidden",position:"relative"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:ok?T.primary:T.error,borderRadius:3}}/>
                      <div style={{position:"absolute",top:0,left:`${(t/max)*100}%`,width:2,height:"100%",background:T.warning,borderRadius:2}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>
                      <span>0</span><span style={{color:T.warning}}>target</span><span>{max}</span>
                    </div>
                  </>}
                  <div style={{marginTop:2}}><TrendBadge curr={v} prev={prev[k]}/></div>
                </div>
              )
            })}
          </div>

          {/* UMUX gauges */}
          <div className="g2" style={{marginBottom:12}}>
            {["zhUmux","sbUmux"].map(k=>{
              const v=curr[k], ok=v!=null&&v>=70, lbl=k==="zhUmux"?"Zeroheight":"Storybook"
              return(
                <div className="card card-pad" key={k}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span className="chart-title" style={{marginBottom:0}}>{lbl} · UMUX</span>
                    <InfoTip text="UMUX-Lite score (0-100). Measures perceived usability and usefulness. Score >=70 is acceptable. Surveyed separately for Zeroheight (docs) and Storybook (code)." T={T}/>
                  </div>
                  <div className="umux-val" style={{color:v==null?T.textMuted:ok?T.primary:T.warning}}>{v!=null?Math.round(v):"—"}</div>
                  {v!=null&&<>
                    <div className="umux-bar">
                      <div style={{width:`${v}%`,height:"100%",background:ok?T.primary:T.warning,borderRadius:3}}/>
                      <div className="umux-thresh"/>
                    </div>
                    <div className="umux-lbls"><span>0 · Poor</span><span style={{color:T.warning}}>70 · Acceptable</span><span>100</span></div>
                    <div style={{marginTop:6}}><TrendBadge curr={v} prev={prev[k]}/></div>
                  </>}
                </div>
              )
            })}
          </div>

          {/* Trend charts */}
          <div className="g2" style={{marginBottom:12}}>
            <div className="card card-pad">
              <div className="chart-title">Survey Scores</div>
              <div className="chart-sub">5-pt scale · all quarters{impactFilterActive?" · filtered":""}</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chart} vertical={false}/>
                  <XAxis dataKey="q" tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[2.5,5]} tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <Tooltip content={tip}/>
                  <Line type="monotone" dataKey="csat" name="CSAT" stroke={T.primary} strokeWidth={2.5} dot={false}/>
                  <Line type="monotone" dataKey="efficiency" name="Efficiency" stroke={T.success} strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="discoverability" name="Discoverability" stroke={T.warning} strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="confidence" name="Confidence" stroke="#9B59B6" strokeWidth={2} dot={false}/>
                  <Line type="monotone" dataKey="handoff" name="Handoff" stroke="#3498DB" strokeWidth={2} dot={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card card-pad">
              <div className="chart-title">UMUX Trend</div>
              <div className="chart-sub">0–100 · dashed = 70 threshold{impactFilterActive?" · filtered":""}</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gzh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.primary} stopOpacity={.12}/><stop offset="95%" stopColor={T.primary} stopOpacity={0}/></linearGradient>
                    <linearGradient id="gsb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.success} stopOpacity={.12}/><stop offset="95%" stopColor={T.success} stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chart} vertical={false}/>
                  <XAxis dataKey="q" tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[40,100]} tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <ReferenceLine y={70} stroke={T.warning} strokeDasharray="4 3" strokeWidth={1.5}/>
                  <Tooltip content={tip}/>
                  <Area type="monotone" dataKey="zhUmux" name="Zeroheight" stroke={T.primary} fill="url(#gzh)" strokeWidth={2.5}/>
                  <Area type="monotone" dataKey="sbUmux" name="Storybook" stroke={T.success} fill="url(#gsb)" strokeWidth={2.5}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Qualitative — top 3 per platform by mentions */}
          <div className="g2">
            <div className="card">
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,color:T.success,fontWeight:500,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
                <Check size={14}/> Working well
              </div>
              {QUAL.positive.map(({platform,items})=>{
                const top = [...items].sort((a,b)=>b.n-a.n).slice(0,3)
                return(
                  <div key={platform}>
                    <div style={{padding:"6px 16px",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,background:T.bg,borderBottom:`1px solid ${T.border}`}}>{platform}</div>
                    {top.map(({text,n},i)=>(
                      <div className="qual-row" key={i}>
                        <span style={{color:T.textSec}}>{text}</span>
                        <span style={{fontSize:12,color:T.textMuted,whiteSpace:"nowrap",flexShrink:0}}>{n} mentions</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="card">
              <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,color:"#a07a00",fontWeight:500,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
                <AlertTriangle size={14}/> Needs attention
              </div>
              {QUAL.negative.map(({platform,items})=>{
                const top = [...items].sort((a,b)=>b.n-a.n).slice(0,3)
                return(
                  <div key={platform}>
                    <div style={{padding:"6px 16px",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,background:T.bg,borderBottom:`1px solid ${T.border}`}}>{platform}</div>
                    {top.map(({text,n},i)=>(
                      <div className="qual-row" key={i}>
                        <span style={{color:T.textSec}}>{text}</span>
                        <span style={{fontSize:12,color:T.textMuted,whiteSpace:"nowrap",flexShrink:0}}>{n} mentions</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* -- ADOPTION tab -------------------------------------------------- */}
      {tab==="Adoption"&&(
        <>
          {/* Filter bar */}
          <div style={{display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap",marginBottom:14,padding:"14px 16px",background:T.surface,borderRadius:8,border:`1px solid ${T.border}`}}>
            <Dropdown label="Quarter" value={selQ} options={availableQs} onChange={q=>{onSelQChange(q);if(compQ===q)onCompQChange(null)}}/>
            <Dropdown label="Compare" value={compQ} options={["None",...availableQs.filter(q=>q!==selQ)]} onChange={q=>onCompQChange(q==="None"?null:q)} placeholder="None"/>
            <div style={{width:1,height:32,background:T.border,flexShrink:0,alignSelf:"flex-end",marginBottom:6}}/>
            <MultiSelect label="Platform" options={PLATFORM_OPTS} values={adoptPlatforms} onChange={setAdoptPlatforms} T={T}/>
            <MultiSelect label="Org function" options={ADOPT_BU_OPTS} values={adoptBUs} onChange={setAdoptBUs} T={T}/>
            {adoptFilterActive&&(
              <button onClick={()=>{setAdoptPlatforms([]);setAdoptBUs([])}} className="btn btn-ghost btn-sm" style={{alignSelf:"flex-end",marginLeft:"auto"}}>
                <X size={13}/> Clear
              </button>
            )}
          </div>
          {compQ&&<div className="compare-bar" style={{marginBottom:12}}>Comparing <strong style={{margin:"0 4px"}}>{selQ}</strong> vs <strong style={{margin:"0 4px"}}>{compQ}</strong></div>}

          {/* -- FIGMA SECTION ------------------------------------ */}
          {showFigma&&(<>
            <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginBottom:10}}>Design — Figma</div>

            {/* Figma stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
              {[
                {lbl:"Inserts (90d)",val:fmtN(adoptVal("figmaInserts",rawCurr.figmaInserts)),r:adoptVal("figmaInserts",rawCurr.figmaInserts),p:adoptVal("figmaInserts",rawPrev.figmaInserts)},
                {lbl:"Detaches (90d)",val:fmtN(rawCurr.detaches),r:rawCurr.detaches,p:rawPrev.detaches,inv:true},
                {lbl:"Total Inserts (all time)",val:fmtN(
                  Object.values(allData).reduce((s,d)=>s+(d.figmaInserts||0),0)
                )},
              ].map(({lbl,val,r,p,inv})=>(
                <div className="card stat-card" key={lbl}>
                  <div className="stat-lbl">{lbl}</div>
                  <div className="stat-val">{val||"—"}</div>
                  <div className="stat-foot"><TrendBadge curr={r} prev={p} invert={inv}/></div>
                </div>
              ))}
            </div>

            {/* Figma inserts vs detaches chart */}
            <div className="card card-pad" style={{marginBottom:16}}>
              <div className="chart-title">Inserts vs Detaches</div>
              <div className="chart-sub">90-day rolling · target detach rate ≤15%</div>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chart} vertical={false}/>
                  <XAxis dataKey="q" tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <Tooltip content={tip}/>
                  <Bar dataKey="_rawFigmaInserts" name="Inserts" fill={T.primary} radius={[3,3,0,0]}/>
                  <Bar dataKey="_rawDetaches" name="Detaches" fill={T.error} radius={[3,3,0,0]} opacity={.7}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>)}

          {/* -- CODE SECTION ------------------------------------- */}
          {showCode&&(<>
            <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginBottom:10,marginTop:showFigma?8:0}}>Code</div>

            {/* Total inserts per platform */}
            {adoptStatCards.filter(c=>!c.lbl.includes("Figma")&&!c.lbl.includes("Detach")).length>0&&(
              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(adoptStatCards.filter(c=>!c.lbl.includes("Figma")&&!c.lbl.includes("Detach")).length,4)},1fr)`,gap:10,marginBottom:12}}>
                {adoptStatCards.filter(c=>!c.lbl.includes("Figma")&&!c.lbl.includes("Detach")).map(({lbl,val,r,p})=>(
                  <div className="card stat-card" key={lbl}>
                    <div className="stat-lbl">{lbl}</div>
                    <div className="stat-val">{val||"—"}</div>
                    <div className="stat-foot"><TrendBadge curr={r} prev={p}/></div>
                  </div>
                ))}
              </div>
            )}

            {/* Code inserts trend chart */}
            <div className="card card-pad" style={{marginBottom:12}}>
              <div className="chart-title">Component Inserts</div>
              <div className="chart-sub">Production usage · all quarters{adoptBUs.length>0&&` · ${adoptBUs.join(", ")}`}</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    {adoptChartLines.map(({key,color})=>(
                      <linearGradient key={key} id={`ga${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={.15}/><stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chart} vertical={false}/>
                  <XAxis dataKey="q" tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <Tooltip content={tip}/>
                  {adoptChartLines.map(({key,name,color})=>(
                    <Area key={key} type="monotone" dataKey={key} name={name} stroke={color} fill={`url(#ga${key})`} strokeWidth={2.5}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Custom components trend */}
            <div className="card card-pad" style={{marginBottom:20}}>
              <div className="chart-title">Custom Components — Product Teams</div>
              <div className="chart-sub">Decreasing = DS coverage improving · target: 0</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.chart} vertical={false}/>
                  <XAxis dataKey="q" tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:12,fill:T.textMuted}} axisLine={false} tickLine={false}/>
                  <Tooltip content={tip}/>
                  {showWeb&&<Line type="monotone" dataKey="_rawCustomWeb" name="Web" stroke={T.primary} strokeWidth={2} dot={{r:3,fill:T.primary}}/>}
                  {showiOS&&<Line type="monotone" dataKey="_rawCustomIOS" name="iOS" stroke={T.success} strokeWidth={2} dot={{r:3,fill:T.success}}/>}
                  {(showAndXML||showAndComp)&&<Line type="monotone" dataKey="_rawCustomAndroid" name="Android" stroke="#3498DB" strokeWidth={2} dot={{r:3,fill:"#3498DB"}}/>}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Per-platform detail tables */}
            {[
              showWeb&&"Web",
              showiOS&&"iOS",
              showAndXML&&"Android (XML)",
              showAndComp&&"Android (Compose)",
            ].filter(Boolean).map(platform=>(
              <div key={platform} style={{marginBottom:24}}>
                <div style={{fontSize:14,fontWeight:500,color:T.text,marginBottom:10,paddingBottom:6,borderBottom:`2px solid ${T.primary}`}}>{platform}</div>

                {/* Component inserts table */}
                <div className="card" style={{marginBottom:12}}>
                  <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:14,fontWeight:500,color:T.text}}>Component Inserts</span>
                    <span style={{fontSize:12,color:T.textMuted}}>{selQ}</span>
                  </div>
                  <table className="tbl" style={{width:"100%"}}>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th style={{textAlign:"right",width:80}}>Adoption</th>
                        <th>Projects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(COMPONENT_DATA[platform]||[]).map(({component,adoption,projects})=>(
                        <tr key={component}>
                          <td style={{fontWeight:500}}>{component}</td>
                          <td style={{textAlign:"right",fontVariantNumeric:"tabular-nums",color:T.primary,fontWeight:500}}>{adoption.toLocaleString()}</td>
                          <td style={{color:T.textMuted,fontSize:12}}>{projects.slice(0,5).join(", ")}{projects.length>5&&` +${projects.length-5} more`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Custom components table */}
                <div className="card">
                  <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:14,fontWeight:500,color:T.text}}>Custom Components</span>
                    <span style={{fontSize:12,color:T.textMuted,background:T.warningBg,padding:"2px 8px",borderRadius:12}}>{(CUSTOM_DATA[platform]||[]).reduce((s,r)=>s+r.adoption,0)} total</span>
                  </div>
                  <table className="tbl" style={{width:"100%"}}>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th style={{textAlign:"right",width:80}}>Uses</th>
                        <th>Projects (reuse count)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(CUSTOM_DATA[platform]||[]).length===0?(
                        <tr><td colSpan={3} style={{textAlign:"center",color:T.textMuted,padding:20}}>No custom components — great coverage!</td></tr>
                      ):(CUSTOM_DATA[platform]||[]).map(({component,adoption,projects})=>(
                        <tr key={component}>
                          <td style={{fontWeight:500}}>{component}</td>
                          <td style={{textAlign:"right",fontVariantNumeric:"tabular-nums",color:T.error,fontWeight:500}}>{adoption}</td>
                          <td style={{color:T.textMuted,fontSize:12}}>{projects.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>)}

          {!showFigma&&!showCode&&(
            <div style={{padding:48,textAlign:"center",color:T.textMuted,fontSize:14}}>Select a platform above to view adoption data.</div>
          )}
        </>
      )}


      {/* -- DOCUMENTATION tab --------------------------------------------- */}
      {tab==="Documentation"&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:14,padding:"10px 14px",background:T.surface,borderRadius:T.r,border:`1px solid ${T.border}`}}>
            <Dropdown label="Quarter" value={selQ} options={availableQs} onChange={q=>{onSelQChange(q);if(compQ===q)onCompQChange(null)}}/>
            <Dropdown label="Compare" value={compQ} options={["None",...availableQs.filter(q=>q!==selQ)]} onChange={q=>onCompQChange(q==="None"?null:q)} placeholder="None"/>
          </div>
          <div className="g21">
            <div className="card card-pad">
              <div className="chart-title">Coverage by Platform</div><div className="chart-sub">Target ≥80%</div>
              {[{p:"Web",pct:rawCurr.docCoverage?Math.min(rawCurr.docCoverage-2,100):null},{p:"iOS",pct:rawCurr.docCoverage?Math.min(rawCurr.docCoverage-15,100):null},{p:"Android",pct:rawCurr.docCoverage?Math.min(rawCurr.docCoverage-18,100):null},{p:"Tokens",pct:rawCurr.docCoverage?Math.min(rawCurr.docCoverage+5,100):null}].map(({p,pct})=>(
                <div key={p} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,lineHeight:"16px",fontWeight:375,marginBottom:4}}>
                    <span style={{color:T.textSec,fontWeight:500}}>{p}</span>
                    <span style={{fontWeight:500,color:pct!=null?(pct>=80?T.success:T.warning):T.textMuted}}>{pct!=null?`${Math.round(pct)}%`:"—"}</span>
                  </div>
                  {pct!=null&&<div className="prog"><div className="prog-fill" style={{width:`${pct}%`,background:pct>=80?T.success:pct>=70?T.warning:T.error}}/></div>}
                </div>
              ))}
              <hr className="divider"/>
              <div style={{display:"flex",gap:20}}>
                {[{l:"ZH Sessions",v:rawCurr.zhTraffic,p:rawPrev.zhTraffic},{l:"SB Sessions",v:rawCurr.sbTraffic,p:rawPrev.sbTraffic}].map(({l,v,p})=>(
                  <div key={l}><div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginBottom:2}}>{l}</div>
                  <div style={{fontSize:18,lineHeight:"24px",fontWeight:580,color:T.text}}>{fmtN(v)||"—"}</div>
                  <TrendBadge curr={v} prev={p}/></div>
                ))}
              </div>
            </div>
            <div className="card card-pad">
              <div className="chart-title">Status breakdown</div><div className="chart-sub">{selQ}</div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart><Pie data={DOC_STATUS} cx="50%" cy="50%" innerRadius={38} outerRadius={62} dataKey="value" paddingAngle={2}>
                  {DOC_STATUS.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie><Tooltip formatter={v=>`${v}%`} contentStyle={{background:T.surface,border:`1px solid ${T.borderMid}`,borderRadius:T.r,fontSize:12}}/></PieChart>
              </ResponsiveContainer>
              {DOC_STATUS.map(s=>(
                <div key={s.name} style={{display:"flex",justifyContent:"space-between",fontSize:12,lineHeight:"16px",fontWeight:375,marginBottom:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:2,background:s.color}}/><span style={{color:T.textSec}}>{s.name}</span></div>
                  <span style={{fontWeight:500,color:T.text}}>{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* -- PERFORMANCE tab ----------------------------------------------- */}
      {tab==="Performance"&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:14,padding:"10px 14px",background:T.surface,borderRadius:T.r,border:`1px solid ${T.border}`}}>
            <Dropdown label="Quarter" value={selQ} options={availableQs} onChange={q=>{onSelQChange(q);if(compQ===q)onCompQChange(null)}}/>
            <Dropdown label="Compare" value={compQ} options={["None",...availableQs.filter(q=>q!==selQ)]} onChange={q=>onCompQChange(q==="None"?null:q)} placeholder="None"/>
          </div>
          <PerformanceTab allData={allData} selQ={selQ} compQ={compQ} rag={rag} setRag={setRag} milestones={milestones} setMilestones={setMilestones} T={T} isAdmin={isAdmin}/>
        </>
      )}
    </div>
  )
}

// ─── FIGMA COMPONENT MANAGER ─────────────────────────────────────────────────
function FigmaManager({components,hidden,onToggle,T}){
  const [search,setSearch]=useState("")
  const visible=components.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()))
  if(!components.length) return null
  const hiddenCount=hidden.length
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <input className="bl-input" placeholder="Filter components…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1}}/>
        <span style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,whiteSpace:"nowrap"}}>{components.length} total · {hiddenCount} hidden</span>
      </div>
      <div className="card">
        <div style={{display:"flex",padding:"7px 12px",borderBottom:`1px solid ${T.border}`,fontSize:12,lineHeight:"16px",fontWeight:500,color:T.textMuted}}>
          <span style={{flex:1}}>Component</span><span style={{width:70,textAlign:"right"}}>Inserts</span><span style={{width:60,textAlign:"center"}}>Track</span>
        </div>
        <div style={{maxHeight:280,overflowY:"auto"}}>
          {visible.map(c=>(
            <div key={c.name} className={`comp-row ${hidden.includes(c.name)?"hidden":""}`}>
              <span className="comp-name">{c.name}</span>
              <span className="comp-stat">{fmtN(c.inserts_90d||c.total_instances||0)}</span>
              <div style={{width:60,display:"flex",justifyContent:"center"}}>
                <Toggle on={!hidden.includes(c.name)} onChange={()=>onToggle(c.name)}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── GA PROPERTIES MANAGER ────────────────────────────────────────────────────
function GAManager({properties,onChange,T}){
  const [adding,setAdding]=useState(false)
  const [form,setForm]=useState({name:"",propertyId:"",proxyUrl:""})
  const METRICS=[{v:"zhTraffic",l:"Zeroheight Traffic"},{v:"sbTraffic",l:"Storybook Traffic"},{v:"custom1",l:"Custom metric 1"},{v:"custom2",l:"Custom metric 2"}]
  return(
    <div>
      <div className="how-to">
        <div className="how-to-lbl">GA4 API Setup (once per property)</div>
        {[{t:<>Create a <strong>service account</strong> in Google Cloud Console for your GA4 property</>},{t:<>Grant it <code>Analytics Viewer</code> role in GA4 Admin → Account/Property access</>},{t:<>Deploy the DS proxy to Vercel with env vars <code>GA4_PROPERTY_ID</code> and <code>GOOGLE_SA_KEY</code></>},{t:"Paste the Vercel proxy URL below — repeat for each property"}].map((s,i)=>(
          <div className="how-step" key={i}><div className="step-n">{i+1}</div><div>{s.t}</div></div>
        ))}
      </div>
      <div className="card" style={{marginBottom:12}}>
        {properties.length===0&&<div style={{padding:"20px",textAlign:"center",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>No GA properties configured yet.</div>}
        {properties.map((p,i)=>(
          <div key={i} className="ga-row">
            <div style={{flex:1}}>
              <div className="ga-name">{p.name}</div>
              <div className="ga-id">Property ID: {p.propertyId||"—"} · Maps to: {METRICS.find(m=>m.v===p.metric)?.l||p.metric}</div>
              {p.proxyUrl&&<div className="ga-id" style={{wordBreak:"break-all"}}>{p.proxyUrl}</div>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={()=>onChange(properties.filter((_,j)=>j!==i))}>Remove</button>
          </div>
        ))}
      </div>
      {adding?(
        <div className="card card-pad">
          <div style={{fontWeight:500,fontSize:14,lineHeight:"18px",fontWeight:375,color:T.text,marginBottom:12}}>Add GA property</div>
          <div className="field"><div className="field-lbl">Display name</div><input className="bl-input" placeholder="e.g. Zeroheight" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="field"><div className="field-lbl">GA4 Property ID</div><input className="bl-input" placeholder="e.g. 123456789" value={form.propertyId} onChange={e=>setForm(f=>({...f,propertyId:e.target.value}))}/></div>
          <div className="field"><div className="field-lbl">Vercel proxy URL</div><input className="bl-input" placeholder="https://your-proxy.vercel.app/api/ga" value={form.proxyUrl} onChange={e=>setForm(f=>({...f,proxyUrl:e.target.value}))}/></div>
          <div className="field">
            <div className="field-lbl">Maps to dashboard metric</div>
            <select className="bl-select" value={form.metric||""} onChange={e=>setForm(f=>({...f,metric:e.target.value}))}>
              <option value="">— select —</option>
              {METRICS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div className="action-row">
            <button className="btn btn-primary btn-sm" disabled={!form.name||!form.metric} onClick={()=>{onChange([...properties,{...form}]);setForm({name:"",propertyId:"",proxyUrl:""});setAdding(false)}}>Add property</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
          </div>
        </div>
      ):(
        <button className="btn btn-outlined btn-sm" onClick={()=>setAdding(true)}>+ Add GA property</button>
      )}
    </div>
  )
}

// ─── SOURCES / SETTINGS ───────────────────────────────────────────────────────
function OrgFunctionManager({mapping,onSave,T}){
  const BU_LIST=["Marketplace","Pay","Infrastructure","Group Function","Security & Privacy","Engineering","DSA","Vinted Go"]
  const [search,setSearch]=useState("")
  const [editTeam,setEditTeam]=useState(null)
  const [editBU,setEditBU]=useState("")
  const teams=Object.keys(mapping).sort()
  const filtered=search?teams.filter(t=>t.toLowerCase().includes(search.toLowerCase())||mapping[t].toLowerCase().includes(search.toLowerCase())):teams
  const byBU=BU_LIST.reduce((acc,bu)=>{acc[bu]=filtered.filter(t=>mapping[t]===bu);return acc},{})
  const reassign=(team,bu)=>{onSave({...mapping,[team]:bu});setEditTeam(null)}
  return(
    <div style={{marginTop:20}}>
      <div style={{fontSize:14,lineHeight:"18px",fontWeight:500,color:T.text,marginBottom:4}}>Org function mapping</div>
      <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted,marginBottom:12}}>Controls how survey responses are segmented in the Org function filter.</div>
      <input className="bl-input" placeholder="Search teams..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:"100%",marginBottom:10}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxHeight:420,overflowY:"auto"}}>
        {BU_LIST.map(bu=>{
          const list=byBU[bu]||[]
          if(!list.length) return null
          return(
            <div key={bu} className="card" style={{marginBottom:0,alignSelf:"start"}}>
              <div style={{padding:"7px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.primary}}>{bu}</span>
                <span style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>{list.length}</span>
              </div>
              {list.map(team=>(
                <div key={team} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                  {editTeam===team?(
                    <>
                      <span style={{flex:1,color:T.text,fontWeight:500}}>{team}</span>
                      <select className="bl-select" style={{fontSize:12,lineHeight:"16px",fontWeight:375,height:26,padding:"0 4px"}} value={editBU} onChange={e=>setEditBU(e.target.value)}>
                        {BU_LIST.map(b=><option key={b} value={b}>{b}</option>)}
                      </select>
                      <button className="btn btn-primary btn-sm" style={{height:26,padding:"0 8px"}} onClick={()=>reassign(team,editBU)}><Check size={13}/></button>
                      <button className="btn btn-ghost btn-sm" style={{height:26,padding:"0 8px"}} onClick={()=>setEditTeam(null)}><X size={14}/></button>
                    </>
                  ):(
                    <>
                      <span style={{flex:1,color:T.textSec}}>{team}</span>
                      <button onClick={()=>{setEditTeam(team);setEditBU(mapping[team]||BU_LIST[0])}}
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:14,lineHeight:"18px",fontWeight:375,color:T.textMuted,padding:"0 2px"}}><Pencil size={13}/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}


function Settings({config,setConfig,figmaComponents,setFigmaComponents,figmaHidden,setFigmaHidden,gaProperties,setGaProperties,onSave,T}){
  const [active,setActive]=useState("overview")
  const [orgMapping,setOrgMapping]=useState(()=>({...TEAM_TO_BU}))
  useEffect(()=>{(async()=>{try{const d=await window.storage.get("ds:orgMapping");if(d?.value)setOrgMapping(JSON.parse(d.value))}catch{}})()},[])  
  const saveOrgMapping=async m=>{setOrgMapping(m);try{await window.storage.set("ds:orgMapping",JSON.stringify(m),false)}catch{}}
  const [fmt_,setFmt]=useState({})
  const [testRes,setTestRes]=useState({})
  const [testing,setTesting]=useState({})
  const [saved,setSaved]=useState(false)
  // Roles state (inline, no separate component)
  const [members,setMembers]=useState([])
  const [memberEmail,setMemberEmail]=useState("")
  const [memberRole,setMemberRole]=useState("viewer")

  useEffect(()=>{
    ;(async()=>{try{const d=await window.storage.get("ds:members");if(d?.value)setMembers(JSON.parse(d.value))}catch{}})()
  },[])
  const saveMembers=async m=>{setMembers(m);try{await window.storage.set("ds:members",JSON.stringify(m),false)}catch{}}
  const addMember=()=>{if(!memberEmail.trim()||members.find(m=>m.email===memberEmail.trim()))return;saveMembers([...members,{email:memberEmail.trim(),role:memberRole}]);setMemberEmail("")}

  const save=async()=>{await onSave();setSaved(true);setTimeout(()=>setSaved(false),2000)}

  const testUrl=async(key,url)=>{
    setTesting(t=>({...t,[key]:true}))
    try{
      const r=await fetch(url.trim(),{mode:"cors"})
      if(!r.ok) throw new Error(`HTTP ${r.status}`)
      const txt=await r.text()
      const lines=txt.trim().split("\n").filter(Boolean)
      if(lines.length<2) throw new Error("No data rows found")
      setTestRes(v=>({...v,[key]:{ok:true,msg:`OK: ${lines.length-1} rows`}}))
    }catch(e){setTestRes(v=>({...v,[key]:{ok:false,msg:`Error: ${e.message}`}}))}
    setTesting(t=>({...t,[key]:false}))
  }

  const getStatus=key=>{
    if(testRes[key]?.ok) return "ok"
    if(config[key]?.trim()) return "warn"
    return "none"
  }

  const SOURCES=[
    {id:"survey",label:"Quarterly Survey",icon:<ClipboardList size={18}/>,desc:"Upload your GetDX CSV export. Filenames with YYYY Q# will auto-detect the quarter.",
      steps:[{t:"In GetDX, open your quarterly survey"},{t:"Export → Download as CSV"},{t:"Name the file with quarter (e.g. 'Survey_2025_Q1.csv') for auto-detection"},{t:"Upload below"}],
      type:"upload",key:"surveyCsv",uploadLabel:"Drop GetDX survey CSV here",uploadHint:"Filename like '2025_Q1_survey.csv' auto-detects the quarter"},
    {id:"docstatus",label:"Documentation Status",icon:<FileText size={18}/>,desc:"Publish your doc status tracking sheet as CSV from Google Sheets.",
      steps:[{t:"Open your doc status Google Sheet"},{t:<>File → Share → Publish to web</>},{t:"Select correct tab, format: CSV"},{t:"Copy URL and paste below"}],
      type:"sheets",key:"docStatusUrl",placeholder:"https://docs.google.com/spreadsheets/d/e/…/pub?output=csv",
      format:"Component, Platform, Status, Quarter\nButton, Web, Documented, Q1 2025"},
    {id:"figma",label:"Figma Analytics",icon:<TrendingUp size={18}/>,desc:"Export component analytics from Figma (Enterprise only). After upload, you can hide irrelevant components.",
      steps:[{t:"Figma → Analytics → Export as CSV (Enterprise)"},{t:"Upload below, then manage which components to track"}],
      type:"upload",key:"figmaCsv",uploadLabel:"Drop Figma Analytics CSV here"},
    {id:"umux-zh",label:"UMUX — Zeroheight",icon:<BarChart2 size={18}/>,desc:"Upload Hotjar UMUX survey CSV for your Zeroheight project.",
      steps:[{t:"Hotjar → Surveys → your Zeroheight UMUX survey"},{t:"Download responses → CSV"},{t:"Upload below"}],
      type:"upload",key:"umuxZhCsv",uploadLabel:"Drop Zeroheight UMUX CSV here",
      format:"q1_meets_needs, q2_frustrating, q3_easy_to_use, q4_time_consuming\n6, 2, 5, 2"},
    {id:"umux-sb",label:"UMUX — Storybook",icon:<BookOpen size={18}/>,desc:"Upload Hotjar UMUX survey CSV for your Storybook project.",
      steps:[{t:"Hotjar → Surveys → your Storybook UMUX survey"},{t:"Download responses → CSV"},{t:"Upload below"}],
      type:"upload",key:"umuxSbCsv",uploadLabel:"Drop Storybook UMUX CSV here",
      format:"q1_meets_needs, q2_frustrating, q3_easy_to_use, q4_time_consuming\n5, 3, 4, 3"},
    {id:"ga",label:"Google Analytics",icon:<TrendingUp size={18}/>,desc:"Connect multiple GA4 properties — each maps to a specific dashboard metric.",
      type:"ga"},
  ]

  return(
    <div className="settings-layout">
      <div className="settings-side">
        <div className="side-lbl">Data sources</div>
        <div className={`side-item ${active==="overview"?"active":""}`} onClick={()=>setActive("overview")}><BarChart2 size={15}/> All sources</div>
        {SOURCES.map(s=>(
          <div key={s.id} className={`side-item ${active===s.id?"active":""}`} onClick={()=>setActive(s.id)}>
            <span>{s.icon}</span><span style={{flex:1}}>{s.label}</span>
            {s.key&&<div className={`side-dot ${getStatus(s.key)}`}/>}
          </div>
        ))}
        <div className="side-lbl" style={{marginTop:16}}>Access</div>
        <div className={`side-item ${active==="roles"?"active":""}`} onClick={()=>setActive("roles")}><Users size={15}/> Roles & members
        </div>
        <hr className="divider"/>
        <button className="btn btn-primary btn-sm" style={{width:"100%"}} onClick={save}>{saved?"Saved!":"Save settings"}</button>
      </div>

      <div className="settings-main">
        {active==="overview"&&(
          <>
            <div className="src-title">Settings</div>
            <div className="src-desc">Configure data sources and team access for your DS Metrics dashboard.</div>
            <div className="banner info">
              <div className="banner-icon"><Lock size={18}/></div>
              <div>
                <div className="banner-title">Who can see this dashboard?</div>
                <div className="banner-text">In Vercel → Settings → Deployment Protection → Vercel Authentication. Whitelist team emails, or connect your Google Workspace domain so anyone with <code>@yourcompany.com</code> can log in. No code needed.</div>
              </div>
            </div>
            <div style={{fontSize:14,lineHeight:"18px",fontWeight:375,color:T.textSec,marginBottom:8}}>Data sources</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
              {SOURCES.map(s=>(
                <div key={s.id} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setActive(s.id)}>
                  <div style={{width:8,height:8,borderRadius:"50%",flexShrink:0,background:s.key?getStatus(s.key)==="ok"?T.success:getStatus(s.key)==="warn"?T.warning:T.borderStrong:T.borderStrong}}/>
                  <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14,lineHeight:"18px",fontWeight:375,color:T.text}}>{s.icon} {s.label}</div>
                  <div style={{fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>{s.key?getStatus(s.key)==="ok"?"Connected":getStatus(s.key)==="warn"?"Configured — not tested":"Not configured":"Manage →"}</div></div>
                </div>
              ))}
            </div>
          </>
        )}

        {active==="roles"&&(
          <>
            <div className="src-title">Roles & members</div>
            <div className="src-desc">Manage who has access to this dashboard and what they can do.</div>
            <div className="banner info">
              <div className="banner-icon"><Info size={18}/></div>
              <div>
                <div className="banner-title">How roles work in production</div>
                <div className="banner-text"><strong>Admins</strong> see Settings and can configure sources. <strong>Viewers</strong> see the dashboard only. In production, enforce via Vercel Authentication + your auth provider.</div>
              </div>
            </div>
            <div className="card" style={{marginBottom:16}}>
              <div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,fontSize:12,lineHeight:"16px",fontWeight:500,color:T.textMuted,display:"grid",gridTemplateColumns:"1fr 100px 80px"}}>
                <span>Email</span><span>Role</span><span/>
              </div>
              {members.length===0&&<div style={{padding:"20px",textAlign:"center",fontSize:12,lineHeight:"16px",fontWeight:375,color:T.textMuted}}>No team members added yet.</div>}
              {members.map(m=>(
                <div key={m.email} style={{display:"grid",gridTemplateColumns:"1fr 100px 80px",padding:"9px 14px",borderBottom:`1px solid ${T.border}`,alignItems:"center"}}>
                  <span style={{fontSize:14,lineHeight:"18px",fontWeight:375,color:T.text}}>{m.email}</span>
                  <select className="bl-select" style={{fontSize:12,lineHeight:"16px",fontWeight:375}} value={m.role} onChange={e=>saveMembers(members.map(x=>x.email===m.email?{...x,role:e.target.value}:x))}>
                    <option value="admin">Admin</option><option value="viewer">Viewer</option>
                  </select>
                  <button className="btn btn-danger btn-sm" onClick={()=>saveMembers(members.filter(x=>x.email!==m.email))}>Remove</button>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <div className="field" style={{flex:1,marginBottom:0}}>
                <div className="field-lbl">Email address</div>
                <input className="bl-input" value={memberEmail} onChange={e=>setMemberEmail(e.target.value)} placeholder="teammate@yourcompany.com" onKeyDown={e=>e.key==="Enter"&&addMember()}/>
              </div>
              <select className="bl-select" style={{width:100,marginBottom:1}} value={memberRole} onChange={e=>setMemberRole(e.target.value)}>
                <option value="admin">Admin</option><option value="viewer">Viewer</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={addMember} disabled={!memberEmail.trim()}>+ Add</button>
            </div>
          </>
        )}

        {SOURCES.filter(s=>s.id===active).map(src=>(
          <div key={src.id}>
            <div style={{fontSize:24,marginBottom:8}}>{src.icon}</div>
            <div className="src-title">{src.label}</div>
            <div className="src-desc">{src.desc}</div>
            {src.steps&&<div className="how-to"><div className="how-to-lbl">How to export</div>{src.steps.map((s,i)=><div className="how-step" key={i}><div className="step-n">{i+1}</div><div>{s.t}</div></div>)}</div>}
            {src.format&&<div className="fmt-box">
              <div className="fmt-trigger" onClick={()=>setFmt(f=>({...f,[src.id]:!f[src.id]}))}>
                <span>Expected column format</span><span>{fmt_[src.id]?"↑":"↓"}</span>
              </div>
              {fmt_[src.id]&&<div className="fmt-body">{src.format}</div>}
            </div>}
            {src.type==="upload"&&(
              <>
                <CSVUpload label={src.uploadLabel} hint={src.uploadHint} T={T}
                  onParsed={(rows,raw,detectedQ)=>{
                    setConfig(c=>({...c,[src.key]:raw}))
                    if(src.id==="figma"&&rows.length)setFigmaComponents(rows.map(r=>({name:r.component_name||r.name||"Unknown",...r})))
                  }}/>
                {src.id==="survey"&&<OrgFunctionManager mapping={orgMapping} onSave={saveOrgMapping} T={T}/>}
                {src.id==="figma"&&figmaComponents.length>0&&(
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:14,lineHeight:"18px",fontWeight:375,color:T.text,marginBottom:8}}>Component tracking — toggle to include/exclude</div>
                    <FigmaManager components={figmaComponents} hidden={figmaHidden} onToggle={name=>setFigmaHidden(h=>h.includes(name)?h.filter(x=>x!==name):[...h,name])} T={T}/>
                  </div>
                )}
              </>
            )}
            {src.type==="sheets"&&(
              <>
                <div className="field"><div className="field-lbl">Published CSV URL</div>
                  <input className={`bl-input ${testRes[src.key]?.ok===true?"ok":testRes[src.key]?.ok===false?"err":""}`}
                    value={config[src.key]||""} placeholder={src.placeholder}
                    onChange={e=>setConfig(c=>({...c,[src.key]:e.target.value}))}/>
                </div>
                <div className="action-row">
                  <button className="btn btn-outlined btn-sm" disabled={testing[src.key]||!config[src.key]?.trim()} onClick={()=>testUrl(src.key,config[src.key])}>
                    {testing[src.key]?"Testing…":"Test connection"}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={save}>{saved?<><Check size={13}/> Saved!</>:"Save"}</button>
                  {testRes[src.key]&&<span className={testRes[src.key].ok?"test-ok":"test-err"}>{testRes[src.key].msg}</span>}
                </div>
              </>
            )}
            {src.type==="ga"&&<GAManager properties={gaProperties} onChange={p=>setGaProperties(p)} T={T}/>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [themeMode,setThemeMode]=useState("system")
  const [dark,setDark]=useState(()=>getSystemPref()==="dark")
  const [role,setRole]=useState("admin")
  const [view,setView]=useState("dashboard")
  const [selQ,setSelQ]=useState("Q1 '25")
  const [compQ,setCompQ]=useState("Q4 '24")
  const [allData,setAllData]=useState(SEED)
  const [rag,setRag]=useState(SEED_RAG)
  const [milestones,setMilestones]=useState(SEED_MILESTONES)
  const [config,setConfig]=useState({})
  const [figmaComponents,setFigmaComponents]=useState([])
  const [figmaHidden,setFigmaHidden]=useState([])
  const [gaProperties,setGaProperties]=useState([])
  const [editingQ,setEditingQ]=useState(null)
  const isAdmin=role==="admin"

  // System theme listener
  useEffect(()=>{
    if(themeMode==="system"){
      if(!window.matchMedia) return
      const mq=window.matchMedia("(prefers-color-scheme: dark)")
      const fn=e=>setDark(e.matches)
      mq.addEventListener("change",fn)
      setDark(mq.matches)
      return()=>mq.removeEventListener("change",fn)
    }
    if(themeMode==="dark") setDark(true)
    if(themeMode==="light") setDark(false)
  },[themeMode])

  const T=dark?DARK:LIGHT
  injectStyles(T)

  useEffect(()=>{
    ;(async()=>{
      try{
        const [cd,dd,rd,md,ghd,gap,thd]=await Promise.allSettled([
          window.storage.get("ds:config"),window.storage.get("ds:allData"),
          window.storage.get("ds:rag"),window.storage.get("ds:milestones"),
          window.storage.get("ds:figmaHidden"),window.storage.get("ds:gaProperties"),
          window.storage.get("ds:themeMode"),
        ])
        if(cd.value?.value) setConfig(JSON.parse(cd.value.value))
        if(dd.value?.value) setAllData(JSON.parse(dd.value.value))
        if(rd.value?.value) setRag(JSON.parse(rd.value.value))
        if(md.value?.value) setMilestones(JSON.parse(md.value.value))
        if(ghd.value?.value) setFigmaHidden(JSON.parse(ghd.value.value))
        if(gap.value?.value) setGaProperties(JSON.parse(gap.value.value))
        if(thd.value?.value){const m=thd.value.value;setThemeMode(m);if(m!=="system"){setDark(m==="dark")}}
      }catch{}
    })()
  },[])

  const saveQ=useCallback(async(q,vals)=>{
    const updated={...allData,[q]:{...(allData[q]||{}),...vals}}
    setAllData(updated)
    try{await window.storage.set("ds:allData",JSON.stringify(updated),false)}catch{}
  },[allData])

  const saveAll=async()=>{
    try{
      await Promise.all([
        window.storage.set("ds:config",JSON.stringify(config),false),
        window.storage.set("ds:rag",JSON.stringify(rag),false),
        window.storage.set("ds:milestones",JSON.stringify(milestones),false),
        window.storage.set("ds:figmaHidden",JSON.stringify(figmaHidden),false),
        window.storage.set("ds:gaProperties",JSON.stringify(gaProperties),false),
        window.storage.set("ds:themeMode",themeMode,false),
      ])
    }catch{}
  }

  const changeTheme=m=>{
    setThemeMode(m)
    try{window.storage.set("ds:themeMode",m,false)}catch{}
  }

  const hasData=Object.keys(allData).length>0
  const availableQs=QUARTERS.filter(q=>allData[q])
  const [tab,setTab]=useState("Impact")
  const criticalCount=useMemo(()=>{try{const s=allData[selQ]||{};let n=0;if(s.zhUmux!=null&&s.zhUmux<70)n++;if(s.sbUmux!=null&&s.sbUmux<70)n++;if(s.csat!=null&&s.csat<4.0)n++;return n}catch{return 0}},[allData,selQ])
  const warnCount=useMemo(()=>{try{const s=allData[selQ]||{};let n=0;if(s.zhUmux!=null&&s.zhUmux>=70&&s.zhUmux<75)n++;if(s.sbUmux!=null&&s.sbUmux>=70&&s.sbUmux<75)n++;return n}catch{return 0}},[allData,selQ])

  return(
    <div className="app">
      {/* NAV */}
      <div className="nav">
        <div className="nav-logo">DS</div>
        <div className="nav-title" onClick={()=>{setView("dashboard");setTab("Impact")}}>Metrics</div>
        {view==="dashboard"&&(
          <div className="nav-tabs">
            {[{t:"Impact"},{t:"Adoption"},{t:"Documentation"},{t:"Performance",badge:criticalCount||warnCount,btype:criticalCount?"":"warn"}].map(({t,badge,btype})=>(
              <button key={t} className={`nav-tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
                {t}{!!badge&&<span className={`nav-tab-badge${btype?" "+btype:""}`}>{badge}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="nav-stretch"/>
        <div style={{display:"flex",alignItems:"center",gap:8,alignSelf:"center"}}>
          <div className="theme-toggle">
            {[{m:"light",l:<Sun size={14}/>},{m:"system",l:<Settings size={14}/>},{m:"dark",l:<Moon size={14}/>}].map(({m,l})=>(
              <button key={m} className={`theme-btn ${themeMode===m?"active":""}`} onClick={()=>changeTheme(m)} title={`${m} mode`}>{l}</button>
            ))}
          </div>
          {isAdmin&&(
            <>
              <div className="nav-divider"/>
              {view==="settings"
                ? <button className="btn btn-outlined btn-sm" onClick={()=>setView("dashboard")}><ArrowLeft size={14}/> Dashboard</button>
                : <button className="btn btn-outlined btn-sm" onClick={()=>setView("settings")}><Settings size={14}/> Configure</button>
              }
            </>
          )}
        </div>
      </div>

      {view==="dashboard"&&(
        <>
          {JSON.stringify(allData)===JSON.stringify(SEED)&&(
            <div style={{background:T.primaryLight,borderBottom:`1px solid ${T.primaryBorder}`,padding:"7px 20px",display:"flex",alignItems:"center",gap:10,fontSize:12,color:T.primary}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Eye size={14}/> Sample data.</span>
              <span>Go to <strong>Settings</strong> to connect real data sources.</span>
              {isAdmin&&<button className="btn btn-outlined btn-sm" style={{marginLeft:"auto",fontSize:12}} onClick={()=>setView("settings")}>Configure <ArrowRight size={14}/></button>}
            </div>
          )}
          <Dashboard
            allData={allData} selQ={selQ} compQ={compQ}
            onSelQChange={q=>{setSelQ(q);if(compQ===q)setCompQ(null)}}
            onCompQChange={setCompQ}
            availableQs={availableQs}
            onEditQ={setEditingQ}
            rag={rag} setRag={r=>{setRag(r);try{window.storage.set("ds:rag",JSON.stringify(r),false)}catch{}}}
            milestones={milestones} setMilestones={m=>{setMilestones(m);try{window.storage.set("ds:milestones",JSON.stringify(m),false)}catch{}}}
            tab={tab} setTab={setTab}
            T={T} isAdmin={isAdmin}
          />
        </>
      )}

      {view==="settings"&&isAdmin&&(
        <Settings
          config={config} setConfig={setConfig}
          figmaComponents={figmaComponents} setFigmaComponents={setFigmaComponents}
          figmaHidden={figmaHidden} setFigmaHidden={f=>{setFigmaHidden(f);try{window.storage.set("ds:figmaHidden",JSON.stringify(f),false)}catch{}}}
          gaProperties={gaProperties} setGaProperties={p=>{setGaProperties(p);try{window.storage.set("ds:gaProperties",JSON.stringify(p),false)}catch{}}}
          onSave={saveAll} T={T}
        />
      )}

      {editingQ&&isAdmin&&(
        <DataModal quarter={editingQ} existing={allData[editingQ]||{}} onSave={vals=>saveQ(editingQ,vals)} onClose={()=>setEditingQ(null)} T={T}/>
      )}
    </div>
  )
}