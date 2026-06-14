import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Question Bank Studio render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-error panel">
        <p className="kicker">APPLICATION ERROR</p>
        <h1>页面遇到异常</h1>
        <p>你的题库数据没有被删除。刷新页面后可以继续；若问题重复出现，请记录当前操作。</p>
        <button className="button primary" type="button" onClick={() => window.location.reload()}>刷新页面</button>
      </main>
    )
  }
}
