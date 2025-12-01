import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

type JwtPayload = {
    userId: string
    tenantId: string
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

// EDITAR CLIENTE
// EDITAR CLIENTE
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const { nome, telefone, email, observacoes } = await req.json()

    if (!nome || !telefone) {
        return NextResponse.json(
            { error: 'Nome e telefone são obrigatórios' },
            { status: 400 }
        )
    }

    try {
        const updated = await prisma.client.update({
            where: {
                id,
                // garante que só atualiza do tenant certo
            },
            data: {
                nome,
                telefone,
                email,
                observacoes,
            },
        })

        // checar se pertence ao tenant
        if (updated.tenantId !== auth.tenantId) {
            return NextResponse.json(
                { error: 'Cliente não encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json(updated)
    } catch {
        return NextResponse.json(
            { error: 'Cliente não encontrado' },
            { status: 404 }
        )
    }
}

// EXCLUIR CLIENTE
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const deleted = await prisma.client.deleteMany({
        where: {
            id,
            tenantId: auth.tenantId,
        },
    })

    if (deleted.count === 0) {
        return NextResponse.json(
            { error: 'Cliente não encontrado' },
            { status: 404 }
        )
    }

    return NextResponse.json({ success: true })
}
