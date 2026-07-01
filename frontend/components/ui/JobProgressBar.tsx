type JobProgressBarProps = {
  done: number;
  failed: number;
  total: number;
};

export function JobProgressBar({ done, failed, total }: JobProgressBarProps) {
  if (total === 0) {
    return null;
  }

  const finished = done + failed;
  const percent = Math.round((finished / total) * 100);

  return (
    <div className="space-y-1">
      <progress
        className="progress-bar h-2 w-full"
        value={finished}
        max={total}
        aria-label={`Job progress: ${percent}% complete`}
      />
      <p className="text-xs text-slate-500">
        {percent}% complete ({done} done, {failed} failed)
      </p>
    </div>
  );
}
