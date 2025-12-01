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

// LISTAR BARBEIROS
export async function GET(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const barbers = await prisma.barber.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(barbers)
}

// CRIAR BARBEIRO
export async function POST(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const {
            nome,
            fotoUrl,
            bio,
            ativo = true,
            horarioInicio = '09:00',
            horarioFim = '19:00',
            diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
        } = await req.json()

        if (!nome) {
            return NextResponse.json(
                { error: 'Nome é obrigatório' },
                { status: 400 }
            )
        }

        const barber = await prisma.barber.create({
            data: {
                nome,
                fotoUrl,
                bio,
                ativo,
                horarioInicio,
                horarioFim,
                diasSemana,
                tenantId: auth.tenantId,
            },
        })

        return NextResponse.json(barber, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: 'Erro ao criar barbeiro' },
            { status: 500 }
        )
    }
}
