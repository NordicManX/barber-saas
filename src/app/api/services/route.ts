import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
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

export async function GET(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const services = await prisma.service.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(services)
}

export async function POST(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const { nome, descricao, duracaoMin, preco, categoria = 'corte', ativo = true } =
            await req.json()

        if (!nome || !duracaoMin || !preco) {
            return NextResponse.json(
                { error: 'Nome, duração e preço são obrigatórios' },
                { status: 400 }
            )
        }

        const service = await prisma.service.create({
            data: {
                tenantId: auth.tenantId,
                nome,
                descricao,
                duracaoMin,
                preco,
                categoria,
                ativo,
            },
        })

        return NextResponse.json(service, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: 'Erro ao criar serviço' },
            { status: 500 }
        )
    }
}