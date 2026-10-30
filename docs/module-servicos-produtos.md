# Módulo: Serviços & Produtos (`/docs/module-servicos-produtos.md`)

## 1. Visão Geral
O módulo **Serviços & Produtos (`ServicesAndProductsView.jsx`)** reúne o catálogo operacional e comercial da barbearia:
- **Aba Serviços:** Catálogo com tempos de execução (`duration_minutes`), preços de venda (`price`), comissão padrão (`commission_percent`) e visibilidade no agendamento online (`active`).
- **Aba Produtos:** Controle de estoque (`stock`), preço de custo (`cost_price`), preço de venda (`price`), comissão do barbeiro por venda (`commission_percent`) e categorias (`Vitrine` e `Bar`).

---

## 2. Estrutura de Tabelas SQL no Supabase

### Tabela `services`
| Coluna | Tipo SQL | Nullable | Descrição / Regra |
|---|---|---|---|
| `id` | `text` / `uuid` | Não | Identificador único do serviço (ex: `"serv-1"` ou UUID). |
| `barbershop_id` | `uuid` | Não | ID da barbearia proprietária (Multi-tenancy). |
| `name` | `text` | Não | Nome do serviço (ex: "Corte Tradicional / Degradê"). |
| `category` | `text` | Sim | Categoria ("Cabelo", "Barba", "Combos", "Tratamentos", "Acabamento"). |
| `duration_minutes` | `integer` | Não | Duração estimada em minutos (alimenta a grade de horários). |
| `price` | `numeric` | Não | Preço cobrado do cliente em R$. |
| `commission_percent`| `numeric` | Sim | Comissão padrão atribuída ao profissional (%). |
| `active` | `boolean` | Não | Indica se o serviço está ativo para seleção e agendamento. |
| `tag` | `text` | Sim | Etiqueta promocional opcional (ex: "Mais Pedido", "VIP"). |
| `created_at` | `timestamptz` | Sim | Data e hora de criação do registro. |

### Tabela `products`
| Coluna | Tipo SQL | Nullable | Descrição / Regra |
|---|---|---|---|
| `id` | `text` / `uuid` | Não | Identificador único do item (ex: `"prod-1"` ou UUID). |
| `barbershop_id` | `uuid` | Não | ID da barbearia proprietária (Multi-tenancy). |
| `name` | `text` | Não | Nome do produto (ex: "Pomada Modeladora Efeito Matte 150g"). |
| `category` | `text` | Não | Tipo do item: `'Vitrine'` ou `'Bar'`. |
| `cost_price` | `numeric` | Sim | Preço de custo unitário. |
| `price` | `numeric` | Não | Preço de venda ao consumidor. |
| `stock` | `integer` | Não | Quantidade física disponível em estoque. |
| `commission_percent`| `numeric` | Sim | Comissão percentual paga ao barbeiro na venda pelo PDV. |
| `active` | `boolean` | Não | Disponibilidade do item no caixa e catálogo. |

---

## 3. Fluxo de Dados e Propagação de Estado

```text
       Supabase (PostgreSQL)
        ▲          ▲
        │          │ (SELECT / INSERT / UPDATE)
        ▼          ▼
     App.jsx (loadDataFromSupabase)
        │
        ├── validateServicesContract (Zod)
        ├── validateProductsContract (Zod)
        │
        ▼ (Props: services, products, callbacks)
     BarbershopDashboard.jsx
        │
        ▼ (Props: services, products, onAdd*, onUpdate*, onDelete*)
     ServicesAndProductsView.jsx (Abas: Serviços / Produtos)
        ├── Sincronização local imediata (localServices / localProducts)
        ├── Persistência assíncrona tolerante a falhas no Supabase
        └── Notificações via Alert nativo da aplicação (sem window.alert)
```

### Contrato de Props de `ServicesAndProductsView.jsx`
- `services` / `initialServices`: Array de serviços carregados.
- `onAddService(createdService)`: Adiciona serviço ao estado do componente pai.
- `onUpdateService(updatedService)`: Atualiza serviço individual no estado do componente pai.
- `onUpdateServices(servicesArray)`: Substitui a lista inteira de serviços.
- `onDeleteService(serviceId)`: Desativação lógica do serviço no estado do componente pai.
- `products` / `initialProducts`: Array de produtos carregados.
- `onAddProduct(createdProduct)`: Adiciona produto ao catálogo e estoque.
- `onUpdateProduct(updatedProduct)`: Atualiza dados do produto (preço, estoque, custo).
- `onUpdateProducts(productsArray)`: Substitui a lista inteira de produtos.
- `onDeleteProduct(productId)`: Desativação lógica do produto.
- `tenant`: Objeto da barbearia com `id` para respeitar o isolamento multi-tenant (`barbershop_id`).

---

## 4. Diretrizes de Integração e Resiliência com o Supabase
1. **Carregamento Inicial Duplo com Validação Zod:**
   - O aplicativo carrega `services` e `products` diretamente do Supabase.
   - Os dados são validados via Zod em `apiContractValidator.ts` (`validateServicesContract` e `validateProductsContract`).
2. **Catálogo de Contingência Tolerante:**
   - Caso a tabela `products` ou `services` retorne vazia ou ocorra falha de rede/RLS, o sistema entra em modo de contingência resiliente, fornecendo itens padrão para que o PDV e os agendamentos continuem funcionando.
3. **Persistência Assíncrona com `barbershop_id` Obrigatório:**
   - Todos os inserts de serviços e produtos incluem explicitamente `barbershop_id: tenant?.id || "a0000000-0000-0000-0000-000000000001"`.
   - Modificações disparam `.update(payload).eq("id", id)`.
   - Soft-delete preserva integridade histórica de fechamento de caixa: `.update({ active: false }).eq("id", id)`.

---

## 5. ⚠️ Regras de Segurança RLS — NÃO ALTERAR SEM CONSULTAR ESTE DOC

### Contexto
O sistema suporta dois métodos de login: **e-mail + senha** e **Entrar com Google** (SSO). Eles se comportam de forma diferente no Supabase:

| Método de login | Role no Supabase | Sessão JWT real |
|---|---|---|
| E-mail + senha | `authenticated` | ✅ Sim |
| Entrar com Google (SSO) | `anon` (sem sessão Supabase nativa) | ⚠️ Apenas se One Tap retornar id_token |

Por causa disso, as tabelas `products` e `services` possuem **duas camadas de policies RLS**:

### Camada 1 — Role `authenticated`
- Policy `products_authenticated_all` / `services_authenticated_all`
- Permite CRUD completo para usuários com sessão JWT real cujo `barbershop_id` coincide com o `profiles.barbershop_id` do `auth.uid()`.
- **Não remover.** Cobre o login por e-mail + senha e o Google SSO quando o One Tap consegue capturar o id_token.

### Camada 2 — Role `anon` (Google SSO sem sessão Supabase)
- Policies: `products_anon_select`, `products_anon_insert`, `products_anon_update`, `products_anon_delete`
- Mesmas policies para `services`.
- SELECT: livre (necessário também para o booking público de clientes).
- INSERT/UPDATE/DELETE: permitido quando `barbershop_id` **E** `tenant_id` são UUIDs válidos (verificação por regex no banco).
- **Não remover.** Sem essas policies, usuários que entrarem com Google não conseguem cadastrar, editar ou excluir produtos e serviços.

### Migrations aplicadas no Supabase
| Arquivo | O que faz |
|---|---|
| `supabase/migrations/20261029000002_fix_products_services_rls_policies.sql` | Cria policies para `authenticated` (CRUD) e `anon` (SELECT) |
| `supabase/migrations/20261029000003_fix_anon_write_products_services.sql` | Adiciona INSERT/UPDATE/DELETE para `anon` |

> Se o banco for reiniciado ou as policies forem resetadas, **execute esses dois arquivos no SQL Editor do Supabase** (nessa ordem) para restaurar o comportamento correto.

### O que NÃO foi alterado
- Tabelas `clients`, `profiles`, `tenants`, `barbers`, `appointments`, `comandas` — **intactas**.
- O sistema de busca e lookup de clientes (tanto por e-mail+senha quanto por Google SSO) — **intacto**.
- O fluxo de agendamento público (`anon` pode inserir em `appointments`) — **intacto**.
