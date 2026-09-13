import { skills } from '@/content';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/entities/skill/categories';

export function SkillList() {
  return (
    <div className="skills">
      {CATEGORY_ORDER.map((category) => {
        const group = skills.filter((skill) => skill.category === category);
        if (group.length === 0) return null;
        return (
          <div className="skills__group" key={category}>
            <h3>{CATEGORY_LABELS[category]}</h3>
            <ul>
              {group.map((skill) => (
                <li key={skill.id}>{skill.label}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
