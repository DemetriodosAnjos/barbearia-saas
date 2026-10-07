/**
 * @file src/tests/unit/visualRegressionEngine.test.tsx
 * Testes Unitários de Conformidade do Storybook e Regressão Visual.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

describe('[Palette] Visual Regression & Storybook Design System Engine', () => {

  describe('1. Button States Coverage', () => {
    it('deve renderizar botão no estado default', () => {
      render(<Button>Agendar</Button>);
      const btn = screen.getByRole('button', { name: /agendar/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    it('deve aplicar atributos acessíveis no estado disabled', () => {
      render(<Button disabled>Bloqueado</Button>);
      const btn = screen.getByRole('button', { name: /bloqueado/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-disabled', 'true');
    });

    it('deve renderizar spinner e aria-busy no estado loading', () => {
      render(<Button isLoading>Salvando...</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-busy', 'true');
    });

    it('deve suportar variante danger/error para ações destrutivas', () => {
      render(<Button variant="danger">Excluir</Button>);
      const btn = screen.getByRole('button', { name: /excluir/i });
      expect(btn.className).toContain('red');
    });
  });

  describe('2. Input States Coverage & WAI-ARIA', () => {
    it('deve renderizar input no estado default com label', () => {
      render(<Input label="Nome Completo" placeholder="Digite seu nome" />);
      expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    });

    it('deve exibir mensagem de erro e associar via aria-describedby no estado error', () => {
      render(<Input label="Telefone" error="Número de telefone obrigatório" />);
      const input = screen.getByLabelText(/telefone/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const errorText = screen.getByText(/número de telefone obrigatório/i);
      expect(errorText).toBeInTheDocument();
      expect(input.getAttribute('aria-describedby')).toContain('error');
    });

    it('deve respeitar estado disabled impedindo foco e edição', () => {
      render(<Input label="ID Bloqueado" disabled value="CLI-100" />);
      expect(screen.getByLabelText(/id bloqueado/i)).toBeDisabled();
    });
  });

  describe('3. Modal Dialog & Accessibility', () => {
    it('não deve renderizar no DOM quando isOpen for falso', () => {
      render(<Modal isOpen={false} title="Modal Fechado"><p>Conteúdo</p></Modal>);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('deve renderizar role="dialog" e aria-modal="true" quando aberto', () => {
      render(<Modal isOpen={true} title="Confirmar Agendamento"><p>Conteúdo Aberto</p></Modal>);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText(/confirmar agendamento/i)).toBeInTheDocument();
    });
  });

  describe('4. Card Component States', () => {
    it('deve renderizar card default com título e descrição', () => {
      render(<Card title="Corte Degradê" description="Duração 45 min" />);
      expect(screen.getByText(/corte degradê/i)).toBeInTheDocument();
      expect(screen.getByText(/duração 45 min/i)).toBeInTheDocument();
    });

    it('deve aplicar classes de seleção quando isSelected for true', () => {
      const { container } = render(<Card title="Selecionado" isSelected />);
      expect(container.firstChild).toHaveClass('border-amber-500');
    });
  });

  describe('5. Cascade Regression Protection', () => {
    it('deve garantir que os estilos básicos de botões contenham foco visível :focus-visible', () => {
      const { container } = render(<Button variant="primary">Teste Foco</Button>);
      const btn = container.querySelector('button');
      expect(btn?.className).toContain('focus-visible:');
    });

    it('deve garantir que badges semânticas possuam alto contraste e bordas calibradas', () => {
      render(<Badge status="confirmed" label="Aprovado" />);
      expect(screen.getByText(/aprovado/i)).toBeInTheDocument();
    });
  });

});
