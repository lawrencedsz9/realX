import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const verificationRequestsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
    status: z.enum(["all", "pending", "approved", "rejected"]).catch("all"),
})

export const Route = createFileRoute('/admin/verification-requests/')({
    validateSearch: (search) => verificationRequestsSearchSchema.parse(search),
})
