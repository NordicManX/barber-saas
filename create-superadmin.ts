const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    const senhaHash = bcrypt.hashSync('admin123', 12)

    const user = await prisma.user.create({
        data: {
            nome: 'Admin Master',
            email: 'nelsonacf88@gmail.com',
            senhaHash,
            role: 'superadmin',
            ativo: true,
            tenantId: null,
        },
    })

    console.log('Superadmin criado:', user)
}

main()
    .catch((e) => {
        console.error(e)
    })
    .finally(async () => {
        await prisma.$disconnect()
        process.exit(0)
    })
