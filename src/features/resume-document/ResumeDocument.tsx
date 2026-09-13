import { jobs } from '@/content';
import { formatMonths, totalExperienceMonths } from '@/entities/job/duration';
import { currentMonthIso } from '@/shared/lib/now';
import { JobEntry } from './JobEntry';
import { SkillList } from './SkillList';

export function ResumeDocument({ now = currentMonthIso() }: { now?: string } = {}) {
  const experience = formatMonths(totalExperienceMonths(jobs, now));
  const ordered = [...jobs].reverse();

  return (
    <article className="resume">
      <header className="resume__header">
        <h1>Альберт Аллагулов</h1>
        <p className="resume__role">Senior Frontend Developer</p>
        {/*
          Единая строка, а не смешение текста и {experience}: React
          иначе вставляет между соседними текстовыми узлами HTML-комментарий
          — маркер для гидрации, — который в SSR-разметке ломает
          сплошной текст «Опыт — N лет» на две части.
        */}
        <p className="resume__lead">
          {`React, TypeScript, highload, UI-архитектура. Опыт — ${experience}. Казань, удалённая работа.`}
        </p>
        <ul className="resume__contacts">
          <li>
            <a href="mailto:goonnors@gmail.com">goonnors@gmail.com</a>
          </li>
          <li>
            <a href="https://t.me/albert_allagulov" target="_blank" rel="noopener noreferrer">
              telegram
            </a>
          </li>
        </ul>
      </header>

      <h2>Опыт работы</h2>
      {ordered.map((job) => (
        <JobEntry job={job} now={now} key={job.id} />
      ))}

      <h2>Навыки</h2>
      <SkillList />

      <h2>Образование</h2>
      <p>
        Омский государственный университет им. Ф. М. Достоевского, физический
        факультет, радиофизика, 2015.
      </p>
    </article>
  );
}
