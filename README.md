# 💰 Leitor de Documentos Financeiros BPO (AI-Powered)

[![GitHub Actions CI](https://github.com/DeckDev-RC/teste/actions/workflows/tests.yml/badge.svg)](https://github.com/DeckDev-RC/teste/actions/workflows/tests.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-blueviolet.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Sistema de nível empresarial para extração automatizada, processamento e gestão de documentos financeiros utilizando Inteligência Artificial de última geração. Desenvolvido para BPOs financeiros que buscam escala e precisão.

## 🚀 Visão Geral

O **Leitor de Docs BPO** transforma imagens e PDFs em dados estruturados em segundos. Utilizando os modelos **Google Gemini 2.0 Flash**, a plataforma identifica automaticamente tipos de documentos, extrai valores, datas e fornecedores, e centraliza tudo em dashboards analíticos intuitivos.

---

## ✨ Funcionalidades Principais

### 🧠 Inteligência Artificial de Elite
- **Extração Automática**: Identificação inteligente de Contas a Pagar e Receber.
- **Análise Multi-Documento**: Processamento em lote de centenas de arquivos simultaneamente.
- **Sistema Anti-Cache**: Algoritmo proprietário para garantir respostas únicas e precisas da API Gemini.

### 📱 Integração WhatsApp (Evolution API)
- **Processamento Inbound**: Receba comprovantes e notas via WhatsApp e processe-os automaticamente.
- **Feedback em Tempo Real**: Respostas automáticas para usuários confirmando a leitura dos dados.

### 📊 Dashboards Especializados
- **Painel Master**: Visão consolidada de todas as análises, métricas de performance da IA e gestão de usuários.
- **Painel do Usuário**: Gestão simplificada dos próprios envios e histórico de processamento.
- **Gráficos Dinâmicos**: Visualização de tendências em tempo real com Chart.js.

---

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** com **Vite** (Build ultra-rápido)
- **Tailwind CSS** (Design responsivo e premium)
- **Framer Motion** (Micro-interações e animações suaves)
- **Lucide React** (Set de ícones moderno)
- **Chart.js** (Visualização de dados analíticos)

### Backend
- **Node.js** & **Express**
- **Supabase** (PostgreSQL, Auth, RLS e Realtime)
- **Google Gemini API** (O cérebro da extração)
- **Evolution API** (Integração WhatsApp)
- **Sharp & Multer** (Processamento e upload de arquivos)

---

## 📂 Estrutura do Projeto

```text
├── backend/
│   ├── src/config/        # Gerenciamento de chaves e envs
│   ├── src/controllers/   # Lógica das rotas (Admin, WhatsApp, etc)
│   ├── src/services/      # Conectores de IA e Evolution API
│   └── migrations/        # Esquemas SQL para Supabase
├── frontend/
│   ├── src/components/    # UI Reutilizável (Header, Charts)
│   ├── src/pages/         # Páginas da aplicação (Master, User, WhatsApp)
│   └── src/utils/         # Helpers e clientes de API
├── .github/workflows/     # CI/CD (Testes automatizados)
└── docker-compose.yml     # Configuração para deploy EasyPanel/Docker
```

---

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- Instância Supabase (Self-hosted ou Cloud)
- Key da API Google Gemini

### Passo a Passo

1. **Clone o projeto:**
   ```bash
   git clone https://github.com/DeckDev-RC/teste.git
   cd LeitorDeDoc
   ```

2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env  # Configure suas credenciais
   npm install
   npm start
   ```

3. **Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 🔐 Segurança e Boas Práticas

- **Segurança do Histórico**: Todo o histórico de commits foi auditado e limpo de credenciais sensíveis via `git filter-branch`.
- **Row Level Security (RLS)**: Políticas rigorosas no Supabase garantem que um usuário só acesse seus próprios dados.
- **Gestão de Chaves**: Implementado um `apiKeyManager` para rotação e fallback de chaves de IA.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/IncredibleFeature`)
3. Adicione suas mudanças (`git commit -m 'Add some IncredibleFeature'`)
4. Faça o Push para a Branch (`git push origin feature/IncredibleFeature`)
5. Abra um Pull Request

---

<p align="center">Desenvolvido com ❤️ para a comunidade BPO</p>