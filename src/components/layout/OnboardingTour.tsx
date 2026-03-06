'use client';

import { useContext, useEffect, VFC, useState } from 'react';
import { ShepherdTour, ShepherdTourContext } from 'react-shepherd';

const tourOptions = {
  defaultStepOptions: {
    cancelIcon: {
      enabled: true,
    },
  },
  useModalOverlay: true,
};

const steps = [
  {
    id: 'intro',
    title: 'Welcome!',
    text: 'Welcome to Anita Deploy! Let\'s take a quick tour of the dashboard to get you started.',
    buttons: [
      {
        text: 'Next',
        action: () => (window as any).tour.next(), // Use global tour object
        classes: 'shepherd-button-primary',
      },
    ],
  },
  {
    id: 'deployments',
    title: 'Your Deployments',
    text: 'This is your main dashboard. All your active and past deployments will appear here as cards.',
    attachTo: { element: '#tour-deployment-area', on: 'bottom' as const },
    buttons: [
      {
        text: 'Back',
        action: () => (window as any).tour.back(),
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Next',
        action: () => (window as any).tour.next(),
        classes: 'shepherd-button-primary',
      },
    ],
  },
  {
    id: 'new-deployment-btn',
    title: 'New Deployment',
    text: 'Ready to launch a new bot? Click here to start the deployment process.',
    attachTo: { element: '#tour-new-deployment-btn', on: 'bottom' as const },
    buttons: [
      {
        text: 'Back',
        action: () => (window as any).tour.back(),
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Next',
        action: () => (window as any).tour.next(),
        classes: 'shepherd-button-primary',
      },
    ],
  },
    {
    id: 'community-feed',
    title: 'Community Feed',
    text: 'Open the Community Feed to chat with other users. It\'s a great place to ask questions!',
    attachTo: { element: '#tour-community-feed', on: 'bottom' as const },
    buttons: [
      {
        text: 'Back',
        action: () => (window as any).tour.back(),
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Next',
        action: () => (window as any).tour.next(),
        classes: 'shepherd-button-primary',
      },
    ],
  },
  {
    id: 'user-nav',
    title: 'Your Account',
    text: 'Finally, this is your user menu. You can view your profile, manage coins, and log out here.',
    attachTo: { element: '#tour-user-nav', on: 'bottom' as const },
    buttons: [
      {
        text: 'Back',
        action: () => (window as any).tour.back(),
        classes: 'shepherd-button-secondary',
      },
      {
        text: 'Done',
        action: () => (window as any).tour.complete(),
        classes: 'shepherd-button-primary',
      },
    ],
  },
];

// This component will actually start the tour
const TourController: VFC = () => {
  const tour = useContext(ShepherdTourContext);
  (window as any).tour = tour;
  
  useEffect(() => {
    const hasTakenTour = localStorage.getItem('anita-deploy-tour-v1');
    if (tour && !hasTakenTour) {
      setTimeout(() => {
        tour.start();
        localStorage.setItem('anita-deploy-tour-v1', 'true');
      }, 500); // Small delay to ensure all elements are mounted
    }
  }, [tour]);
  
  return null;
};

const OnboardingTour = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }

  return (
    <ShepherdTour steps={steps} tourOptions={tourOptions}>
      <TourController />
    </ShepherdTour>
  );
};

export default OnboardingTour;
