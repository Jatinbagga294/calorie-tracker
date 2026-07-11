import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function TrendChart({ data }) {
  return (
    <div className="h-64 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="label" fontSize={12} stroke="currentColor" className="text-slate-400" />
          <YAxis fontSize={12} stroke="currentColor" className="text-slate-400" width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
            wrapperClassName="dark:[&>div]:!bg-slate-800 dark:[&>div]:!text-slate-100"
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Line type="monotone" dataKey="in" name="In" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="out" name="Out" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="net" name="Net" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
