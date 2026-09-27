'use client';

import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useRouter } from 'next/navigation';

import { ROUTES } from '../../constants/routes';
import { getApiRequestService } from '../../factories/apiRequestService';

type CheckoutPayPalButtonsProps = {
  clientId: string;
  processorProductId: number;
  autoRenew: boolean;
  onError: (message: string) => void;
};

export function CheckoutPayPalButtons({
  clientId,
  processorProductId,
  autoRenew,
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
        key={`${autoRenew ? 'subscription' : 'order'}-${processorProductId}`}
        options={{
          clientId,
          currency: 'USD',
          intent: autoRenew ? 'subscription' : 'capture',
          vault: autoRenew,
        }}
      >
        <PayPalButtons
          style={{ layout: 'vertical' }}
          createOrder={
            autoRenew
              ? undefined
              : async () => {
                  const order =
                    await getApiRequestService().reqBillingCreatePayPalOrder(checkoutUrls());
                  return order.order_id;
                }
          }
          createSubscription={
            autoRenew
              ? async () => {
                  const subscription =
                    await getApiRequestService().reqBillingCreatePayPalSubscription(checkoutUrls());
                  return subscription.subscription_id;
                }
              : undefined
          }
          onApprove={async (data) => {
            if (!autoRenew && data.orderID !== undefined && data.orderID !== '') {
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
