import { inputStyle, labelStyle } from "../constants/styles";

export default function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        ...inputStyle, appearance: "none",
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 stroke=%27%23768A96%27 fill=%27none%27 stroke-width=%271.5%27/%3E%3C/svg%3E")',
        backgroundRepeat: "no-repeat", backgroundPosition: "right 16px center", paddingRight: 40,
      }}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
