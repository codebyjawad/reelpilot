import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BarChartData {
  date: string;
  published: number;
  scheduled: number;
}

interface BarChart7DayProps {
  data: BarChartData[];
}

export default function BarChart7Day({ data }: BarChart7DayProps) {
  const maxValue = Math.max(
    1,
    ...data.map((d) => Math.max(d.published, d.scheduled))
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-xs text-slate-400">Published</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-cyan-500" />
          <span className="text-xs text-slate-400">Scheduled</span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-4 h-48">
        {data.map((item, index) => {
          const publishedHeight = (item.published / maxValue) * 100;
          const scheduledHeight = (item.scheduled / maxValue) * 100;
          const dayLabel = format(new Date(item.date), 'EEE');

          return (
            <div
              key={index}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex w-full items-end justify-center gap-1 h-40">
                <div className="relative flex flex-col items-center flex-1 max-w-[20px]">
                  <div
                    className={cn(
                      'w-full rounded-t-sm transition-all duration-500 bg-emerald-500/80 hover:bg-emerald-400'
                    )}
                    style={{
                      height: `${Math.max(publishedHeight, item.published > 0 ? 4 : 0)}%`,
                      minHeight: item.published > 0 ? '4px' : '0',
                    }}
                    title={`Published: ${item.published}`}
                  />
                  {item.published > 0 && (
                    <span className="absolute -top-4 text-[10px] font-medium text-emerald-400">
                      {item.published}
                    </span>
                  )}
                </div>
                <div className="relative flex flex-col items-center flex-1 max-w-[20px]">
                  <div
                    className={cn(
                      'w-full rounded-t-sm transition-all duration-500 bg-cyan-500/80 hover:bg-cyan-400'
                    )}
                    style={{
                      height: `${Math.max(scheduledHeight, item.scheduled > 0 ? 4 : 0)}%`,
                      minHeight: item.scheduled > 0 ? '4px' : '0',
                    }}
                    title={`Scheduled: ${item.scheduled}`}
                  />
                  {item.scheduled > 0 && (
                    <span className="absolute -top-4 text-[10px] font-medium text-cyan-400">
                      {item.scheduled}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 h-px bg-slate-700/50 w-full" />
    </div>
  );
}
