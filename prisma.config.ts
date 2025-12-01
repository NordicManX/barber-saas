import { defineConfig } from '@prisma/internals'

export default defineConfig({
    migrate: {
        connectionString: process.env.DATABASE_URL!,
    },
})
