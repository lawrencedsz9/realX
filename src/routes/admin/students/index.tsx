import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const studentsSearchSchema = z.object({
    pageSize: z.number().catch(10),
    page: z.number().catch(1),
})

export type StudentSearch = z.infer<typeof studentsSearchSchema>

export const Route = createFileRoute('/admin/students/')({
    validateSearch: (search) => studentsSearchSchema.parse(search),
})
