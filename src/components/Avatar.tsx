import type { UserView } from "../../shared/contracts";

export function Avatar({ name, color = "gold", size = 38 }: { name: string; color?: UserView["avatarColor"]; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
  return <span className={`avatar avatar--${color}`} style={{ width: size, height: size, fontSize: Math.max(11, size * .32) }} aria-hidden="true">{initials}</span>;
}
