import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Badge, { STATUS_TRANSITIONS, STATUS_CONFIG } from "../../components/ui/Badge";

describe("Component: Badge", () => {
  it("renders default status correctly", () => {
    render(<Badge status="waiting" />);
    expect(screen.getByText("Aguardando")).toBeInTheDocument();
  });

  it("renders custom label if provided", () => {
    render(<Badge status="confirmed" label="Horário Confirmado" />);
    expect(screen.getByText("Horário Confirmado")).toBeInTheDocument();
  });

  it("enforces finite state machine transitions", () => {
    expect(STATUS_TRANSITIONS.waiting).toContain("confirmed");
    expect(STATUS_TRANSITIONS.waiting).toContain("cancelled");
    expect(STATUS_TRANSITIONS.completed).toEqual([]);
    expect(STATUS_TRANSITIONS.cancelled).toEqual([]);
    expect(STATUS_TRANSITIONS.no_show).toEqual([]);
  });

  it("allows transition dropdown when interactive and not in terminal state", () => {
    const handleStatusChange = vi.fn();
    render(
      <Badge
        status="waiting"
        isInteractive={true}
        onStatusChange={handleStatusChange}
      />
    );

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();

    // Click to open dropdown
    fireEvent.click(button);

    // Option to transition to "Confirmado" should be visible
    const confirmedOption = screen.getByText("Confirmado");
    expect(confirmedOption).toBeInTheDocument();

    fireEvent.click(confirmedOption);
    expect(handleStatusChange).toHaveBeenCalledWith("confirmed");
  });

  it("is not interactive when in terminal state (completed)", () => {
    const handleStatusChange = vi.fn();
    render(
      <Badge
        status="completed"
        isInteractive={true}
        onStatusChange={handleStatusChange}
      />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
