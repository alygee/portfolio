import type { ReactNode } from 'react';
import { displayJobs, jobs, projects as contentProjects, type Project } from '@/content';
import { formatMonths, totalExperienceMonths } from '@/entities/job/duration';
import { currentMonthIso } from '@/shared/lib/now';
import { JobEntry } from './JobEntry';
import { ProjectEntry } from './ProjectEntry';
import { SkillList } from './SkillList';

export function ResumeDocument({
  now = currentMonthIso(),
  projects = contentProjects,
  skillsAction = null,
}: { now?: string; projects?: readonly Project[]; skillsAction?: ReactNode } = {}) {
  const experience = formatMonths(totalExperienceMonths(jobs, now));

  return (
    <article className="resume">
      <header className="resume__header">
        <h1>Albert Allagulov</h1>
        <p className="resume__role">Senior Frontend Developer</p>
        {/*
          Единая строка, а не смешение текста и {experience}: React
          иначе вставляет между соседними текстовыми узлами HTML-комментарий
          — маркер для гидрации, — который в SSR-разметке ломает
          сплошной текст «Опыт — N лет» на две части.
        */}
        <p className="resume__lead">
          {`React, TypeScript, high-load, UI architecture. Experience: ${experience}. Kazan, Russia; open to remote work.`}
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

      <h2>Work experience</h2>
      {displayJobs.map((job) => (
        <JobEntry job={job} now={now} key={job.id} />
      ))}

      {projects.length > 0 && (
        <section className="projects" aria-labelledby="projects-heading">
          <h2 id="projects-heading">ML projects</h2>
          {projects.map((project) => (
            <ProjectEntry project={project} key={project.id} />
          ))}
        </section>
      )}

      {/*
        Последний якорь маршрута (`HALL_ANCHOR_ID`): секция в точке обзора —
        камера у зала навыков. id совпадает с `ROUTE_ANCHOR_IDS`, это
        закреплено тестом `displayOrder.test.tsx`.
      */}
      <section id="skills" aria-labelledby="skills-heading">
        <h2 id="skills-heading">Skills</h2>
        {skillsAction}
        <SkillList />
      </section>

      <h2>Education</h2>
      <p>
        Dostoevsky Omsk State University, Faculty of Physics, radiophysics,
        2015.
      </p>
    </article>
  );
}
