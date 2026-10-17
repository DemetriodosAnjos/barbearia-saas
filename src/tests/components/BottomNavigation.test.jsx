import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BottomNavigation from "../../components/ui/BottomNavigation";

describe("Component: BottomNavigation (Layout Simétrico 2+1+2)", () => {
  const mockItems = [
    {
      id: "agenda",
      label: "Agenda",
      title: "Agenda (Home)",
      ariaLabel: "Agenda (Home)",
      icon: <span data-testid="icon-agenda">📅</span>,
    },
    {
      id: "clientes",
      label: "Clientes",
      title: "Clientes",
      ariaLabel: "Clientes",
      icon: <span data-testid="icon-clientes">👥</span>,
    },
    {
      id: "novo_atendimento",
      label: "Novo Atendimento",
      title: "Novo Atendimento",
      ariaLabel: "Novo Atendimento",
      icon: <span data-testid="icon-novo">✂️</span>,
      isCenterAction: true,
    },
    {
      id: "financeiro",
      label: "Financeiro",
      title: "Financeiro",
      ariaLabel: "Financeiro",
      icon: <span data-testid="icon-financeiro">💰</span>,
    },
    {
      id: "mais",
      label: "Mais",
      title: "Mais / Perfil",
      ariaLabel: "Mais / Perfil",
      icon: <span data-testid="icon-mais">⚙️</span>,
    },
  ];

  it("renderiza a barra fixa de navegação com role navigation e 5 itens no layout 2+1+2", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    const nav = screen.getByRole("navigation", { name: /navegação inferior mobile/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass("fixed", "bottom-0");

    // Verifica presença de todos os rótulos e botões
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Novo Atendimento")).toBeInTheDocument();
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
    expect(screen.getByText("Mais")).toBeInTheDocument();
  });

  it("destaca visualmente o botão central de 'Novo Atendimento' (isCenterAction)", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    const centerBtn = screen.getByTestId("bottom-nav-cta-center");
    expect(centerBtn).toBeInTheDocument();
    expect(centerBtn).toHaveAttribute("data-nav-center", "true");
    expect(screen.getByTestId("icon-novo")).toBeInTheDocument();
  });

  it("aplica estados ativo/inativo corretamente com aria-current='page'", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="clientes"
        onChange={vi.fn()}
      />
    );

    const clientesBtn = screen.getByTestId("bottom-nav-clientes");
    expect(clientesBtn).toHaveAttribute("aria-current", "page");

    const agendaBtn = screen.getByTestId("bottom-nav-agenda");
    expect(agendaBtn).not.toHaveAttribute("aria-current");
  });

  it("chama a função onChange ao clicar nas abas normais e no botão central", () => {
    const handleChange = vi.fn();
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={handleChange}
      />
    );

    // Clica em Financeiro
    const financeiroBtn = screen.getByTestId("bottom-nav-financeiro");
    fireEvent.click(financeiroBtn);
    expect(handleChange).toHaveBeenCalledWith("financeiro");

    // Clica no botão central de Novo Atendimento
    const centerBtn = screen.getByTestId("bottom-nav-cta-center");
    fireEvent.click(centerBtn);
    expect(handleChange).toHaveBeenCalledWith("novo_atendimento");
  });
});
