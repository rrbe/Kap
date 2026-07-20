import React from 'react';
import * as Sentry from '@sentry/electron/renderer';
import {settings} from './settings';

class SentryErrorBoundary extends React.Component<{children: React.ReactNode}> {
  constructor(props) {
    super(props);
    const app = window.kap.app.getInfo();

    if (!app.development && settings.get('allowAnalytics')) {
      Sentry.init();
    }
  }

  componentDidCatch(error, errorInfo) {
    console.log(error, errorInfo);
    const scope = Sentry.getCurrentScope();
    for (const [key, value] of Object.entries(errorInfo)) {
      scope.setExtra(key, value);
    }

    Sentry.captureException(error);

    // This is needed to render errors correctly in development / production
    super.componentDidCatch(error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}

export default SentryErrorBoundary;
