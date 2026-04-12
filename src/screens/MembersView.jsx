import { C } from "../constants/colors";
import { btnPrimary, labelStyle } from "../constants/styles";
import { RELATIONSHIP_OPTIONS } from "../utils/relationships";
import PageShell from "../components/PageShell";
import Card from "../components/Card";
import Avatar from "../components/Avatar";
import Divider from "../components/Divider";
import Header from "../components/Header";

// Phase 7.1: Use context instead of props for app data
import { useAppData } from "../contexts/AppDataContext";

/**
 * Members list view — extracted from Dashboard.jsx.
 * Phase 7.1: Now uses useAppData() context instead of receiving appData/currentUser as props.
 */
export default function MembersView({ onSelectMember, onAddMember, onBack }) {
  // Phase 7.1: Pull data from context
  const { appData, currentUser, currentUserId } = useAppData();

  const activeMembers = appData.users.filter((u) => u.status !== "pending");
  const pendingMembers = appData.users.filter((u) => u.status === "pending");

  return (
    <PageShell narrow topNav>
      <Header title="Active Members" onBack={onBack} />
      <Card delay={0.05}>
        {activeMembers.length === 0 && pendingMembers.length === 0 && (
          <p style={{ color: C.steel, fontSize: 14, textAlign: "center", padding: "16px 0" }}>No members yet.</p>
        )}
        {activeMembers.map((u, i) => (
          <div key={u.id}>
            <button onClick={() => onSelectMember(u.id)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, padding: "14px 0", width: "100%", transition: "all 0.15s",
            }}>
              <Avatar name={u.name} type={u.type} size={40} image={u.avatar} crop={u.avatarCrop} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: C.dark }}>{u.name}</p>
                <p style={{ fontSize: 12, color: C.steel }}>
                  {u.type === "dependent" ? "Restricted" : "Member"}
                  {(() => { const rel = (currentUser?.relationships || {})[u.id]; return rel ? ` · ${RELATIONSHIP_OPTIONS.find((o) => o.v === rel)?.l || rel}` : ""; })()}
                  {u.pointBalance > 0 ? ` · ${u.pointBalance} pts` : ""}
                </p>
              </div>
              {u.id === currentUserId && (
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.navy, background: C.ice, padding: "4px 10px", borderRadius: 50 }}>You</span>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.steel} strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {(i < activeMembers.length - 1 || pendingMembers.length > 0) && <Divider />}
          </div>
        ))}
        {pendingMembers.length > 0 && (
          <>
            <p style={{ ...labelStyle, marginTop: 12, marginBottom: 8 }}>Pending</p>
            {pendingMembers.map((u, i) => (
              <div key={u.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", opacity: 0.45 }}>
                  <Avatar name={u.name} type={u.type} size={40} image={u.avatar} crop={u.avatarCrop} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: C.steel }}>{u.name}</p>
                    <p style={{ fontSize: 12, color: C.steel, fontStyle: "italic" }}>Awaiting profile setup</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.steel, background: C.mist, padding: "4px 10px", borderRadius: 50 }}>Pending</span>
                </div>
                {i < pendingMembers.length - 1 && <Divider />}
              </div>
            ))}
          </>
        )}
      </Card>
      <button onClick={onAddMember} style={{ ...btnPrimary, width: "100%", marginTop: 16 }}>Add Member</button>
    </PageShell>
  );
}
