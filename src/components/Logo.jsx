import { C } from "../constants/colors";

export default function Logo({ size = 32 }) {
  return (
    <span style={{
      fontFamily: "'Fraunces', serif",
      fontWeight: 700,
      fontSize: size,
      color: C.dark,
      letterSpacing: "-0.02em",
      fontStyle: "italic",
    }}>
      divvy
    </span>
  );
}
