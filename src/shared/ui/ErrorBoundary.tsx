import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Изолирует ветку дерева: при ошибке внутри неё ветка не рендерится, а всё
 * остальное остаётся в DOM. Живёт в `shared`, потому что это средство
 * надёжности, а не часть сцены.
 *
 * Fallback-разметки нет намеренно: единственный нынешний потребитель —
 * фоновый 3D-слой, и правильное поведение при его падении это «страница без
 * сцены», а не сообщение об ошибке поверх резюме.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ошибка в изолированной ветке, она не отрендерена:', error);
    if (info.componentStack != null) console.error(info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
