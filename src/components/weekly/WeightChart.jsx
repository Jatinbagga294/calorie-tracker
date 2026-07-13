import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function WeightChart({ data }) {
  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="label" fontSize={12} stroke="currentColor" className="text-slate-400" />
          <YAxis
            fontSize={12}
            stroke="currentColor"
            className="text-slate-400"
            width={40}
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13 }}
            wrapperClassName="dark:[&>div]:!bg-slate-800 dark:[&>div]:!text-slate-100"
            formatter={(value) => [`${value} kg`, 'Weight']}
          />
          <Line type="monotone" dataKey="kg" name="Weight" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
