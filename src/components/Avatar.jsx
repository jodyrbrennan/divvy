import { C, font } from "../constants/colors";

export default function Avatar({ name, type, size = 38, image, crop }) {
  if (image) {
    const z = crop?.zoom || 1;
    const ox = crop?.x || 0;
    const oy = crop?.y || 0;
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        overflow: "hidden", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(41,53,60,0.2)",
      }}>
        <img src={image} alt={name} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${z}) translate(${ox / z}px, ${oy / z}px)`,
        }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: type === "dependent" ? C.gradientAccent : C.gradientPrimary,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, fontFamily: font, color: C.white,
      boxShadow: "0 2px 8px rgba(41,53,60,0.2)", flexShrink: 0,
    }}>
      {name?.charAt(0)?.toUpperCase()}
    </div>
  );
}
