import { useMemo, useCallback } from 'react';
import { getDisplayRepo } from '@sureagents/shared/pr-types';
import type { PRMetadata } from '@sureagents/shared/pr-types';
import type { PRDiffScope } from '@sureagents/shared/pr-stack';
import type { CodeAnnotation } from '@sureagents/ui/types';

export function useAnnotationFactory(prMetadata: PRMetadata | null, diffScope?: PRDiffScope) {
  const prContext = useMemo(() => ({
    ...(prMetadata ? {
      prUrl: prMetadata.url,
      prNumber: prMetadata.platform === 'github' ? prMetadata.number : prMetadata.iid,
      prTitle: prMetadata.title,
      prRepo: getDisplayRepo(prMetadata),
      ...(diffScope ? { diffScope } : {}),
    } : {}),
  }), [prMetadata, diffScope]);

  const withPRContext = useCallback(
    (annotation: CodeAnnotation): CodeAnnotation => ({ ...annotation, ...prContext }),
    [prContext],
  );

  return { withPRContext };
}
