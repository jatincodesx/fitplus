import "server-only";

const FEATURE_QUERY_TIMEOUT_MS = Number(process.env.FEATURE_QUERY_TIMEOUT_MS ?? 8000);

export type FeatureStepResult<T> = {
  data: T;
  failed: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "UnknownError";
}

export async function withFeatureTimeout<T>(
  routeTag: string,
  label: string,
  task: () => Promise<T>
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`FeatureTimeout:${label}`)), FEATURE_QUERY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([task(), timeout]);
  } catch (error) {
    console.error(routeTag, {
      label,
      error: getErrorMessage(error),
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function withFeatureFallback<T>(
  routeTag: string,
  label: string,
  task: () => Promise<T>,
  fallback: T
): Promise<FeatureStepResult<T>> {
  try {
    return {
      data: await withFeatureTimeout(routeTag, label, task),
      failed: false,
    };
  } catch {
    return {
      data: fallback,
      failed: true,
    };
  }
}
