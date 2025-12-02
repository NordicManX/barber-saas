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

// EDITAR SERVIÇO
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const { nome, descricao, duracaoMin, preco, categoria, ativo } =
        await req.json()

    if (!nome || !duracaoMin || !preco) {
        return NextResponse.json(
            { error: 'Nome, duração e preço são obrigatórios' },
            { status: 400 }
        )
    }

    try {
        const updated = await prisma.service.update({
            where: { id },
            data: {
                nome,
                descricao,
                duracaoMin,
                preco,
                categoria,
                ativo,
            },
        })

        if (updated.tenantId !== auth.tenantId) {
            return NextResponse.json(
                { error: 'Serviço não encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json(updated)
    } catch {
        return NextResponse.json(
            { error: 'Serviço não encontrado' },
            { status: 404 }
        )
    }
}

// EXCLUIR SERVIÇO
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const deleted = await prisma.service.deleteMany({
        where: {
            id,
            tenantId: auth.tenantId,
        },
    })

    if (deleted.count === 0) {
        return NextResponse.json(
            { error: 'Serviço não encontrado' },
            { status: 404 }
        )
    }

    return NextResponse.json({ success: true })
}
