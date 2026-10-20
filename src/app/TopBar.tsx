import { EngineToggle } from './EngineToggle'
import { ModeSwitcher } from './ModeSwitcher'

export function TopBar() {
  return (
    <header className="bg-card/60 flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2 sm:px-4">
      <div className="min-w-0 flex-1 basis-56">
        <h1 className="truncate text-sm font-semibold tracking-wide">
          DIGITAL RIG <span className="text-muted-foreground">·</span> Equipo Pulling / Workover
        </h1>
        <p className="text-muted-foreground truncate text-xs">
          Gemelo digital de servicios de pozo
        </p>
      </div>
      {/* En <640px la barra de modos hace scroll horizontal en vez de desbordar la página. */}
      <nav
        aria-label="Modos de la aplicación"
        className="order-last -mx-3 max-w-[100vw] overflow-x-auto overflow-y-hidden px-3 sm:order-none sm:mx-0 sm:max-w-none sm:overflow-visible sm:px-0"
      >
        <ModeSwitcher />
      </nav>
      <EngineToggle />
    </header>
  )
}
