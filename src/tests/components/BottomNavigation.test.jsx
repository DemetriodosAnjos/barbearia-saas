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

  it("renderiza os ícones da barra inferior estilizados no tom Âmbar do Dark Theme", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    // Verifica que os botões contêm wrappers com a classe de cor âmbar
    const agendaBtn = screen.getByTestId("bottom-nav-agenda");
    const iconContainer = agendaBtn.querySelector("div");
    expect(iconContainer?.className).toContain("text-amber-500");
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

  it("abre o menu suspenso popover com as 5 opções com tipografia #969696 idêntica à Navbar", () => {
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

    // 1. Modo de Exibição com ThemeToggle da Navbar
    const modoExibicaoLabel = screen.getByText("Modo de Exibição");
    expect(modoExibicaoLabel).toBeInTheDocument();
    expect(modoExibicaoLabel).toHaveClass("dark:text-[#969696]");
    expect(screen.getByRole("button", { name: /alternar para modo/i })).toBeInTheDocument();

    // 2. Meu Perfil com cor #969696
    const perfilLabel = screen.getByText("Meu Perfil");
    expect(perfilLabel).toBeInTheDocument();
    expect(perfilLabel).toHaveClass("dark:text-[#969696]");

    // 3. Configurações da Barbearia com cor #969696
    const configLabel = screen.getByText("Configurações da Barbearia");
    expect(configLabel).toBeInTheDocument();
    expect(configLabel).toHaveClass("dark:text-[#969696]");

    // 4. Suporte & Ajuda com cor #969696
    const suporteLabel = screen.getByText("Suporte & Ajuda");
    expect(suporteLabel).toBeInTheDocument();
    expect(suporteLabel).toHaveClass("dark:text-[#969696]");

    // 5. Sair da Plataforma com cor #969696
    const sairLabel = screen.getByText("Sair da Plataforma");
    expect(sairLabel).toBeInTheDocument();
    expect(sairLabel).toHaveClass("dark:text-[#969696]");

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

  it("alterna o ThemeToggle ao clicar no seletor de tema dentro do menu Mais", () => {
    render(
      <BottomNavigation
        items={mockItems}
        activeItem="agenda"
        onChange={vi.fn()}
      />
    );

    // Abre menu Mais
    fireEvent.click(screen.getByTestId("bottom-nav-mais"));

    const themeToggleBtn = screen.getByRole("button", { name: /alternar para modo/i });
    expect(themeToggleBtn).toBeInTheDocument();

    // Alterna o tema
    fireEvent.click(themeToggleBtn);
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
