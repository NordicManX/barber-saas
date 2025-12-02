# Barber SaaS – Sistema de Agendamento para Barbearias

Plataforma multi-tenant de agendamento para barbearias, com painel de barbearia (tenant) e painel Admin Master para gestão das barbearias assinantes.

## Stack

- Next.js (App Router, TypeScript)
- Node.js
- PostgreSQL (Neon)
- Prisma ORM
- JWT para autenticação
- Deploy alvo: Vercel + Neon

---

## Funcionalidades já implementadas (backend)

### Multi-tenant e autenticação

- Modelagem multi-tenant com tabela `Tenant` e colunas `tenantId` em:
  - `User`, `Client`, `Barber`, `Service`, `Appointment`
- Autenticação por JWT:
  - `POST /api/auth/register`
    - Cria Tenant (barbearia) + usuário owner vinculado ao tenant.
  - `POST /api/auth/login`
    - Retorna JWT com `userId`, `tenantId` e `role` (`owner`, `barber`, etc.).

### Clientes (Clients)

- `GET /api/clients`
  - Lista clientes do tenant autenticado (filtra por `tenantId`).
- `POST /api/clients`
  - Cria cliente: `nome`, `telefone`, `email`, `observacoes`.
- `PUT /api/clients/[id]`
  - Edita cliente garantindo que o registro pertence ao `tenantId` do token.
- `DELETE /api/clients/[id]`
  - Remove cliente do tenant atual.

### Barbeiros (Barbers)

- `GET /api/barbers`
  - Lista barbeiros do tenant autenticado.
- `POST /api/barbers`
  - Cria barbeiro: `nome`, `bio`, `fotoUrl`, `ativo`, `horarioInicio`, `horarioFim`, `diasSemana`.
- `PUT /api/barbers/[id]`
  - Edita barbeiro (inclusive horários e status).
- `DELETE /api/barbers/[id]`
  - Remove barbeiro do tenant atual.

### Serviços (Services)

- `GET /api/services`
  - Lista serviços do tenant autenticado.
- `POST /api/services`
  - Cria serviço: `nome`, `descricao`, `duracaoMin`, `preco`, `categoria`, `ativo`.
- `PUT /api/services/[id]`
  - Edita serviço.
- `DELETE /api/services/[id]`
  - Remove serviço do tenant atual.

### Agendamentos (Appointments)

- `GET /api/appointments`
  - Lista agendamentos do tenant.
  - Suporta filtros:
    - `?date=YYYY-MM-DD`
    - `?barberId=...&date=YYYY-MM-DD`
- `POST /api/appointments`
  - Cria agendamento com:
    - `clientId`, `barberId`, `serviceId`, `inicio`
  - Calcula `fim` com base em `duracaoMin` do serviço.
  - Valida conflito de horário para o mesmo barbeiro (impede overbooking).
- `PUT /api/appointments/[id]`
  - Atualiza `status` (ex.: `agendado`, `confirmado`, `concluido`, `cancelado`) e opcionalmente o `inicio` (recalculando `fim` e rechecando conflito).
- `DELETE /api/appointments/[id]`
  - Remove agendamento do tenant atual.

---

## Painel Admin Master

Usuário especial com `role = superadmin`, sem `tenantId`, usado para gerenciar barbearias (tenants).

### Criação do superadmin

Script: `create-superadmin.ts` (ou `.js`), que cria um usuário:

- `nome`: `Admin Master`
- `email`: ex.: `admin@barber-saas.com`
- `senha`: ex.: `admin123` (armazenada como hash bcrypt)
- `role`: `superadmin`
- `tenantId`: `null`

### Rotas admin

- `POST /api/admin/login`
  - Login do superadmin.
  - Retorna token JWT com `role = superadmin`.

- `GET /api/admin/tenants`
  - Lista todas as barbearias (tenants) com contadores:
    - número de usuários, clientes, barbeiros, serviços e agendamentos.

- `POST /api/admin/tenants`
  - Cria uma nova barbearia + usuário owner.
  - Campos:
    - `nomeBarbearia`, `cnpj`, `telefone`, `endereco`, `plano`
    - `ownerNome`, `ownerEmail`, `ownerSenhaHash` (hash bcrypt já pronto)

---

## Fluxos de autenticação

### Login do dono da barbearia (tenant)

1. `POST /api/auth/login`
   - Body:
     ```
     {
       "email": "dono@barbearia.com",
       "senha": "123456"
     }
     ```
2. Usar o token retornado em:
   - `Authorization: Bearer <TOKEN>`
   - Para acessar `/api/clients`, `/api/barbers`, `/api/services`, `/api/appointments`.

### Login do Admin Master

1. `POST /api/admin/login`
   - Body:
     ```
     {
       "email": "admin@barber-saas.com",
       "senha": "admin123"
     }
     ```
2. Usar o token retornado em:
   - `Authorization: Bearer <TOKEN_ADMIN>`
   - Para acessar `/api/admin/tenants` e demais rotas admin.

---

## Próximos passos (backend)

- Admin
  - `PUT /api/admin/tenants/[id]`  
    - Alterar plano (`basic`, `pro`, etc.) e `status` (`active`, `suspended`).
  - `DELETE /api/admin/tenants/[id]`  
    - Suspender/remover barbearias.

- Relatórios
  - `GET /api/reports/revenue`  
    - Faturamento por dia/mês e por barbeiro.
  - `GET /api/reports/appointments`  
    - Total de agendamentos por status e período.

- Melhorias em agendamentos
  - Respeitar `diasSemana`, `horarioInicio` e `horarioFim` do barbeiro na criação de horários.
  - Suporte a bloqueios de agenda (folgas/feriados).
  - Endpoint para retornar horários disponíveis de um barbeiro em um dia.

---

## Próximos passos (frontend)

Após estabilizar o backend, o plano é:

- Tela de login (owner) e tela de login admin (separadas).
- Layout do dashboard da barbearia:
  - Lista de próximos agendamentos.
  - CRUD visual de clientes, barbeiros, serviços.
  - Tela de agenda com filtro por barbeiro e dia.
- Painel Admin Master:
  - Lista de barbearias com métricas básicas.
  - Tela para criar/editar/suspender barbearias.

---

## Scripts úteis

- Rodar em desenvolvimento:
  
    `npm run dev`

- Sincronizar Prisma com o banco:

`npx prisma db push`

`npx prisma generate`

- Abrir Prisma Studio:

`npx prisma studio`

- Criar superadmin:

  `npx ts-node create-superadmin.ts`

  `node create-superadmin.js`

