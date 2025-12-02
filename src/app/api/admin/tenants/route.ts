import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

type JwtPayload = {
    userId: string
    tenantId: string | null
    role: string
}

function getAuthUser(req: NextRequest): JwtPayload | null {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }

    const token = authHeader.replace('Bearer ', '').trim()
    try {
        const payload = jwt.verify(token, JWT_SECRET) as JwtPayload
        return payload
    } catch {
        return null
    }
}

// LISTAR TENANTS
export async function GET(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth || auth.role !== 'superadmin') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                    clients: true,
                    barbers: true,
                    services: true,
                    appointments: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tenants)
}

// CRIAR TENANT + OWNER
export async function POST(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth || auth.role !== 'superadmin') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const { nomeBarbearia, cnpj, telefone, endereco, plano, ownerNome, ownerEmail, ownerSenhaHash } =
            await req.json()

        if (!nomeBarbearia || !cnpj || !ownerNome || !ownerEmail || !ownerSenhaHash) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: nomeBarbearia, cnpj, ownerNome, ownerEmail, ownerSenhaHash' },
                { status: 400 }
            )
        }

        const tenant = await prisma.tenant.create({
            data: {
                nome: nomeBarbearia,
                cnpj,
                telefone,
                endereco,
                plano: plano ?? 'basic',
                status: 'active',
                users: {
                    create: {
                        nome: ownerNome,
                        email: ownerEmail,
                        senhaHash: ownerSenhaHash,
                        role: 'owner',
                        ativo: true,
                    },
                },
            },
            include: {
                users: true,
            },
        })

        return NextResponse.json(tenant, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: 'Erro ao criar tenant' },
            { status: 500 }
        )
    }
}
