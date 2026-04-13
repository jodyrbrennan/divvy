import { useState } from "react";
import { C, font, fontDisplay } from "../constants/colors";
import { btnBase, btnPrimary, btnSecondary, btnGhost, inputStyle, labelStyle } from "../constants/styles";
import { uid } from "../utils/storage";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import HoldOption from "../components/HoldOption";
import WizardNav from "../components/WizardNav";
import Avatar from "../components/Avatar";

import { useAppData } from "../contexts/AppDataContext";

/**
 * Phase 3A: Event Creation Screen
 *
 * 5-step wizard for creating household events (birthdays, appointments, etc.)
 * These events appear on the calendar and will feed into the Insight Engine.
 *
 * Uses simple tap-to-select (not hold-to-select) for a faster creation flow.
 */

const EVENT_TYPES = [
  { key: "birthday", label: "Birthday", emoji: "🎂", desc: "Annual birthday celebration" },
  { key: "appointment", label: "Appointment", emoji: "🏥", desc: "Doctor, dentist, vet, etc." },
  { key: "gathering", label: "Gathering", emoji: "🎉", desc: "Party, dinner, family event" },
  { key: "school", label: "School", emoji: "📚", desc: "School event, conference, recital" },
  { key: "holiday", label: "Holiday", emoji: "🌟", desc: "Holiday or day off" },
  { key: "travel", label: "Travel", emoji: "✈️", desc: "Trip, vacation, travel day" },
  { key: "other", label: "Other", emoji: "📌", desc: "Any other event" },
];

const RECURRENCE_OPTIONS = [
  { key: "none", label: "One-time event", desc: "Happens once" },
  { key: "yearly", label: "Repeats every year", desc: "Great for birthdays and anniversaries" },
];

export default function CreateEventScreen({ onComplete, onBack, editingEvent }) {
  const { appData, currentUserId } = useAppData();
  const users = appData.users;
  const isEditing = !!editingEvent;

  const [step, setStep] = useState(0);
  const totalSteps = 5;

  const [event, setEvent] = useState(() => {
    if (editingEvent) {
      return {
        name: editingEvent.name || "",
        description: editingEvent.description || "",
        eventType: editingEvent.eventType || "other",
        date: editingEvent.date || "",
        time: editingEvent.time || "",
        endDate: editingEvent.endDate || "",
        linkedMembers: editingEvent.linkedMembers || [],
        recurrence: editingEvent.recurrence || "none",
      };
    }
    return {
      name: "",
      description: "",
      eventType: "other",
      date: "",
      time: "",
      endDate: "",
      linkedMembers: [],
      recurrence: "none",
    };
  });

  const updateEvent = (key, value) => setEvent((prev) => ({ ...prev, [key]: value }));

  const toggleMember = (userId) => {
    setEvent((prev) => {
      const list = prev.linkedMembers.includes(userId)
        ? prev.linkedMembers.filter((id) => id !== userId)
        : [...prev.linkedMembers, userId];
      return { ...prev, linkedMembers: list };
    });
  };

  const selectAllMembers = () => {
    setEvent((prev) => ({
      ...prev,
      linkedMembers: prev.linkedMembers.length === users.length
        ? []
        : users.map((u) => u.id),
    }));
  };

  // Tap to select event type → auto-advance to step 2
  const handleTypeSelect = (typeKey) => {
    const updates = { eventType: typeKey };
    if (typeKey === "birthday") updates.recurrence = "yearly";
    setEvent((prev) => ({ ...prev, ...updates }));
    setTimeout(() => setStep(2), 200);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return event.name.trim().length > 0;
      case 1: return !!event.eventType;
      case 2: return !!event.date;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleSave = () => {
    const newEvent = {
      id: isEditing ? editingEvent.id : uid(),
      name: event.name.trim(),
      description: event.description.trim(),
      eventType: event.eventType,
      date: event.date,
      time: event.time || null,
      endDate: event.endDate || null,
      linkedMembers: event.linkedMembers,
      recurrence: event.recurrence,
      createdBy: isEditing ? editingEvent.createdBy : currentUserId,
      createdAt: isEditing ? editingEvent.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onComplete(newEvent);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const typeInfo = EVENT_TYPES.find((t) => t.key === event.eventType);

  return (
    <PageShell narrow topNav>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ ...btnGhost, padding: "8px 0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600 }}>
          {isEditing ? "Edit Event" : "New Event"}
        </h2>
      </div>

      <WizardNav step={step} totalSteps={totalSteps}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onBackToList={step === 0 ? onBack : null} />

      <Card style={{ marginTop: 16 }}>

        {/* ─── STEP 0: Name & Description ─── */}
        {step === 0 && (
          <div style={{ animation: "fadeUp 0.2s ease both" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>What's the event?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Give it a name and optional description.</p>

            <label style={labelStyle}>Event Name</label>
            <input
              style={inputStyle}
              value={event.name}
              onChange={(e) => updateEvent("name", e.target.value)}
              placeholder="e.g. Mom's Birthday, Dentist Appointment"
              autoFocus
            />

            <label style={{ ...labelStyle, marginTop: 18 }}>Description (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={event.description}
              onChange={(e) => updateEvent("description", e.target.value)}
              placeholder="Any extra details, notes, or reminders..."
            />
          </div>
        )}

        {/* ─── STEP 1: Event Type (tap to select, auto-advances) ─── */}
        {step === 1 && (
          <div style={{ animation: "fadeUp 0.2s ease both" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>What kind of event?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Hold to select a category.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {EVENT_TYPES.map((type) => (
                <HoldOption
                  key={type.key}
                  selected={event.eventType === type.key}
                  onHoldComplete={() => handleTypeSelect(type.key)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 24 }}>{type.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{type.label}</p>
                      <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>{type.desc}</p>
                    </div>
                  </div>
                </HoldOption>
              ))}
            </div>
          </div>
        )}

        {/* ─── STEP 2: Date & Time ─── */}
        {step === 2 && (
          <div style={{ animation: "fadeUp 0.2s ease both" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>When is it?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Set the date and optionally a time.</p>

            <label style={labelStyle}>Date</label>
            <input
              type="date"
              style={inputStyle}
              value={event.date}
              onChange={(e) => updateEvent("date", e.target.value)}
            />

            <label style={{ ...labelStyle, marginTop: 18 }}>Time (optional)</label>
            <input
              type="time"
              style={inputStyle}
              value={event.time}
              onChange={(e) => updateEvent("time", e.target.value)}
            />

            <label style={{ ...labelStyle, marginTop: 18 }}>End Date (optional — for multi-day events)</label>
            <input
              type="date"
              style={inputStyle}
              value={event.endDate}
              onChange={(e) => updateEvent("endDate", e.target.value)}
              min={event.date || undefined}
            />

            {event.date && (
              <p style={{ marginTop: 14, fontSize: 13, color: C.navy, fontWeight: 500 }}>
                {typeInfo?.emoji} {formatDate(event.date)}
                {event.endDate && event.endDate !== event.date && ` — ${formatDate(event.endDate)}`}
                {event.time && ` at ${event.time}`}
              </p>
            )}
          </div>
        )}

        {/* ─── STEP 3: Link Members ─── */}
        {step === 3 && (
          <div style={{ animation: "fadeUp 0.2s ease both" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Who is this for?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 20 }}>Link household members to this event. This helps Divvy plan around everyone's schedule.</p>

            <button onClick={selectAllMembers} style={{
              ...btnGhost, padding: "8px 14px", fontSize: 12, marginBottom: 12,
              color: event.linkedMembers.length === users.length ? C.navy : C.steel,
              background: event.linkedMembers.length === users.length ? C.ice : "transparent",
              borderRadius: 8,
            }}>
              {event.linkedMembers.length === users.length ? "Clear all" : "Select everyone"}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.filter((u) => u.status !== "pending").map((user) => {
                const isLinked = event.linkedMembers.includes(user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    style={{
                      all: "unset", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 16px", borderRadius: 14,
                      background: isLinked ? C.ice : "rgba(255,255,255,0.5)",
                      border: `1.5px solid ${isLinked ? C.sky : C.border}`,
                      transition: "all 0.2s",
                    }}
                  >
                    <Avatar name={user.name} type={user.type} size={36} image={user.avatar} crop={user.avatarCrop} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{user.name}</p>
                      <p style={{ fontSize: 12, color: C.steel }}>{user.type === "dependent" ? "Dependent" : "Member"}</p>
                    </div>
                    {isLinked && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill={C.navy} />
                        <path d="M8 12.5l2.5 2.5 5-5" stroke={C.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {event.linkedMembers.length === 0 && (
              <p style={{ marginTop: 14, fontSize: 12, color: C.steel, fontStyle: "italic" }}>
                No members linked — that's fine! The event will still show on the calendar.
              </p>
            )}
          </div>
        )}

        {/* ─── STEP 4: Recurrence + Summary (tap to select recurrence) ─── */}
        {step === 4 && (
          <div style={{ animation: "fadeUp 0.2s ease both" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Does this repeat?</h3>
            <p style={{ color: C.steel, fontSize: 13, marginBottom: 12 }}>
              {event.eventType === "birthday"
                ? "Birthdays repeat every year by default."
                : "Choose whether this is a one-time event or happens annually."}
            </p>
            <p style={{ fontSize: 12, color: C.steel, marginBottom: 16, fontStyle: "italic" }}>Hold to select</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {RECURRENCE_OPTIONS.map((opt) => (
                <HoldOption
                  key={opt.key}
                  selected={event.recurrence === opt.key}
                  onHoldComplete={() => updateEvent("recurrence", opt.key)}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{opt.label}</p>
                    <p style={{ fontSize: 12, color: C.steel, marginTop: 1 }}>{opt.desc}</p>
                  </div>
                </HoldOption>
              ))}
            </div>

            {/* ─── Summary ─── */}
            <div style={{
              marginTop: 28, padding: "18px 20px", borderRadius: 16,
              background: C.ice, border: `1px solid ${C.sky}`,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Event Summary</p>
              <p style={{ fontWeight: 600, fontSize: 16, color: C.dark, marginBottom: 4 }}>
                {typeInfo?.emoji} {event.name}
              </p>
              <p style={{ fontSize: 13, color: C.steel, marginBottom: 2 }}>{formatDate(event.date)}{event.time ? ` at ${event.time}` : ""}</p>
              {event.endDate && event.endDate !== event.date && (
                <p style={{ fontSize: 13, color: C.steel, marginBottom: 2 }}>Through {formatDate(event.endDate)}</p>
              )}
              {event.linkedMembers.length > 0 && (
                <p style={{ fontSize: 13, color: C.steel }}>
                  {event.linkedMembers.map((id) => users.find((u) => u.id === id)?.name).filter(Boolean).join(", ")}
                </p>
              )}
              <p style={{ fontSize: 12, color: C.navy, marginTop: 4, fontWeight: 500 }}>
                {event.recurrence === "yearly" ? "Repeats every year" : "One-time event"}
              </p>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              style={{ ...btnPrimary, width: "100%", marginTop: 20 }}
            >
              {isEditing ? "Save Changes" : "Create Event"}
            </button>
          </div>
        )}

        {/* ─── Continue button (steps 0, 2, 3 only — step 1 auto-advances, step 4 has Save) ─── */}
        {[0, 2, 3].includes(step) && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            style={{
              ...btnPrimary,
              width: "100%",
              marginTop: 24,
              opacity: canProceed() ? 1 : 0.4,
            }}
          >
            Continue
          </button>
        )}
      </Card>
    </PageShell>
  );
}
