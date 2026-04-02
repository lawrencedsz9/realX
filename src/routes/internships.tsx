import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/internships')({
  component: () => <iframe src="/internships/index.html" className="w-full h-screen border-none" title="internships" />
})
