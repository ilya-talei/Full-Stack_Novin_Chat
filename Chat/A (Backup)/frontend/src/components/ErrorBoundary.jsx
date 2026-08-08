import { Component } from 'react';
import Button from '@components/ui/Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen chat-bg text-ink gap-4 px-4">
          <h1 className="text-2xl font-bold">خطایی رخ داد</h1>
          <p className="text-ink-secondary text-center">
            {this.state.error?.message || 'مشکلی پیش آمده است'}
          </p>
          <Button onClick={() => window.location.reload()}>تلاش مجدد</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
