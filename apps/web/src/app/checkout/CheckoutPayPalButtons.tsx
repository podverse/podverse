'use client';

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';

import { ROUTES } from '../../constants/routes';
import { getApiRequestService } from '../../factories/apiRequestService';

type CheckoutPayPalButtonsProps = {
  clientId: string;
  processorProductId: number;
  onError: (message: string) => void;
};

export function CheckoutPayPalButtons({
  clientId,
  processorProductId,
  onError,
}: CheckoutPayPalButtonsProps) {
  const router = useRouter();

  const checkoutUrls = () => {
    const origin = window.location.origin;
    return {
      processorProductId,
      returnUrl: `${origin}${ROUTES.CHECKOUT_SUCCESS}`,
      cancelUrl: `${origin}${ROUTES.CHECKOUT}`,
    };
  };

  return (
    <div data-testid="checkout-paypal">
      <PayPalScriptProvider
        key={`order-${processorProductId}`}
        options={{
          clientId,
          currency: 'USD',
          intent: 'capture',
        }}
      >
        <PayPalButtons
          style={{ layout: 'vertical' }}
          createOrder={async () => {
            const order = await getApiRequestService().reqBillingCreatePayPalOrder(checkoutUrls());
            return order.order_id;
          }}
          onApprove={async (data) => {
            if (data.orderID !== undefined && data.orderID !== '') {
              await getApiRequestService().reqBillingCapturePayPalOrder(data.orderID);
            }
            router.push(ROUTES.CHECKOUT_SUCCESS);
          }}
          onError={() => {
            onError('paypal');
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}
