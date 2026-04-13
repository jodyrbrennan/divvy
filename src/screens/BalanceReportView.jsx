import { useState, useMemo } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnGhost, labelStyle } from "../constants/styles";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Chip from "../components/Chip";
import Header from "../components/Header";

import { useAppData } from "../contexts/AppDataContext";

/**
 * Phase 3B: Balance Report View
 *
 * Shows household contribution patterns with positive framing.
 * Never shames or ranks negatively — always frames as celebration
 * and opportunity.
 */

const TIME_PERIODS = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

// Positive messages based on contribution level
const getEncouragement = (tasksCompleted, totalTasks, isTopContributor) => {
  if (totalTasks === 0) return "The household is just getting started!";
  if (isTopContributor) return "Leading the way!";
  if (tasksCompleted > 0) return "Every contribution counts!";
  return "Ready to jump in when the moment's right.";
};

// Get start of current week (Monday)
const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

// Get start of current month
const getMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export default function BalanceReportView({ onBack }) {
  const { appData } = useAppData();
  const [period, setPeriod] = useState("week");

  const users = appData.users.filter((u) => u.status !== "pending");
  const completions = appData.completions || [];
  const recognitions = appData.recognitions || [];

  // Filter data by selected time period
  const periodStart = period === "week" ? getWeekStart()
    : period === "month" ? getMonthStart()
    : new Date(0); // all time

  const filteredCompletions = useMemo(() =>
    completions.filter((c) => new Date(c.timestamp) >= periodStart),
    [completions, period]
  );

  const filteredRecognitions = useMemo(() =>
    recognitions.filter((r) => new Date(r.timestamp) >= periodStart),
    [recognitions, period]
  );

  // Household totals
  const totalTasks = filteredCompletions.length;
  const totalPoints = filteredCompletions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
  const totalRecognitions = filteredRecognitions.length;

  // Per-member stats
  const memberStats = useMemo(() => {
    return users.map((user) => {
      const userCompletions = filteredCompletions.filter((c) => c.userId === user.id);
      const tasksCompleted = userCompletions.length;
      const pointsEarned = userCompletions.reduce((sum, c) => sum + (c.pointsEarned || 0), 0);
      const recognitionsSent = filteredRecognitions.filter((r) => r.fromUserId === user.id).length;
      const recognitionsReceived = filteredRecognitions.filter((r) => r.toUserId === user.id).length;

      return {
        user,
        tasksCompleted,
        pointsEarned,
        recognitionsSent,
        recognitionsReceived,
      };
    }).sort((a, b) => b.tasksCompleted - a.tasksCompleted); // Highest first
  }, [users, filteredCompletions, filteredRecognitions]);

  const maxTasks = Math.max(...memberStats.map((s) => s.tasksCompleted), 1);
  const topContributorId = memberStats[0]?.user.id;

  // Period label for display
  const periodLabel = period === "week" ? "this week"
    : period === "month" ? "this month"
    : "all time";

  // Colors for member bars (cycle through these)
  const BAR_COLORS = ["#5B9BD5", "#2ECC71", "#E67E22", "#9B59B6", "#E74C3C", "#1ABC9C", "#F39C12"];

  return (
    <PageShell narrow topNav>
      <Header title="Balance Report" onBack={onBack} />

      {/* Time Period Selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {TIME_PERIODS.map((tp) => (
          <Chip key={tp.key} label={tp.label} selected={period === tp.key}
            onClick={() => setPeriod(tp.key)} />
        ))}
      </div>

      {/* Household Summary */}
      <Card style={{ marginBottom: 14 }} delay={0.05}>
        <p style={{ ...labelStyle, marginBottom: 16 }}>Household Overview</p>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{
            flex: 1, textAlign: "center", padding: "14px 8px", borderRadius: 14,
            background: "rgba(91,155,213,0.08)", border: "1px solid rgba(91,155,213,0.15)",
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#5B9BD5", lineHeight: 1 }}>{totalTasks}</p>
            <p style={{ fontSize: 11, color: C.steel, marginTop: 4, fontWeight: 600 }}>Tasks Done</p>
          </div>
          <div style={{
            flex: 1, textAlign: "center", padding: "14px 8px", borderRadius: 14,
            background: "rgba(46,204,113,0.08)", border: "1px solid rgba(46,204,113,0.15)",
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#2ECC71", lineHeight: 1 }}>{totalPoints}</p>
            <p style={{ fontSize: 11, color: C.steel, marginTop: 4, fontWeight: 600 }}>Points Earned</p>
          </div>
          <div style={{
            flex: 1, textAlign: "center", padding: "14px 8px", borderRadius: 14,
            background: "rgba(230,126,34,0.08)", border: "1px solid rgba(230,126,34,0.15)",
          }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: "#E67E22", lineHeight: 1 }}>{totalRecognitions}</p>
            <p style={{ fontSize: 11, color: C.steel, marginTop: 4, fontWeight: 600 }}>Shout-outs</p>
          </div>
        </div>
        {totalTasks > 0 && (
          <p style={{ fontSize: 13, color: C.navy, marginTop: 14, fontWeight: 500, textAlign: "center" }}>
            The household completed {totalTasks} task{totalTasks !== 1 ? "s" : ""} {periodLabel} — nice work, team!
          </p>
        )}
        {totalTasks === 0 && (
          <p style={{ fontSize: 13, color: C.steel, marginTop: 14, textAlign: "center", fontStyle: "italic" }}>
            No tasks completed {periodLabel} yet. Every day is a fresh start!
          </p>
        )}
      </Card>

      {/* Contribution Balance */}
      <Card style={{ marginBottom: 14 }} delay={0.1}>
        <p style={{ ...labelStyle, marginBottom: 16 }}>Who's Been Pitching In</p>

        {/* Visual bar chart */}
        {totalTasks > 0 && (
          <div style={{ marginBottom: 20 }}>
            {memberStats.map((stat, i) => {
              const barWidth = maxTasks > 0 ? (stat.tasksCompleted / maxTasks) * 100 : 0;
              const color = BAR_COLORS[i % BAR_COLORS.length];
              return (
                <div key={stat.user.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar name={stat.user.name} type={stat.user.type} size={22}
                        image={stat.user.avatar} crop={stat.user.avatarCrop} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{stat.user.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{stat.tasksCompleted}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: C.ice, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: color,
                      width: `${barWidth}%`, transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                      minWidth: stat.tasksCompleted > 0 ? 8 : 0,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalTasks === 0 && (
          <p style={{ fontSize: 13, color: C.steel, fontStyle: "italic", padding: "8px 0" }}>
            Complete some tasks to see how the household shares the load!
          </p>
        )}
      </Card>

      {/* Individual Member Cards */}
      <p style={{ ...labelStyle, marginBottom: 12, marginTop: 8 }}>Member Highlights</p>
      {memberStats.map((stat, i) => {
        const isTop = stat.user.id === topContributorId && totalTasks > 0;
        const encouragement = getEncouragement(stat.tasksCompleted, totalTasks, isTop);
        const color = BAR_COLORS[i % BAR_COLORS.length];

        return (
          <Card key={stat.user.id} style={{ marginBottom: 10 }} delay={0.12 + i * 0.03}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Avatar name={stat.user.name} type={stat.user.type} size={42}
                image={stat.user.avatar} crop={stat.user.avatarCrop} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ fontWeight: 700, fontSize: 16, color: C.dark }}>{stat.user.name}</p>
                  {isTop && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 50,
                      background: `${color}18`, color, textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>Top contributor</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>{encouragement}</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10,
                background: C.ice,
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1 }}>{stat.tasksCompleted}</p>
                <p style={{ fontSize: 10, color: C.steel, marginTop: 3, fontWeight: 600 }}>Tasks</p>
              </div>
              <div style={{
                flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10,
                background: C.ice,
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1 }}>{stat.pointsEarned}</p>
                <p style={{ fontSize: 10, color: C.steel, marginTop: 3, fontWeight: 600 }}>Points</p>
              </div>
              <div style={{
                flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10,
                background: C.ice,
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1 }}>{stat.recognitionsSent}</p>
                <p style={{ fontSize: 10, color: C.steel, marginTop: 3, fontWeight: 600 }}>Sent</p>
              </div>
              <div style={{
                flex: 1, textAlign: "center", padding: "10px 6px", borderRadius: 10,
                background: C.ice,
              }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: C.dark, lineHeight: 1 }}>{stat.recognitionsReceived}</p>
                <p style={{ fontSize: 10, color: C.steel, marginTop: 3, fontWeight: 600 }}>Received</p>
              </div>
            </div>
          </Card>
        );
      })}

      {users.length === 0 && (
        <Card>
          <p style={{ fontSize: 14, color: C.steel, textAlign: "center", padding: "20px 0" }}>
            Add household members to start tracking contributions!
          </p>
        </Card>
      )}
    </PageShell>
  );
}
