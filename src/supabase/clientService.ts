import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==============================================================================
// TIPOS E INTERFACES DE DADOS
// ==============================================================================

export interface Client {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  last_visit?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  last_visit?: string | null;
  // Opcional no input pois é injetado automaticamente a partir do auth.uid()
  tenant_id?: string;
}

export interface UpdateClientInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  last_visit?: string | null;
}

// ==============================================================================
// CONFIGURAÇÃO DO CLIENTE SUPABASE
// ==============================================================================

/**
 * Cria ou obtém a instância do cliente Supabase.
 * No ambiente real, passe process.env.NEXT_PUBLIC_SUPABASE_URL ou import.meta.env.VITE_SUPABASE_URL
 */
export function getSupabaseClient(supabaseUrl?: string, supabaseAnonKey?: string): SupabaseClient {
  const url = supabaseUrl || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_URL : '') || 'https://sua-empresa.supabase.co';
  const anonKey = supabaseAnonKey || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY : '') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// ==============================================================================
// SERVIÇO DE CLIENTES COM ISOLAMENTO DE TENANT
// ==============================================================================

export class ClientsService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * PASSO 2: Inserção segura de novo cliente.
   * Obtém o usuário logado no Supabase Auth e injeta explicitamente o tenant_id.
   * Mesmo que ocorra qualquer tentativa de burlar no frontend, as políticas de
   * RLS e o Trigger no banco impedem a gravação em outro tenant.
   */
  async createClient(input: CreateClientInput): Promise<{ data: Client | null; error: Error | null }> {
    try {
      // 1. Obtém o usuário autenticado na sessão atual do Supabase
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Usuário não autenticado. Faça login para cadastrar clientes.');
      }

      // 2. Monta o payload garantindo o tenant_id da barbearia/admin logado
      const clientPayload = {
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: input.notes?.trim() || null,
        last_visit: input.last_visit || null,
        // Injeção mandatória do tenant_id do usuário logado
        tenant_id: user.id,
      };

      // 3. Executa a inserção via Supabase.
      // O Supabase enviará o JWT do usuário no cabeçalho Authorization: Bearer <token>.
      // A política RLS "Inserir clientes apenas no próprio tenant" validará que tenant_id = auth.uid().
      const { data, error } = await this.supabase
        .from('clients')
        .insert([clientPayload])
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao cadastrar cliente: ${error.message}`);
      }

      return { data: data as Client, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  /**
   * Consulta os clientes do tenant.
   * Graças à política RLS "Clientes visíveis apenas pelo proprietário"
   * (USING (tenant_id = auth.uid())), o banco Postgres filtra AUTOMATICAMENTE
   * apenas os clientes deste tenant. NENHUM dado de outra barbearia é retornado.
   */
  async getClients(): Promise<{ data: Client[] | null; error: Error | null }> {
    try {
      // O JWT anexado automaticamente na requisição permite ao Postgres aplicar auth.uid()
      const { data, error } = await this.supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`Erro ao listar clientes: ${error.message}`);
      }

      return { data: (data as Client[]) || [], error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  /**
   * Atualiza os dados de um cliente existente.
   * O RLS garante que o UPDATE só afeta o registro se ele pertencer ao tenant autenticado.
   */
  async updateClient(clientId: string, updates: UpdateClientInput): Promise<{ data: Client | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar cliente: ${error.message}`);
      }

      return { data: data as Client, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  /**
   * Remove um cliente pertencente ao próprio tenant.
   */
  async deleteClient(clientId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await this.supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        throw new Error(`Erro ao excluir cliente: ${error.message}`);
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err };
    }
  }
}
