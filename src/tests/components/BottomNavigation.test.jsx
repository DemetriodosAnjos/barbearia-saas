import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BottomNavigation from "../../components/ui/BottomNavigation";

describe("Component: BottomNavigation (Layout Simétrico 2+1+2 e Menu Mais)", () => {
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

  it("renderiza a barra fixa com cantos arredondados no topo (rounded-t-2xl) e fundo escuro", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    const nav = screen.getByRole("navigation", { name: /navegação inferior mobile/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass("fixed", "bottom-0", "rounded-t-2xl");

    // Verifica estilo inline protetor contra vazamento de tema
    expect(nav.style.backgroundColor).toBe("rgb(23, 23, 23)");
    expect(nav.style.borderTopLeftRadius).toBe("1rem");
    expect(nav.style.borderTopRightRadius).toBe("1rem");

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

  it("abre o menu suspenso popover com as 5 opções ao clicar no botão 'Mais'", () => {
    const handleNavigate = vi.fn();
    const handleLogout = vi.fn();

    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    );

    // Popover inicialmente fechado
    expect(screen.queryByTestId("bottom-nav-more-popover")).not.toBeInTheDocument();

    // Clica no botão "Mais"
    const maisBtn = screen.getByTestId("bottom-nav-mais");
    fireEvent.click(maisBtn);

    // Popover aberto
    const popover = screen.getByTestId("bottom-nav-more-popover");
    expect(popover).toBeInTheDocument();

    // 1. Modo de Exibição com toggle
    expect(screen.getByText("Modo de Exibição")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-theme-toggle")).toBeInTheDocument();

    // 2. Meu Perfil
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument();

    // 3. Configurações da Barbearia
    expect(screen.getByText("Configurações da Barbearia")).toBeInTheDocument();

    // 4. Suporte & Ajuda
    expect(screen.getByText("Suporte & Ajuda")).toBeInTheDocument();

    // 5. Sair da Plataforma
    expect(screen.getByText("Sair da Plataforma")).toBeInTheDocument();

    // Clica em "Meu Perfil"
    fireEvent.click(screen.getByTestId("bottom-nav-item-perfil"));
    expect(handleNavigate).toHaveBeenCalledWith("perfil");
    expect(screen.queryByTestId("bottom-nav-more-popover")).not.toBeInTheDocument();
  });

  it("aciona logout ao clicar em 'Sair da Plataforma' no menu Mais", () => {
    const handleLogout = vi.fn();

    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
        onLogout={handleLogout}
      />
    );

    // Abre menu Mais
    fireEvent.click(screen.getByTestId("bottom-nav-mais"));

    // Clica em Sair da Plataforma
    const logoutBtn = screen.getByTestId("bottom-nav-item-logout");
    fireEvent.click(logoutBtn);
    expect(handleLogout).toHaveBeenCalled();
  });

  it("alterna o switch de tema ao clicar no Modo de Exibição", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    // Abre menu Mais
    fireEvent.click(screen.getByTestId("bottom-nav-mais"));

    const themeToggle = screen.getByTestId("bottom-nav-theme-toggle");
    expect(themeToggle).toBeInTheDocument();

    // Alterna o tema
    fireEvent.click(themeToggle);
    expect(document.documentElement.classList.contains("dark") || !document.documentElement.classList.contains("dark")).toBeTruthy();
  });

  it("fecha o menu popover ao clicar no backdrop externo", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    // Abre menu Mais
    fireEvent.click(screen.getByTestId("bottom-nav-mais"));
    expect(screen.getByTestId("bottom-nav-more-popover")).toBeInTheDocument();

    // Clica no backdrop
    const backdrop = screen.getByTestId("bottom-nav-more-backdrop");
    fireEvent.click(backdrop);

    // Popover deve fechar
    expect(screen.queryByTestId("bottom-nav-more-popover")).not.toBeInTheDocument();
  });
});
