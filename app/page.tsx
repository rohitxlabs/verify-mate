"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  QrCode,
  Smartphone,
  LogOut,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Radio,
  Clock,
  ArrowRight,
  Save,
  Award,
  RotateCcw,
  Search,
  ExternalLink
} from "lucide-react";

interface EvaluatorUser {
  email: string;
  role: string;
}

interface StudentMarks {
  problem_understanding: string;
  prototype_development: string;
  innovation: string;
  team_work: string;
  market_readiness: string;
  presentation: string;
}

interface StudentItem {
  name: string;
  email?: string;
  teamCode?: string;
  college?: string;
  marks: StudentMarks;
}

interface ActiveTeamData {
  teamId: string;
  teamCode: string;
  teamName: string;
  teamData: Record<string, string | undefined>;
  teamMembers: string[];
  students: StudentItem[];
  updatedAt?: string;
}

const CRITERIA_COLUMNS = [
  {
    key: "problem_understanding" as keyof StudentMarks,
    sheetColumn: "Problem understanding",
    label: "Problem statement understand",
    short: "Problem Understand",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    focusBorder: "focus:border-blue-400 focus:ring-blue-400",
  },
  {
    key: "prototype_development" as keyof StudentMarks,
    sheetColumn: "Prototype developement",
    label: "Prototype developement",
    short: "Prototype Dev",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    focusBorder: "focus:border-cyan-400 focus:ring-cyan-400",
  },
  {
    key: "innovation" as keyof StudentMarks,
    sheetColumn: "Innovation",
    label: "Innovation",
    short: "Innovation",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    focusBorder: "focus:border-purple-400 focus:ring-purple-400",
  },
  {
    key: "team_work" as keyof StudentMarks,
    sheetColumn: "Team Work",
    label: "Team work",
    short: "Team Work",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    focusBorder: "focus:border-amber-400 focus:ring-amber-400",
  },
  {
    key: "market_readiness" as keyof StudentMarks,
    sheetColumn: "Market Readiness",
    label: "Market readinesss",
    short: "Market Readiness",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    focusBorder: "focus:border-emerald-400 focus:ring-emerald-400",
  },
  {
    key: "presentation" as keyof StudentMarks,
    sheetColumn: "Presentation",
    label: "Presentation",
    short: "Presentation",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    focusBorder: "focus:border-rose-400 focus:ring-rose-400",
  },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function EvaluatorPage() {
  const [user, setUser] = useState<EvaluatorUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Active scanned team from mobile (shows ONLY the scanned team)
  const [activeTeam, setActiveTeam] = useState<ActiveTeamData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [newScanAlert, setNewScanAlert] = useState(false);
  const previousTeamIdRef = useRef<string | null>(null);

  // Student marks state: studentName -> StudentMarks
  const [studentsMarks, setStudentsMarks] = useState<Record<string, StudentMarks>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");

  // Manual test code input (for testing without a physical phone)
  const [manualCode, setManualCode] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Check stored user session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("evaluator_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse stored user", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Poll for mobile scan updates for the logged in evaluator
  useEffect(() => {
    if (!user || !isPolling) return;

    let isMounted = true;

    const checkActiveTeam = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/evaluator/active-team?username=${encodeURIComponent(
            user.email
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();

        if (!isMounted) return;

        if (data.status === "success" && data.teamId) {
          const isNewTeam = previousTeamIdRef.current !== data.teamId;

          if (isNewTeam) {
            previousTeamIdRef.current = data.teamId;
            setNewScanAlert(true);
            setTimeout(() => setNewScanAlert(false), 3000);
          }

          let studentList: StudentItem[] = [];
          if (Array.isArray(data.students) && data.students.length > 0) {
            studentList = data.students;
          }

          const teamDisplayName =
            data.teamName ||
            data.teamData?.["Team Name"] ||
            data.teamData?.["Team_Name"] ||
            data.teamId;

          setActiveTeam({
            teamId: data.teamId,
            teamCode: data.teamCode || data.teamId,
            teamName: teamDisplayName,
            teamData: data.teamData || {},
            teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
            students: studentList,
            updatedAt: data.updatedAt,
          });

          // Sync marks state for students in this scanned team
          setStudentsMarks((prev) => {
            const next = { ...prev };
            studentList.forEach((st) => {
              if (isNewTeam || !next[st.name]) {
                next[st.name] = {
                  problem_understanding: st.marks?.problem_understanding || "",
                  prototype_development: st.marks?.prototype_development || "",
                  innovation: st.marks?.innovation || "",
                  team_work: st.marks?.team_work || "",
                  market_readiness: st.marks?.market_readiness || "",
                  presentation: st.marks?.presentation || "",
                };
              }
            });
            return next;
          });
        } else if (data.status === "waiting") {
          // No team is currently scanned for this evaluator
          if (previousTeamIdRef.current !== null) {
            previousTeamIdRef.current = null;
            setActiveTeam(null);
          }
        }
      } catch (err) {
        // Silent poll error
      }
    };

    checkActiveTeam();
    const interval = setInterval(checkActiveTeam, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, isPolling]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError("Please enter username/email and password.");
      return;
    }

    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim(),
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        const userData: EvaluatorUser = {
          email: data.user.email,
          role: data.user.role || "evaluator",
        };
        localStorage.setItem("evaluator_user", JSON.stringify(userData));
        setUser(userData);
        setLoginEmail("");
        setLoginPassword("");
      } else {
        setLoginError(data.message || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setLoginError("Cannot connect to backend server. Make sure it is running.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("evaluator_user");
    setUser(null);
    setActiveTeam(null);
    setStudentsMarks({});
    previousTeamIdRef.current = null;
  };

  // Handle Clear / Ready for Next Scan
  const handleClearActiveTeam = async () => {
    if (!user) return;
    try {
      await fetch(`${API_BASE_URL}/evaluator/clear-active-team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.email }),
      });
      setActiveTeam(null);
      previousTeamIdRef.current = null;
    } catch (e) {
      console.error("Failed to clear active team:", e);
    }
  };

  // Handle Manual Scan / Code entry (for quick testing)
  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim() || !user) return;

    setManualLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr_number: manualCode.trim(),
          scanner_email: user.email,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setManualCode("");
        // Trigger immediate poll
        const activeRes = await fetch(
          `${API_BASE_URL}/evaluator/active-team?username=${encodeURIComponent(
            user.email
          )}`
        );
        const activeData = await activeRes.json();
        if (activeData.status === "success") {
          setActiveTeam({
            teamId: activeData.teamId,
            teamCode: activeData.teamCode || activeData.teamId,
            teamName:
              activeData.teamName ||
              activeData.teamData?.["Team Name"] ||
              activeData.teamId,
            teamData: activeData.teamData || {},
            teamMembers: Array.isArray(activeData.teamMembers) ? activeData.teamMembers : [],
            students: Array.isArray(activeData.students) ? activeData.students : [],
            updatedAt: activeData.updatedAt,
          });
        }
      } else {
        alert(data.message || "Failed to load team by code");
      }
    } catch (err) {
      console.error("Manual scan error:", err);
      alert("Error contacting backend server");
    } finally {
      setManualLoading(false);
    }
  };

  // Handle Mark Change
  const handleMarkChange = (
    studentName: string,
    field: keyof StudentMarks,
    value: string
  ) => {
    if (value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 10) return;
    }

    setStudentsMarks((prev) => ({
      ...prev,
      [studentName]: {
        ...(prev[studentName] || {
          problem_understanding: "",
          prototype_development: "",
          innovation: "",
          team_work: "",
          market_readiness: "",
          presentation: "",
        }),
        [field]: value,
      },
    }));
  };

  // Calculate Total Score for student (/60)
  const getStudentTotal = (marks?: StudentMarks) => {
    if (!marks) return 0;
    const p1 = parseFloat(marks.problem_understanding) || 0;
    const p2 = parseFloat(marks.prototype_development) || 0;
    const p3 = parseFloat(marks.innovation) || 0;
    const p4 = parseFloat(marks.team_work) || 0;
    const p5 = parseFloat(marks.market_readiness) || 0;
    const p6 = parseFloat(marks.presentation) || 0;
    return Math.round((p1 + p2 + p3 + p4 + p5 + p6) * 10) / 10;
  };

  // Save Marks to Google Sheet & DB (first looks up by team code, then student name)
  const handleSaveMarks = async (targetStudent?: StudentItem) => {
    if (!user || !activeTeam) return;

    const listToSave = targetStudent
      ? [targetStudent]
      : activeTeam.students;

    if (listToSave.length === 0) return;

    const payloadStudents = listToSave.map((s) => ({
      name: s.name,
      email: s.email || "",
      teamCode: activeTeam.teamCode,
      marks: studentsMarks[s.name] || s.marks,
    }));

    if (targetStudent) {
      setSavingStudent(targetStudent.name);
    } else {
      setIsSaving(true);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/evaluator/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evaluator_username: user.email,
          team_code: activeTeam.teamCode,
          team_name: activeTeam.teamName,
          students: payloadStudents,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setSavedSuccessMsg(
          targetStudent
            ? `✓ Marks saved to Google Sheet for "${targetStudent.name}"!`
            : `✓ Marks saved to Google Sheet for all students in Team "${activeTeam.teamName}"!`
        );
        setTimeout(() => setSavedSuccessMsg(""), 4000);
      } else {
        alert(data.message || "Failed to save marks to Google Sheet");
      }
    } catch (err) {
      console.error("Save marks error:", err);
      alert("Network error connecting to backend server.");
    } finally {
      setIsSaving(false);
      setSavingStudent(null);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#00171F] flex items-center justify-center text-sky-200">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00A8E8]" />
      </div>
    );
  }

  // ==========================================
  // VIEW 1: LOGIN PAGE
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen relative flex items-center justify-center px-4 py-12 bg-gradient-to-br from-[#00171F] via-[#003459] to-[#007EA7] overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">
          <div className="glass-panel-elevated rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl border border-white/15">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#007EA7] to-[#00A8E8] text-white shadow-lg shadow-cyan-500/30 mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Event Registration
              </h1>
              <p className="text-sm font-medium text-cyan-200/90 mt-1.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                Evaluator Portal & Marks Scoring
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-start gap-2.5">
                <span className="text-red-400 font-bold">⚠️</span>
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-cyan-100 uppercase tracking-wider mb-2">
                  Evaluator Username / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-300/70">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. evaluator or evaluator@..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-100 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-300/70">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cyan-300/70 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold tracking-wider text-sm uppercase bg-gradient-to-r from-[#007EA7] to-[#00A8E8] hover:from-[#00A8E8] hover:to-[#007EA7] text-white shadow-lg shadow-[#007EA7]/40 hover:shadow-cyan-400/50 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>LOGIN AS EVALUATOR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: EVALUATOR DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00171F] via-[#003459] to-[#007EA7] text-white flex flex-col">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007EA7] to-[#00A8E8] flex items-center justify-center shadow-md shadow-cyan-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white leading-tight">
                Event Registration
              </div>
              <div className="text-xs text-cyan-300 font-medium flex items-center gap-1.5">
                <span>Evaluator Portal</span>
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
                <span className="text-[11px] text-cyan-200/70">Scanned Team Scoring</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-xs text-cyan-100 flex items-center gap-2">
              <span className="text-cyan-300/80">Hi there,</span>
              <span className="font-bold text-white max-w-[180px] truncate">{user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/15 hover:border-red-500/40 text-cyan-200 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Success Alert Toast */}
        {savedSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-semibold flex items-center gap-3 shadow-lg shadow-emerald-500/10 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{savedSuccessMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASE 1: NO TEAM SCANNED YET -> SHOW WAITING STATE        */}
        {/* ======================================================== */}
        {!activeTeam ? (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="max-w-2xl w-full glass-panel-elevated rounded-3xl p-8 sm:p-12 border border-white/15 shadow-2xl text-center relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Glowing Phone / QR Icon */}
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-[#007EA7] to-[#00A8E8] text-white shadow-xl shadow-cyan-500/30 mb-6">
                <Smartphone className="w-12 h-12 animate-pulse" />
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
              </div>

              {/* Greeting */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                Hi there, <span className="text-cyan-300">{user.email}</span>! 👋
              </h2>

              <p className="text-base text-cyan-100 font-semibold mb-4">
                Waiting for QR Code Scan from Phone App
              </p>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-cyan-200/80 leading-relaxed mb-8 text-left space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#007EA7] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Open the Event Registration app on your mobile phone.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#007EA7] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Ensure you are logged in with your evaluator account (<strong className="text-white">{user.email}</strong>).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#007EA7] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>Scan any team's QR badge. <strong>That team's name and student scoring table will automatically appear here!</strong></span>
                </div>
              </div>

              {/* Live Listening Status Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Radio className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Live Sync Active: Listening for your phone's scan...</span>
              </div>

              {/* Quick Manual Test Code Form (helpful for instant testing) */}
              <div className="mt-8 pt-6 border-t border-white/10 text-left">
                <div className="text-xs font-semibold text-cyan-200/70 mb-2 flex items-center justify-between">
                  <span>Quick Test / Manual Team Code:</span>
                  <span className="text-[10px] text-cyan-300/50">Enter Team Code or QR</span>
                </div>
                <form onSubmit={handleManualScan} className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. TC-01 or QR number"
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-cyan-200/40 focus:outline-none focus:ring-2 focus:ring-[#00A8E8]"
                  />
                  <button
                    type="submit"
                    disabled={manualLoading || !manualCode.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#007EA7] hover:bg-[#00A8E8] text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {manualLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Load Team</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 2: TEAM IS SCANNED -> SHOW ONLY THE SCANNED TEAM     */
          /* ======================================================== */
          <>
            {/* Banner for the SCANNED Team Only */}
            <div
              className={`glass-panel-elevated rounded-3xl p-6 border transition-all duration-500 shadow-2xl ${
                newScanAlert
                  ? "bg-gradient-to-r from-emerald-950/60 to-cyan-950/60 border-emerald-400 ring-4 ring-emerald-400/30 scale-[1.01]"
                  : "border-white/15"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                {/* Team Info */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#007EA7] to-[#00A8E8] flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
                    <Users className="w-7 h-7" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        Scanned by Evaluator: {user.email}
                      </span>
                      {activeTeam.updatedAt && (
                        <span className="text-[11px] text-cyan-200/60">
                          {new Date(activeTeam.updatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* ONLY THIS TEAM NAME */}
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                      Team: {activeTeam.teamName}
                    </h2>

                    <div className="flex items-center gap-4 text-xs text-cyan-200/80 mt-1 flex-wrap">
                      <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md border border-white/10 text-cyan-100 font-bold">
                        Code: {activeTeam.teamCode}
                      </span>

                      {activeTeam.teamData?.["College Name"] && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-cyan-300" />
                          <span>{activeTeam.teamData["College Name"]}</span>
                        </span>
                      )}

                      <span className="text-cyan-300 font-semibold">
                        {activeTeam.students.length} Student Members
                      </span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-3 self-end lg:self-center">
                  <button
                    onClick={handleClearActiveTeam}
                    title="Clear current team and wait for next scan"
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/15 border border-white/15 text-cyan-200 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Scan Next Team</span>
                  </button>

                  <button
                    onClick={() => handleSaveMarks()}
                    disabled={isSaving || activeTeam.students.length === 0}
                    className="py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Marks...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save All Marks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SCORING TABLE FOR THE STUDENTS OF THIS SCANNED TEAM      */}
            {/* ======================================================== */}
            <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-cyan-300" />
                    <span>Evaluation Scoring for Team "{activeTeam.teamName}"</span>
                  </h3>
                  <p className="text-xs text-cyan-200/70 mt-0.5">
                    Fill marks (0 to 10) for each column. On save, marks are stored into Google Sheet columns for each student.
                  </p>
                </div>

                <div className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-400/20 font-semibold">
                  {activeTeam.students.length} Students in Scanned Team
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1020px]">
                  <thead>
                    <tr className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider text-cyan-200 bg-white/5">
                      <th className="py-3.5 px-3 w-10 text-center">#</th>
                      <th className="py-3.5 px-4 min-w-[200px]">Student Name</th>
                      {CRITERIA_COLUMNS.map((col) => (
                        <th key={col.key} className="py-3.5 px-2 text-center min-w-[115px]">
                          <div className="font-bold text-white">{col.label}</div>
                          <div className="text-[9px] text-cyan-300/70 font-mono">Column: {col.sheetColumn} (/10)</div>
                        </th>
                      ))}
                      <th className="py-3.5 px-3 text-center min-w-[85px]">
                        <div className="font-bold text-amber-300">Total</div>
                        <div className="text-[9px] text-amber-300/70 font-mono">(/60)</div>
                      </th>
                      <th className="py-3.5 px-3 text-center w-24">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {activeTeam.students.length > 0 ? (
                      activeTeam.students.map((student, idx) => {
                        const marks = studentsMarks[student.name] || student.marks || {
                          problem_understanding: "",
                          prototype_development: "",
                          innovation: "",
                          team_work: "",
                          market_readiness: "",
                          presentation: "",
                        };
                        const total = getStudentTotal(marks);
                        const isStudentSaving = savingStudent === student.name;

                        return (
                          <tr key={student.name + idx} className="hover:bg-white/5 transition-colors group">
                            {/* Index */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="w-6 h-6 rounded-lg bg-white/10 text-cyan-200 text-xs font-bold inline-flex items-center justify-center">
                                {idx + 1}
                              </span>
                            </td>

                            {/* Student Name */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm group-hover:text-cyan-200 transition-colors">
                                {student.name}
                              </div>
                              {student.email && (
                                <div className="text-[11px] text-cyan-300/60 truncate max-w-[200px]">
                                  {student.email}
                                </div>
                              )}
                              {student.college && (
                                <div className="text-[10px] text-cyan-300/40 truncate max-w-[200px]">
                                  🏫 {student.college}
                                </div>
                              )}
                            </td>

                            {/* 6 Criteria Columns */}
                            {CRITERIA_COLUMNS.map((col) => {
                              const val = marks[col.key] || "";
                              return (
                                <td key={col.key} className="py-3.5 px-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={val}
                                    placeholder="0-10"
                                    onChange={(e) =>
                                      handleMarkChange(student.name, col.key, e.target.value)
                                    }
                                    className={`w-20 text-center py-2 px-1 rounded-xl bg-black/40 border border-white/20 text-white font-bold text-sm placeholder-cyan-200/20 focus:outline-none focus:ring-2 transition-all ${col.focusBorder}`}
                                  />
                                </td>
                              );
                            })}

                            {/* Total Score */}
                            <td className="py-3.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center min-w-[50px] py-1.5 px-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-sm">
                                {total}
                              </span>
                            </td>

                            {/* Save Action */}
                            <td className="py-3.5 px-3 text-center">
                              <button
                                onClick={() => handleSaveMarks(student)}
                                disabled={isStudentSaving || isSaving}
                                title={`Save marks for ${student.name} to Google Sheet`}
                                className="py-1.5 px-3 rounded-xl text-xs font-bold bg-[#007EA7]/40 hover:bg-[#007EA7] border border-cyan-400/40 text-white transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 cursor-pointer"
                              >
                                {isStudentSaving ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save</span>
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-cyan-200/60 text-sm">
                          No students found for this scanned team.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Save All & Info Bar */}
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cyan-200/70">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>
                    Direct Google Sheet sync active for Team <strong>{activeTeam.teamName}</strong> ({activeTeam.teamCode}).
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSaveMarks()}
                    disabled={isSaving || activeTeam.students.length === 0}
                    className="py-2 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save All Marks for this Team</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
