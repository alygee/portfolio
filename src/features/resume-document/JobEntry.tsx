import type { Job } from '@/content';
import { formatMonths, jobMonths } from '@/entities/job/duration';

const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
] as const;

function formatIsoMonth(iso: string): string {
  const [year, month] = iso.split('-');
  const name = MONTH_NAMES[Number(month) - 1] ?? '';
  return `${name} ${year}`;
}

export function JobEntry({ job, now }: { job: Job; now: string }) {
  const period = `${formatIsoMonth(job.start)} — ${
    job.end === null ? 'настоящее время' : formatIsoMonth(job.end)
  }`;

  return (
    <section className="job" aria-labelledby={`job-${job.id}`} id={job.id}>
      <h3 id={`job-${job.id}`}>
        <span className="job__company">{job.company}</span>{' '}
        <span className="job__role">— {job.role}</span>
      </h3>
      <p className="job__meta">
        <span>{period}</span>
        <span className="job__duration">{formatMonths(jobMonths(job, now))}</span>
        <span>{job.city}</span>
        {job.url !== undefined && (
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {job.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )}
      </p>
      <p className="job__summary">{job.summary}</p>
      <ul className="job__bullets">
        {job.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {job.metrics !== undefined && (
        <dl className="job__metrics">
          {job.metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
