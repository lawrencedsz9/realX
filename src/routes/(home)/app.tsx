import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/(home)/app')({
  component: () => (
    <div className="relative w-full h-screen">
      <iframe src="/app/index.html" className="w-full h-full border-none" title="app" />
      <div className="absolute bottom-4 right-4 flex gap-4 text-sm text-gray-500">
        <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
        <Link to="/terms-and-conditions" className="hover:underline">Terms and Conditions</Link>
      </div>
    </div>
  )
})
