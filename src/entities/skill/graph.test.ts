import { displayJobs, projects, skills, type Bridge, type Job, type Project, type Skill } from '@/content';
import { buildSkillGraph, skillGraph } from './graph';

const testSkills: Skill[] = [
  { id: 'react', label: 'React', category: 'framework' },
  { id: 'postgres', label: 'PostgreSQL', category: 'database' },
  { id: 'python', label: 'Python', category: 'ml-data', intent: 'learning' },
  { id: 'onnx', label: 'ONNX', category: 'mlops', intent: 'planned' },
];
const testJobs = [
  { id: 'acme', company: 'Acme', stack: ['react', 'postgres'] },
] as unknown as Job[];
const testProjects = [
  { id: 'demo', title: 'Демо', url: 'https://example.com/demo', stack: ['python'] },
] as unknown as Project[];
const testBridges = [{ from: 'postgres', to: 'python', why: 'потому что' }] as unknown as Bridge[];

const graph = buildSkillGraph(testSkills, testJobs, testProjects, testBridges);
const node = (id: string) => graph.nodes.find((n) => n.id === id)!;

describe('buildSkillGraph', () => {
  it('узлы — навыки, работы и проекты', () => {
    expect(graph.nodes.map((n) => [n.id, n.kind])).toEqual([
      ['react', 'skill'],
      ['postgres', 'skill'],
      ['python', 'skill'],
      ['onnx', 'skill'],
      ['acme', 'job'],
      ['demo', 'project'],
    ]);
  });

  it('у навыка домен из категории и выведенный статус', () => {
    expect(node('react')).toMatchObject({ domain: 'web', status: 'applied' });
    expect(node('python')).toMatchObject({ domain: 'ml', status: 'applied' });
    expect(node('onnx')).toMatchObject({ domain: 'ml', status: 'planned' });
  });

  it('хаб-работа ведёт к станции, хаб-проект — к репозиторию', () => {
    expect(node('acme')).toMatchObject({ label: 'Acme', domain: 'web', href: '#acme' });
    expect(node('demo')).toMatchObject({ label: 'Демо', domain: 'ml', href: 'https://example.com/demo' });
  });

  it('ребро applied — от хаба к каждому навыку его stack', () => {
    const applied = graph.edges.filter((e) => e.kind === 'applied');
    expect(applied).toEqual([
      { from: 'acme', to: 'react', kind: 'applied' },
      { from: 'acme', to: 'postgres', kind: 'applied' },
      { from: 'demo', to: 'python', kind: 'applied' },
    ]);
  });

  it('мост — ребро bridge', () => {
    expect(graph.edges.filter((e) => e.kind === 'bridge')).toEqual([
      { from: 'postgres', to: 'python', kind: 'bridge' },
    ]);
  });
});

describe('граф настоящего контента', () => {
  const ids = new Set(skillGraph.nodes.map((n) => n.id));

  it('узлов столько же, сколько навыков, работ и проектов', () => {
    expect(skillGraph.nodes).toHaveLength(skills.length + displayJobs.length + projects.length);
  });

  it('нет висячих рёбер', () => {
    for (const edge of skillGraph.edges) {
      expect(ids.has(edge.from), edge.from).toBe(true);
      expect(ids.has(edge.to), edge.to).toBe(true);
    }
  });

  it('навык имеет ребро applied тогда и только тогда, когда он применён', () => {
    const withEvidence = new Set(skillGraph.edges.filter((e) => e.kind === 'applied').map((e) => e.to));
    for (const n of skillGraph.nodes) {
      if (n.kind === 'skill') expect(withEvidence.has(n.id), n.id).toBe(n.status === 'applied');
    }
  });

  it('хабы-работы в порядке станций', () => {
    expect(skillGraph.nodes.filter((n) => n.kind === 'job').map((n) => n.id)).toEqual(
      displayJobs.map((job) => job.id),
    );
  });
});
