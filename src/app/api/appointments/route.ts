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

// LISTAR AGENDAMENTOS
export async function GET(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const barberId = searchParams.get('barberId') || undefined
    const date = searchParams.get('date') // formato YYYY-MM-DD opcional

    let startDate: Date | undefined
    let endDate: Date | undefined

    if (date) {
        startDate = new Date(date + 'T00:00:00')
        endDate = new Date(date + 'T23:59:59')
    }

    const appointments = await prisma.appointment.findMany({
        where: {
            tenantId: auth.tenantId,
            barberId,
            ...(startDate && endDate
                ? { inicio: { gte: startDate, lte: endDate } }
                : {}),
        },
        orderBy: { inicio: 'asc' },
        include: {
            client: true,
            barber: true,
            service: true,
        },
    })

    return NextResponse.json(appointments)
}

// CRIAR AGENDAMENTO
export async function POST(req: NextRequest) {
    const auth = getAuthUser(req)
    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const { clientId, barberId, serviceId, inicio } = await req.json()

        if (!clientId || !barberId || !serviceId || !inicio) {
            return NextResponse.json(
                { error: 'clientId, barberId, serviceId e inicio são obrigatórios' },
                { status: 400 }
            )
        }

        // Buscar serviço para calcular horário de fim
        const service = await prisma.service.findFirst({
            where: {
                id: serviceId,
                tenantId: auth.tenantId,
                ativo: true,
            },
        })

        if (!service) {
            return NextResponse.json(
                { error: 'Serviço inválido' },
                { status: 400 }
            )
        }

        const inicioDate = new Date(inicio)
        const fimDate = new Date(
            inicioDate.getTime() + service.duracaoMin * 60 * 1000
        )

        // Verificar conflito de horário para o barbeiro
        const conflito = await prisma.appointment.findFirst({
            where: {
                tenantId: auth.tenantId,
                barberId,
                status: { in: ['agendado', 'confirmado'] },
                OR: [
                    {
                        inicio: { lt: fimDate },
                        fim: { gt: inicioDate },
                    },
                ],
            },
        })

        if (conflito) {
            return NextResponse.json(
                { error: 'Conflito de horário para este barbeiro' },
                { status: 409 }
            )
        }

        const appointment = await prisma.appointment.create({
            data: {
                tenantId: auth.tenantId,
                clientId,
                barberId,
                serviceId,
                inicio: inicioDate,
                fim: fimDate,
                status: 'agendado',
            },
        })

        return NextResponse.json(appointment, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: 'Erro ao criar agendamento' },
            { status: 500 }
        )
    }
}
