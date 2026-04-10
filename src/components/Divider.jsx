import { C } from "../constants/colors";

export default function Divider() {
  return <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`, margin: "12px 0" }} />;
}
