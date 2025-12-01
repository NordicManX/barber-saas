import { NextRequest, NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
    try {
        const { nome, email, senha, nomeBarbearia, cnpj } = await req.json()

        // Criar tenant (barbearia) primeiro
        const tenant = await prisma.tenant.create({
            data: {
                nome: nomeBarbearia,
                cnpj,
            }
        })

        // Hash da senha
        const senhaHash = bcrypt.hashSync(senha, 12)

        // Criar usuário owner
        const user = await prisma.user.create({
            data: {
                nome,
                email,
                senhaHash,
                tenantId: tenant.id,
                role: 'owner'
            }
        })

        return NextResponse.json({
            message: 'Barbearia e usuário criados com sucesso!',
            tenantId: tenant.id,
            userId: user.id
        })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
    }
}
