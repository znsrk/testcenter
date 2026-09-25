import { Headphones, Radio } from 'lucide-react'
import { Empty, Filters, TaskCard } from './components'
import type { Catalog, Selection, TaskSummary } from './types'

export function ListeningRoom({ catalog, selection, setSelection, tasks, onOpen }: {
  catalog: Catalog
  selection: Selection
  setSelection: (selection: Selection) => void
  tasks: TaskSummary[]
  onOpen: (id: string) => void
}) {
  const recordings = tasks.filter((task) =>
    task.skill === 'listening' && task.grade === selection.grade && task.stage === selection.stage)
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TUNE IN. THINK DEEPER.</div>
          <h1>The listening room.</h1>
          <p>Listening task generation is under construction.</p>
        </div>
        <Filters catalog={catalog} value={selection} onChange={setSelection} />
      </div>
      <section className="panel admin-audio">
        <div className="section-heading compact">
          <h2><Radio size={22} /> Audio generation · Under construction</h2>
        </div>
        <p>New recordings cannot be created in this browser-only version. Text and writing practice remain available.</p>
      </section>
      <div className="section-heading"><h2>Recordings saved in this browser</h2></div>
      <div className="task-list">
        {recordings.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} />)}
        {recordings.length === 0 && (
          <Empty icon={Headphones} title="No recordings saved here">
            Audio generation is under construction. Explore reading, Use of English, or writing practice in the meantime.
          </Empty>
        )}
      </div>
    </>
  )
}
