import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./components/EmptyState";
import { BookOpen } from "lucide-react";

describe("shared UI", () => {
  it("renders an honest empty state", () => {
    render(<EmptyState icon={BookOpen} title="Nothing here yet" text="Create your first note." />);
    expect(screen.getByRole("heading", { name: "Nothing here yet" })).toBeInTheDocument();
    expect(screen.getByText("Create your first note.")).toBeInTheDocument();
  });
});
