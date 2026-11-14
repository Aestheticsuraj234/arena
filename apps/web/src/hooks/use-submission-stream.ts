'use client';

import type {SubmissionEvent, SubmissionState, TestResultView} from '@arena/shared';
import {useEffect, useState} from 'react';

import {api} from '@/lib/api';

export interface LiveProgress {
  status: SubmissionState;
  /** Tests reported so far, by position. */
  tests: Array<Pick<TestResultView, 'position' | 'status' | 'timeMs'>>;
  total: number | null;
  done: boolean;
}

/**
 * Follows a submission over SSE until `done`. Returns null until a token is
 * given. On `done`, the caller fetches the full submission.
 */
export function useSubmissionStream(token: string | null): LiveProgress | null {
  const [progress, setProgress] = useState<LiveProgress | null>(null);

  useEffect(() => {
    if (!token) {
      setProgress(null);
      return;
    }
    setProgress({status: 'in_queue', tests: [], total: null, done: false});
    const source = new EventSource(api.eventsUrl(token), {withCredentials: true});

    const handle = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as SubmissionEvent;
      setProgress((prev) => {
        const base = prev ?? {status: 'in_queue', tests: [], total: null, done: false};
        switch (event.type) {
          case 'status':
            return {...base, status: event.status};
          case 'test':
            return {
              ...base,
              status: 'processing',
              total: event.total,
              tests: [...base.tests.filter((t) => t.position !== event.position), event],
            };
          case 'done':
            return {...base, status: event.status, done: true};
        }
      });
      if (event.type === 'done') source.close();
    };

    for (const type of ['status', 'test', 'done']) {
      source.addEventListener(type, handle as EventListener);
    }
    return () => source.close();
  }, [token]);

  return progress;
}
