import {describe, expect, it} from 'vitest';

import {canTransition, isFinalStatus} from '../src';

describe('submission state machine', () => {
  it('only lets the queue move to processing', () => {
    expect(canTransition('in_queue', 'processing')).toBe(true);
    expect(canTransition('in_queue', 'accepted')).toBe(false);
  });

  it('lets processing finish, requeue or be reclaimed', () => {
    expect(canTransition('processing', 'accepted')).toBe(true);
    expect(canTransition('processing', 'in_queue')).toBe(true);
    expect(canTransition('processing', 'processing')).toBe(true);
  });

  it('never changes a final status', () => {
    expect(isFinalStatus('wrong_answer')).toBe(true);
    expect(canTransition('accepted', 'processing')).toBe(false);
    expect(canTransition('accepted', 'wrong_answer')).toBe(false);
  });
});
