import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Prayer usage data - morning and evening prayers
const data = [
  {
    name: 'Mon',
    morning: 672,
    evening: 589,
  },
  {
    name: 'Tue',
    morning: 698,
    evening: 612,
  },
  {
    name: 'Wed',
    morning: 731,
    evening: 640,
  },
  {
    name: 'Thu',
    morning: 685,
    evening: 603,
  },
  {
    name: 'Fri',
    morning: 722,
    evening: 651,
  },
  {
    name: 'Sat',
    morning: 615,
    evening: 582,
  },
  {
    name: 'Sun',
    morning: 765,
    evening: 701,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          formatter={(value, name) => {
            return [
              `${value} users`,
              name === 'morning' ? 'Morning Prayers' : 'Evening Prayers',
            ]
          }}
          labelFormatter={(label) => `${label}`}
        />
        <Legend
          formatter={(value) =>
            value === 'morning' ? 'Morning Prayers' : 'Evening Prayers'
          }
        />
        <Bar
          dataKey='morning'
          radius={[4, 4, 0, 0]}
          className='fill-indigo-500 dark:fill-indigo-400'
          name='morning'
        />
        <Bar
          dataKey='evening'
          radius={[4, 4, 0, 0]}
          className='fill-purple-500 dark:fill-purple-400'
          name='evening'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
