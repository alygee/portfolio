import { skills, type Project } from '@/content';
import { formatIsoMonth } from './JobEntry';

const LABEL_BY_ID = new Map<string, string>(skills.map((skill) => [skill.id, skill.label]));

/**
 * ML-проект — `article`, а не `section`: якоря маршрута — `section[id]`, и
 * проект им не является (камера к проектам не летает).
 */
export function ProjectEntry({ project }: { project: Project }) {
  return (
    <article className="project" aria-labelledby={`project-${project.id}`}>
      <h3 id={`project-${project.id}`}>
        <a href={project.url} target="_blank" rel="noopener noreferrer">
          {project.title}
        </a>
      </h3>
      <p className="project__meta">
        {`${project.kind === 'kaggle' ? 'Kaggle' : 'Проект'} · ${formatIsoMonth(project.date)}`}
      </p>
      <p>{project.summary}</p>
      <ul className="job__bullets">
        {project.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <p className="project__stack">{project.stack.map((id) => LABEL_BY_ID.get(id)).join(', ')}</p>
    </article>
  );
}
