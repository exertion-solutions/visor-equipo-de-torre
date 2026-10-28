import { lazy, Suspense } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LegacyRigViewer } from '@/components/viewer/LegacyRigViewer'
import { useViewerStore } from '@/stores/viewerStore'
import { StatusBar } from './StatusBar'
import { TopBar } from './TopBar'
import { useUrlSync } from './urlSync'

// three + r3f + drei pesan ~1 MB: se cargan aparte para que la UI pinte primero.
// Con el motor legacy (por defecto) este chunk ni siquiera se descarga.
const Viewport = lazy(() =>
  import('@/components/viewer/Viewport').then((m) => ({ default: m.Viewport })),
)
// Ficha y tooltip traen los datos del equipo: también se cargan aparte.
const NativeOverlay = lazy(() => import('./NativeOverlay'))

export function App() {
  const engine = useViewerStore((s) => s.engine)
  useUrlSync()

  return (
    <TooltipProvider>
      <div className="dark bg-background text-foreground flex h-dvh flex-col">
        <TopBar />
        <main className="relative min-h-0 flex-1">
          {/* El iframe del V2 queda montado aunque el motor sea el nativo: se oculta, no se destruye. */}
          <LegacyRigViewer active={engine === 'legacy'} />
          {engine === 'native' && (
            <>
              <Suspense fallback={null}>
                <Viewport />
                <NativeOverlay />
              </Suspense>
              <p
                role="status"
                className="bg-background/80 text-muted-foreground pointer-events-none absolute top-3 left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-md border px-3 py-1 text-center text-xs backdrop-blur"
              >
                R3F nativo en migración: sin paridad con V2 (ver docs/FEATURE_PARITY.md)
              </p>
            </>
          )}
        </main>
        <StatusBar />
      </div>
    </TooltipProvider>
  )
}
