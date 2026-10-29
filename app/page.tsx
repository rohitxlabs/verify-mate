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
  ExternalLink,
  ChevronDown,
  MessageSquare,
  Tag,
  AlertCircle,
  UserCheck,
  Calculator,
  Layers
} from "lucide-react";

interface EvaluatorUser {
  email: string;
  role: string;
  panelist_number?: number;
}

interface StudentFeedback {
  category: string;
  customCategory: string;
  remarks: string;
}

interface StudentItem {
  name: string;
  email?: string;
  teamCode?: string;
  college?: string;
  evaluation_category?: string;
  custom_category?: string;
  remarks?: string;
  myRemark?: string;
  combinedRemarks?: string;
  combined_remarks?: string;
  team_marks?: string;
  total_marks?: number;
  panelist_count?: number;
}

interface ActiveTeamData {
  teamId: string;
  teamCode: string;
  teamName: string;
  teamData: Record<string, string | undefined>;
  teamMembers: string[];
  students: StudentItem[];
  teamMarks?: string;
  totalMarks?: number;
  panelistCount?: number;
  averageMarks?: string;
  myTeamMarks?: string;
  alreadySubmitted?: boolean;
  updatedAt?: string;
}

const EVALUATION_CATEGORIES = [
  "Presentation",
  "Coding",
  "Innovation",
  "Others"
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://event-registration-backend-pearl.vercel.app";

// Helper to get clean evaluator user ID without email domain for badge
function getUserIdDisplay(user: EvaluatorUser | null): string {
  if (!user?.email) return "Evaluator";
  return user.email.includes("@") ? user.email.split("@")[0] : user.email;
}

export default function EvaluatorPage() {
  const [user, setUser] = useState<EvaluatorUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Active scanned team from mobile (shows ONLY the scanned team)
  const [activeTeam, setActiveTeam] = useState<ActiveTeamData | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [newScanAlert, setNewScanAlert] = useState(false);
  const previousTeamIdRef = useRef<string | null>(null);

  // Team Marks state (entered once per team by this panelist)
  const [teamMarks, setTeamMarks] = useState<string>("");
  const [teamMarksError, setTeamMarksError] = useState<string>("");

  // Individual student remarks & category state: studentName -> StudentFeedback
  const [studentFeedback, setStudentFeedback] = useState<Record<string, StudentFeedback>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savingStudent, setSavingStudent] = useState<string | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");


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

  // Helper to synchronize active team data for this specific panelist
  const syncActiveTeamData = (data: any, isNewTeam: boolean) => {
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
      teamMarks: data.teamMarks,
      totalMarks: data.totalMarks !== undefined ? Number(data.totalMarks) : 0,
      panelistCount: data.panelistCount !== undefined ? Number(data.panelistCount) : 0,
      averageMarks: data.averageMarks || "",
      myTeamMarks: data.myTeamMarks || "",
      alreadySubmitted: Boolean(data.alreadySubmitted),
      updatedAt: data.updatedAt,
    });

    // Populate this evaluator's own saved marks
    if (data.myTeamMarks !== undefined && data.myTeamMarks !== null && data.myTeamMarks !== "") {
      setTeamMarks(String(data.myTeamMarks));
    } else if (isNewTeam) {
      setTeamMarks("");
    }

    // Populate individual feedback state for this evaluator
    setStudentFeedback((prev) => {
      const next = { ...prev };
      studentList.forEach((st) => {
        if (isNewTeam || !next[st.name]) {
          const myRemark = st.myRemark ?? st.remarks ?? "";
          let myCat = st.evaluation_category || "Presentation";
          let customCat = st.custom_category || "";

          if (myCat.startsWith("Others: ")) {
            customCat = myCat.replace("Others: ", "");
            myCat = "Others";
          } else if (!EVALUATION_CATEGORIES.includes(myCat) && myCat) {
            customCat = myCat;
            myCat = "Others";
          }

          next[st.name] = {
            category: myCat || "Presentation",
            customCategory: customCat,
            remarks: myRemark || "",
          };
        }
      });
      return next;
    });
  };

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

          syncActiveTeamData(data, isNewTeam);
        } else if (data.status === "waiting") {
          // No team is currently scanned for this evaluator
          if (previousTeamIdRef.current !== null) {
            previousTeamIdRef.current = null;
            setActiveTeam(null);
            setTeamMarks("");
            setStudentFeedback({});
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
          panelist_number: data.user.panelist_number,
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
    setTeamMarks("");
    setStudentFeedback({});
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
      setTeamMarks("");
      setStudentFeedback({});
      previousTeamIdRef.current = null;
    } catch (e) {
      console.error("Failed to clear active team:", e);
    }
  };


  // Handle Category Change
  const handleCategoryChange = (studentName: string, category: string) => {
    setStudentFeedback((prev) => ({
      ...prev,
      [studentName]: {
        ...(prev[studentName] || {
          category: "Presentation",
          customCategory: "",
          remarks: "",
        }),
        category,
      },
    }));
  };

  // Handle Custom Category Change (when category === 'Others')
  const handleCustomCategoryChange = (studentName: string, customCategory: string) => {
    setStudentFeedback((prev) => ({
      ...prev,
      [studentName]: {
        ...(prev[studentName] || {
          category: "Others",
          customCategory: "",
          remarks: "",
        }),
        customCategory,
      },
    }));
  };

  // Handle Remarks Change
  const handleRemarksChange = (studentName: string, remarks: string) => {
    setStudentFeedback((prev) => ({
      ...prev,
      [studentName]: {
        ...(prev[studentName] || {
          category: "Presentation",
          customCategory: "",
          remarks: "",
        }),
        remarks,
      },
    }));
  };

  // Handle Team Marks Input Change (validated according to scoring rules)
  const handleTeamMarksChange = (value: string) => {
    setTeamMarksError("");
    if (value === "") {
      setTeamMarks("");
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setTeamMarks(value);
  };

  // Save Evaluation (Team Marks + Individual Student Remarks)
  const handleSaveEvaluation = async (targetStudent?: StudentItem) => {
    if (!user || !activeTeam) return;

    // Validate Team Marks when submitting overall evaluation
    if (!targetStudent) {
      if (teamMarks.trim() === "") {
        setTeamMarksError("Please enter your team marks before submitting.");
        return;
      }
      const num = parseFloat(teamMarks);
      if (isNaN(num) || num < 0) {
        setTeamMarksError("Please enter a valid positive number for team marks.");
        return;
      }
    }

    const listToSave = targetStudent ? [targetStudent] : activeTeam.students;
    if (listToSave.length === 0) return;

    const payloadStudents = listToSave.map((s) => {
      const fb = studentFeedback[s.name] || {
        category: s.evaluation_category || "Presentation",
        customCategory: s.custom_category || "",
        remarks: s.remarks || "",
      };
      const finalCategory =
        fb.category === "Others" && fb.customCategory
          ? `Others: ${fb.customCategory.trim()}`
          : fb.category;

      return {
        name: s.name,
        email: s.email || "",
        teamCode: activeTeam.teamCode,
        category: fb.category,
        custom_category: fb.customCategory,
        evaluation_category: finalCategory,
        remarks: fb.remarks,
        team_marks: teamMarks,
      };
    });

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
          team_marks: teamMarks,
          students: payloadStudents,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        const total = data.total_marks ?? activeTeam.totalMarks;
        const count = data.panelist_count ?? activeTeam.panelistCount;

        setSavedSuccessMsg(
          targetStudent
            ? `✓ Remarks for "${targetStudent.name}" updated! Total Marks: ${total} (${count} panelist${count > 1 ? "s" : ""}).`
            : `✓ Team evaluation submitted! Total Marks: ${total} (Sum across ${count} panelist${count > 1 ? "s" : ""}). Remarks prefixed with your User ID (${getUserIdDisplay(user)}).`
        );
        setTimeout(() => setSavedSuccessMsg(""), 6000);

        // Re-fetch active team immediately so combined remarks and totals update on screen
        const refreshRes = await fetch(
          `${API_BASE_URL}/evaluator/active-team?username=${encodeURIComponent(user.email)}`
        );
        const refreshData = await refreshRes.json();
        if (refreshData.status === "success") {
          syncActiveTeamData(refreshData, false);
        }
      } else {
        alert(data.message || "Failed to save evaluation to Google Sheet");
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
                    placeholder="Enter username or email"
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
  const userIdDisplay = getUserIdDisplay(user);

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
                <span className="text-[11px] text-cyan-200/70">Scoring & Remarks</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Authenticated Evaluator User ID Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/40 text-xs font-bold text-cyan-200 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
              <span>{userIdDisplay}</span>
            </div>

            {/* Logged in User Email */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-cyan-200/70">
              <Mail className="w-3 h-3 text-cyan-400/70" />
              <span className="font-mono text-[11px] truncate max-w-[160px]">{user.email}</span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 border border-white/15 hover:border-red-500/40 text-cyan-200 hover:text-red-300 transition-colors cursor-pointer"
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
                Hi there, <span className="text-cyan-300">{userIdDisplay}</span>! 👋
              </h2>

              <p className="text-base text-cyan-100 font-semibold mb-4 flex items-center justify-center gap-2">
                <span>Waiting for Mobile QR Code Scan</span>
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
                  <span>Scan any team's QR badge. <strong>The team name, member list, and scoring section will appear instantly!</strong></span>
                </div>
              </div>

              {/* Live Listening Status Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Radio className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Live Sync Active: Listening for your phone's scan...</span>
              </div>

            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 2: TEAM IS SCANNED -> SHOW EVALUATOR FORM            */
          /* ======================================================== */
          <>
            {/* Banner for the SCANNED Team */}
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
                        Scanned Team
                      </span>
                      {activeTeam.updatedAt && (
                        <span className="text-[11px] text-cyan-200/60 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(activeTeam.updatedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Team Name */}
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
                    onClick={() => handleSaveEvaluation()}
                    disabled={isSaving || activeTeam.students.length === 0}
                    className="py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Submit Evaluation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* MAIN CARD: TEAM MEMBERS & INDIVIDUAL FEEDBACK TABLE     */}
            {/* ======================================================== */}
            <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-white/15 shadow-2xl overflow-hidden flex flex-col gap-6">
              {/* Header Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-cyan-300" />
                    <span>Team Members and Individual Feedback</span>
                  </h3>
                  <p className="text-xs text-cyan-200/70 mt-1">
                    Select an evaluation category and write specific remarks for each student. Enter overall team marks below.
                  </p>
                </div>

                <div className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-400/20 font-semibold self-start sm:self-auto flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{activeTeam.students.length} Members in Team</span>
                </div>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider text-cyan-200 bg-white/5">
                      <th className="py-3.5 px-3 w-12 text-center">#</th>
                      <th className="py-3.5 px-4 w-1/4 min-w-[180px]">Student Name</th>
                      <th className="py-3.5 px-4 w-1/4 min-w-[200px]">Evaluation Category</th>
                      <th className="py-3.5 px-4 min-w-[280px]">Your Remarks & All Feedback</th>
                      <th className="py-3.5 px-3 text-center w-24">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10">
                    {activeTeam.students.length > 0 ? (
                      activeTeam.students.map((student, idx) => {
                        const feedback = studentFeedback[student.name] || {
                          category: student.evaluation_category || "Presentation",
                          customCategory: student.custom_category || "",
                          remarks: student.myRemark || student.remarks || "",
                        };
                        const isStudentSaving = savingStudent === student.name;
                        const isOthers = feedback.category === "Others";

                        return (
                          <tr key={student.name + idx} className="hover:bg-white/5 transition-colors group">
                            {/* Index */}
                            <td className="py-4 px-3 text-center align-top">
                              <span className="w-7 h-7 rounded-xl bg-white/10 text-cyan-200 text-xs font-bold inline-flex items-center justify-center mt-1">
                                {idx + 1}
                              </span>
                            </td>

                            {/* Student Name */}
                            <td className="py-4 px-4 align-top">
                              <div className="font-bold text-white text-sm group-hover:text-cyan-200 transition-colors">
                                {student.name}
                              </div>
                              {student.email && (
                                <div className="text-[11px] text-cyan-300/60 truncate max-w-[200px] mt-0.5">
                                  {student.email}
                                </div>
                              )}
                              {student.college && (
                                <div className="text-[10px] text-cyan-300/40 truncate max-w-[200px] mt-0.5">
                                  🏫 {student.college}
                                </div>
                              )}
                            </td>

                            {/* Evaluation Category Dropdown */}
                            <td className="py-4 px-4 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="relative">
                                  <select
                                    value={feedback.category}
                                    onChange={(e) =>
                                      handleCategoryChange(student.name, e.target.value)
                                    }
                                    className="w-full appearance-none py-2.5 pl-3.5 pr-10 rounded-xl bg-black/40 border border-white/20 text-white font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00A8E8] transition-all cursor-pointer"
                                  >
                                    {EVALUATION_CATEGORIES.map((cat) => (
                                      <option key={cat} value={cat} className="bg-[#002233] text-white">
                                        {cat}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-cyan-300">
                                    <ChevronDown className="w-4 h-4" />
                                  </div>
                                </div>

                                {/* Custom Category Input if Others is selected */}
                                {isOthers && (
                                  <div className="animate-fade-in">
                                    <input
                                      type="text"
                                      value={feedback.customCategory}
                                      onChange={(e) =>
                                        handleCustomCategoryChange(student.name, e.target.value)
                                      }
                                      placeholder="Specify category..."
                                      className="w-full py-2 px-3 rounded-xl bg-black/50 border border-cyan-400/50 text-cyan-100 text-xs placeholder-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-[#00A8E8] transition-all"
                                    />
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Individual Remarks Box & Combined History */}
                            <td className="py-4 px-4 align-top">
                              <textarea
                                rows={2}
                                value={feedback.remarks}
                                onChange={(e) =>
                                  handleRemarksChange(student.name, e.target.value)
                                }
                                placeholder={`Enter your remarks for ${student.name}...`}
                                className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white text-xs sm:text-sm placeholder-cyan-200/30 focus:outline-none focus:ring-2 focus:ring-[#00A8E8] transition-all resize-y min-h-[58px]"
                              />

                              {/* Combined Panelists' Remarks Display */}
                              {student.combinedRemarks && student.combinedRemarks.trim() && (
                                <div className="mt-2.5 p-2.5 rounded-xl bg-black/40 border border-cyan-400/20 text-xs">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                                    <MessageSquare className="w-3 h-3 text-cyan-400" />
                                    <span>All Panelists' Remarks:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {student.combinedRemarks.split("|").map((entry, eIdx) => {
                                      const trimmed = entry.trim();
                                      if (!trimmed) return null;
                                      const colonIdx = trimmed.indexOf(":");
                                      const uid = colonIdx > -1 ? trimmed.substring(0, colonIdx).trim() : "";
                                      const msg = colonIdx > -1 ? trimmed.substring(colonIdx + 1).trim() : trimmed;
                                      return (
                                        <div
                                          key={eIdx}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                                        >
                                          <span className="font-mono font-bold text-cyan-300 text-[11px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-400/30">
                                            {uid || "Panelist"}
                                          </span>
                                          <span className="text-cyan-100">{msg}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Row Action (Quick Save for student) */}
                            <td className="py-4 px-3 text-center align-top">
                              <button
                                onClick={() => handleSaveEvaluation(student)}
                                disabled={isStudentSaving || isSaving}
                                title={`Save remarks for ${student.name}`}
                                className="py-2 px-3 rounded-xl text-xs font-bold bg-[#007EA7]/40 hover:bg-[#007EA7] border border-cyan-400/40 text-white transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50 cursor-pointer mt-1"
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
                        <td colSpan={5} className="py-12 text-center text-cyan-200/60 text-sm">
                          No students found for this scanned team.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ======================================================== */}
              {/* TEAM MARKS SECTION (Entered once for the team)           */}
              {/* ======================================================== */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white/5 border border-white/15 flex flex-col gap-5 shadow-inner">
                {/* Live Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Total Marks (Sum) */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/15 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                        Total Marks (Sum)
                      </div>
                      <div className="text-2xl font-black text-amber-300 mt-0.5">
                        {activeTeam.totalMarks ?? 0}
                      </div>
                      <div className="text-[10px] text-cyan-200/50 mt-0.5">
                        Sum of all panelists' marks
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Panelist Count */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/15 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                        Panelists Evaluated
                      </div>
                      <div className="text-2xl font-black text-cyan-200 mt-0.5">
                        {activeTeam.panelistCount ?? 0}
                      </div>
                      <div className="text-[10px] text-cyan-200/50 mt-0.5">
                        Distinct panelist count
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Average Score */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/15 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                        Average Score
                      </div>
                      <div className="text-2xl font-black text-emerald-300 mt-0.5">
                        {activeTeam.averageMarks ||
                          (activeTeam.panelistCount && activeTeam.totalMarks
                            ? (activeTeam.totalMarks / activeTeam.panelistCount).toFixed(1)
                            : "—")}
                      </div>
                      <div className="text-[10px] text-cyan-200/50 mt-0.5">
                        Calculated average
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center text-emerald-300">
                      <Calculator className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Already Submitted Status Banner */}
                {activeTeam.alreadySubmitted && activeTeam.myTeamMarks && (
                  <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-100 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-300 flex-shrink-0" />
                    <span>
                      You have previously submitted <strong>{activeTeam.myTeamMarks} marks</strong> for Team &quot;{activeTeam.teamName}&quot;. Submitting again will update your score without incrementing the panelist count or duplicating marks.
                    </span>
                  </div>
                )}

                {/* Input and Submit Controls */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pt-2 border-t border-white/10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-300" />
                      <label htmlFor="team-marks-box" className="text-base sm:text-lg font-bold text-white">
                        Enter Your Marks for this Team:
                      </label>
                    </div>
                    <p className="text-xs text-cyan-200/80 mt-1">
                      Provide your team score. This will be added to the <strong>TotalMarks</strong> sum and increment <strong>PanelistCount</strong> in Google Sheet.
                    </p>
                    {teamMarksError && (
                      <div className="mt-2 text-xs font-bold text-red-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>{teamMarksError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                      <input
                        id="team-marks-box"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={teamMarks}
                        onChange={(e) => handleTeamMarksChange(e.target.value)}
                        placeholder="Enter marks"
                        className="w-full sm:w-44 text-center py-3 px-4 rounded-xl bg-black/50 border border-white/25 text-white font-extrabold text-base placeholder-cyan-200/30 focus:outline-none focus:ring-2 focus:ring-[#00A8E8] transition-all"
                      />
                    </div>

                    <button
                      onClick={() => handleSaveEvaluation()}
                      disabled={isSaving || activeTeam.students.length === 0}
                      className="py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Submit Evaluation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Sync Info Bar */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-cyan-200/70">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>
                    Google Sheet & Database live sync active for Team <strong>{activeTeam.teamName}</strong> ({activeTeam.teamCode}).
                  </span>
                </div>
                <div className="text-[11px] text-cyan-300/70 font-mono">
                  Columns: TotalMarks • PanelistCount • Remarks ({userIdDisplay}: remark) • Category
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
