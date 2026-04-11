import { C, font, fontDisplay } from "../constants/colors";
import { btnPrimary, btnBase } from "../constants/styles";
import Avatar from "./Avatar";

export default function TaskCompletionDialog({ tasks, users, currentUserId, onConfirm, onCancel }) {
  const currentUser = users.find((u) => u.id === currentUserId);
  const otherUsers = users.filter((u) => u.id !== currentUserId && u.status !== "pending");
  const taskCount = tasks.length;
  const taskLabel = taskCount === 1 ? `"${tasks[0].name}"` : `${taskCount} tasks`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(41,53,60,0.5)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, animation: "fadeUp 0.2s ease both",
    }}>
      <div style={{
        background: C.white, borderRadius: 20, padding: 28,
        maxWidth: 420, width: "100%",
        boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: C.dark, marginBottom: 8 }}>
          Mark complete
        </h3>
        <p style={{ color: C.steel, fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          Who completed {taskLabel}?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentUser && (
            <button onClick={() => onConfirm(currentUserId)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 12,
              background: C.ice, border: `1.5px solid ${C.sky}`,
              transition: "all 0.2s",
            }}>
              <Avatar name={currentUser.name} type={currentUser.type} size={32}
                image={currentUser.avatar} crop={currentUser.avatarCrop} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>I completed {taskCount === 1 ? "this" : "these"}</p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>{currentUser.name}</p>
              </div>
            </button>
          )}

          {otherUsers.map((u) => (
            <button key={u.id} onClick={() => onConfirm(u.id)} style={{
              all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.4)", border: `1.5px solid ${C.border}`,
              transition: "all 0.2s",
            }}>
              <Avatar name={u.name} type={u.type} size={32}
                image={u.avatar} crop={u.avatarCrop} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: C.dark }}>
                  Completing for {u.name}
                </p>
                <p style={{ fontSize: 12, color: C.steel, marginTop: 2 }}>
                  {u.type === "dependent" ? "Restricted member" : "Member"}
                </p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={onCancel} style={{
          ...btnBase, width: "100%", marginTop: 16,
          background: "transparent", color: C.steel, fontSize: 14,
          textAlign: "center", display: "flex", justifyContent: "center",
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}