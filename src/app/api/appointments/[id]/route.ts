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

// EDITAR AGENDAMENTO
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)

    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const { status, inicio } = await req.json()

    if (!status) {
        return NextResponse.json(
            { error: 'Status é obrigatório para edição' },
            { status: 400 }
        )
    }

    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id },
        })

        if (!appointment || appointment.tenantId !== auth.tenantId) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            )
        }

        let fimDate = appointment.fim
        if (inicio) {
            // Se mudou o início, recalcula fim com duração do serviço
            const service = await prisma.service.findUnique({
                where: { id: appointment.serviceId },
            })
            if (!service) {
                return NextResponse.json(
                    { error: 'Serviço relacionado não encontrado' },
                    { status: 400 }
                )
            }
            const inicioDate = new Date(inicio)
            fimDate = new Date(inicioDate.getTime() + service.duracaoMin * 60 * 1000)

            // Verificar conflito de horário para o barbeiro
            const conflito = await prisma.appointment.findFirst({
                where: {
                    tenantId: auth.tenantId,
                    barberId: appointment.barberId,
                    status: { in: ['agendado', 'confirmado'] },
                    id: { not: id }, // Ignorar o próprio agendamento
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
        }

        const updated = await prisma.appointment.update({
            where: { id },
            data: {
                status,
                inicio: inicio ? new Date(inicio) : appointment.inicio,
                fim: fimDate,
            },
        })

        return NextResponse.json(updated)
    } catch (error) {
        return NextResponse.json(
            { error: 'Erro ao atualizar agendamento' },
            { status: 500 }
        )
    }
}

// EXCLUIR AGENDAMENTO
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = getAuthUser(req)

    if (!auth) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const deleted = await prisma.appointment.deleteMany({
        where: {
            id,
            tenantId: auth.tenantId,
        },
    })

    if (deleted.count === 0) {
        return NextResponse.json(
            { error: 'Agendamento não encontrado' },
            { status: 404 }
        )
    }

    return NextResponse.json({ success: true })
}
