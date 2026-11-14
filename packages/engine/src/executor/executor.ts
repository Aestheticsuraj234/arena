import type {ExecutionJob, ExecutionResult} from './types';

/**
 * Runs untrusted code. `DockerExecutor` is the real one; tests use fakes, and
 * the bonus chapter adds a Firecracker executor behind the same interface.
 */
export interface Executor {
  execute(job: ExecutionJob): Promise<ExecutionResult>;
}
