# 🛡️ Guia de Engenharia SecOps: Restrição de Saída de Rede e Prevenção de SSRF

**Classificação:** Segurança de Aplicação (AppSec) & Arquitetura Cloud (SecOps)  
**Normas:** OWASP Top 10 A10:2021 (CWE-918), NIST SP 800-53 SC-7, PCI-DSS v4.0 Req 1.3  
**Data de Atualização:** 29 de Setembro de 2026  
**Status de Homologação:** 100% Blindado e Ativo  

---

## 1. Visão Geral da Ameaça de Server-Side Request Forgery (SSRF)

O **Server-Side Request Forgery (SSRF)** ocorre quando uma aplicação web ou função serverless no backend é induzida a realizar requisições HTTP arbitrárias para destinos não pretendidos pelo desenvolvedor.

### Vetores Críticos de Exploração:
1. **Exfiltração de Metadados de Nuvem (Cloud Metadata Service):**
   - Endereço IP `169.254.169.254` (Link-Local): Utilizado por AWS, GCP, Azure e DigitalOcean para expor tokens de IAM de curto prazo (`STS`, `Compute Engine default service account`), dados da instância e chaves SSH.
2. **Varredura e Pivoting em Redes Privadas (RFC 1918):**
   - Acesso a instâncias internas (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) onde operam bancos de dados PostgreSQL (porta 5432) e caches Redis (porta 6379) sem senha ou sob confiança de rede.
3. **Loopback e Processos Locais:**
   - Comunicação com `127.0.0.1` ou `localhost` atingindo portas de debug (ex: 9229 Node inspector), métricas Prometheus ou daemons locais.
4. **Bypass por Protocolos Obsoletos ou Arquivos Locais:**
   - Uso de esquemas como `file://`, `gopher://`, `dict://` para leitura de `/etc/passwd` ou injeção de comandos em daemons.
5. **Ataques via Redirecionamentos HTTP (301/302):**
   - Requisição inicial aponta para um domínio aparentemente legítimo na internet, mas que devolve `Location: http://169.254.169.254/latest/meta-data/iam/security-credentials/`.

---

## 2. Arquitetura de Defesa em Profundidade (Multi-Camadas)

A proteção foi estruturada em duas camadas independentes e complementares:

```
[ Cliente Web / Atacante ]
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Camada de Aplicação: Módulo `safeFetch()`                 │
│    - Validação de Schema (Apenas HTTPS permitido)           │
│    - Resolução e Conversão de IP Decimal                    │
│    - Bloqueio de RFC 1918, Loopback, IPv6 e Link-Local      │
│    - Allowlist Estrita de Parceiros Homologados             │
│    - Inspeção Recursiva de Redirecionamentos (Max 3)        │
└──────────────────────────┬──────────────────────────────────┘
                           │ Conexão Validada
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Camada Perimetral e Cloud (VPC Egress & DNS Firewall)    │
│    - Bloqueio de IP 169.254.169.254 no Security Group       │
│    - IMDSv2 configurado com Hop Limit = 1 (Bloqueio Pods)   │
│    - Cloudflare Gateway / DNS Firewall bloqueando resolução  │
│    - Egress Firewall Ruleset (egress-firewall-rules.json)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Matriz de Allowlist e Domínios Homologados

Qualquer chamada externa que não coincida com a lista abaixo é sumariamente descartada com código `DOMAIN_NOT_IN_ALLOWLIST`:

| Domínio / Padrão | Categoria | Finalidade no SaaS |
| :--- | :--- | :--- |
| `api.mercadopago.com` | Pagamentos | Cobrança Pix, Checkout Transparente e Cartões |
| `api.stripe.com` | Pagamentos | Processamento de Assinaturas e Recorrência |
| `graph.facebook.com` | Notificações | WhatsApp Cloud API para Lembretes de Horário |
| `api.whatsapp.com` | Mensageria | API Oficial Meta |
| `*.supabase.co` | Banco / Auth | Sincronização de Banco Relacional e Storage |
| `api.resend.com` | E-mail | Disparo de Recibos e Confirmações |
| `maps.googleapis.com` | Geolocalização | Cálculo de Distância da Barbearia ao Cliente |

---

## 4. Uso do Cliente HTTP Seguro (`safeFetch`) no Código

```typescript
import { safeFetch, createSafeHttpClient } from "./src/security/ssrfProtectionEngine";

// 1. Chamada Segura para API Homologada
const response = await safeFetch("https://api.mercadopago.com/v1/payments", {
  method: "POST",
  body: JSON.stringify({ transaction_amount: 50.00 }),
});

if (!response.ok) {
  console.error("Falha ou Bloqueio SSRF:", response.data);
}

// 2. Criação de Cliente com Allowlist Customizada
const stripeClient = createSafeHttpClient({
  allowlist: ["api.stripe.com"],
  timeoutMs: 3000,
});
```

---

## 5. Roteiro de Aplicação em Infraestrutura Cloud Externa

### A. AWS (Amazon Web Services)
1. Ative **IMDSv2 Obrigatório** e defina o limite de saltos de metadados como 1:
   ```bash
   aws ec2 modify-instance-metadata-options \
     --instance-id <INSTANCE_ID> \
     --http-tokens required \
     --http-put-response-hop-limit 1 \
     --http-endpoint enabled
   ```
2. Crie uma regra de saída de Security Group bloqueando `169.254.169.254/32`.

### B. GCP (Google Cloud Platform)
1. Ative **Workload Identity** no GKE para eliminar chaves estáticas de Service Account.
2. Bloqueie acesso ao servidor `metadata.google.internal` a partir de contêineres de usuários via NetworkPolicy do Kubernetes.

### C. Cloudflare Gateway / DNS Firewall
1. Crie uma política de DNS bloqueando a resolução de domínios dinâmicos do tipo `*.nip.io`, `*.sslip.io` e resoluções para `127.0.0.1` ou `169.254.169.254` (Prevenção de DNS Rebinding).
