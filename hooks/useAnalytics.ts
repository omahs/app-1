import { useCallback } from 'react';
import ReactGA from 'react-ga4';

export default <T>() => {
  const dataInitialize = useCallback(() => sessionStorage.setItem('webData', JSON.stringify({})), []);

  const setData = useCallback((payload: T) => {
    if (typeof window === 'undefined') return;
    const currentData = sessionStorage.getItem('webData');
    const newData = currentData ? { ...JSON.parse(currentData), ...payload } : payload;
    sessionStorage.setItem('webData', JSON.stringify(newData));
  }, []);

  const unsetData = useCallback((key: string) => {
    const currentData = sessionStorage.getItem('webData');

    if (currentData) {
      const parsedData = JSON.parse(currentData);

      if (key in parsedData) {
        delete parsedData[key];
        sessionStorage.setItem('webData', JSON.stringify(parsedData));
      }
    }
  }, []);

  const getData = useCallback(() => {
    const currentData = sessionStorage.getItem('webData');
    return currentData ? JSON.parse(currentData) : {};
  }, []);

  const analyticsEvent = useCallback(
    (eventName: string, payload: Record<keyof T, string>) => {
      ReactGA.event(eventName, { ...payload, ...getData() });
    },
    [getData],
  );

  return { setData, unsetData, dataInitialize, analyticsEvent };
};
