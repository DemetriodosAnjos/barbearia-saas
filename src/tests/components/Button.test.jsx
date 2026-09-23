import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "../../components/ui/Button";

describe("Component: Button", () => {
  it("renders children text correctly", () => {
    render(<Button>Agendar Corte</Button>);
    expect(screen.getByRole("button", { name: /agendar corte/i })).toBeInTheDocument();
  });

  it("handles onClick callback", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Confirmar</Button>);

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("displays loading state and disables button", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Salvar
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("disables button when disabled prop is true", () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Indisponível
      </Button>
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
