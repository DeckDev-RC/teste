# 💰 Leitor de Documentos BPO (AI-Powered)

[![GitHub Actions Status](https://github.com/DeckDev-RC/teste/actions/workflows/tests.yml/badge.svg)](https://github.com/DeckDev-RC/teste/actions)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-blueviolet.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

O **Leitor de Documentos BPO** é uma solução de nível empresarial projetada para automatizar a ingestão de dados financeiros. Utilizando modelos avançados de IA (Gemini 2.0 Flash), o sistema processa imagens e PDFs, extraindo informações críticas com precisão e velocidade inigualáveis.

---

## 🚀 Arquitetura do Sistema

O projeto é dividido em dois ecossistemas principais, garantindo escalabilidade e separação de responsabilidades:

### 📱 Frontend (React + Vite)
Uma Single Page Application (SPA) moderna, focada em UX/UI premium:
- **Dashboards Contextuais**: Visão Master (Gestão total) vs Visão Usuário (Histórico pessoal).
- **Processamento em Lote**: Interface robusta para upload e análise de centenas de arquivos simultaneamente.
- **Real-time Stats**: Dashboards dinâmicos com Chart.js para monitoramento de volume e performance.
- **Design System**: Construído com Tailwind CSS e Framer Motion para animações fluidas.

### ⚙️ Backend (Node.js + Express)
API escalável que orquestra a inteligência da aplicação:
- **Multi-Provider AI**: Engine flexível que utiliza **Gemini 2.0 Flash** (primário), **OpenAI** e **Nexus** (OpenRoute) como fallbacks.
- **Integração WhatsApp**: Conexão nativa com **Evolution API** para processamento automático de mídias enviadas via chat.
- **Sistema de Créditos**: Gestão mensal automatizada de uso por usuário (limite padrão de 2500 requisições).
- **Segurança Hardened**: Implementação de RLS (Row Level Security) no Supabase, Rate Limiting e auditoria completa de logs.

---

## ✨ Funcionalidades Técnicas

- **Extração Inteligente**: Reconhecimento automático de Ordens de Serviço, Comprovantes STONE, Boletos, Notas Fiscais e Recibos PIX.
- **Sistema Anti-Cache**: Algoritmo que quebra o cache agressivo de IA para garantir que cada re-análise seja independente e precisa.
- **Gestão de Sessões WHATSAPP**: Controle de instâncias QRCode e monitoramento de conexão via dashboard.
- **Auditoria de Dados**: Logs detalhados de cada transação, erro e sucesso de processamento para conformidade.

---

## 📂 Estrutura de Diretórios Real

```text
├── backend/
│   ├── src/controllers/   # Lógica de endpoints (Análise, Admin, WhatsApp)
│   ├── src/services/      # Core logic (AI Factory, Credits, Evolution Service)
│   ├── src/middleware/    # Segurança (Auth, Rate Limit, Role Validation)
│   └── migrations/        # Evolução do banco de dados (SQL RPCs e tabelas)
├── frontend/
│   ├── src/pages/         # HomePage, DashboardPage, WhatsAppPage, etc.
│   ├── src/components/    # Header unificado, Gráficos, Tabelas dinâmicas
│   └── src/utils/         # authenticatedFetch e clientes de API
└── .github/workflows/     # CI Automatizado (tests.yml)
```

---

## 🛠️ Configuração de Ambiente

O projeto utiliza variáveis de ambiente segregadas por ambiente.

### Requisitos Mínimos
- Node.js 18 ou superior.
- Docker & Docker Compose (para deploy simplificado).
- Instância Supabase configurada com os RPCs das migrations.

### Instalação Rápida
1.  **Backend**: `cd backend && npm install && npm start`
2.  **Frontend**: `cd frontend && npm install && npm run dev`

---

## 🔐 Segurança e Compliance

Este projeto segue padrões rigorosos de segurança:
- **Clean Git History**: Histórico livre de credenciais sensíveis.
- **Protected Endpoints**: Rotas administrativas protegidas por validação de Role (Master/Admin).
- **Environment Driven**: Nenhuma chave de API é hardcoded no código fonte.

---

## 📝 Licença
Desenvolvido para uso profissional sob a licença MIT. 

<p align="center"><b>Leitor de Docs BPO - Inteligência que Liberta o seu Tempo</b></p>