import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/fullstack-dev')({
  component: () => <iframe src="/fullstack-dev/index.html" className="w-full h-screen border-none" title="fullstack-dev" />
})
