import { FormPanel } from './FormPanel'
import { Scene } from '../3d/Scene'

export function Layout() {
  return (
    <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
      {/* Left panel - Form ~35% */}
      <aside className="w-full md:w-[35%] h-[40vh] md:h-auto bg-dark-secondary border-b md:border-b-0 md:border-r border-dark-tertiary overflow-hidden">
        <FormPanel />
      </aside>
      {/* Right panel - 3D Canvas ~65% */}
      <section className="w-full md:w-[65%] flex-1 bg-dark-primary relative">
        <Scene />
      </section>
    </main>
  )
}
