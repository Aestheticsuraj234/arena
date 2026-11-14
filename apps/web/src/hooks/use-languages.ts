'use client';

import type {LanguageInfo} from '@arena/shared';
import {useEffect, useState} from 'react';

import {api} from '@/lib/api';

/** The languages the server can run, loaded once per page. */
export function useLanguages(): LanguageInfo[] {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  useEffect(() => {
    api.languages().then(setLanguages, () => setLanguages([]));
  }, []);
  return languages;
}
