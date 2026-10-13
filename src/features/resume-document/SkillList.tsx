import { bridges, jobs, projects, skills } from '@/content';
import { dispatchScene } from '@/entities/scene-mode/sceneStore';
import {
  CATEGORY_DOMAIN,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  DOMAIN_LABELS,
  type Domain,
} from '@/entities/skill/categories';
import { STATUS_LABELS, skillStatus } from '@/entities/skill/status';

const DOMAINS: readonly Domain[] = ['web', 'ml'];
const LABEL_BY_ID = new Map<string, string>(skills.map((skill) => [skill.id, skill.label]));

/**
 * HTML-проекция зала навыков (Р1/Р2): всё, что есть в сцене, есть здесь —
 * домены, статусы (текстом, не только цветом), мосты. Наведение указателя в
 * режиме стыковки подсвечивает узел в зале; редьюсер игнорирует подсветку в
 * других режимах, поэтому обработчик безусловный.
 */
export function SkillList() {
  return (
    <>
      {DOMAINS.map((domain) => (
        <div className="skills-domain" key={domain}>
          <h3>{DOMAIN_LABELS[domain]}</h3>
          <div className="skills">
            {CATEGORY_ORDER.filter((category) => CATEGORY_DOMAIN[category] === domain).map(
              (category) => {
                const group = skills.filter((skill) => skill.category === category);
                if (group.length === 0) return null;
                return (
                  <div className="skills__group" key={category}>
                    <h4>{CATEGORY_LABELS[category]}</h4>
                    <ul>
                      {group.map((skill) => {
                        const status = skillStatus(skill, jobs, projects);
                        return (
                          <li
                            key={skill.id}
                            className={`skill skill--${status}`}
                            onPointerEnter={() => dispatchScene({ type: 'highlight', id: skill.id })}
                            onPointerLeave={() => dispatchScene({ type: 'highlight', id: null })}
                          >
                            {skill.label}
                            {status !== 'applied' && (
                              <span className="skill__status"> — {STATUS_LABELS[status]}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              },
            )}
          </div>
        </div>
      ))}

      <h3>Что я переношу в ML</h3>
      <ul className="bridges">
        {bridges.map((bridge) => (
          <li key={`${bridge.from}-${bridge.to}`}>
            <span className="bridge__pair">
              {`${LABEL_BY_ID.get(bridge.from)} → ${LABEL_BY_ID.get(bridge.to)}`}
            </span>{' '}
            — {bridge.why}
          </li>
        ))}
      </ul>
    </>
  );
}
