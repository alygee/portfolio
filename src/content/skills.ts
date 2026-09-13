export type SkillCategory =
  | 'framework'
  | 'language'
  | 'build'
  | 'testing'
  | 'state'
  | 'backend'
  | 'database'
  | 'geo'
  | 'infra';

export type Skill = {
  id: string;
  label: string;
  category: SkillCategory;
};

export const skills = [
  { id: 'typescript', label: 'TypeScript', category: 'language' },
  { id: 'javascript', label: 'JavaScript', category: 'language' },
  { id: 'php', label: 'PHP', category: 'language' },
  { id: 'react', label: 'React', category: 'framework' },
  { id: 'vue', label: 'Vue', category: 'framework' },
  { id: 'angular', label: 'Angular', category: 'framework' },
  { id: 'angularjs', label: 'AngularJS', category: 'framework' },
  { id: 'extjs', label: 'ExtJS', category: 'framework' },
  { id: 'laravel', label: 'Laravel', category: 'backend' },
  { id: 'nodejs', label: 'Node.js', category: 'backend' },
  { id: 'vite', label: 'Vite', category: 'build' },
  { id: 'webpack', label: 'Webpack', category: 'build' },
  { id: 'jest', label: 'Jest', category: 'testing' },
  { id: 'cypress', label: 'Cypress', category: 'testing' },
  { id: 'storybook', label: 'Storybook', category: 'testing' },
  { id: 'redux', label: 'Redux Toolkit', category: 'state' },
  { id: 'effector', label: 'Effector', category: 'state' },
  { id: 'rxjs', label: 'RxJS', category: 'state' },
  { id: 'chakra', label: 'Chakra UI', category: 'framework' },
  { id: 'maplibre', label: 'MapLibre', category: 'geo' },
  { id: 'mapbox', label: 'Mapbox', category: 'geo' },
  { id: 'openlayers', label: 'OpenLayers', category: 'geo' },
  { id: 'postgres', label: 'PostgreSQL', category: 'database' },
  { id: 'mongodb', label: 'MongoDB', category: 'database' },
  { id: 'mysql', label: 'MySQL', category: 'database' },
  { id: 'graphql', label: 'GraphQL', category: 'backend' },
  { id: 'websocket', label: 'WebSocket', category: 'backend' },
  { id: 'docker', label: 'Docker', category: 'infra' },
  { id: 'ci', label: 'CI/CD', category: 'infra' },
  { id: 'wordpress', label: 'WordPress', category: 'backend' },
  { id: 'magento', label: 'Magento', category: 'backend' },
] as const satisfies readonly Skill[];

export type SkillId = (typeof skills)[number]['id'];
