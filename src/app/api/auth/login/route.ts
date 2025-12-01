import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(req: NextRequest) {
    try {
        const { email, senha } = await req.json()

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.ativo) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
        }

        const senhaValida = bcrypt.compareSync(senha, user.senhaHash)
        if (!senhaValida) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
        }

        const payload = {
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        }

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })

        return NextResponse.json({ token })
    } catch (error) {
        return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 })
    }
}
