# Straumur Web Component

Embeddable payment checkout component for Straumur with support for cards, Apple Pay, Google Pay, 3D Secure, and stored payment methods.

## Installation

```bash
npm install straumur-web-component
```

```bash
yarn add straumur-web-component
```

## Quick Start

```javascript
import { StraumurCheckout } from 'straumur-web-component';

const checkout = new StraumurCheckout({
  sessionId: 'your-session-id',
  environment: 'test', // or 'live'
  locale: 'en', // or 'is' for Icelandic
  onPaymentCompleted: (data) => {
    console.log('Payment completed:', data);
  },
  onPaymentFailed: (data) => {
    console.log('Payment failed:', data);
  }
});

// Mount to a DOM element
checkout.mount('#checkout-container');
```

## Documentation

For complete documentation, configuration options, and integration guides, visit:

**[https://docs.straumur.is/payment-gateway/components/straumur-components/web-component](https://docs.straumur.is/payment-gateway/components/straumur-components/web-component)**

## Features

- Multiple payment methods (cards, Apple Pay, Google Pay)
- 3D Secure 2.0 authentication
- Stored payment methods for returning customers
- Co-badged/dual-brand card support
- Instant payment buttons
- Localization (English & Icelandic)
- TypeScript support

## Support

- **Issues**: [GitHub Issues](https://github.com/Straumur-Greidslumidlun/straumur-web-component/issues)
- **Documentation**: [https://docs.straumur.is](https://docs.straumur.is)

## License

MIT
