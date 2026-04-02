import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/')({
    component: HomeComponent,
})

function HomeComponent() {
    return (
        <iframe 
            src="/index.html" 
            className="w-full h-screen border-none" 
            title="Website"
        />
    )
}
