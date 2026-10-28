# TRACKING PRO — VERSÃO PERSONALIZADA PARA HOTMART + META ADS

Plataforma privada e profissional de rastreamento e atribuição de marketing digital, inspirada em softwares de tracking de alta precisão (Hyros, RedTrack, Voluum), desenvolvida especificamente para infoprodutores e afiliados que utilizam **Hotmart** e **Meta Ads**.

---

## 🚀 Arquitetura & Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS.
- **Backend Serverless:** Funções serverless compatíveis nativamente com a **Vercel** (`/api/*`). Sem necessidade de processo Node.js permanente ativo.
- **Banco de Dados & Autenticação:** **Supabase** (PostgreSQL relacional com Row Level Security e índices otimizados).
- **Integração Hotmart:** Receptor de Webhooks 2.0 com autenticação por token (`hottok`), garantia de idempotência, auditoria e conciliação de receitas.
- **Integração Meta Ads:** Marketing API oficial para importação de métricas (Gastos, Impressões, Cliques, CPM, CPC, CTR) e Conversions API (CAPI server-side) com hashing SHA-256 e deduplicação.
- **Script Cliente:** Script JavaScript assíncrono para captura de First/Last Touch e auto-decoração de links de checkout (`sck={session}|{campaign}|{ad}`).

---

## 📦 Como Subir no Seu GitHub

Abra o terminal na raiz do projeto e execute os comandos abaixo:

```bash
# 1. Iniciar o repositório git (caso ainda não iniciado)
git init

# 2. Adicionar todos os arquivos
git add .

# 3. Criar o primeiro commit
git commit -m "feat: initial commit Tracking Pro - Hotmart + Meta Ads"

# 4. Definir branch principal
git branch -M main

# 5. Adicionar o link do seu repositório no GitHub (crie um repositório vazio no github.com antes)
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# 6. Enviar para o GitHub
git push -u origin main
```

---

## ⚡ Como Implantar na Vercel (Passo a Passo)

1. Acesse [vercel.com](https://vercel.com) e faça login.
2. Clique em **"Add New..."** > **"Project"**.
3. Selecione o repositório do **Tracking Pro** importado do seu GitHub.
4. Em **Framework Preset**, a Vercel detectará automaticamente **Vite**.
5. Em **Environment Variables**, adicione as seguintes variáveis (veja o arquivo `.env.example`):

| Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `SUPABASE_URL` | URL do seu projeto Supabase | `https://xyzcompany.supabase.co` |
| `SUPABASE_ANON_KEY` | Chave pública anônima do Supabase | `eyJhbGciOiJIUzI1NiIsIn...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada de serviço do Supabase | `eyJhbGciOiJIUzI1NiIsIn...` |
| `HOTMART_HOTTOK` | Token de verificação da Hotmart (Hottok) | `hottok_prod_sec_...` |
| `HOTMART_VERIFY_TOKEN` | Forçar validação de autenticidade (true/false) | `true` |
| `META_ACCESS_TOKEN` | Token de Acesso da Meta Marketing API | `EAAGm0PXq1ZB0BA...` |
| `META_AD_ACCOUNT_ID` | ID da sua Conta de Anúncios com `act_` | `act_482910482019481` |
| `META_PIXEL_ID` | ID numérico do Pixel / Dataset da Meta | `984029184029184` |
| `META_TEST_EVENT_CODE` | Código de Teste do CAPI (Opcional) | `TEST12345` |
| `META_CAPI_ENABLED` | Ativar envio server-side CAPI nas vendas | `true` |

6. Clique em **"Deploy"**.
7. Pronto! A Vercel criará automaticamente os endpoints serverless em `/api/*` e o frontend em sua URL pública (ex: `https://tracking-pro.vercel.app`).

---

## 🗄️ Configuração do Banco de Dados no Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No menu lateral do Supabase, clique em **SQL Editor**.
3. Abra o arquivo `supabase/migrations/20261027_init_tracking_pro.sql` deste projeto, copie todo o conteúdo e cole no SQL Editor do Supabase.
4. Clique em **"Run"** para criar todas as tabelas:
   - `hotmart_webhook_events`: auditoria imutável de webhooks recebidos.
   - `orders`: pedidos e transações normalizadas com atribuição completa.
   - `tracking_sessions`: sessões de visitantes com preservação de primeiro e último toque.
   - `tracking_events`: eventos de pageview e inícios de checkout.
   - `meta_insights`: métricas importadas da Meta Ads.
   - `meta_capi_logs`: registro de disparos server-side para o Conversions API.
   - `app_settings`: configurações globais e tokens de integração.

---

## 🔗 Configuração do Webhook Oficial na Hotmart

1. Acesse sua conta na **Hotmart** (produtor ou afiliado).
2. Vá em **Ferramentas** > **Webhook (API e Notificações)**.
3. Clique em **Cadastrar Webhook**:
   - **Nome:** `Tracking Pro Produção`
   - **URL de Envio:** `https://seu-dominio.vercel.app/api/webhook-hotmart`
   - **Versão:** `2.0.0`
4. Selecione os eventos que deseja acompanhar:
   - Compra Aprovada (`PURCHASE_APPROVED`)
   - Compra Completa (`PURCHASE_COMPLETE`)
   - Aguardando Pagamento (`PURCHASE_BILLET_PRINTED`, `PURCHASE_OUT_OF_SHOPPING_CART`)
   - Reembolso (`PURCHASE_REFUNDED`)
   - Chargeback (`PURCHASE_CHARGEBACK`)
   - Cancelada (`PURCHASE_CANCELED`)
5. Copie o **Token de Autenticação (Hottok)** gerado pela Hotmart e cole no Tracking Pro na aba **Integração Hotmart**.

---

## 🎯 Configuração do Meta Ads & Conversions API (CAPI)

1. Acesse o **Gerenciador de Negócios da Meta** (`business.facebook.com`).
2. Vá em **Configurações do Negócio** > **Usuários do Sistema**.
3. Crie um usuário do sistema com permissão de Administrador e clique em **Gerar Novo Token**.
4. Selecione os escopos:
   - `ads_read`
   - `read_insights`
5. Defina a validade como **Nunca expirar** e copie o token.
6. Na aba **Meta Ads & CAPI** do Tracking Pro, informe:
   - **ID da Conta:** `act_SEU_ID_DE_ANUNCIOS`
   - **Token de Acesso:** Cole o token gerado.
   - **ID do Pixel:** Encontrado no Gerenciador de Eventos da Meta.
   - **Test Event Code:** (Opcional) Código para testar o CAPI na aba "Testar Eventos".

---

## 💻 Instalação do Script de Tracking na Página de Vendas

Cole a tag no `<head>` das suas páginas de vendas, páginas de captura, VSLs e presells:

```html
<script src="https://seu-dominio.vercel.app/tracking-pro.js" data-api="https://seu-dominio.vercel.app" async></script>
```

### O que o Script faz automaticamente:
- Captura parâmetros UTM (`utm_source`, `utm_campaign`, `utm_content`, etc.) e identificadores de clique (`fbclid`, `gclid`).
- Salva o primeiro contato (First Touch) e atualiza o último contato (Last Touch).
- Identifica botões e links de checkout que apontem para a Hotmart (`pay.hotmart.com`) e injeta automaticamente o parâmetro `sck`:
  ```text
  sck=tpro_sid_8291f0a1|cmp_escala_lal|ad_video_vsl_01&src=meta_ads
  ```
- Dispara `initiate_checkout` antes de direcionar o lead para o pagamento.
- Quando a compra é confirmada, a Hotmart envia esse `sck` de volta no webhook, permitindo que o Tracking Pro associe a venda à campanha e ao anúncio exato com **100% de confiança**.

---

## 📂 Estrutura de Pastas do Projeto

```text
├── api/                       # Funções Serverless Vercel
│   ├── webhook-hotmart.ts     # Receptor autenticado de Webhooks Hotmart
│   ├── track.ts               # Coletor de eventos do pixel/script
│   ├── meta-sync.ts           # Sincronizador da Meta Marketing API
│   ├── meta-capi.ts           # Disparador server-side Meta Conversions API
│   ├── dashboard.ts           # Agregador de métricas financeiras
│   ├── settings.ts            # Gerenciador de configurações e credenciais
│   └── hotmart-reprocess.ts   # Reprocessador seguro de notificações
├── public/
│   └── tracking-pro.js        # Script de tracking cliente de alta performance
├── src/
│   ├── components/            # Interface React modular
│   │   ├── FinancialDashboard.tsx  # Painel de Gastos vs Receitas e ROAS
│   │   ├── AttributionView.tsx     # Auditoria de Atribuição (Click to Sale)
│   │   ├── HotmartIntegrationView.tsx # Configuração e Simulador de Webhooks
│   │   ├── MetaAdsView.tsx         # Marketing API e CAPI
│   │   ├── TrackingScriptView.tsx  # Construtor de links e código do script
│   │   ├── DatabaseDeployView.tsx  # Schema Supabase e Guia de Deploy
│   │   └── AttributionModal.tsx    # Modal de jornada do comprador
│   ├── server/                # Lógica de negócio e banco de dados
│   │   ├── db.ts              # Camada de banco de dados (Supabase/Persistent)
│   │   ├── hotmart.ts         # Validação, idempotência e cálculo financeiro
│   │   ├── meta.ts            # Cliente Meta Marketing API oficial
│   │   ├── capi.ts            # Cliente Meta Conversions API (SHA-256)
│   │   └── tracking.ts        # Sessões e registro de eventos
│   └── types/                 # Definições estritas de TypeScript
├── supabase/
│   └── migrations/
│       └── 20261027_init_tracking_pro.sql # Schema PostgreSQL completo com RLS
├── server.ts                  # Servidor Express para ambiente local/desenvolvimento
├── vercel.json                # Configuração de rotas e serverless Vercel
└── .env.example               # Exemplo das variáveis de ambiente necessárias
```

---

## 🔒 Segurança e Privacidade

- **Sem exposição de chaves no frontend:** O token de acesso da Meta, segredos do Supabase e tokens de webhook permanecem estritamente no backend.
- **Idempotência Rigorosa:** Evita duplicidade de faturamento em casos de reenvio de webhooks pela Hotmart.
- **Conformidade LGPD/GDPR:** Sem fingerprinting invasivo ou armazenamento desnecessário de dados sensíveis; IPs são pseudonimizados com hash salgado.
