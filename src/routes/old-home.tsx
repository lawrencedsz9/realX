import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/old-home')({
  component: () => <iframe src="/old-home/index.html" className="w-full h-screen border-none" title="old-home" />
})
