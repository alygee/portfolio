export type SkillCategory =
  | 'framework'
  | 'language'
  | 'build'
  | 'testing'
  | 'state'
  | 'backend'
  | 'database'
  | 'geo'
  | 'infra'
  | 'ml-data'
  | 'ml-classic'
  | 'ml-deep'
  | 'llm'
  | 'mlops';

/**
 * Намерение — только у навыка без доказательств (спека зала, К1–К2).
 * «Применён» здесь не пишется никогда: он выводится из `stack` работ и
 * проектов (`entities/skill/status.ts`).
 */
export type SkillIntent = 'learning' | 'planned';

export type Skill = {
  id: string;
  label: string;
  category: SkillCategory;
  intent?: SkillIntent;
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
  // ML — траектория по docs/ml-engineer-plan.md. Намерение снимается в том же
  // коммите, где навык попадает в stack проекта (тест К2).
  { id: 'python', label: 'Python', category: 'ml-data', intent: 'learning' },
  { id: 'numpy', label: 'NumPy', category: 'ml-data', intent: 'planned' },
  { id: 'pandas', label: 'pandas', category: 'ml-data', intent: 'planned' },
  { id: 'sklearn', label: 'scikit-learn', category: 'ml-classic', intent: 'planned' },
  { id: 'catboost', label: 'CatBoost', category: 'ml-classic', intent: 'planned' },
  { id: 'lightgbm', label: 'LightGBM', category: 'ml-classic', intent: 'planned' },
  { id: 'pytorch', label: 'PyTorch', category: 'ml-deep', intent: 'planned' },
  { id: 'transformers', label: 'Hugging Face Transformers', category: 'ml-deep', intent: 'planned' },
  { id: 'rag', label: 'RAG', category: 'llm', intent: 'planned' },
  { id: 'vector-db', label: 'Vector DBs', category: 'llm', intent: 'planned' },
  { id: 'lora', label: 'LoRA', category: 'llm', intent: 'planned' },
  { id: 'evals', label: 'Evals', category: 'llm', intent: 'planned' },
  { id: 'fastapi', label: 'FastAPI', category: 'mlops', intent: 'planned' },
  { id: 'mlflow', label: 'MLflow', category: 'mlops', intent: 'planned' },
  { id: 'dvc', label: 'DVC', category: 'mlops', intent: 'planned' },
  { id: 'onnx', label: 'ONNX', category: 'mlops', intent: 'planned' },
  { id: 'vllm', label: 'vLLM', category: 'mlops', intent: 'planned' },
  { id: 'evidently', label: 'Evidently', category: 'mlops', intent: 'planned' },
] as const satisfies readonly Skill[];

export type SkillId = (typeof skills)[number]['id'];
